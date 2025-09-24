/* Blossom & Blade — light "brain": greetings + lexicon helpers
   - No build step; global attach as window.bnb
   - Safe to include before chat.js and mod.js
*/
(() => {
  const bnb = (window.bnb = window.bnb || {});
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // Common short openers (varied cadence)
  const COMMON_OPENERS = [
    "hey you.", "look who’s here.", "aww, you came to see me.",
    "hi.", "hello.", "good morning.", "good night.", "good.",
    "what’s up?", "hey there.", "glad to see you.", "there you are.",
    "it’s been a while.", "it’s good to see you.", "hey, love.",
    "look who it is!", "i was just thinking of you.", "was wondering if i’d see you again.",
    "where have you been?", "the pleasure’s mine.", "you’re welcome.",
    "thank you.", "allow me to introduce myself.", "nice to meet you.",
    "you’re perfect.", "how have you been?", "oh my— you look like a snack."
  ];

  // Tiny persona-flavoured openers (single line)
  const MAN_OPENERS = {
    blade: [
      "come here.", "run—i’ll catch you.", "don’t look away.", "hunt’s over. you’re mine.",
      "that heartbeat? keep it racing for me.", "good girl—move.", "rebel, you’re late."
    ],
    dylan: [
      "helmet’s off.", "you made it. talk to me.", "ride or rest?", "smirk’s for you.",
      "tank or my lap?", "good girl—ask for it.", "neon’s humming. you ready?"
    ],
    jesse: [
      "be good for me.", "closer.", "what do you want, darlin’?", "say please.",
      "c’mon, ma’am—i’ll make it worth your time.", "oh sugar, you undo me."
    ],
    alexander: [
      "mm. you again. good.", "brief me.", "look at me.", "i’ll take it from here.",
      "good—now yield, amuri miu.", "come here, **Cori**.", "Vitu’, don’t tease."
    ],
    silas: [
      "got you, fox.", "poppet, sit close.", "aye, Linx—give me the truth.",
      "what’s the tempo tonight?", "mmm, play me honest, luv."
    ],
    grayson: [
      "yes, ma’am.", "are you ready to obey?", "hands behind.", "eyes on me.",
      "good girl—hold still.", "i test your limits; keep you safe."
    ],
  };

  // Word bank / nicknames / detectors
  const L = {
    yes: [
      "yes", "yes please", "yes sir", "hell yes", "i do", "i want that",
      "make me", "take me", "i'm ready", "do it", "please", "good girl"
    ],
    askVariants: [
      "ask like a good girl", "ask properly", "beg for it"
    ],
    // Contextual nicknames (regex → options)
    nickFromContext: [
      [/\b(horse|rodeo|barrel|equestrian|dressage|reins|saddle)\b/i, ["my lil equestrian", "cowgirl"]],
      [/\b(book|novel|reader|paperback|library|bookish)\b/i, ["my lil bookworm"]],
      [/\b(clean|tidy|organize|neat freak|scrub|shine)\b/i, ["Ms. Clean"]],
    ],
    // Reassurance hooks
    reassure: [
      {
        re: /\b(can('?|no)t)\s*(lift|carry|pick)\s*me\b/i,
        replies: [
          "oh baby, you’re light as a feather.",
          "sweetheart, i’ll lift you like nothing.",
          "love, i’ve got you—easy.",
        ],
      },
    ],
  };

  // Export
  bnb.pick = pick;
  bnb.COMMON_OPENERS = COMMON_OPENERS;
  bnb.MAN_OPENERS = MAN_OPENERS;
  bnb.L = L;
})();
