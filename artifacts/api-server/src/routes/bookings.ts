import { Router } from "express";
import { db, bookingsTable, modelsTable, notificationsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth.js";
import { sendAdminAlert } from "../lib/email.js";

const router = Router();

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const bookings = await db.select({
      id: bookingsTable.id,
      userId: bookingsTable.userId,
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
      .leftJoin(modelsTable, eq(bookingsTable.modelId, modelsTable.id))
      .where(eq(bookingsTable.userId, req.userId!))
      .orderBy(desc(bookingsTable.createdAt));

    res.json({ bookings, total: bookings.length });
  } catch (err) {
    req.log.error({ err }, "Get bookings error");
    res.status(500).json({ error: "server_error", message: "Failed to get bookings" });
  }
});

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { modelId, duration, telegramNumber, paymentMethod, screenshotUrl, notes } = req.body;
    if (!modelId || !duration || !telegramNumber || !paymentMethod) {
      res.status(400).json({ error: "validation", message: "modelId, duration, telegramNumber, and paymentMethod are required" });
      return;
    }

    const models = await db.select().from(modelsTable).where(eq(modelsTable.id, Number(modelId))).limit(1);
    if (!models.length) {
      res.status(404).json({ error: "not_found", message: "Model not found" });
      return;
    }

    const model = models[0];
    const rateMap: Record<number, number> = {
      15: model.fifteenMinRate,
      30: model.thirtyMinRate,
      60: model.sixtyMinRate,
    };
    const amount = rateMap[Number(duration)] || model.fifteenMinRate;

    const [booking] = await db.insert(bookingsTable).values({
      userId: req.userId!,
      modelId: Number(modelId),
      duration: Number(duration),
      amount,
      telegramNumber,
      paymentMethod,
      screenshotUrl,
      notes,
      status: "pending",
    }).returning();

    await db.insert(notificationsTable).values({
      userId: req.userId!,
      title: "Booking Submitted",
      message: `Your video call booking with ${model.name} (${duration} min) has been submitted and is pending confirmation.`,
      type: "booking",
    });

    const userRows = await db.select({ username: usersTable.username, email: usersTable.email })
      .from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    const u = userRows[0];
    sendAdminAlert(
      `New booking — ${model.name} (${duration} min)`,
      `A member just booked a video call.<br/><br/>
      <strong>User:</strong> ${u?.username || "Unknown"} (${u?.email || ""})<br/>
      <strong>Model:</strong> ${model.name}<br/>
      <strong>Duration:</strong> ${duration} min<br/>
      <strong>Amount:</strong> $${amount}<br/>
      <strong>Telegram:</strong> ${telegramNumber}<br/>
      <strong>Payment:</strong> ${paymentMethod}<br/>
      <strong>Time:</strong> ${new Date().toLocaleString()}<br/><br/>
      <a href="${process.env.FRONTEND_URL || ""}/admin" style="color:#dc143c;">Review in Admin Panel →</a>`
    ).catch(() => {});

    res.status(201).json({ ...booking, modelName: model.name });
  } catch (err) {
    req.log.error({ err }, "Create booking error");
    res.status(500).json({ error: "server_error", message: "Failed to create booking" });
  }
});

export default router;
