import { logger } from "./logger.js";

const SITE_URL = process.env.FRONTEND_URL || "https://forbiddenfruit.vercel.app";

function brevoApiKey(): string  { return process.env.BREVO_API_KEY || ""; }
function fromEmail(): string    { return process.env.BREVO_FROM_EMAIL || process.env.ADMIN_EMAIL || ""; }
function adminEmail(): string   { return process.env.ADMIN_EMAIL || fromEmail(); }

export function isEmailEnabled(): boolean {
  return !!(brevoApiKey() && fromEmail());
}

async function sendMail(to: string, subject: string, html: string): Promise<void> {
  const apiKey = brevoApiKey();
  const from   = fromEmail();
  if (!apiKey || !from) {
    logger.warn("Email not configured — set BREVO_API_KEY and BREVO_FROM_EMAIL on Render");
    return;
  }
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": apiKey, "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        sender:      { name: "Forbidden Fruit", email: from },
        to:          [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      logger.error({ status: res.status, body, to, subject }, "Brevo email send failed");
    } else {
      logger.info({ to, subject }, "Email sent via Brevo");
    }
  } catch (err) {
    logger.error({ err, to, subject }, "Email send error");
  }
}

async function sendMailBatch(
  recipients: { email: string; name?: string }[],
  subject: string,
  html: string
): Promise<{ sent: number; failed: number }> {
  const apiKey = brevoApiKey();
  const from   = fromEmail();
  if (!apiKey || !from || recipients.length === 0) return { sent: 0, failed: recipients.length };
  try {
    // Use BCC so recipients cannot see each other's addresses
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": apiKey, "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        sender:      { name: "Forbidden Fruit", email: from },
        to:          [{ email: from, name: "Forbidden Fruit" }],  // send to self
        bcc:         recipients.map(r => ({ email: r.email, name: r.name || r.email })),
        subject,
        htmlContent: html,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      logger.error({ status: res.status, body, subject }, "Brevo batch send failed");
      return { sent: 0, failed: recipients.length };
    }
    logger.info({ count: recipients.length, subject }, "Batch email sent via Brevo (BCC)");
    return { sent: recipients.length, failed: 0 };
  } catch (err) {
    logger.error({ err, subject }, "Brevo batch send error");
    return { sent: 0, failed: recipients.length };
  }
}

/* ─── Template helpers ──────────────────────────────────────── */

const TIER_COLOR: Record<string, string> = {
  bronze: "#cd7f32",
  silver: "#c0c0c0",
  gold:   "#ffd700",
};

function base(preheader: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Forbidden Fruit</title>
</head>
<body style="margin:0;padding:0;background:#080808;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;">
<span style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}</span>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#080808;">
  <tr><td align="center" style="padding:32px 16px;">
    <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

      <!-- Logo -->
      <tr><td align="center" style="padding:0 0 24px;">
        <div style="display:inline-block;padding:12px 24px;border:1px solid #2a2a2a;border-radius:12px;background:#111;">
          <span style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:2px;">FORBIDDEN</span>
          <span style="font-size:22px;font-weight:900;color:#dc143c;letter-spacing:2px;"> FRUIT</span>
        </div>
      </td></tr>

      <!-- Card -->
      <tr><td style="background:#111;border:1px solid #222;border-radius:20px;overflow:hidden;">
        <!-- Red top bar -->
        <div style="height:4px;background:linear-gradient(90deg,#dc143c,#ff4466);"></div>
        <div style="padding:40px 36px;">
          ${body}
        </div>
      </td></tr>

      <!-- Footer links -->
      <tr><td align="center" style="padding:28px 0 8px;">
        <table cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding:0 12px;"><a href="${SITE_URL}/content" style="color:#dc143c;text-decoration:none;font-size:13px;font-weight:600;">The Vault</a></td>
            <td style="padding:0 12px;color:#333;">|</td>
            <td style="padding:0 12px;"><a href="${SITE_URL}/bookings" style="color:#dc143c;text-decoration:none;font-size:13px;font-weight:600;">Book a Call</a></td>
            <td style="padding:0 12px;color:#333;">|</td>
            <td style="padding:0 12px;"><a href="${SITE_URL}/membership" style="color:#dc143c;text-decoration:none;font-size:13px;font-weight:600;">VIP Tiers</a></td>
          </tr>
        </table>
        <p style="margin:16px 0 4px;color:#444;font-size:12px;">Forbidden Fruit &mdash; Members Only Platform</p>
        <p style="margin:0;color:#333;font-size:11px;">You're receiving this because you have an account on Forbidden Fruit.</p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function btn(label: string, url: string, color = "linear-gradient(135deg,#dc143c,#ff4466)"): string {
  return `<table cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;">
    <tr>
      <td style="background:${color};border-radius:10px;">
        <a href="${url}" style="display:inline-block;color:#fff;font-weight:bold;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;">${label}</a>
      </td>
    </tr>
  </table>`;
}

