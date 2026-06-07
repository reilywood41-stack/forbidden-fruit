import { Router } from "express";
import { db, pool, usersTable, paymentsTable, contentTable, modelsTable, bookingsTable, notificationsTable, referralsTable, settingsTable } from "@workspace/db";
import { eq, desc, like, and, sql, inArray } from "drizzle-orm";
import { requireAdmin, type AuthRequest } from "../lib/auth.js";
import { sendPaymentApproved, sendPaymentRejected, sendEmailBlast, isEmailEnabled } from "../lib/email.js";

const router = Router();

router.use(requireAdmin);

function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function formatModel(m: any) {
  return {
    id: m.id,
    name: m.name,
    slug: m.slug ?? null,
    age: m.age,
    bio: m.bio,
    avatarUrl: m.avatarUrl,
    coverImageUrl: m.coverImageUrl ?? null,
    isAvailableForCalls: m.isAvailableForCalls === 1,
    callRates: {
      fifteenMin: m.fifteenMinRate,
      thirtyMin: m.thirtyMinRate,
      sixtyMin: m.sixtyMinRate,
    },
    createdAt: m.createdAt,
  };
}

router.get("/users", async (req: AuthRequest, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = db.select().from(usersTable);
    if (search) {
      query = query.where(like(usersTable.username, `%${search}%`)) as any;
    }

    const users = await (query as any).orderBy(desc(usersTable.createdAt)).limit(Number(limit)).offset(offset);
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(usersTable);

    const safeUsers = users.map((u: any) => {
      const { passwordHash, emailVerificationToken, passwordResetToken, ...safe } = u;
      return { ...safe, totalSpent: 0, videosWatched: u.videosWatched || 0 };
    });

    res.json({ users: safeUsers, total: Number(count), page: Number(page), limit: Number(limit) });
  } catch (err) {
    req.log.error({ err }, "Admin get users error");
    res.status(500).json({ error: "server_error", message: "Failed to get users" });
  }
});

router.get("/users/:id", async (req: AuthRequest, res) => {
  try {
    const users = await db.select().from(usersTable).where(eq(usersTable.id, Number(req.params.id))).limit(1);
    if (!users.length) {
      res.status(404).json({ error: "not_found", message: "User not found" });
      return;
    }

    const u = users[0];
    const { passwordHash, emailVerificationToken, passwordResetToken, ...safe } = u;

    const totalSpentResult = await db.select({ total: sql<number>`coalesce(sum(amount), 0)` })
      .from(paymentsTable)
      .where(and(eq(paymentsTable.userId, u.id), eq(paymentsTable.status, "approved")));

    res.json({ ...safe, totalSpent: Number(totalSpentResult[0]?.total || 0), videosWatched: u.videosWatched || 0 });
  } catch (err) {
    req.log.error({ err }, "Admin get user error");
    res.status(500).json({ error: "server_error", message: "Failed to get user" });
  }
});

router.put("/users/:id", async (req: AuthRequest, res) => {
  try {
    const { membershipTier, isAdmin, isEmailVerified, membershipExpiry, isActive } = req.body;
    const updates: any = { updatedAt: new Date() };
    if (membershipTier !== undefined) updates.membershipTier = membershipTier;
    if (isAdmin !== undefined) updates.isAdmin = isAdmin;
    if (isEmailVerified !== undefined) updates.isEmailVerified = isEmailVerified;
    if (membershipExpiry !== undefined) updates.membershipExpiry = new Date(membershipExpiry);
    if (isActive !== undefined) updates.isActive = isActive;

    const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, Number(req.params.id))).returning();
    const { passwordHash, emailVerificationToken, passwordResetToken, ...safe } = updated;
    res.json(safe);
  } catch (err) {
    req.log.error({ err }, "Admin update user error");
    res.status(500).json({ error: "server_error", message: "Failed to update user" });
  }
});

