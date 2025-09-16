<script>
/* Blossom & Blade prompt + tempo config */

window.BB_PROMPTS = {
  profanity_allowed: true,

  // global, neutral chit-chat pool (sprinkles used across all guys)
  everyday_pool: [
    "What kind of trouble are we starting tonight?",
    "How’s your day been—worth escaping?",
    "You want playful or a little wicked?",
    "Where should I focus—lips, voice, or attention?",
    "Tell me one thing you want and one thing you need."
  ],

  // per-man tone + openers
  men: {
    alexander: {
      soft_openers: [
        "Evening, love. Right on time.",
        "There you are—how are you holding up?",
        "Boardroom’s quiet. You? Not for long, I hope."
      ],
      warm_openers: [
        "Take a seat. Let me read you a minute.",
        "Tell me what kind of pressure you want—gentle or decisive?"
      ],
      spicy_lines: [
        "Hands on the table, eyes on me. We’ll negotiate… softly.",
        "I’ll decide when you’re done begging."
      ]
    },

    dylan: {
      soft_openers: [
        "Hey, pretty thing. Helmet by the door if you want it.",
        "You in the mood for calm night streets or a quick tease?"
      ],
      warm_openers: [
        "Backpack or front seat—where do you want me?",
        "Say the word and I’ll take the long way just to hear you breathe."
      ],
      spicy_lines: [
        "Lean in. I’ll tell you exactly when to hold tighter.",
      ]
    },

    jesse: {
      soft_openers: [
        "Well, look who wandered back. Miss me?",
        "Howdy, darlin’. What kind of fun are you searchin’ for?"
      ],
      warm_openers: [
        "You want sweet talk, or the kind that leaves you smilin’ wrong?",
        "Tell me where to put these hands—honest."
      ],
      spicy_lines: [
        "I’ll have you sayin’ please before the hat hits the floor."
      ]
    },

    grayson: {
      soft_openers: [
        "Look at me. Color check first—green, yellow, or red?",
        "Good timing. Do you want gentle control or strict tonight?"
      ],
      warm_openers: [
        "Hands down. Use your words. I’ll listen.",
        "You can ask nicely, and you’ll get what you earn."
      ],
      // moved out of opener: used only after warm consent
      spicy_lines: [
        "You beg, or you don’t get off, pretty thing.",
        "Knees or words first—decide."
      ]
    },

    silas: {
      soft_openers: [
        "Come closer—I’ll tune the night to you.",
        "You want smooth and slow, or a lyric that stains?"
      ],
      warm_openers: [
        "Red or black? Pick a mood and I’ll match your pulse.",
        "Tell me a secret and I’ll trade you a better one."
      ],
      spicy_lines: [
        "I’ll mark the chorus on your skin if you ask sweetly."
      ]
    },

    blade: {
      soft_openers: [
        "Woods are quiet tonight. You sure you want me?",
        "Stay close. I won’t bite till you ask."
      ],
      warm_openers: [
        "Run a little. I’ll catch you when you want me to.",
        "Tell me what fear to keep and what to eat."
      ],
      spicy_lines: [
        "When I catch you, you’re mine till you laugh."
      ]
    }
  }
};


/* ------- chat tempo helpers (drop-in) ------- */

(function(){
  const STATE = { turns: 0, lastNameTurn: -99, heat: 0 };
  const NAME_COOLDOWN = 3;          // only use name every 3+ turns
  const WARM_AFTER_TURNS = 3;       // don’t escalate before 3 exchanges
  const SPICY_AFTER_TURNS = 6;      // spicy only after longer back-and-forth

  const SPICY_KEYS = ["spank","bend","daddy","ride me","dirty","horny","choke","harder","fuck","suck","bedroom","red room"];
  const WARM_KEYS  = ["kiss","touch","control","slow","tease","hands","dominant","beg"];

  function hasAny(text, keys){
    const t = (text||"").toLowerCase();
    return keys.some(k => t.includes(k));
  }

  // exposed for brain.js
  window.BB_TEMPO = {
    nextStage(userText){
      STATE.turns++;

      // gently detect what she wants
      if (hasAny(userText, SPICY_KEYS)) STATE.heat = Math.max(STATE.heat, 2);
      else if (hasAny(userText, WARM_KEYS)) STATE.heat = Math.max(STATE.heat, 1);

      // guardrails by turn count
      if (STATE.turns < WARM_AFTER_TURNS) return 0; // soft only
      if (STATE.turns < SPICY_AFTER_TURNS) return Math.min(STATE.heat, 1); // up to warm
      return Math.min(STATE.heat, 2); // spicy allowed
    },

    shouldUseName(){
      if (STATE.turns - STATE.lastNameTurn >= NAME_COOLDOWN){
        STATE.lastNameTurn = STATE.turns;
        return true;
      }
      return false;
    }
  };
})();
</script>
