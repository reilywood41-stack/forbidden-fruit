import { pgTable, serial, text, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contentTypeEnum = pgEnum("content_type", ["video", "image", "gallery"]);
export const contentTierEnum = pgEnum("content_tier", ["free", "bronze", "silver", "gold"]);

export const modelsTable = pgTable("models", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique(),
  age: integer("age"),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  coverImageUrl: text("cover_image_url"),
  isAvailableForCalls: integer("is_available_for_calls").notNull().default(1),
  fifteenMinRate: integer("fifteen_min_rate").notNull().default(50),
  thirtyMinRate: integer("thirty_min_rate").notNull().default(80),
  sixtyMinRate: integer("sixty_min_rate").notNull().default(150),
  boostedLikes: integer("boosted_likes").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const contentTable = pgTable("content", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  type: contentTypeEnum("type").notNull(),
  tier: contentTierEnum("tier").notNull(),
  duration: integer("duration"),
  thumbnailUrl: text("thumbnail_url"),
  videoUrl: text("video_url"),
  imageUrls: text("image_urls").notNull().default("[]"),
  isPhoneAspect: boolean("is_phone_aspect").notNull().default(false),
  modelId: integer("model_id").references(() => modelsTable.id),
  tags: text("tags").notNull().default("[]"),
  viewCount: integer("view_count").notNull().default(0),
  likeCount: integer("like_count").notNull().default(0),
  boostedLikes: integer("boosted_likes").notNull().default(0),
  boostedViews: integer("boosted_views").notNull().default(0),
  commentCount: integer("comment_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const commentsTable = pgTable("comments", {
  id: serial("id").primaryKey(),
  contentId: integer("content_id").notNull().references(() => contentTable.id),
  userId: integer("user_id").notNull(),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const contentLikesTable = pgTable("content_likes", {
  id: serial("id").primaryKey(),
  contentId: integer("content_id").notNull().references(() => contentTable.id),
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertContentSchema = createInsertSchema(contentTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertContent = z.infer<typeof insertContentSchema>;
export type Content = typeof contentTable.$inferSelect;

export const insertModelSchema = createInsertSchema(modelsTable).omit({ id: true, createdAt: true });
export type InsertModel = z.infer<typeof insertModelSchema>;
export type Model = typeof modelsTable.$inferSelect;
