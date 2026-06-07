import { pgTable, serial, text, integer, real, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const paymentMethodEnum = pgEnum("payment_method", ["cashapp", "giftcard", "crypto"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "approved", "rejected"]);
export const subscriptionAddonEnum = pgEnum("subscription_addon", ["weekly", "monthly", "annual"]);

export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  method: paymentMethodEnum("method").notNull(),
  membershipTier: text("membership_tier").notNull(),
  subscriptionAddon: subscriptionAddonEnum("subscription_addon"),
  amount: real("amount").notNull(),
  screenshotUrl: text("screenshot_url"),
  giftCardImageUrl: text("gift_card_image_url"),
  status: paymentStatusEnum("status").notNull().default("pending"),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof paymentsTable.$inferSelect;
