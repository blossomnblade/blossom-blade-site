// api/magic/send.js
const crypto = require("crypto");

function base64url(buf) {
  return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function signToken(payloadObj, secret) {
  const payload = base64url(JSON.stringify(payloadObj));
  const sig = base64url(crypto.createHmac("sha256", secret).update(payload).digest());
  return `${payload}.${sig}`;
}

function makeOrigin(req) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}`;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Use POST" });
    return;
  }

  try {
    const { email, next } = req.body || {};
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      res.status(400).json({ ok: false, error: "Valid email required" });
      return;
    }

    const secret = process.env.SESSION_SECRET;
    if (!secret) {
      res.status(500).json({ ok: false, error: "SESSION_SECRET not set" });
      return;
    }

    const lower = String(email).trim().toLowerCase();

    // Token good for 15 minutes
    const exp = Date.now() + 15 * 60 * 1000;
    const token = signToken({ email: lower, exp }, secret);

    const origin = makeOrigin(req);
    const nextPath = next || "/chat.html";
    const link = `${origin}/api/magic/verify?token=${encodeURIComponent(token)}&next=${encodeURIComponent(nextPath)}`;

    // If you later add an email service, send the link here.
    // For now — development fallback — we just return the link.
    // If you do configure Resend, uncomment the fetch below and set RESEND_API_KEY and FROM_EMAIL env vars.

    /*
    if (process.env.RESEND_API_KEY && process.env.FROM_EMAIL) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: process.env.FROM_EMAIL, // e.g. "Blossom & Blade <login@blossomblade.com>"
          to: [lower],
          subject: "Your Blossom & Blade sign-in link",
          html: `<p>Tap to sign in:</p><p><a href="${link}">Sign in to Blossom &amp; Blade</a></p><p>This link expires in 15 minutes.</p>`
        })
      });
      return res.status(200).json({ ok: true, sent: true });
    }
    */

    // Dev/test mode: show the link so you can click it.
    res.status(200).json({ ok: true, sent: false, link });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Unexpected error" });
  }
};
