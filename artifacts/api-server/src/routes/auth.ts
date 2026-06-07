import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  hashPassword,
  comparePassword,
  generateToken,
  generateReferralCode,
  generateResetToken,
  requireAuth,
  type AuthRequest,
} from "../lib/auth.js";
import { sendWelcomeEmail, sendAdminAlert } from "../lib/email.js";

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const { email, username, password, referralCode } = req.body;
    if (!email || !username || !password) {
      res.status(400).json({ error: "validation", message: "Email, username, and password are required" });
      return;
    }

    const existing = await db.select().from(usersTable)
      .where(eq(usersTable.email, email)).limit(1);
    if (existing.length) {
      res.status(400).json({ error: "conflict", message: "Email already registered" });
      return;
    }

    const existingUsername = await db.select().from(usersTable)
      .where(eq(usersTable.username, username)).limit(1);
    if (existingUsername.length) {
      res.status(400).json({ error: "conflict", message: "Username already taken" });
      return;
    }

    let referredBy: number | undefined;
    if (referralCode) {
      const referrer = await db.select().from(usersTable)
        .where(eq(usersTable.referralCode, referralCode)).limit(1);
      if (referrer.length) {
        referredBy = referrer[0].id;
      }
    }

    const passwordHash = hashPassword(password);
    const userReferralCode = generateReferralCode();
    const verificationToken = generateResetToken();

    const [newUser] = await db.insert(usersTable).values({
      email,
      username,
      passwordHash,
      referralCode: userReferralCode,
      referredBy,
      isEmailVerified: true,
      emailVerificationToken: verificationToken,
      membershipTier: "none",
    }).returning();

    if (referredBy) {
      await db.update(usersTable)
        .set({ referralCount: (await db.select({ rc: usersTable.referralCount }).from(usersTable).where(eq(usersTable.id, referredBy)).limit(1))[0].rc + 1 })
        .where(eq(usersTable.id, referredBy));
    }

    const token = generateToken(newUser.id);
    const { passwordHash: _, emailVerificationToken: __, passwordResetToken: ___, ...userPublic } = newUser;

    sendWelcomeEmail(email, username).catch(() => {});
    sendAdminAlert(
      `New sign-up: ${username}`,
      `A new user just registered on Forbidden Fruit.<br/><br/>
      <strong>Username:</strong> ${username}<br/>
      <strong>Email:</strong> ${email}<br/>
      <strong>Referred by:</strong> ${referredBy ? `User #${referredBy}` : "None"}<br/>
      <strong>Time:</strong> ${new Date().toLocaleString()}`
    ).catch(() => {});

    res.status(201).json({ user: userPublic, token });
  } catch (err) {
    req.log.error({ err }, "Register error");
    res.status(500).json({ error: "server_error", message: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "validation", message: "Email and password required" });
      return;
    }

    const users = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (!users.length || !comparePassword(password, users[0].passwordHash)) {
      res.status(401).json({ error: "invalid_credentials", message: "Invalid email or password" });
      return;
    }

    await db.update(usersTable).set({ lastActive: new Date() }).where(eq(usersTable.id, users[0].id));

    const token = generateToken(users[0].id);
    const { passwordHash: _, emailVerificationToken: __, passwordResetToken: ___, ...userPublic } = users[0];

    res.json({ user: userPublic, token });
  } catch (err) {
    req.log.error({ err }, "Login error");
    res.status(500).json({ error: "server_error", message: "Login failed" });
  }
});

router.post("/logout", (_req, res) => {
  res.json({ success: true, message: "Logged out" });
});

router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { passwordHash: _, emailVerificationToken: __, passwordResetToken: ___, ...userPublic } = user;
    res.json(userPublic);
  } catch (err) {
    req.log.error({ err }, "Get me error");
    res.status(500).json({ error: "server_error", message: "Failed to get user" });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: "validation", message: "Email required" });
      return;
    }

    const users = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (users.length) {
      const resetToken = generateResetToken();
      const expiry = new Date(Date.now() + 3600000);
      await db.update(usersTable)
        .set({ passwordResetToken: resetToken, passwordResetExpiry: expiry })
        .where(eq(usersTable.id, users[0].id));
    }

    res.json({ success: true, message: "If that email exists, a reset link has been sent" });
  } catch (err) {
    req.log.error({ err }, "Forgot password error");
    res.status(500).json({ error: "server_error", message: "Failed to send reset email" });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      res.status(400).json({ error: "validation", message: "Token and password required" });
      return;
    }

    const users = await db.select().from(usersTable)
      .where(eq(usersTable.passwordResetToken, token)).limit(1);

    if (!users.length || !users[0].passwordResetExpiry || users[0].passwordResetExpiry < new Date()) {
      res.status(400).json({ error: "invalid_token", message: "Invalid or expired reset token" });
      return;
    }

    const passwordHash = hashPassword(password);
    await db.update(usersTable)
      .set({ passwordHash, passwordResetToken: null, passwordResetExpiry: null })
      .where(eq(usersTable.id, users[0].id));

    res.json({ success: true, message: "Password reset successfully" });
  } catch (err) {
    req.log.error({ err }, "Reset password error");
    res.status(500).json({ error: "server_error", message: "Failed to reset password" });
  }
});

export default router;
