// api/magic/verify.js
// Verifies a magic-link token, sets a signed session cookie, and redirects.
// ⭐ Note: magic link verify

import crypto from "crypto";

// Use an env var in Vercel: LOGIN_SECRET (Project → Settings → Environment Variables)
const SECRET = process.env.LOGIN_SECRET || "dev-secret-change-me";

// ---- tiny helpers ----
const b64u = {
  enc: (bufOrStr) =>
    Buffer.from(bufOrStr)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, ""),
  dec: (str) =>
    Buffer.from(str.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(),
};

function hmac(data) {
  return b64u.enc(crypto.createHmac("sha256", SECRET).update(data).digest());
}

function safeEq(a, b) {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

// Accepts tokens that look like "<data>.<sig>"
// where <data> is base64url JSON: { email, exp } (exp = ms since epoch)
function verifyToken(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) {
    throw new Error("Bad token");
  }
  const [data, sig] = token.split(".");
  if (!safeEq(hmac(data), sig)) throw new Error("Signature mismatch");

  const payload = JSON.parse(b64u.dec(data));
  if (!payload?.email || !payload?.exp) throw new Error("Malformed token");
  const now = Date.now();
  if (now > Number(payload.exp)) throw new Error("Token expired");

  return { email: String(payload.email) };
}

// Create a signed, cookie-safe session blob
function makeSession({ email }) {
  const now = Date.now();
  const exp = now + 1000 * 60 * 60 * 24 * 30; // 30 days
  const data = b64u.enc(JSON.stringify({ email, iat: now, exp }));
  const sig = hmac(data);
  return `${data}.${sig}`;
}

// Ensure we only ever redirect within our own site
function sanitizeNext(next) {
  if (typeof next !== "string") return "/chat.html";
  // only allow relative paths inside this site
  if (!next.startsWith("/") || next.startsWith("//")) return "/chat.html";
  return next;
}

export default async function handler(req, res) {
  try {
    const { token, next, man } =
      req.method === "POST" ? (req.body || {}) : (req.query || {});

    const { email } = verifyToken(token);

    // Build and set the session cookie
    const session = makeSession({ email });
    // Cookie attributes: HttpOnly, Secure, SameSite=Lax, 30 days
    res.setHeader("Set-Cookie", [
      `bb.sid=${session}; Path=/; Max-Age=${60 * 60 * 24 * 30}; HttpOnly; Secure; SameSite=Lax`,
    ]);

    // Decide where to send them after login
    let dest = sanitizeNext(next || "/chat.html");
    // Preserve "man" choice if provided (e.g., blade)
    if (man) {
      const url = new URL("http://x" + dest); // dummy origin for URL API
      url.searchParams.set("man", String(man));
      dest = url.pathname + (url.search || "");
    }

    // Optional: you can also mark ageVerified if you only send magic links to adults
    // localStorage isn't available here (server), so the age gate stays client-side.

    res.writeHead(302, { Location: dest });
    res.end();
  } catch (err) {
    // On failure, show a simple message (you can prettify later)
    res
      .status(400)
      .json({ ok: false, error: (err && err.message) || "Invalid token" });
  }
}