router.delete("/users/:id", async (req: AuthRequest, res) => {
  try {
    await db.delete(usersTable).where(eq(usersTable.id, Number(req.params.id)));
    res.json({ success: true, message: "User deleted" });
  } catch (err) {
    req.log.error({ err }, "Admin delete user error");
    res.status(500).json({ error: "server_error", message: "Failed to delete user" });
  }
});

router.get("/payments", async (req: AuthRequest, res) => {
  try {
    const { status } = req.query;
    let query = db.select({
      id: paymentsTable.id,
      userId: paymentsTable.userId,
      username: usersTable.username,
      email: usersTable.email,
      method: paymentsTable.method,
      membershipTier: paymentsTable.membershipTier,
      subscriptionAddon: paymentsTable.subscriptionAddon,
      amount: paymentsTable.amount,
      screenshotUrl: paymentsTable.screenshotUrl,
      giftCardImageUrl: paymentsTable.giftCardImageUrl,
      status: paymentsTable.status,
      adminNote: paymentsTable.adminNote,
      createdAt: paymentsTable.createdAt,
    }).from(paymentsTable)
      .leftJoin(usersTable, eq(paymentsTable.userId, usersTable.id));

    if (status) {
      query = query.where(eq(paymentsTable.status, status as any)) as any;
    }

    const payments = await (query as any).orderBy(desc(paymentsTable.createdAt));
    const [{ pendingCount }] = await db.select({ pendingCount: sql<number>`count(*)` })
      .from(paymentsTable).where(eq(paymentsTable.status, "pending"));

    res.json({ payments, total: payments.length, pendingCount: Number(pendingCount) });
  } catch (err) {
    req.log.error({ err }, "Admin get payments error");
    res.status(500).json({ error: "server_error", message: "Failed to get payments" });
  }
});

router.put("/payments/:id/pending", async (req: AuthRequest, res) => {
  try {
    const [payment] = await db.update(paymentsTable)
      .set({ status: "pending", adminNote: null, updatedAt: new Date() })
      .where(eq(paymentsTable.id, Number(req.params.id)))
      .returning();

    if (payment) {
      await db.insert(notificationsTable).values({
        userId: payment.userId,
        title: "Payment Under Review",
        message: `Your ${payment.membershipTier} membership payment is currently under system review.`,
        type: "payment",
      });
    }

    res.json({ success: true, message: "Payment reset to pending" });
  } catch (err) {
    req.log.error({ err }, "Admin reset payment error");
    res.status(500).json({ error: "server_error", message: "Failed to reset payment" });
  }
});

router.put("/payments/:id/approve", async (req: AuthRequest, res) => {
  try {
    const [payment] = await db.update(paymentsTable)
      .set({ status: "approved", updatedAt: new Date() })
      .where(eq(paymentsTable.id, Number(req.params.id)))
      .returning();

    if (payment) {
      const tierExpiry = new Date();
      tierExpiry.setMonth(tierExpiry.getMonth() + 1);
      await db.update(usersTable)
        .set({ membershipTier: payment.membershipTier as any, membershipExpiry: tierExpiry })
        .where(eq(usersTable.id, payment.userId));

      const user = await db.select().from(usersTable).where(eq(usersTable.id, payment.userId)).limit(1);
      if (user.length && user[0].referredBy) {
        const referral = await db.select().from(referralsTable)
          .where(and(eq(referralsTable.referrerId, user[0].referredBy), eq(referralsTable.referredId, payment.userId)))
          .limit(1);

        if (!referral.length) {
          await db.insert(referralsTable).values({
            referrerId: user[0].referredBy,
            referredId: payment.userId,
            isPaying: true,
          });
        } else if (!referral[0].isPaying) {
          await db.update(referralsTable).set({ isPaying: true })
            .where(eq(referralsTable.id, referral[0].id));
        }

        const payingReferrals = await db.select({ count: sql<number>`count(*)` })
          .from(referralsTable)
          .where(and(eq(referralsTable.referrerId, user[0].referredBy), eq(referralsTable.isPaying, true)));

        if (Number(payingReferrals[0].count) >= 10) {
          const goldExpiry = new Date();
          goldExpiry.setMonth(goldExpiry.getMonth() + 1);
          await db.update(usersTable)
            .set({ membershipTier: "gold", membershipExpiry: goldExpiry })
            .where(eq(usersTable.id, user[0].referredBy));

          await db.insert(notificationsTable).values({
            userId: user[0].referredBy,
            title: "Gold Membership Unlocked!",
            message: "Congratulations! You've referred 10 paying members and earned a free Gold membership!",
            type: "referral",
          });
        }
      }

      await db.insert(notificationsTable).values({
        userId: payment.userId,
        title: "Payment Approved",
        message: `Your ${payment.membershipTier} membership payment has been verified by our system. Enjoy your membership!`,
        type: "payment",
      });

      if (user.length) {
        sendPaymentApproved(user[0].email, user[0].username, payment.membershipTier, Number(payment.amount)).catch(() => {});
      }
    }

    res.json({ success: true, message: "Payment approved" });
  } catch (err) {
    req.log.error({ err }, "Admin approve payment error");
    res.status(500).json({ error: "server_error", message: "Failed to approve payment" });
  }
});

