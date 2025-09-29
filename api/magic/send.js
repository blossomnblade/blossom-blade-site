// /api/magic/send.js
// Builds a sign-in link for the given email and returns it as JSON.
// No email sending yet—this is a safe stub you can test in the browser/console.

export const config = { runtime: "edge" };

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function validEmail(e = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e).toLowerCase());
}

async function hmac(input, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(input));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=+$/g, "");
}

export default async function handler(req) {
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);

  let body = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const email = (body.email || "").trim();
  const returnTo = (body.returnTo || "/chat.html").trim(); // where to send them after verify
  if (!validEmail(email)) return json({ error: "Invalid email" }, 400);

  const host = req.headers.get("host") || "www.blossomnblade.com";
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const baseUrl = `${proto}://${host}`;

  // Token: { email, exp } + HMAC signature (no DB needed)
  const ttlMinutes = 20;
  const exp = Date.now() + ttlMinutes * 60 * 1000;
  const payload = btoa(JSON.stringify({ email, exp }));
  const secret = (process.env.MAGIC_SECRET || process.env.AI_KEY || "dev-secret") + "|v1";
  const sig = await hmac(payload, secret);
  const token = `${payload}.${sig}`;

  const link = `${baseUrl}/api/magic/verify?token=${encodeURIComponent(token)}&returnTo=${encodeURIComponent(returnTo)}`;

  // For now, just RETURN the link so you can copy/paste it.
  // Later we’ll send it via SendGrid/Mailersend/Postmark.
  return json({ ok: true, email, link, expires_in_minutes: ttlMinutes });
}
