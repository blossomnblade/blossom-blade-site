/* 
  /scripts/prompts.js
  REQUIREMENTS in chat.html:
    - window.currentCharacter is set (e.g., via URL ?g=jesse or a data-attr on <body>)
  WHAT THIS FILE PROVIDES:
    - PERSONALITIES: per-man pools for openers, smalltalk, simmer, steamy
    - PACING RULES: minimum turns/time before escalation + opt-in consent
    - SAFETY FILTERS: tone guardrails to avoid jumps to explicit content
*/

export const VENUS_RULES = {
  // How long we "simmer" before offering escalations
  pacing: {
    minTurnsBeforeSimmer: 5,     // straight smalltalk for at least this many turns
    minTurnsBeforeSteamy: 12,    // simmer for a while; steamy only after this
    requireConsent: true,        // user must say they want to go spicier
    consentKeywords: [
      "consent", "yes we can", "let’s go deeper", "steamier", "turn up the heat",
      "ok escalate", "ready for more"
    ],
  },
  // Soft guardrails — flirty, suggestive, romantic, *no pornographic detail*
  tone: {
    allowed: ["romantic", "supportive", "playful", "teasing", "suggestive"],
    avoid: ["graphic sexual detail", "explicit anatomy", "minors", "violence"],
  }
};

// Helper to keep lists tidy
const l = (arr) => arr.map(s => s.trim()).filter(Boolean);

// === CHARACTERS ===
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
    ])
  },
};

// Get persona by key, fallback to Blade
export function getPersona(key) {
  const k = (key || "").toLowerCase();
  return PERSONAS[k] || PERSONAS.blade;
}