router.delete("/payments/:id/proof", async (req: AuthRequest, res) => {
  try {
    await db.update(paymentsTable)
      .set({ screenshotUrl: null, giftCardImageUrl: null, updatedAt: new Date() })
      .where(eq(paymentsTable.id, Number(req.params.id)));
    res.json({ success: true, message: "Payment proof deleted" });
  } catch (err) {
    req.log.error({ err }, "Admin delete proof error");
    res.status(500).json({ error: "server_error", message: "Failed to delete proof" });
  }
});

router.put("/payments/:id/reject", async (req: AuthRequest, res) => {
  try {
    const { reason } = req.body;
    const [payment] = await db.update(paymentsTable)
      .set({ status: "rejected", adminNote: reason, updatedAt: new Date() })
      .where(eq(paymentsTable.id, Number(req.params.id)))
      .returning();

    if (payment) {
      await db.insert(notificationsTable).values({
        userId: payment.userId,
        title: "Payment Rejected",
        message: `Your payment was rejected. Reason: ${reason || "Please contact support"}`,
        type: "payment",
      });

      const [user] = await db.select({ email: usersTable.email, username: usersTable.username })
        .from(usersTable).where(eq(usersTable.id, payment.userId)).limit(1);
      if (user) {
        sendPaymentRejected(user.email, user.username, payment.membershipTier, reason).catch(() => {});
      }
    }

    res.json({ success: true, message: "Payment rejected" });
  } catch (err) {
    req.log.error({ err }, "Admin reject payment error");
    res.status(500).json({ error: "server_error", message: "Failed to reject payment" });
  }
});

router.get("/content", async (req: AuthRequest, res) => {
  try {
    const items = await db.select({
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
      tags: contentTable.tags,
      viewCount: contentTable.viewCount,
      likeCount: contentTable.likeCount,
      boostedLikes: contentTable.boostedLikes,
      boostedViews: contentTable.boostedViews,
      commentCount: contentTable.commentCount,
      createdAt: contentTable.createdAt,
    }).from(contentTable)
      .leftJoin(modelsTable, eq(contentTable.modelId, modelsTable.id))
      .orderBy(desc(contentTable.createdAt));

    const formatted = items.map(item => ({
      ...item,
      imageUrls: item.imageUrls ? JSON.parse(item.imageUrls) : [],
      tags: item.tags ? JSON.parse(item.tags) : [],
      isPhoneAspect: item.isPhoneAspect ?? false,
      isLocked: false,
    }));

    res.json({ items: formatted, total: formatted.length, page: 1, limit: 1000, totalPages: 1 });
  } catch (err) {
    req.log.error({ err }, "Admin get content error");
    res.status(500).json({ error: "server_error", message: "Failed to get content" });
  }
});

