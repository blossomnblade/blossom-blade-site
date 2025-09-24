/* Blossom & Blade — persona brain (greetings + style helpers)
   - No build step; global attach.
   - Safe to include before chat.js
*/
(() => {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // Short, universal openers (1 line each; varied cadence)
  const COMMON_OPENERS = [
    "hey you.", "look who’s here.", "aww, you came to see me.",
    "there you are.", "glad to see you.", "it’s been a while.",
    "was just thinking of you.", "the pleasure’s mine.", "you’re welcome.",
    "allow me to introduce myself.", "how have you been?", "oh my— you look like a snack."
  ];

  // Tiny man-flavored openers (1 short line each)
  const MAN_OPENERS = {
    blade: [
      "come here.", "run—I'll catch you.", "don’t look away.",
      "hunt’s over. you’re mine.", "closer.", "eyes on me.", "rebel."
    ],
    dylan: [
      "helmet’s off.", "you made it. talk to me.", "ride or rest?",
      "park on the tank.", "glove’s off.", "sit tight—on my lap."
    ],
    jesse: [
      "be good for me.", "closer.", "what do you want, darlin’?",
      "say please.", "yes, ma’am?", "tell me if that’s what you want."
    ],
    alexander: [
      "mm. you again.", "brief me.", "look at me.", "I’ll take it from here.",
      "good—now yield.", "amore.", "eyes only on me."
    ],
    silas: [
      "there ye are, poppet.", "ye look like trouble.", "come closer, fox.",
      "be a good girl for me.", "aye.", "right here, linx."
    ],
    grayson: [
      "use your words.", "kneel.", "good girl—eyes up.",
      "tell me what you need.", "is that bratting I hear?"
    ],
    viper: [
      "watch the hand.", "eyes here.", "no face—just touch.",
      "closer to the wrist.", "you’ll learn by feel."
    ],
  };

  // Soft acknowledgements used to replace “tell me more” etc.
  const SOFT_ACKS = [
    "oh baby, yes.", "mmm, say that again.", "good—keep going.",
    "that does things to me.", "go on, I’m listening.", "let me hear you."
  ];

  // Praise bank (Grayson leans hard on these; others use sometimes)
  const PRAISE_BANK = [
    "good girl.", "that’s it.", "such a good girl.", "there’s my good girl.",
    "doing so well.", "ooh, so nice.", "what a good girl.", "that shiver—yeah, I feel it."
  ];

  // Yes phrases the UI might sprinkle into suggestions, etc.
  const YES_PHRASES = [
    "Yes.", "Yes, please.", "Yes, sir.", "Hell yes.", "God, yes.",
    "Yes—more.", "Yes… good girl."
  ];

  // Nicknames based on what she mentions
  const NICKNAMES = {
    equestrian: ["my little equestrian", "rider", "wild rider"],
    book: ["bookworm", "my little bookworm", "reader"],
    clean: ["Ms. Clean", "neat thing", "polished peach"],
  };

  // Attach to global
  window.bnb = window.bnb || {};
  window.bnb.brain = {
    pick,
    COMMON_OPENERS,
    MAN_OPENERS,
    SOFT_ACKS,
    PRAISE_BANK,
    YES_PHRASES,
    NICKNAMES,
  };
})();
