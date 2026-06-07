import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const dmsTable = pgTable("dms", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  modelId: integer("model_id"),
  fromAdmin: boolean("from_admin").notNull().default(false),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
