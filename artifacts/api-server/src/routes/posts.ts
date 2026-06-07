import { Router } from "express";
import { pool } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth.js";

const router = Router();

const TIER_LEVEL: Record<string, number> = { none: 0, free: 0, bronze: 1, silver: 2, gold: 3 };

function formatPost(p: any, userTierLevel: number) {
  const postTierLevel = TIER_LEVEL[p.tier] ?? 0;
  const isLocked = postTierLevel > userTierLevel;
  return {
    id: p.id,
    modelId: p.model_id,
    modelName: p.model_name || null,
    modelAvatar: p.model_avatar || null,
    modelSlug: p.model_slug || null,
    caption: isLocked ? null : (p.caption || ""),
    mediaUrls: isLocked ? [] : (JSON.parse(p.media_urls || "[]") as string[]),
    mediaType: p.media_type as string,
    tier: p.tier as string,
    likeCount: Number(p.like_count || 0),
    commentCount: Number(p.comment_count || 0),
    isPinned: Boolean(p.is_pinned),
    isLocked,
    isLiked: p.is_liked === true || p.is_liked === "true",
    createdAt: p.created_at as string,
  };
}

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userTierLevel = TIER_LEVEL[req.user?.membershipTier || "none"] ?? 0;
    const { modelId, limit = "20" } = req.query;
    const params: (string | number)[] = [req.user!.id, Number(limit)];
    const modelFilter = modelId ? `AND p.model_id = $${params.push(Number(modelId))}` : "";

    const result = await pool.query(
      `SELECT p.*, m.name as model_name, m.avatar_url as model_avatar, m.slug as model_slug,
              (SELECT EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $1)) as is_liked
       FROM posts p
       LEFT JOIN models m ON m.id = p.model_id
       WHERE 1=1 ${modelFilter}
       ORDER BY p.is_pinned DESC, p.created_at DESC
       LIMIT $2`,
      params
    );

    res.json({ posts: result.rows.map((r) => formatPost(r, userTierLevel)) });
  } catch (err) {
    req.log.error({ err }, "Get posts error");
    res.status(500).json({ error: "server_error", message: "Failed to get posts" });
  }
});

router.post("/:id/like", requireAuth, async (req: AuthRequest, res) => {
  try {
    const postId = Number(req.params.id);
    const userId = req.user!.id;

    const existing = await pool.query(
      "SELECT id FROM post_likes WHERE post_id = $1 AND user_id = $2",
      [postId, userId]
    );

    let liked: boolean;
    if (existing.rows.length > 0) {
      await pool.query("DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2", [postId, userId]);
      await pool.query("UPDATE posts SET like_count = GREATEST(0, like_count - 1) WHERE id = $1", [postId]);
      liked = false;
    } else {
      await pool.query(
        "INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [postId, userId]
      );
      await pool.query("UPDATE posts SET like_count = like_count + 1 WHERE id = $1", [postId]);
      liked = true;
    }

    const countRes = await pool.query("SELECT like_count FROM posts WHERE id = $1", [postId]);
    res.json({ liked, likeCount: Number(countRes.rows[0]?.like_count || 0) });
  } catch (err) {
    req.log.error({ err }, "Post like error");
    res.status(500).json({ error: "server_error", message: "Failed to toggle like" });
  }
});

export default router;
