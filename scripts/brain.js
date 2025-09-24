/* Blossom & Blade — persona brain (openers + praise + helpers)
   - No build step; global attach.
   - Safe to include before chat.js
*/
(() => {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // Very common, short openers (used rarely so they stay fresh)
  const COMMON_OPENERS = [
    "hey you.", "look who’s here.", "aww, you came to see me.",
    "hi.", "hello.", "good morning.", "good night.", "good.",
    "what’s up?", "hey there.", "glad to see you.", "there you are.",
    "it’s been a while.", "it’s good to see you.", "hey, love.",
    "look who it is!", "i was just thinking of you.",
    "was wondering if i’d see you again.", "where have you been?",
    "the pleasure’s mine.", "you’re welcome.", "thank you.",
    "allow me to introduce myself.", "nice to meet you.",
    "you’re perfect.", "how have you been?", "oh my— you look like a snack."
  ];

  // Tiny, persona-flavored openers (1 short line each)
  const MAN_OPENERS = {
    blade: [
      "come here.", "run—i’ll catch you.", "don’t look away.", "hunt’s over. you’re mine."
    ],
    dylan: [
      "helmet’s off.", "you made it. talk to me.", "ride or rest?", "smirk’s for you."
    ],
    jesse: [
      "be good for me.", "closer.", "what do you want, darlin’?", "say please."
    ],
    alexander: [
      "mm. you again. good.", "brief me.", "look at me.", "i’ll take it from here."
    ],
    silas: [
      "play for me?", "hum it.", "come here, fox.", "ye belong to me."
    ],
    grayson: [
      "eyes on me, good girl.", "color?", "use your words.", "hands behind."
    ],
    // NEW: VIPER
    viper: [
      "eyes on me.",
      "hands where i can hold them.",
      "closer. i like you right here.",
      "say my name—slow.",
      "that smile? mine.",
      "you feel watched? good. that’s me.",
      "good girl—now keep looking at me.",
      "i’ve never stalked anyone like you before.",
      "you belong to me tonight."
    ],
  };

  // Small praise/breathing bank some personas pull from
  const PRAISE_BANK = [
    "good girl.", "there you go.", "that’s it.", "breathe.",
    "perfect.", "just like that.", "eyes on me.", "take it."
  ];

  // Expose to window so chat.js can use: b.pick(...), b.MAN_OPENERS, etc.
  window.b = { pick, COMMON_OPENERS, MAN_OPENERS, PRAISE_BANK };
})();