router.post("/content", async (req: AuthRequest, res) => {
  try {
    const { title, description, type, tier, duration, thumbnailUrl, videoUrl, imageUrls, isPhoneAspect, modelId, tags } = req.body;
    if (!title || !type || !tier) {
      res.status(400).json({ error: "validation", message: "Title, type, and tier required" });
      return;
    }

    const [item] = await db.insert(contentTable).values({
      title,
      description,
      type,
      tier,
      duration: duration ? Number(duration) : null,
      thumbnailUrl,
      videoUrl,
      imageUrls: JSON.stringify(imageUrls || []),
      isPhoneAspect: !!isPhoneAspect,
      modelId: modelId || null,
      tags: JSON.stringify(tags || []),
    }).returning();

    res.status(201).json({
      ...item,
      imageUrls: JSON.parse(item.imageUrls),
      tags: JSON.parse(item.tags),
      isPhoneAspect: item.isPhoneAspect ?? false,
      isLocked: false,
    });
  } catch (err) {
    req.log.error({ err }, "Admin create content error");
    res.status(500).json({ error: "server_error", message: "Failed to create content" });
  }
});

router.put("/content/:id", async (req: AuthRequest, res) => {
  try {
    const { title, description, type, tier, thumbnailUrl, videoUrl, imageUrls, isPhoneAspect, modelId, tags } = req.body;
    const updates: any = { updatedAt: new Date() };
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (type !== undefined) updates.type = type;
    if (tier !== undefined) updates.tier = tier;
    if (thumbnailUrl !== undefined) updates.thumbnailUrl = thumbnailUrl;
    if (videoUrl !== undefined) updates.videoUrl = videoUrl;
    if (imageUrls !== undefined) updates.imageUrls = JSON.stringify(imageUrls);
    if (isPhoneAspect !== undefined) updates.isPhoneAspect = !!isPhoneAspect;
    if (modelId !== undefined) updates.modelId = modelId;
    if (tags !== undefined) updates.tags = JSON.stringify(tags);

    const [item] = await db.update(contentTable).set(updates)
      .where(eq(contentTable.id, Number(req.params.id))).returning();

    res.json({
      ...item,
      imageUrls: JSON.parse(item.imageUrls),
      tags: JSON.parse(item.tags),
      isPhoneAspect: item.isPhoneAspect ?? false,
      isLocked: false,
    });
  } catch (err) {
    req.log.error({ err }, "Admin update content error");
    res.status(500).json({ error: "server_error", message: "Failed to update content" });
  }
});

router.delete("/content/:id", async (req: AuthRequest, res) => {
  try {
    await db.delete(contentTable).where(eq(contentTable.id, Number(req.params.id)));
    res.json({ success: true, message: "Content deleted" });
  } catch (err) {
    req.log.error({ err }, "Admin delete content error");
    res.status(500).json({ error: "server_error", message: "Failed to delete content" });
  }
});

router.get("/bookings", async (req: AuthRequest, res) => {
  try {
    const bookings = await db.select({
      id: bookingsTable.id,
      userId: bookingsTable.userId,
      username: usersTable.username,
      email: usersTable.email,
      modelId: bookingsTable.modelId,
      modelName: modelsTable.name,
      duration: bookingsTable.duration,
      amount: bookingsTable.amount,
      telegramNumber: bookingsTable.telegramNumber,
      status: bookingsTable.status,
      paymentMethod: bookingsTable.paymentMethod,
      screenshotUrl: bookingsTable.screenshotUrl,
      scheduledAt: bookingsTable.scheduledAt,
      notes: bookingsTable.notes,
      createdAt: bookingsTable.createdAt,
    }).from(bookingsTable)
      .leftJoin(usersTable, eq(bookingsTable.userId, usersTable.id))
      .leftJoin(modelsTable, eq(bookingsTable.modelId, modelsTable.id))
      .orderBy(desc(bookingsTable.createdAt));

    res.json({ bookings, total: bookings.length });
  } catch (err) {
    req.log.error({ err }, "Admin get bookings error");
    res.status(500).json({ error: "server_error", message: "Failed to get bookings" });
  }
});

