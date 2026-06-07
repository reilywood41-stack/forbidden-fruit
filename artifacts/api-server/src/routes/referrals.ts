import { Router } from "express";
import { db, usersTable, referralsTable, promoCodesTable, notificationsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth.js";

const router = Router();

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const referrals = await db.select({
      referredId: referralsTable.referredId,
      isPaying: referralsTable.isPaying,
      createdAt: referralsTable.createdAt,
      username: usersTable.username,
    }).from(referralsTable)
      .leftJoin(usersTable, eq(referralsTable.referredId, usersTable.id))
      .where(eq(referralsTable.referrerId, user.id));

    const payingCount = referrals.filter(r => r.isPaying).length;
    const goalProgress = payingCount;
    const siteUrl = process.env.FRONTEND_URL || "https://forbiddenfruit.vercel.app";
    const referralLink = `${siteUrl}/register?ref=${user.referralCode}`;

    res.json({
      referralCode: user.referralCode,
      referralCount: user.referralCount,
      referralLink,
      referredUsers: referrals.map(r => ({
        username: r.username || "Unknown",
        joinedAt: r.createdAt,
        isPaying: r.isPaying,
      })),
      goalProgress,
      nextReward: goalProgress >= 10 ? "Gold membership (achieved!)" : `Gold membership (${10 - goalProgress} more referrals)`,
    });
  } catch (err) {
    req.log.error({ err }, "Get referrals error");
    res.status(500).json({ error: "server_error", message: "Failed to get referrals" });
  }
});

router.post("/apply-promo", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      res.status(400).json({ error: "validation", message: "Promo code required" });
      return;
    }

    const promos = await db.select().from(promoCodesTable)
      .where(and(eq(promoCodesTable.code, code.toUpperCase()), eq(promoCodesTable.isActive, true)))
      .limit(1);

    if (!promos.length) {
      res.status(400).json({ error: "invalid_code", message: "Invalid or expired promo code" });
      return;
    }

    const promo = promos[0];
    if (promo.maxUses && promo.usedCount >= promo.maxUses) {
      res.status(400).json({ error: "code_exhausted", message: "Promo code has reached its usage limit" });
      return;
    }

    await db.update(promoCodesTable)
      .set({ usedCount: promo.usedCount + 1 })
      .where(eq(promoCodesTable.id, promo.id));

    res.json({ success: true, message: "Promo code applied successfully" });
  } catch (err) {
    req.log.error({ err }, "Apply promo error");
    res.status(500).json({ error: "server_error", message: "Failed to apply promo code" });
  }
});

export default router;
