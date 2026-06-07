import { Router } from "express";
import { db, paymentsTable, usersTable, notificationsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth.js";
import { sendAdminAlert } from "../lib/email.js";

const router = Router();

function calcAmount(tier: string, addon?: string): number {
  const tierPrices: Record<string, number> = { bronze: 10, silver: 30, gold: 50 };
  const addonPrices: Record<string, number> = { weekly: 50, monthly: 100, annual: 500 };
  return (tierPrices[tier] || 0) + (addon ? (addonPrices[addon] || 0) : 0);
}

router.post("/submit", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { method, membershipTier, subscriptionAddon, amount, screenshotUrl, giftCardImageUrl } = req.body;
    if (!method || !membershipTier) {
      res.status(400).json({ error: "validation", message: "Payment method and tier required" });
      return;
    }

    const calculatedAmount = amount || calcAmount(membershipTier, subscriptionAddon);

    const [payment] = await db.insert(paymentsTable).values({
      userId: req.userId!,
      method,
      membershipTier,
      subscriptionAddon,
      amount: calculatedAmount,
      screenshotUrl,
      giftCardImageUrl,
      status: "pending",
    }).returning();

    await db.insert(notificationsTable).values({
      userId: req.userId!,
      title: "Payment Submitted",
      message: `Your ${membershipTier} membership payment of $${calculatedAmount} has been submitted and is awaiting approval.`,
      type: "payment",
    });

    const userRows = await db.select({ username: usersTable.username, email: usersTable.email })
      .from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    const u = userRows[0];
    sendAdminAlert(
      `New payment submitted — $${calculatedAmount}`,
      `A member just submitted a payment.<br/><br/>
      <strong>User:</strong> ${u?.username || "Unknown"} (${u?.email || ""})<br/>
      <strong>Tier:</strong> ${membershipTier}<br/>
      <strong>Amount:</strong> $${calculatedAmount}<br/>
      <strong>Method:</strong> ${method}<br/>
      <strong>Time:</strong> ${new Date().toLocaleString()}<br/><br/>
      <a href="${process.env.FRONTEND_URL || ""}/admin" style="color:#dc143c;">Review in Admin Panel →</a>`
    ).catch(() => {});

    res.status(201).json(payment);
  } catch (err) {
    req.log.error({ err }, "Submit payment error");
    res.status(500).json({ error: "server_error", message: "Failed to submit payment" });
  }
});

router.get("/my", requireAuth, async (req: AuthRequest, res) => {
  try {
    const payments = await db.select().from(paymentsTable)
      .where(eq(paymentsTable.userId, req.userId!))
      .orderBy(desc(paymentsTable.createdAt));

    res.json({ payments, total: payments.length });
  } catch (err) {
    req.log.error({ err }, "Get my payments error");
    res.status(500).json({ error: "server_error", message: "Failed to get payments" });
  }
});

export default router;
