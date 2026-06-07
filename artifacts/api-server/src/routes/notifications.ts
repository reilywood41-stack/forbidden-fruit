import { Router } from "express";
import { db, notificationsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth.js";

const router = Router();

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const notifications = await db.select().from(notificationsTable)
      .where(eq(notificationsTable.userId, req.userId!))
      .orderBy(desc(notificationsTable.createdAt));

    const unreadCount = notifications.filter(n => !n.isRead).length;
    res.json({ notifications, unreadCount });
  } catch (err) {
    req.log.error({ err }, "Get notifications error");
    res.status(500).json({ error: "server_error", message: "Failed to get notifications" });
  }
});

router.put("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    await db.update(notificationsTable)
      .set({ isRead: true })
      .where(eq(notificationsTable.userId, req.userId!));

    res.json({ success: true, message: "All notifications marked as read" });
  } catch (err) {
    req.log.error({ err }, "Mark all read error");
    res.status(500).json({ error: "server_error", message: "Failed to mark notifications as read" });
  }
});

router.put("/:id/read", requireAuth, async (req: AuthRequest, res) => {
  try {
    await db.update(notificationsTable)
      .set({ isRead: true })
      .where(and(
        eq(notificationsTable.id, Number(req.params.id)),
        eq(notificationsTable.userId, req.userId!)
      ));

    res.json({ success: true, message: "Notification marked as read" });
  } catch (err) {
    req.log.error({ err }, "Mark notification read error");
    res.status(500).json({ error: "server_error", message: "Failed to mark notification as read" });
  }
});

router.delete("/all", requireAuth, async (req: AuthRequest, res) => {
  try {
    await db.delete(notificationsTable)
      .where(eq(notificationsTable.userId, req.userId!));

    res.json({ success: true, message: "All notifications deleted" });
  } catch (err) {
    req.log.error({ err }, "Delete all notifications error");
    res.status(500).json({ error: "server_error", message: "Failed to delete notifications" });
  }
});

router.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    await db.delete(notificationsTable)
      .where(and(
        eq(notificationsTable.id, Number(req.params.id)),
        eq(notificationsTable.userId, req.userId!)
      ));

    res.json({ success: true, message: "Notification deleted" });
  } catch (err) {
    req.log.error({ err }, "Delete notification error");
    res.status(500).json({ error: "server_error", message: "Failed to delete notification" });
  }
});

export default router;
