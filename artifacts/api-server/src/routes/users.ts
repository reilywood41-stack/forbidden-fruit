import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth.js";

const router = Router();

router.get("/profile", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { passwordHash: _, emailVerificationToken: __, passwordResetToken: ___, ...profile } = user;
    res.json(profile);
  } catch (err) {
    req.log.error({ err }, "Get profile error");
    res.status(500).json({ error: "server_error", message: "Failed to get profile" });
  }
});

router.put("/profile", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { displayName, bio, avatarUrl } = req.body;
    const [updated] = await db.update(usersTable)
      .set({ displayName, bio, avatarUrl, updatedAt: new Date() })
      .where(eq(usersTable.id, req.userId!))
      .returning();

    const { passwordHash: _, emailVerificationToken: __, passwordResetToken: ___, ...profile } = updated;
    res.json(profile);
  } catch (err) {
    req.log.error({ err }, "Update profile error");
    res.status(500).json({ error: "server_error", message: "Failed to update profile" });
  }
});

export default router;
