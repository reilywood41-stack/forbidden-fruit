import { Router } from "express";
import { db, dmsTable, usersTable, modelsTable } from "@workspace/db";
import { eq, desc, and, sql } from "drizzle-orm";
import { requireAuth, requireAdmin, type AuthRequest } from "../lib/auth.js";

const router = Router();
const SILVER_GOLD = ["silver", "gold"];

router.get("/unread", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(dmsTable)
      .where(and(eq(dmsTable.userId, user.id), eq(dmsTable.fromAdmin, true), eq(dmsTable.isRead, false)));
    res.json({ unread: Number(count) });
  } catch {
    res.json({ unread: 0 });
  }
});

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const modelId = req.query.modelId ? Number(req.query.modelId) : null;

    const conditions = modelId
      ? and(eq(dmsTable.userId, user.id), eq(dmsTable.modelId, modelId))
      : eq(dmsTable.userId, user.id);

    const messages = await db.select().from(dmsTable)
      .where(conditions)
      .orderBy(dmsTable.createdAt);

    if (modelId) {
      await db.update(dmsTable)
        .set({ isRead: true })
        .where(and(eq(dmsTable.userId, user.id), eq(dmsTable.modelId, modelId)));
    }

    res.json({ messages, canSend: SILVER_GOLD.includes(user.membershipTier) });
  } catch (err) {
    req.log.error({ err }, "Get DMs error");
    res.status(500).json({ error: "server_error", message: "Failed to load messages" });
  }
});

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    if (!SILVER_GOLD.includes(user.membershipTier)) {
      res.status(403).json({ error: "forbidden", message: "DMs require Silver or Gold membership" });
      return;
    }
    const { message, modelId } = req.body;
    if (!message?.trim()) {
      res.status(400).json({ error: "validation", message: "Message cannot be empty" });
      return;
    }
    if (!modelId) {
      res.status(400).json({ error: "validation", message: "Select a model to message" });
      return;
    }
    const [dm] = await db.insert(dmsTable).values({
      userId: user.id,
      modelId: Number(modelId),
      fromAdmin: false,
      message: message.trim(),
    }).returning();
    res.status(201).json(dm);
  } catch (err) {
    req.log.error({ err }, "Send DM error");
    res.status(500).json({ error: "server_error", message: "Failed to send message" });
  }
});

router.get("/admin/threads", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const allMessages = await db.select({
      id: dmsTable.id,
      userId: dmsTable.userId,
      modelId: dmsTable.modelId,
      fromAdmin: dmsTable.fromAdmin,
      message: dmsTable.message,
      isRead: dmsTable.isRead,
      createdAt: dmsTable.createdAt,
      username: usersTable.username,
      membershipTier: usersTable.membershipTier,
      modelName: modelsTable.name,
      modelAvatarUrl: modelsTable.avatarUrl,
    }).from(dmsTable)
      .leftJoin(usersTable, eq(dmsTable.userId, usersTable.id))
      .leftJoin(modelsTable, eq(dmsTable.modelId, modelsTable.id))
      .orderBy(desc(dmsTable.createdAt));

    const threadMap = new Map<string, any>();
    for (const msg of allMessages) {
      const key = `${msg.userId}-${msg.modelId ?? 0}`;
      if (!threadMap.has(key)) {
        threadMap.set(key, {
          key,
          userId: msg.userId,
          modelId: msg.modelId,
          username: msg.username,
          membershipTier: msg.membershipTier,
          modelName: msg.modelName || "Admin",
          modelAvatarUrl: msg.modelAvatarUrl,
          lastMessage: msg.message,
          lastAt: msg.createdAt,
          unread: 0,
          messages: [],
        });
      }
      const thread = threadMap.get(key);
      thread.messages.unshift(msg);
      if (!msg.fromAdmin && !msg.isRead) thread.unread++;
    }

    res.json({ threads: Array.from(threadMap.values()) });
  } catch (err) {
    req.log.error({ err }, "Admin get DM threads error");
    res.status(500).json({ error: "server_error", message: "Failed to load threads" });
  }
});

router.post("/admin/reply/:userId/:modelId", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) {
      res.status(400).json({ error: "validation", message: "Message required" });
      return;
    }
    const modelId = req.params.modelId && req.params.modelId !== "0"
      ? Number(req.params.modelId)
      : null;
    const [dm] = await db.insert(dmsTable).values({
      userId: Number(req.params.userId),
      modelId,
      fromAdmin: true,
      message: message.trim(),
    }).returning();
    res.status(201).json(dm);
  } catch (err) {
    req.log.error({ err }, "Admin reply DM error");
    res.status(500).json({ error: "server_error", message: "Failed to send reply" });
  }
});

export default router;
