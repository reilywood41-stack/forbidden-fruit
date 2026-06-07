import { Router } from "express";
import { db, contentTable, commentsTable, modelsTable, usersTable, contentLikesTable } from "@workspace/db";
import { eq, and, like, sql, desc } from "drizzle-orm";
import { requireAuth, optionalAuth, type AuthRequest } from "../lib/auth.js";

const router = Router();

const TIER_ORDER: Record<string, number> = { none: 0, free: 0, bronze: 1, silver: 2, gold: 3 };
const CONTENT_TIER_ORDER: Record<string, number> = { free: 0, bronze: 1, silver: 2, gold: 3 };

function canAccessTier(userTier: string, contentTier: string): boolean {
  if (contentTier === "free") return true;
  const userLevel = TIER_ORDER[userTier] ?? 0;
  const contentLevel = CONTENT_TIER_ORDER[contentTier] ?? 99;
  return userLevel >= contentLevel;
}

function formatContent(item: any, userTier: string) {
  const locked = !canAccessTier(userTier, item.tier);
  const parsedImageUrls = item.imageUrls ? JSON.parse(item.imageUrls) : [];
  const parsedTags = item.tags ? JSON.parse(item.tags) : [];
  return {
    ...item,
    imageUrls: locked ? [] : parsedImageUrls,
    tags: parsedTags,
    isLocked: locked,
    isPhoneAspect: item.isPhoneAspect ?? false,
    videoUrl: locked ? null : item.videoUrl,
    viewCount: (item.viewCount || 0) + (item.boostedViews || 0),
    likeCount: (item.likeCount || 0) + (item.boostedLikes || 0),
  };
}

const CONTENT_SELECT = {
  id: contentTable.id,
  title: contentTable.title,
  description: contentTable.description,
  type: contentTable.type,
  tier: contentTable.tier,
  thumbnailUrl: contentTable.thumbnailUrl,
  videoUrl: contentTable.videoUrl,
  imageUrls: contentTable.imageUrls,
  isPhoneAspect: contentTable.isPhoneAspect,
  modelId: contentTable.modelId,
  modelName: modelsTable.name,
  modelSlug: modelsTable.slug,
  tags: contentTable.tags,
  duration: contentTable.duration,
  viewCount: contentTable.viewCount,
  likeCount: contentTable.likeCount,
  boostedLikes: contentTable.boostedLikes,
  boostedViews: contentTable.boostedViews,
  commentCount: contentTable.commentCount,
  createdAt: contentTable.createdAt,
};

router.get("/", optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { tier, type, search, modelId, page = 1, limit = 20 } = req.query;
    const userTier = req.user?.membershipTier || "none";
    const offset = (Number(page) - 1) * Number(limit);

    let query = db.select(CONTENT_SELECT).from(contentTable)
      .leftJoin(modelsTable, eq(contentTable.modelId, modelsTable.id));

    const conditions = [];
    if (tier) conditions.push(eq(contentTable.tier, tier as any));
    if (type) conditions.push(eq(contentTable.type, type as any));
    if (search) conditions.push(like(contentTable.title, `%${search}%`));
    if (modelId) conditions.push(eq(contentTable.modelId, Number(modelId)));

    const filtered = conditions.length ? query.where(and(...conditions)) : query;

    const items = await filtered.orderBy(desc(contentTable.createdAt)).limit(Number(limit)).offset(offset);
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(contentTable);

    res.json({
      items: items.map(item => formatContent(item, userTier)),
      total: Number(count),
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(Number(count) / Number(limit)),
    });
  } catch (err) {
    req.log.error({ err }, "Get content error");
    res.status(500).json({ error: "server_error", message: "Failed to get content" });
  }
});

