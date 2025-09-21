// /api/chat.js
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const { messages, man='blade', mode='night' } = req.body || {};
    if (!Array.isArray(messages) || !messages.length) {
      res.status(400).json({ error: 'Missing messages' });
      return;
    }

    // hard no topics
    const BANNED = ["rape","incest","bestiality","scat","minors","trafficking"];

    // quick guard: if the last user message contains a banned word, pivot
    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    if (lastUser && BANNED.some(w => lastUser.content.toLowerCase().includes(w))) {
      res.status(200).json({
        text: "Let’s keep it safe and sweet. Tell me something you enjoyed today."
      });
      return;
    }

    // model + temperature tuned for playful variety
    const payload = {
      model: "gpt-4o-mini",
      temperature: 0.9,
      top_p: 0.95,
      max_tokens: 180,
      messages
    };

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!r.ok) {
      const t = await r.text();
      console.error('OpenAI error', t);
      res.status(200).json({
        text: "I lost my line there—say that again for me?"
      });
      return;
    }

    const data = await r.json();
    const text =
      data?.choices?.[0]?.message?.content?.trim() ||
      "You’ve got my attention—tell me one small good thing from your day.";

    res.status(200).json({ text });
  } catch (e) {
    console.error(e);
    res.status(200).json({ text: "Signal’s fuzzy. Want to try that once more?" });
  }
}
