// Vercel Edge function stub for adult-friendly processor integration.
// TODAY: just validates the plan and "redirects" to a thank-you page.
// LATER: call your processor API and return their hosted checkout URL.

export const config = { runtime: "edge" };

const PLANS = {
  day_single:  { price: 7.99,  name: "Day Pass (one man)" },
  monthly_all:{ price: 14.99, name: "Monthly (all rooms)" }
};

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), { status: 405 });
  }
  const { plan } = await req.json().catch(() => ({}));
  const item = PLANS[plan];
  if (!item) {
    return new Response(JSON.stringify({ error: "Unknown plan" }), { status: 400 });
  }

  // TODO: swap this block for your payment provider call.
  // Example flow:
  // 1) create transaction with provider
  // 2) receive hostedCheckoutUrl
  // 3) return { redirectUrl: hostedCheckoutUrl }

  const fakeReceiptId = Math.random().toString(36).slice(2);
  const url = `/thank-you.html?plan=${plan}&amt=${item.price}&r=${fakeReceiptId}`;
  return new Response(JSON.stringify({ redirectUrl: url }), {
    headers: { "Content-Type": "application/json" }
  });
}