function h1(text: string): string {
  return `<h1 style="margin:0 0 20px;font-size:28px;font-weight:900;color:#fff;line-height:1.2;">${text}</h1>`;
}

function p(text: string, color = "#aaaaaa"): string {
  return `<p style="margin:0 0 16px;color:${color};font-size:15px;line-height:1.7;">${text}</p>`;
}

function badge(text: string, color: string): string {
  return `<span style="display:inline-block;background:${color}22;color:${color};font-weight:bold;text-transform:uppercase;font-size:13px;letter-spacing:1px;padding:5px 16px;border-radius:20px;border:1px solid ${color}55;">${text}</span>`;
}

function divider(): string {
  return `<div style="height:1px;background:linear-gradient(90deg,transparent,#333,transparent);margin:24px 0;"></div>`;
}

function infoRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 12px;color:#666;font-size:13px;vertical-align:top;white-space:nowrap;">${label}</td>
    <td style="padding:8px 12px;color:#fff;font-size:13px;font-weight:600;">${value}</td>
  </tr>`;
}

function infoTable(rows: string): string {
  return `<table cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#0a0a0a;border:1px solid #222;border-radius:12px;margin:16px 0;">
    ${rows}
  </table>`;
}

/* ─── Public email functions ─────────────────────────────────── */

export async function sendWelcomeEmail(to: string, username: string): Promise<void> {
  await sendMail(
    to,
    "Welcome to Forbidden Fruit 🍎",
    base(
      `Welcome, ${username}. Your access is active.`,
      `${h1(`Welcome, ${username}.`)}
      ${p("You've joined one of the most exclusive members-only platforms. Your account is live and ready to explore.", "#ccc")}
      ${divider()}
      <p style="margin:0 0 12px;color:#888;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">What's waiting for you</p>
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-bottom:20px;">
        <tr><td style="padding:6px 0;color:#aaa;font-size:14px;">🔓 &nbsp;<strong style="color:#fff;">Free content</strong> — available right now, no upgrade needed</td></tr>
        <tr><td style="padding:6px 0;color:#aaa;font-size:14px;">💎 &nbsp;<strong style="color:#fff;">VIP tiers</strong> — Bronze, Silver & Gold unlock exclusive content</td></tr>
        <tr><td style="padding:6px 0;color:#aaa;font-size:14px;">📞 &nbsp;<strong style="color:#fff;">Private calls</strong> — book a 1-on-1 session anytime</td></tr>
        <tr><td style="padding:6px 0;color:#aaa;font-size:14px;">🎁 &nbsp;<strong style="color:#fff;">Referral rewards</strong> — earn credits for every friend you bring</td></tr>
      </table>
      ${divider()}
      ${btn("Enter the Vault →", `${SITE_URL}/content`)}`
    )
  );
}

export async function sendPaymentApproved(to: string, username: string, tier: string, amount: number): Promise<void> {
  const color = TIER_COLOR[tier] || "#dc143c";
  await sendMail(
    to,
    `✅ Your ${tier.toUpperCase()} membership is now active!`,
    base(
      `Payment approved — ${tier} access is live.`,
      `${h1("Payment approved.")}
      ${badge(tier, color)}
      <br /><br />
      ${p(`Hi <strong style="color:#fff;">${username}</strong>, your payment has been verified and your membership is now fully active.`, "#ccc")}
      ${infoTable(`
        ${infoRow("Membership Tier", `<span style="color:${color};">${tier.toUpperCase()}</span>`)}
        ${infoRow("Amount Paid", `<span style="color:#4ade80;">$${amount}</span>`)}
        ${infoRow("Status", '<span style="color:#4ade80;">✓ Active</span>')}
        ${infoRow("Access", "Immediate — all tier content unlocked")}
      `)}
      ${divider()}
      <p style="margin:0 0 12px;color:#888;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Next steps</p>
      ${p(`Head to the Vault and explore all your <strong style="color:${color};">${tier}</strong> tier content. You can also book a private call any time from the Bookings page.`, "#aaa")}
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding-right:12px;">${btn("Go to Vault →", `${SITE_URL}/content`, `linear-gradient(135deg,${color},${color}99)`)}</td>
          <td>${btn("Book a Call →", `${SITE_URL}/bookings`, "linear-gradient(135deg,#222,#333)")}</td>
        </tr>
      </table>`
    )
  );
}

export async function sendPaymentRejected(to: string, username: string, tier: string, reason?: string): Promise<void> {
  await sendMail(
    to,
    "⚠️ Payment not approved — action required",
    base(
      "Your payment could not be verified. Please resubmit.",
      `${h1("Payment not approved.")}
      ${p(`Hi <strong style="color:#fff;">${username}</strong>, we were unable to verify your <strong style="color:#fff;">${tier.toUpperCase()}</strong> membership payment.`, "#ccc")}
      ${reason ? `<div style="background:#1a0505;border:1px solid #dc143c44;border-radius:12px;padding:16px 18px;margin:0 0 20px;">
        <p style="margin:0 0 6px;color:#888;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Reason for rejection</p>
        <p style="margin:0;color:#f87171;font-size:14px;line-height:1.6;">${reason}</p>
      </div>` : ""}
      ${divider()}
      <p style="margin:0 0 12px;color:#888;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">How to fix this</p>
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-bottom:20px;">
        <tr><td style="padding:5px 0;color:#aaa;font-size:14px;">1. &nbsp;Go to the Membership page and select your tier</td></tr>
        <tr><td style="padding:5px 0;color:#aaa;font-size:14px;">2. &nbsp;Complete the payment using the instructions provided</td></tr>
        <tr><td style="padding:5px 0;color:#aaa;font-size:14px;">3. &nbsp;Upload a clear screenshot or enter your gift card details</td></tr>
        <tr><td style="padding:5px 0;color:#aaa;font-size:14px;">4. &nbsp;Submit and wait for admin approval (usually within a few hours)</td></tr>
      </table>
      ${btn("Resubmit Payment →", `${SITE_URL}/membership`)}`
    )
  );
}

export async function sendBookingConfirmation(
  to: string,
  username: string,
  duration: number,
  amount: number,
  modelName?: string
): Promise<void> {
  await sendMail(
    to,
    "📞 Booking request received!",
    base(
      "Your call booking has been submitted.",
      `${h1("Booking received.")}
      ${p(`Hi <strong style="color:#fff;">${username}</strong>, your booking request has been submitted and is being reviewed. You'll receive a confirmation once it's approved.`, "#ccc")}
      ${infoTable(`
        ${infoRow("Duration", `${duration} minutes`)}
        ${infoRow("Amount", `$${amount}`)}
        ${modelName ? infoRow("Model", `<strong>${modelName}</strong>`) : ""}
        ${infoRow("Status", '<span style="color:#facc15;">⏳ Pending approval</span>')}
      `)}
      ${divider()}
      ${p("We'll reach out shortly to confirm the time and details of your call. Make sure your messages are open.", "#888")}
      ${btn("View Bookings →", `${SITE_URL}/bookings`)}`
    )
  );
}

export async function sendEmailBlast(
  recipients: { email: string; name: string }[],
  subject: string,
  message: string
): Promise<{ sent: number; failed: number }> {
  if (!isEmailEnabled() || recipients.length === 0) return { sent: 0, failed: 0 };
  const htmlBody = `${h1(subject)}
    ${message.split("\n\n").map(para => p(para.replace(/\n/g, "<br />"), "#ccc")).join("")}
    ${divider()}
    <table cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding-right:10px;">${btn("Visit the Vault →", `${SITE_URL}/content`)}</td>
        <td>${btn("Book a Call →", `${SITE_URL}/bookings`, "linear-gradient(135deg,#222,#333)")}</td>
      </tr>
    </table>`;
  return sendMailBatch(recipients, subject, base(subject, htmlBody));
}

export async function sendAdminAlert(subject: string, body: string): Promise<void> {
  const to = adminEmail();
  if (!to || !isEmailEnabled()) return;
  await sendMail(
    to,
    `[FF Alert] ${subject}`,
    base(
      subject,
      `${h1("Platform Alert")}
      ${p(body, "#cccccc")}
      ${divider()}
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding-right:10px;">${btn("Admin Panel →", `${SITE_URL}/admin`)}</td>
          <td>${btn("View Payments →", `${SITE_URL}/admin`, "linear-gradient(135deg,#222,#333)")}</td>
        </tr>
      </table>
      ${p("This is an automated alert from your Forbidden Fruit platform.", "#444")}`
    )
  );
}
