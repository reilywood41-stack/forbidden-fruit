import { pgTable, serial, text, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { modelsTable } from "./content";

export const postsTable = pgTable("posts", {
  id: serial("id").primaryKey(),
  modelId: integer("model_id").references(() => modelsTable.id),
  caption: text("caption"),
  mediaUrls: text("media_urls").notNull().default("[]"),
  mediaType: varchar("media_type", { length: 10 }).notNull().default("image"),
  tier: varchar("tier", { length: 10 }).notNull().default("free"),
  likeCount: integer("like_count").notNull().default(0),
  commentCount: integer("comment_count").notNull().default(0),
  isPinned: boolean("is_pinned").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const postLikesTable = pgTable("post_likes", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => postsTable.id),
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Post = typeof postsTable.$inferSelect;
