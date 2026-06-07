import { Router } from "express";
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const DEFAULTS: Record<string, string> = {
  payment_methods: "giftcard",
  cashapp_tag: "",
  crypto_address: "",
  accepted_gift_cards: "Amazon,Apple,Visa,Google Play",
  accepted_crypto: "USDT,Bitcoin,USDC",
  gift_card_instructions: "",
  crypto_qr_url: "",
};

router.get("/", async (req, res) => {
  try {
    const rows = await db.select().from(settingsTable);
    const result: Record<string, string> = { ...DEFAULTS };
    for (const row of rows) {
      result[row.key] = row.value;
    }
    res.json(result);
  } catch (err: any) {
    req.log?.error({ err }, "Get settings error");
    res.json(DEFAULTS);
  }
});

export default router;