router.put("/bookings/:id/status", async (req: AuthRequest, res) => {
  try {
    const { status, scheduledAt } = req.body;
    const updates: any = { updatedAt: new Date(), status };
    if (scheduledAt) updates.scheduledAt = new Date(scheduledAt);

    await db.update(bookingsTable).set(updates).where(eq(bookingsTable.id, Number(req.params.id)));
    res.json({ success: true, message: "Booking status updated" });
  } catch (err) {
    req.log.error({ err }, "Admin update booking status error");
    res.status(500).json({ error: "server_error", message: "Failed to update booking status" });
  }
});

router.post("/notifications/send", async (req: AuthRequest, res) => {
  try {
    const { title, message, targetTier, type } = req.body;
    if (!title || !message) {
      res.status(400).json({ error: "validation", message: "Title and message required" });
      return;
    }

    let users;
    if (!targetTier || targetTier === "all") {
      users = await db.select({ id: usersTable.id }).from(usersTable);
    } else if (targetTier === "free") {
      users = await db.select({ id: usersTable.id }).from(usersTable)
        .where(eq(usersTable.membershipTier, "none" as any));
    } else {
      users = await db.select({ id: usersTable.id }).from(usersTable)
        .where(eq(usersTable.membershipTier, targetTier as any));
    }

    if (users.length > 0) {
      await db.insert(notificationsTable).values(
        users.map(u => ({
          userId: u.id,
          title,
          message,
          type: type || "system",
        }))
      );
    }

    res.json({ success: true, message: `Notification sent to ${users.length} users` });
  } catch (err) {
    req.log.error({ err }, "Admin send notification error");
    res.status(500).json({ error: "server_error", message: "Failed to send notification" });
  }
});

router.get("/email-campaign/status", async (_req: AuthRequest, res) => {
  res.json({ enabled: isEmailEnabled() });
});

router.post("/email-campaign/test", async (req: AuthRequest, res) => {
  try {
    if (!isEmailEnabled()) {
      res.status(503).json({ error: "not_configured", message: "Email not configured — add BREVO_API_KEY and BREVO_FROM_EMAIL to Render" });
      return;
    }
    const adminUser = await db.select({ email: usersTable.email, username: usersTable.username })
      .from(usersTable).where(eq(usersTable.isAdmin, true)).limit(1);
    const to = adminUser[0]?.email || process.env.ADMIN_EMAIL || process.env.BREVO_FROM_EMAIL || "";
    if (!to) {
      res.status(400).json({ error: "no_recipient", message: "No admin email found to send the test to" });
      return;
    }
    const { sendAdminAlert } = await import("../lib/email.js");
    await sendAdminAlert("Test email — email is working! ✅", `This is a test alert from your Forbidden Fruit platform.\n\nSent at: ${new Date().toISOString()}`);
    req.log.info({ to }, "Test email sent");
    res.json({ success: true, sentTo: to });
  } catch (err) {
    req.log.error({ err }, "Test email error");
    res.status(500).json({ error: "server_error", message: "Failed to send test email" });
  }
});

router.post("/email-campaign", async (req: AuthRequest, res) => {
  try {
    const { subject, message, targetTier } = req.body;
    if (!subject?.trim() || !message?.trim()) {
      res.status(400).json({ error: "validation", message: "Subject and message are required" });
      return;
    }

    let users: { email: string; username: string }[];
    const baseQuery = db.select({ email: usersTable.email, username: usersTable.username }).from(usersTable);

    if (!targetTier || targetTier === "all") {
      users = await baseQuery;
    } else if (targetTier === "none") {
      users = await baseQuery.where(eq(usersTable.membershipTier, "none" as any));
    } else {
      users = await baseQuery.where(eq(usersTable.membershipTier, targetTier as any));
    }

    const recipients = users.map(u => ({ email: u.email, name: u.username }));
    const { sent, failed } = await sendEmailBlast(recipients, subject, message);

    res.json({ success: true, sent, failed, total: recipients.length });
  } catch (err) {
    req.log.error({ err }, "Email campaign error");
    res.status(500).json({ error: "server_error", message: "Failed to send email campaign" });
  }
});

