import { logger } from "./logger.js";

const SITE_URL = process.env.FRONTEND_URL || "https://forbiddenfruit.app";
const LOGO_URL = `${SITE_URL}/og-image.jpg`;

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
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": apiKey, "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        sender:      { name: "Forbidden Fruit", email: from },
        to:          [{ email: from, name: "Forbidden Fruit" }],
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
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<meta http-equiv="X-UA-Compatible" content="IE=edge"/>
<meta name="color-scheme" content="dark"/>
<title>Forbidden Fruit</title>
<!--[if mso]><style>table{border-collapse:collapse;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background:#080808;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<span style="display:none;font-size:1px;color:#080808;max-height:0;overflow:hidden;mso-hide:all;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</span>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#080808;min-height:100vh;">
  <tr><td align="center" style="padding:40px 16px 60px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

      <!-- ── Logo header ── -->
      <tr><td align="center" style="padding:0 0 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="background:#0f0f0f;border:1px solid #2a2a2a;border-radius:16px;padding:16px 28px;">
              <!-- Decorative bar -->
              <div style="height:3px;background:linear-gradient(90deg,#dc143c,#ff4466,#dc143c);border-radius:2px;margin-bottom:14px;"></div>
              <!-- Brand name -->
              <div style="text-align:center;">
                <span style="font-size:11px;font-weight:700;color:#666;letter-spacing:4px;text-transform:uppercase;display:block;margin-bottom:6px;">Members Only</span>
                <span style="font-size:26px;font-weight:900;color:#ffffff;letter-spacing:3px;line-height:1;">FORBIDDEN</span>
                <span style="font-size:26px;font-weight:900;color:#dc143c;letter-spacing:3px;line-height:1;"> FRUIT</span>
              </div>
            </td>
          </tr>
        </table>
      </td></tr>

      <!-- ── Main card ── -->
      <tr><td style="background:#0f0f0f;border:1px solid #1e1e1e;border-radius:24px;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,.6);">
        <!-- Crimson gradient top bar -->
        <div style="height:5px;background:linear-gradient(90deg,#8b0000,#dc143c,#ff4466,#dc143c,#8b0000);"></div>
        <!-- Content area -->
        <div style="padding:44px 40px 40px;">
          ${body}
        </div>
        <!-- Bottom bar -->
        <div style="height:1px;background:linear-gradient(90deg,transparent,#1e1e1e,transparent);"></div>
        <div style="padding:20px 40px;background:#0a0a0a;">
          <p style="margin:0;color:#333;font-size:11px;text-align:center;line-height:1.6;">You're receiving this because you have an account on Forbidden Fruit.<br/>© ${new Date().getFullYear()} Forbidden Fruit — All rights reserved.</p>
        </div>
      </td></tr>

      <!-- ── Footer nav ── -->
      <tr><td align="center" style="padding:28px 0 8px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding:0 14px;"><a href="${SITE_URL}/content" style="color:#dc143c;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;">The Vault</a></td>
            <td style="padding:0 4px;color:#2a2a2a;font-size:10px;">●</td>
            <td style="padding:0 14px;"><a href="${SITE_URL}/bookings" style="color:#dc143c;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;">Book a Call</a></td>
            <td style="padding:0 4px;color:#2a2a2a;font-size:10px;">●</td>
            <td style="padding:0 14px;"><a href="${SITE_URL}/membership" style="color:#dc143c;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;">VIP Tiers</a></td>
          </tr>
        </table>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function btn(label: string, url: string, color = "linear-gradient(135deg,#dc143c,#ff4466)"): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;">
    <tr>
      <td style="background:${color};border-radius:12px;box-shadow:0 4px 15px rgba(220,20,60,0.35);">
        <a href="${url}" style="display:inline-block;color:#fff;font-weight:700;text-decoration:none;padding:15px 36px;border-radius:12px;font-size:14px;letter-spacing:.5px;">${label}</a>
      </td>
    </tr>
  </table>`;
}

function h1(text: string): string {
  return `<h1 style="margin:0 0 20px;font-size:30px;font-weight:900;color:#fff;line-height:1.2;letter-spacing:-.5px;">${text}</h1>`;
}

function p(text: string, color = "#999999"): string {
  return `<p style="margin:0 0 16px;color:${color};font-size:15px;line-height:1.8;">${text}</p>`;
}

function badge(text: string, color: string): string {
  return `<span style="display:inline-block;background:${color}1a;color:${color};font-weight:800;text-transform:uppercase;font-size:12px;letter-spacing:2px;padding:6px 18px;border-radius:30px;border:1px solid ${color}44;">${text}</span>`;
}

function divider(): string {
  return `<div style="height:1px;background:linear-gradient(90deg,transparent,#222,transparent);margin:28px 0;"></div>`;
}

function infoRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:10px 16px;color:#555;font-size:13px;vertical-align:top;white-space:nowrap;border-bottom:1px solid #111;">${label}</td>
    <td style="padding:10px 16px;color:#eee;font-size:13px;font-weight:600;border-bottom:1px solid #111;">${value}</td>
  </tr>`;
}

