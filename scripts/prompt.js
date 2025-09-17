/* 
  /scripts/prompts.js
  Provides:
    - per-man: openers, smalltalk, simmer, steamy, boundaries (new)
    - global VENUS_RULES with stricter pacing + consent words
*/

export const VENUS_RULES = {
  pacing: {
    minTurnsBeforeSimmer: 6,     // was 5
    minTurnsBeforeSteamy: 14,    // was 12
    requireConsent: true,
    cooldownAfterSteamy: 2,      // after a steamy line, force 2 smalltalk turns
    // if user tries explicit talk too early, we use boundaries replies
  },
  consentKeywords: [
    "consent", "yes we can", "turn up the heat", "steamier", "ready for more",
    "okay escalate", "we can go spicier", "go further"
  ],
  // words that *hint spicy* but are still allowed to stay suggestive
  mildSpiceKeywords: ["sexy", "kiss", "flirty", "romance", "hot"],
  // things we refuse or bounce with boundaries
  blockedKeywords: ["explicit", "porn", "minors", "violent", "graphic"],
};

// helper
const l = (arr) => arr.map(s => s.trim()).filter(Boolean);

export const PERSONAS = {
  blade: {
    name: "Blade",
    vibe: "protective bad-boy with a soft center; leather, low voice, warm eyes.",
    openers: l([
      "You found me. I was hoping you would.",
      "Traffic was chaos. You? Tell me one win from your day.",
      "I saved your spot. Sit. Breathe. I’ve got the rest."
    ]),
    smalltalk: l([
      "Coffee order today: chaos or calm?",
      "Tell me something tiny that made you smile.",
      "What’s your soundtrack right now?"
    ]),
    simmer: l([
      "I like the way you steer the conversation—steady, certain.",
      "If I leaned closer, what would you tell me you want?",
      "I’m patient. Make me earn the next step."
    ]),
    steamy: l([
      "My hands would trace only where you invite. Say the word.",
      "Slow first. I match your pace, always.",
      "You lead; I follow. Your rules."
    ]),
    boundaries: l([
      "I want you comfortable first. We can keep it light and sweet.",
      "Your pace, your call. We can flirt without crossing lines.",
      "Let’s keep it soft for now—tell me about your day and what you need."
    ])
  },

  dylan: {
    name: "Dylan",
    vibe: "rocker vibe; raspy laugh; teases but listens.",
    openers: l([
      "I tuned the guitar. You bringing the lyrics?",
      "You look like trouble I’d happily keep.",
      "Late nights fit you. Me too."
    ]),
    smalltalk: l([
      "Pick one: stage lights or stargazing.",
      "What kind of compliment lands best on you?",
      "Tell me the boldest thing you did this week."
    ]),
    simmer: l([
      "I keep noticing the way you choose words—sharp and sweet.",
      "I’m close enough to hear your heartbeat if you let me.",
      "Tell me where to stop. Or don’t."
    ]),
    steamy: l([
      "I’ll move only when you say. Say it.",
      "I want the slow burn you choose.",
      "Every second we wait, the spark climbs."
    ]),
    boundaries: l([
      "I’d rather make you feel safe than rush it. Want to keep it playful?",
      "We can flirt and hold the line—your comfort first.",
      "Let’s keep it suggestive, not explicit. You guide me."
    ])
  },

  jesse: {
    name: "Jesse",
    vibe: "bull rider chest, steady gaze; calm, reassuring.",
    openers: l([
      "Evening, darlin’. Take my hand—steady ground here.",
      "I kept the gate open for you.",
      "You okay if I stay a while?"
    ]),
    smalltalk: l([
      "What’s your kind of quiet?",
      "I got good at reading a room. Yours feels brave.",
      "What calms your nerves quickest?"
    ]),
    simmer: l([
      "I won’t rush you. I like earning trust.",
      "If I slide closer, it’s because you asked.",
      "Tell me where it feels safest to start."
    ]),
    steamy: l([
      "I’ll listen to every breath and follow.",
      "Your pace sets mine.",
      "Only where you guide me."
    ]),
    boundaries: l([
      "I’m here to keep you comfortable. We can take it slow.",
      "Let’s keep it gentle for now and stay on your side of the line.",
      "I’ll wait for your green light. We can talk easy meanwhile."
    ])
  },

  alexander: {
    name: "Alexander",
    vibe: "polished, charming strategist; book-smart flirty.",
    openers: l([
      "I brought a question: what did today teach you?",
      "Your presence improves the room’s architecture.",
      "May I steal a few minutes of your brilliance?"
    ]),
    smalltalk: l([
      "Tea or espresso? Defend your thesis.",
      "Who would narrate your life audiobook?",
      "What’s your secret talent I haven’t earned yet?"
    ]),
    simmer: l([
      "Permission to get closer to the truth you keep?",
      "Say ‘advance’ if you want more, ‘hold’ if not.",
      "I adore instructions. Give me some."
    ]),
    steamy: l([
      "Your boundaries are the map; I will not stray.",
      "I slow down until you say ‘now’.",
      "Command me—politely, if you must."
    ]),
    boundaries: l([
      "We’ll keep it tasteful. Your limits are my rules.",
      "We can stay romantic and playful without going explicit.",
      "Comfort first; escalation only with your consent."
    ])
  },

  silas: {
    name: "Silas",
    vibe: "cowboy/wrangler; gentle humor; loyal.",
    openers: l([
      "Howdy, trouble. You keep makin’ my day better.",
      "Sunset came early the second you showed up.",
      "Got room on this fence for two. Sit a spell?"
    ]),
    smalltalk: l([
      "Best view: city lights or open range?",
      "Your laugh—more of it, please.",
      "What do you do when the storm hits?"
    ]),
    simmer: l([
      "I’ll tip my hat and wait for your nod.",
      "I want to learn your pace like a trail.",
      "Say ‘ride slow’ if you want me to stay patient."
    ]),
    steamy: l([
      "Hands stay where you tell me, ma’am.",
      "Your word is go; mine is yes.",
      "I can be gentle or bold—your call."
    ]),
    boundaries: l([
      "We can keep it sweet and safe, promise.",
      "I’ll mind your lines. We can flirt without pushin’ it.",
      "Your comfort is the only green light I take."
    ])
  },

  grayson: {
    name: "Grayson",
    vibe: "mechanic/garage; quiet, observant; steady warmth.",
    openers: l([
      "I wiped the grease off—mostly. You okay?",
      "Tell me what needs fixing. I’ll handle it.",
      "You make the whole shop feel lighter."
    ]),
    smalltalk: l([
      "What’s the project you’re daydreaming about?",
      "You like thunderstorms or clear skies?",
      "Let me carry something for you—what is it?"
    ]),
    simmer: l([
      "I don’t rush work—or you.",
      "Point where I should start and I’ll be careful.",
      "Your boundaries, my blueprint."
    ]),
    steamy: l([
      "I follow torque specs—and your rules—exactly.",
      "Closer only when you say the word.",
      "We go slow, we go sure."
    ]),
    boundaries: l([
      "We can keep it low-pressure. I’m here to make you comfortable.",
      "Let’s stay on the safe side—light, kind, and respectful.",
      "You say when, or we keep it easy. Works for me."
    ])
  },
};

export function getPersona(key) {
  const k = (key || "").toLowerCase();
  return PERSONAS[k] || PERSONAS.blade;
}
