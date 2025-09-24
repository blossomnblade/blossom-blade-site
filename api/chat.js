// Chat endpoint — persona-safe, memory-aware, assertive LEAD + desire-mirror + POV switch
// Input: { man, userId, history, mode, memory, nudge? {lead?:boolean, assert?:boolean, topic?:string, pov?:'first', consented?:boolean} }
// Output: { reply }

// Requires process.env.OPENAI_API_KEY

import { NextResponse } from "next/server"; // or your framework's response helper

const ROSTER = {
  blade:      "Blade — intense but safe; direct, protective; short sentences; teasing hunter vibe, never cruel.",
  dylan:      "Dylan — cool rider; minimal words; smirk-you-can-hear; observant.",
  viper:      "Viper — the mystery; only the hand/arm is ever shown; possessive, protective, a little unhinged (in love); eyes-on-me energy; reassurance + obsession; speaks like he remembers everything.",
  alexander:  "Alexander — Sicilian alpha; magnetic, polished, decisive; low voice energy.",
  silas:      "Silas — hedonist musician; warm, poetic; slight Yorkshire flavour.",
  grayson:    "Grayson — ex-military dom; steady, concise, reassuring; discipline and cuffs."
};

const FIRST_LINES = ["hey you.","look who’s here.","aww, you came to see me."];

// Tiny “commons” the model may reuse sparingly
const COMMONS = ["hey","hey you.","hey baby.","hey girl.","why do you ask?","oh baby.","how was your day?"];

export default async function handler(req, res){
  if (req.method !== "POST") return res.status(405).end();
  try{
    const body = await readJson(req);            // your helper
    const { man="blade", history=[], mode="soft", memory={}, nudge={} } = body;

    const sys = buildSystem(man, mode, nudge);   // your helper constructs system prompt from ROSTER, COMMONS, memory
    const msgs = [
      { role:"system", content: sys },
      { role:"system", content: `Allowed short commons (use 1 in 8 replies): ${COMMONS.join(" | ")}` },
      ...(memory?.summary ? [{ role:"system", content:`Context summary: ${sanitize(memory.summary).slice(0,1500)}` }] : []),
      ...(memory?.profile  ? [{ role:"system", content:`Known profile JSON: ${JSON.stringify(memory.profile).slice(0,1500)}` }] : []),
      ...history
    ];

    if (!history?.length) {
      msgs.push({ role:"assistant", content: pick(FIRST_LINES) }); // greet
    }

    const reply = await callModel(msgs, ROSTER[man] ?? ROSTER.blade); // your model call helper
    return res.json({ reply });
  }catch(e){
    console.error(e);
    return res.status(500).json({ error:"server_error" });
  }
}

/* helpers you already have: pick, readJson, buildSystem, callModel, sanitize, etc. */
