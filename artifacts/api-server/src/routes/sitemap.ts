import { Router } from "express";
import { db } from "@workspace/db";
import { modelsTable } from "@workspace/db/schema";
import { isNotNull } from "drizzle-orm";

const router = Router();

const SITE_URL = process.env["FRONTEND_URL"] || "https://forbiddenfruit.app";

router.get("/sitemap.xml", async (_req, res) => {
  try {
    const rows = await db
      .select({ slug: modelsTable.slug })
      .from(modelsTable)
      .where(isNotNull(modelsTable.slug));

    const staticUrls = [
      { loc: "/", priority: "1.0", changefreq: "weekly" },
      { loc: "/membership", priority: "0.9", changefreq: "weekly" },
      { loc: "/posts", priority: "0.8", changefreq: "daily" },
    ];

    const modelUrls = rows
      .filter((r) => r.slug)
      .map((r) => ({
        loc: `/models/${r.slug}`,
        priority: "0.8",
        changefreq: "weekly",
      }));

    const allUrls = [...staticUrls, ...modelUrls];
    const lastmod = new Date().toISOString().split("T")[0];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls
  .map(
    (u) => `  <url>
    <loc>${SITE_URL}${u.loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(xml);
  } catch {
    res.status(500).json({ error: "Failed to generate sitemap" });
  }
});

export default router;
