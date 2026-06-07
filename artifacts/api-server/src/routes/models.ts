import { Router } from "express";
import { db, modelsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { optionalAuth, type AuthRequest } from "../lib/auth.js";

const router = Router();

function formatModel(m: any) {
  return {
    id: m.id,
    name: m.name,
    slug: m.slug ?? null,
    age: m.age ?? null,
    bio: m.bio,
    avatarUrl: m.avatarUrl,
    coverImageUrl: m.coverImageUrl ?? null,
    isAvailableForCalls: m.isAvailableForCalls === 1 || m.isAvailableForCalls === true,
    boostedLikes: m.boostedLikes ?? 0,
    callRates: {
      fifteenMin: m.fifteenMinRate ?? 50,
      thirtyMin: m.thirtyMinRate ?? 90,
      sixtyMin: m.sixtyMinRate ?? 150,
    },
    createdAt: m.createdAt,
  };
}

router.get("/", optionalAuth, async (req: AuthRequest, res) => {
  try {
    const models = await db.select().from(modelsTable);
    res.json({ models: models.map(formatModel) });
  } catch (err) {
    req.log.error({ err }, "Get models error");
    res.status(500).json({ error: "server_error", message: "Failed to get models" });
  }
});

export default router;
