import app from "./app";
import { logger } from "./lib/logger";
import { pool } from "@workspace/db";

async function runMigrations() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
    `);
    await pool.query(`
      DO $$ BEGIN
        ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'crypto';
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await pool.query(`
      ALTER TABLE content ADD COLUMN IF NOT EXISTS boosted_likes INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE content ADD COLUMN IF NOT EXISTS boosted_views INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE models  ADD COLUMN IF NOT EXISTS boosted_likes INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE models  ADD COLUMN IF NOT EXISTS slug TEXT;
      ALTER TABLE models  ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
      ALTER TABLE dms     ADD COLUMN IF NOT EXISTS model_id INTEGER;
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        model_id INTEGER REFERENCES models(id),
        caption TEXT,
        media_urls TEXT NOT NULL DEFAULT '[]',
        media_type VARCHAR(10) NOT NULL DEFAULT 'image',
        tier VARCHAR(10) NOT NULL DEFAULT 'free',
        like_count INTEGER NOT NULL DEFAULT 0,
        comment_count INTEGER NOT NULL DEFAULT 0,
        is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS post_likes (
        id SERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(post_id, user_id)
      );
    `);
    logger.info("DB migrations complete");
  } catch (err) {
    logger.error({ err }, "DB migration failed — continuing anyway");
  }
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

runMigrations().then(() => {
  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
});
