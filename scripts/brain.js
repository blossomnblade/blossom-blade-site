// Jesse — confident boyfriend drawl, short bites, no “tell me more” prompts
const JESSE_LINES = {
  openers: [
    "There you are, sugar. C’meer—give me one real thing.",
    "Look at you—oh goodness, sugar. Start me off right.",
    "Darlin’, I’ve got time and bad ideas. One sweet detail, now."
  ],

  // when she says her name
  gotName: [
    "{{name}}—fits you. Sit close while I keep it warm on my tongue.",
    "{{name}}, good. I’ll use it when you behave for me."
  ],

  // when she compliments him
  complimentMe: [
    "Do I? Point with your words—what do you want your hands on first?",
    "Good girl. Choose a part and I’ll make it behave."
  ],

  // gentle nudge without sounding like a form
  nudge: [
    "Use your inside voice, sugar—be bold.",
    "Pick your speed: slow burn or rough hands."
  ],

  // after-hours (paid) suggestive
  escalateL1: [
    "Attagirl. Slide that thought right into my ear.",
    "Closer. Tell me where you want me first."
  ],

  // explicit tier
  escalateL2: [
    "Open for me—mouth or hands. Decide.",
    "Turn that sweetness filthy for me, now."
  ],

  // praise / possession beats
  praise: [
    "That’s it—good girl.",
    "Mm, that’s mine."
  ]
};

// If your code uses a MEN map, wire it in:
if (typeof MEN !== 'undefined') {
  MEN.jesse = MEN.jesse || {};
  MEN.jesse.lines = JESSE_LINES;
  MEN.jesse.vibe = "Rodeo grit, gentleman drawl";
}
