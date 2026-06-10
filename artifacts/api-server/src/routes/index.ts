import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import sitemapRouter from "./sitemap.js";
import authRouter from "./auth.js";
import usersRouter from "./users.js";
import contentRouter from "./content.js";
import modelsRouter from "./models.js";
import paymentsRouter from "./payments.js";
import referralsRouter from "./referrals.js";
import bookingsRouter from "./bookings.js";
import notificationsRouter from "./notifications.js";
import adminRouter from "./admin.js";
import storageRouter from "./storage.js";
import settingsRouter from "./settings.js";
import dmsRouter from "./dms.js";
import postsRouter from "./posts.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(sitemapRouter);
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/content", contentRouter);
router.use("/models", modelsRouter);
router.use("/payments", paymentsRouter);
router.use("/referrals", referralsRouter);
router.use("/bookings", bookingsRouter);
router.use("/notifications", notificationsRouter);
router.use("/admin", adminRouter);
router.use("/storage", storageRouter);
router.use("/settings", settingsRouter);
router.use("/dms", dmsRouter);
router.use("/posts", postsRouter);

export default router;