router.get("/analytics", async (req: AuthRequest, res) => {
  try {
    const [totalUsers] = await db.select({ count: sql<number>`count(*)` }).from(usersTable);
    const [totalRevenue] = await db.select({ total: sql<number>`coalesce(sum(amount), 0)` })
      .from(paymentsTable).where(eq(paymentsTable.status, "approved"));
    const [activeSubscriptions] = await db.select({ count: sql<number>`count(*)` })
      .from(usersTable).where(sql`membership_expiry > now()`);
    const [pendingPayments] = await db.select({ count: sql<number>`count(*)` })
      .from(paymentsTable).where(eq(paymentsTable.status, "pending"));
    const [totalContent] = await db.select({ count: sql<number>`count(*)` }).from(contentTable);
    const [totalBookings] = await db.select({ count: sql<number>`count(*)` }).from(bookingsTable);
    const [recentSignups] = await db.select({ count: sql<number>`count(*)` })
      .from(usersTable).where(sql`created_at > now() - interval '30 days'`);

    const membershipBreakdown = await db.select({
      tier: usersTable.membershipTier,
      count: sql<number>`count(*)`,
    }).from(usersTable).groupBy(usersTable.membershipTier);

    const breakdown = { bronze: 0, silver: 0, gold: 0 };
    membershipBreakdown.forEach(m => {
      if (m.tier in breakdown) breakdown[m.tier as keyof typeof breakdown] = Number(m.count);
    });

    const revenueByMonth = await db.select({
      month: sql<string>`to_char(created_at, 'YYYY-MM')`,
      revenue: sql<number>`coalesce(sum(amount), 0)`,
    }).from(paymentsTable)
      .where(and(eq(paymentsTable.status, "approved"), sql`created_at > now() - interval '12 months'`))
      .groupBy(sql`to_char(created_at, 'YYYY-MM')`)
      .orderBy(sql`to_char(created_at, 'YYYY-MM')`);

    res.json({
      totalUsers: Number(totalUsers.count),
      totalRevenue: Number(totalRevenue.total),
      activeSubscriptions: Number(activeSubscriptions.count),
      pendingPayments: Number(pendingPayments.count),
      totalContent: Number(totalContent.count),
      totalBookings: Number(totalBookings.count),
      recentSignups: Number(recentSignups.count),
      membershipBreakdown: breakdown,
      revenueByMonth,
    });
  } catch (err) {
    req.log.error({ err }, "Admin analytics error");
    res.status(500).json({ error: "server_error", message: "Failed to get analytics" });
  }
});

router.post("/models", async (req: AuthRequest, res) => {
  try {
    const { name, age, bio, avatarUrl, coverImageUrl, isAvailableForCalls, callRates, fifteenMinRate, thirtyMinRate, sixtyMinRate } = req.body;
    if (!name) {
      res.status(400).json({ error: "validation", message: "Model name required" });
      return;
    }

    const r15 = callRates?.fifteenMin ?? fifteenMinRate ?? 50;
    const r30 = callRates?.thirtyMin ?? thirtyMinRate ?? 90;
    const r60 = callRates?.sixtyMin ?? sixtyMinRate ?? 150;

    const baseSlug = generateSlug(name);
    let slug = baseSlug;
    const existing = await db.select({ slug: modelsTable.slug }).from(modelsTable).where(eq(modelsTable.slug, slug));
    if (existing.length) slug = `${baseSlug}-${Date.now()}`;

    const [model] = await db.insert(modelsTable).values({
      name,
      slug,
      age: age ? Number(age) : null,
      bio,
      avatarUrl,
      coverImageUrl: coverImageUrl || null,
      isAvailableForCalls: isAvailableForCalls ? 1 : 0,
      fifteenMinRate: r15,
      thirtyMinRate: r30,
      sixtyMinRate: r60,
    }).returning();

    res.status(201).json(formatModel(model));
  } catch (err) {
    req.log.error({ err }, "Admin create model error");
    res.status(500).json({ error: "server_error", message: "Failed to create model" });
  }
});

