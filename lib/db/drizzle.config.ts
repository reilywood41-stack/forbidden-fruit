import { defineConfig } from "drizzle-kit";
import path from "path";

const dbUrl = process.env.NEON_URL || process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error("NEON_URL or DATABASE_URL must be set. Did you forget to provision a database?");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl,
  },
});