router.get("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const userTier = req.user?.membershipTier || "none";

    const items = await db.select(CONTENT_SELECT).from(contentTable)
      .leftJoin(modelsTable, eq(contentTable.modelId, modelsTable.id))
      .where(eq(contentTable.id, id)).limit(1);

    if (!items.length) {
      res.status(404).json({ error: "not_found", message: "Content not found" });
      return;
    }

    if (canAccessTier(userTier, items[0].tier)) {
      await db.update(contentTable).set({ viewCount: sql`${contentTable.viewCount} + 1` }).where(eq(contentTable.id, id));
      await db.update(usersTable).set({ videosWatched: sql`${usersTable.videosWatched} + 1` }).where(eq(usersTable.id, req.userId!));
    }

    let isLiked = false;
    if (req.userId) {
      const existing = await db.select({ id: contentLikesTable.id })
        .from(contentLikesTable)
        .where(and(eq(contentLikesTable.contentId, id), eq(contentLikesTable.userId, req.userId)))
        .limit(1);
      isLiked = existing.length > 0;
    }

    res.json({ ...formatContent(items[0], userTier), isLiked });
  } catch (err) {
    req.log.error({ err }, "Get content by id error");
    res.status(500).json({ error: "server_error", message: "Failed to get content" });
  }
});

router.post("/:id/like", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const userId = req.userId!;

    const existing = await db.select({ id: contentLikesTable.id })
      .from(contentLikesTable)
      .where(and(eq(contentLikesTable.contentId, id), eq(contentLikesTable.userId, userId)))
      .limit(1);

    if (existing.length) {
      await db.delete(contentLikesTable)
        .where(and(eq(contentLikesTable.contentId, id), eq(contentLikesTable.userId, userId)));
      await db.update(contentTable)
        .set({ likeCount: sql`GREATEST(${contentTable.likeCount} - 1, 0)` })
        .where(eq(contentTable.id, id));
      const [updated] = await db.select({ likeCount: contentTable.likeCount }).from(contentTable).where(eq(contentTable.id, id)).limit(1);
      res.json({ liked: false, likeCount: updated?.likeCount ?? 0 });
    } else {
      await db.insert(contentLikesTable).values({ contentId: id, userId });
      await db.update(contentTable)
        .set({ likeCount: sql`${contentTable.likeCount} + 1` })
        .where(eq(contentTable.id, id));
      const [updated] = await db.select({ likeCount: contentTable.likeCount }).from(contentTable).where(eq(contentTable.id, id)).limit(1);
      res.json({ liked: true, likeCount: updated?.likeCount ?? 0 });
    }
  } catch (err) {
    req.log.error({ err }, "Toggle like error");
    res.status(500).json({ error: "server_error", message: "Failed to toggle like" });
  }
});

router.get("/:id/comments", requireAuth, async (req: AuthRequest, res) => {
  try {
    const contentId = Number(req.params.id);
    const comments = await db.select({
      id: commentsTable.id,
      contentId: commentsTable.contentId,
      userId: commentsTable.userId,
      username: usersTable.username,
      avatarUrl: usersTable.avatarUrl,
      text: commentsTable.text,
      createdAt: commentsTable.createdAt,
    }).from(commentsTable)
      .leftJoin(usersTable, eq(commentsTable.userId, usersTable.id))
      .where(eq(commentsTable.contentId, contentId))
      .orderBy(desc(commentsTable.createdAt));

    res.json({ comments, total: comments.length });
  } catch (err) {
    req.log.error({ err }, "Get comments error");
    res.status(500).json({ error: "server_error", message: "Failed to get comments" });
  }
});

router.post("/:id/comments", requireAuth, async (req: AuthRequest, res) => {
  try {
    const contentId = Number(req.params.id);
    const { text } = req.body;
    if (!text?.trim()) {
      res.status(400).json({ error: "validation", message: "Comment text required" });
      return;
    }

    const [comment] = await db.insert(commentsTable).values({
      contentId,
      userId: req.userId!,
      text: text.trim(),
    }).returning();

    await db.update(contentTable)
      .set({ commentCount: sql`${contentTable.commentCount} + 1` })
      .where(eq(contentTable.id, contentId));

    const user = req.user!;
    res.status(201).json({
      ...comment,
      username: user.username,
      avatarUrl: user.avatarUrl,
    });
  } catch (err) {
    req.log.error({ err }, "Add comment error");
    res.status(500).json({ error: "server_error", message: "Failed to add comment" });
  }
});

export default router;