function infoTable(rows: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#080808;border:1px solid #1e1e1e;border-radius:14px;overflow:hidden;margin:18px 0;">
    ${rows}
  </table>`;
}

function highlight(text: string): string {
  return `<div style="background:linear-gradient(135deg,#1a0408,#120208);border:1px solid #dc143c33;border-radius:14px;padding:18px 20px;margin:16px 0;">
    <p style="margin:0;color:#f0f0f0;font-size:14px;line-height:1.7;">${text}</p>
  </div>`;
}

function featureList(items: string[]): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-bottom:20px;">
    ${items.map(i => `<tr><td style="padding:6px 0;color:#aaa;font-size:14px;line-height:1.6;">${i}</td></tr>`).join("")}
  </table>`;
}

/* ─── Public email functions ─────────────────────────────────── */

export async function sendWelcomeEmail(to: string, username: string): Promise<void> {
  await sendMail(
    to,
    "Welcome to Forbidden Fruit 🍎 — Your Access is Live",
    base(
      `Welcome, ${username}. Your exclusive access starts now.`,
      `${h1(`Welcome, ${username}.`)}
      ${p(`You've joined one of the most exclusive members-only platforms. Your account is <strong style="color:#4ade80;">live and ready</strong> to explore.`, "#ccc")}
      ${divider()}
      <p style="margin:0 0 14px;color:#555;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">What's waiting for you</p>
      ${featureList([
        "🔓 &nbsp;<strong style=\"color:#fff;\">Free content</strong> — available right now, no upgrade needed",
        "💎 &nbsp;<strong style=\"color:#fff;\">VIP tiers</strong> — Bronze, Silver &amp; Gold unlock exclusive content",
        "📞 &nbsp;<strong style=\"color:#fff;\">Private calls</strong> — book a 1-on-1 session anytime",
        "💬 &nbsp;<strong style=\"color:#fff;\">Direct messages</strong> — chat directly with your favourite models",
        "🎁 &nbsp;<strong style=\"color:#fff;\">Referral rewards</strong> — earn credits for every friend you bring",
      ])}
      ${divider()}
      ${highlight("To unlock premium content, visit the Membership page and choose your tier — Bronze, Silver, or Gold. Payments are reviewed within a few hours.")}
      ${btn("Enter the Vault →", `${SITE_URL}/content`)}`
    )
  );
}

export async function sendPaymentApproved(to: string, username: string, tier: string, amount: number): Promise<void> {
  const color = TIER_COLOR[tier] || "#dc143c";
  await sendMail(
    to,
    `✅ Your ${tier.toUpperCase()} membership is now active — Welcome to the inner circle`,
    base(
      `Payment approved — ${tier} access is live. Welcome to the inner circle.`,
      `${h1("Payment approved.")}
      ${badge(tier, color)}
      <br /><br />
      ${p(`Hi <strong style="color:#fff;">${username}</strong>, your payment has been verified and your <strong style="color:${color};">${tier.toUpperCase()}</strong> membership is now fully active.`, "#ccc")}
      ${infoTable(`
        ${infoRow("Membership Tier", `<span style="color:${color};font-weight:800;">${tier.toUpperCase()}</span>`)}
        ${infoRow("Amount Paid", `<span style="color:#4ade80;">$${amount}</span>`)}
        ${infoRow("Status", '<span style="color:#4ade80;">✓ Active</span>')}
        ${infoRow("Access", "Immediate — all tier content unlocked")}
      `)}
      ${divider()}
      <p style="margin:0 0 14px;color:#555;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">Next steps</p>
      ${p(`Head to the Vault and explore all your <strong style="color:${color};">${tier}</strong> content. You can also book a private call any time from the Bookings page.`, "#aaa")}
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding-right:12px;">${btn("Go to Vault →", `${SITE_URL}/content`, `linear-gradient(135deg,${color},${color}aa)`)}</td>
          <td>${btn("Book a Call →", `${SITE_URL}/bookings`, "linear-gradient(135deg,#1a1a1a,#2a2a2a)")}</td>
        </tr>
      </table>`
    )
  );
}

export async function sendPaymentRejected(to: string, username: string, tier: string, reason?: string): Promise<void> {
  await sendMail(
    to,
    "⚠️ Payment could not be verified — action required",
    base(
      "Your payment could not be verified. Here's what to do next.",
      `${h1("Payment not approved.")}
      ${p(`Hi <strong style="color:#fff;">${username}</strong>, we were unable to verify your <strong style="color:#fff;">${tier.toUpperCase()}</strong> membership payment.`, "#ccc")}
      ${reason ? `<div style="background:#1a0505;border:1px solid #dc143c33;border-radius:14px;padding:18px 20px;margin:0 0 20px;">
        <p style="margin:0 0 8px;color:#555;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">Reason for rejection</p>
        <p style="margin:0;color:#f87171;font-size:14px;line-height:1.7;">${reason}</p>
      </div>` : ""}
      ${divider()}
      <p style="margin:0 0 14px;color:#555;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;">How to fix this</p>
      ${featureList([
        "1. &nbsp;Go to the Membership page and select your tier",
        "2. &nbsp;Complete the payment using the instructions provided",
        "3. &nbsp;Upload a <strong style=\"color:#fff;\">clear screenshot</strong> or enter your gift card details",
        "4. &nbsp;Submit and wait for approval <span style=\"color:#888;\">(usually within a few hours)</span>",
      ])}
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
    "📞 Booking request received — We'll confirm shortly",
    base(
      "Your private call booking has been submitted and is being reviewed.",
      `${h1("Booking received.")}
      ${p(`Hi <strong style="color:#fff;">${username}</strong>, your booking request has been submitted and is under review. You'll receive a confirmation with full details once it's approved.`, "#ccc")}
      ${infoTable(`
        ${infoRow("Duration", `${duration} minutes`)}
        ${infoRow("Amount", `$${amount}`)}
        ${modelName ? infoRow("Model", `<strong style="color:#fff;">${modelName}</strong>`) : ""}
        ${infoRow("Status", '<span style="color:#facc15;">⏳ Pending approval</span>')}
      `)}
      ${divider()}
      ${highlight("We'll reach out shortly to confirm the exact time and call details. Keep an eye on your messages and notifications — we'll contact you on Telegram.")}
      ${btn("View My Bookings →", `${SITE_URL}/bookings`)}`
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
    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding-right:12px;">${btn("Visit the Vault →", `${SITE_URL}/content`)}</td>
        <td>${btn("Book a Call →", `${SITE_URL}/bookings`, "linear-gradient(135deg,#1a1a1a,#2a2a2a)")}</td>
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
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding-right:12px;">${btn("Admin Panel →", `${SITE_URL}/admin`)}</td>
          <td>${btn("View Payments →", `${SITE_URL}/admin`, "linear-gradient(135deg,#1a1a1a,#2a2a2a)")}</td>
        </tr>
      </table>
      ${p("This is an automated alert from your Forbidden Fruit platform.", "#333")}`
    )
  );
}