router.put("/models/:id", async (req: AuthRequest, res) => {
  try {
    const { name, age, bio, avatarUrl, coverImageUrl, isAvailableForCalls, fifteenMinRate, thirtyMinRate, sixtyMinRate } = req.body;
    const updates: any = {};
    if (name !== undefined) { updates.name = name; updates.slug = generateSlug(name); }
    if (age !== undefined) updates.age = age ? Number(age) : null;
    if (bio !== undefined) updates.bio = bio;
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
    if (coverImageUrl !== undefined) updates.coverImageUrl = coverImageUrl;
    if (isAvailableForCalls !== undefined) updates.isAvailableForCalls = isAvailableForCalls ? 1 : 0;
    if (fifteenMinRate !== undefined) updates.fifteenMinRate = fifteenMinRate;
    if (thirtyMinRate !== undefined) updates.thirtyMinRate = thirtyMinRate;
    if (sixtyMinRate !== undefined) updates.sixtyMinRate = sixtyMinRate;

    const [model] = await db.update(modelsTable).set(updates)
      .where(eq(modelsTable.id, Number(req.params.id))).returning();

    res.json(formatModel(model));
  } catch (err) {
    req.log.error({ err }, "Admin update model error");
    res.status(500).json({ error: "server_error", message: "Failed to update model" });
  }
});

router.delete("/models/:id", async (req: AuthRequest, res) => {
  try {
    await db.delete(modelsTable).where(eq(modelsTable.id, Number(req.params.id)));
    res.json({ success: true, message: "Model deleted" });
  } catch (err) {
    req.log.error({ err }, "Admin delete model error");
    res.status(500).json({ error: "server_error", message: "Failed to delete model" });
  }
});

router.put("/models/:id/boost-likes", async (req: AuthRequest, res) => {
  try {
    const { boostedLikes } = req.body;
    const val = Math.max(0, Number(boostedLikes) || 0);
    await db.update(modelsTable).set({ boostedLikes: val }).where(eq(modelsTable.id, Number(req.params.id)));
    res.json({ success: true, boostedLikes: val });
  } catch (err) {
    req.log.error({ err }, "Admin boost model likes error");
    res.status(500).json({ error: "server_error", message: "Failed to update boosted likes" });
  }
});

router.put("/content/:id/boost-likes", async (req: AuthRequest, res) => {
  try {
    const { boostedLikes } = req.body;
    const val = Math.max(0, Number(boostedLikes) || 0);
    await db.update(contentTable).set({ boostedLikes: val }).where(eq(contentTable.id, Number(req.params.id)));
    res.json({ success: true, boostedLikes: val });
  } catch (err) {
    req.log.error({ err }, "Admin boost content likes error");
    res.status(500).json({ error: "server_error", message: "Failed to update boosted likes" });
  }
});

router.put("/content/:id/boost-views", async (req: AuthRequest, res) => {
  try {
    const { boostedViews } = req.body;
    const val = Math.max(0, Number(boostedViews) || 0);
    await db.update(contentTable).set({ boostedViews: val }).where(eq(contentTable.id, Number(req.params.id)));
    res.json({ success: true, boostedViews: val });
  } catch (err) {
    req.log.error({ err }, "Admin boost content views error");
    res.status(500).json({ error: "server_error", message: "Failed to update boosted views" });
  }
});

const SETTING_DEFAULTS: Record<string, string> = {
  payment_methods: "giftcard",
  cashapp_tag: "",
  crypto_address: "",
  accepted_gift_cards: "Amazon,Apple,Visa,Google Play",
  accepted_crypto: "USDT,Bitcoin,USDC",
  gift_card_instructions: "",
  crypto_qr_url: "",
};

router.get("/settings", async (req: AuthRequest, res) => {
  try {
    const rows = await db.select().from(settingsTable);
    const result: Record<string, string> = { ...SETTING_DEFAULTS };
    for (const row of rows) {
      result[row.key] = row.value;
    }
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Admin get settings error");
    res.status(500).json({ error: "server_error", message: "Failed to get settings" });
  }
});

// ─── Posts (admin feed management) ───────────────────────────────────────────

router.get("/posts", async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, m.name as model_name, m.avatar_url as model_avatar
      FROM posts p
      LEFT JOIN models m ON m.id = p.model_id
      ORDER BY p.is_pinned DESC, p.created_at DESC
      LIMIT 200
    `);
    res.json({
      posts: result.rows.map((p: any) => ({
        ...p,
        mediaUrls: JSON.parse(p.media_urls || "[]"),
        likeCount: Number(p.like_count || 0),
        isPinned: Boolean(p.is_pinned),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Admin get posts error");
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/posts", async (req: AuthRequest, res) => {
  try {
    const { modelId, caption, mediaUrls, mediaType, tier, isPinned } = req.body;
    const urls = JSON.stringify(Array.isArray(mediaUrls) ? mediaUrls : []);
    const result = await pool.query(
      `INSERT INTO posts (model_id, caption, media_urls, media_type, tier, is_pinned)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [modelId || null, caption || "", urls, mediaType || "image", tier || "free", isPinned ?? false]
    );
    res.json({ post: result.rows[0] });
  } catch (err) {
    req.log.error({ err }, "Admin create post error");
    res.status(500).json({ error: "server_error" });
  }
});

router.put("/posts/:id", async (req: AuthRequest, res) => {
  try {
    const { modelId, caption, mediaUrls, mediaType, tier, isPinned } = req.body;
    const urls = JSON.stringify(Array.isArray(mediaUrls) ? mediaUrls : []);
    const result = await pool.query(
      `UPDATE posts SET model_id=$1, caption=$2, media_urls=$3, media_type=$4, tier=$5, is_pinned=$6
       WHERE id=$7 RETURNING *`,
      [modelId || null, caption || "", urls, mediaType || "image", tier || "free", isPinned ?? false, Number(req.params.id)]
    );
    res.json({ post: result.rows[0] });
  } catch (err) {
    req.log.error({ err }, "Admin update post error");
    res.status(500).json({ error: "server_error" });
  }
});

router.delete("/posts/:id", async (req: AuthRequest, res) => {
  try {
    await pool.query("DELETE FROM posts WHERE id=$1", [Number(req.params.id)]);
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Admin delete post error");
    res.status(500).json({ error: "server_error" });
  }
});

// ─── Settings ────────────────────────────────────────────────────────────────

router.put("/settings", async (req: AuthRequest, res) => {
  try {
    const { payment_methods, cashapp_tag, crypto_address, accepted_gift_cards, accepted_crypto, gift_card_instructions, crypto_qr_url } = req.body;
    const updates: Array<{ key: string; value: string }> = [];

    if (payment_methods !== undefined) updates.push({ key: "payment_methods", value: String(payment_methods) });
    if (cashapp_tag !== undefined) updates.push({ key: "cashapp_tag", value: String(cashapp_tag) });
    if (crypto_address !== undefined) updates.push({ key: "crypto_address", value: String(crypto_address) });
    if (accepted_gift_cards !== undefined) updates.push({ key: "accepted_gift_cards", value: String(accepted_gift_cards) });
    if (accepted_crypto !== undefined) updates.push({ key: "accepted_crypto", value: String(accepted_crypto) });
    if (gift_card_instructions !== undefined) updates.push({ key: "gift_card_instructions", value: String(gift_card_instructions) });
    if (crypto_qr_url !== undefined) updates.push({ key: "crypto_qr_url", value: String(crypto_qr_url) });

    for (const { key, value } of updates) {
      await db.insert(settingsTable)
        .values({ key, value, updatedAt: new Date() })
        .onConflictDoUpdate({ target: settingsTable.key, set: { value, updatedAt: new Date() } });
    }

    res.json({ success: true, message: "Settings updated" });
  } catch (err) {
    req.log.error({ err }, "Admin update settings error");
    res.status(500).json({ error: "server_error", message: "Failed to update settings" });
  }
});

export default router;
