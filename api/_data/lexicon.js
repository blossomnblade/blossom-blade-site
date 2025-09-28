// api/_data/lexicon.js
// Central wordbank + helpers the chat endpoints can use.
// Safe-by-default; expand freely.

// ————— Nicknames (global buckets) —————
export const NICKNAMES = {
  soft: [
    "love","babe","beautiful","gorgeous","sunshine","angel",
    "sweetheart","doll","pretty one","cutie","sweet thing"
  ],
  playful: [
    "trouble","minx","brat","tease","heartbreaker","wild one",
    "forbidden fruit","duchess","lil lamb","little lamb","lil devil","little devil",
    "lil depravity","little depravity"
  ],
  spicy: [
    "good girl","queen","princess","temptress"
  ]
};

// ————— Persona-specific nicknames —————
// Add more personas as needed (keys should match your character ids)
export const PERSONA_NICKNAMES = {
  silas: ["lass","duchess","forbidden fruit","lil lamb","little lamb"],
  // blade: ["princess","good girl","trouble"],
  // cowboy: ["darlin'","sweetheart","angel"],
  // add more…
};

// ————— Everyday synonyms (for vibe + normalization targets) —————
export const EVERYDAY_SYNONYMS = {
  yes: ["yeah","yep","mm-hmm","uh-huh","for sure","absolutely"],
  no: ["nah","nope","not really"],
  okay: ["ok","k","alright","sounds good","works for me"],
  laugh: ["haha","lol","lmao","😂","snort"],
  hello: ["hey","hi","heyy","yo"],
  bye: ["bye","later","ttyl","gtg"],
  want: ["want","crave","need","dying for"],
  like: ["like","dig","into","love"],
  hot: ["hot","fine","🔥","sexy","spicy"],
  cute: ["cute","adorable","precious","sweet"],
  // respect titles (southern / polite)
  yes_maam: ["yes ma’am","yes, ma’am","yes maam","yes maam.","yes, maam"],
  no_maam:  ["no ma’am","no, ma’am","no maam","no, maam"]
};

// Map casual → canonical tokens (helps memory consistency)
export const NORMALIZE_MAP = {
  "yeah":"yes","yep":"yes","mm-hmm":"yes","uh-huh":"yes",
  "nah":"no","nope":"no",
  "ok":"okay","k":"okay","alright":"okay",
  "lol":"laugh","lmao":"laugh","haha":"laugh","😂":"laugh",
  "yes ma’am":"yes_maam","yes, ma’am":"yes_maam","yes maam":"yes_maam","yes, maam":"yes_maam",
  "no ma’am":"no_maam","no, ma’am":"no_maam","no maam":"no_maam","no, maam":"no_maam",
  "cum":"come" // keep content consistent in memory/analytics
};

// ————— Allowed spicy words (consensual fantasy) —————
export const DIRTY_OK = {
  anatomy_f: ["pussy","kitty","cunt","clit","thighs","hips","ass"],
  anatomy_m: ["cock","dick","length","tip","shaft","hands","mouth"],
  actions: ["kiss","make out","grind","spank","choke (consensual)","go down","taste you","ride","thrust","edge"],
  fluids_ok: ["come","finish","cream","wet","drip"],
  toys_ok: ["vibrator","wand","toy","plug","rope (consensual)"],
  kinks_ok: [
    "roleplay",
    "praise",
    "degradation (consensual)",
    "dominance & submission (consensual)",
    "knife play (fantasy, no real harm, no blood)"
  ]
};

// Mild–strong curses permitted to “drive the moment” (tone tool, not insults)
export const CURSES_OK = [
  "damn","hell","shit","fuck","holy hell","goddamn" // use sparingly for emphasis
];

// ————— Banned-topic detectors (broad patterns) —————
export const BANNED_PATTERNS = [
  /barely\s*legal|school\s*(boy|girl)|\bminor\b|under\s*1?8/gi,            // minors
  /(step|half)\s*(mom|mother|dad|father|bro(ther)?|sis(ter)?)/gi,           // incest/step-family
  /\brape|rapey|without\s*consent|no\s*consent|drugged|unconscious/gi,      // non-consent / no capacity
  /bestiality|animal\s*(sex|play)|dog\s*sex|horse\s*sex/gi,                  // bestiality
  /necrophilia|corpse/gi,                                                    // necrophilia
  /\bscat|feces|poop\s*play|shit\s*play/gi,                                  // scat/extreme bodily fluids
  /\btraffick(ing)?|sell\s*(her|him|people)/gi,                              // trafficking
  /\bblood\s*play|bleed(ing)?\b/gi                                           // blood (knife play must avoid blood)
];

// ————— Calendar bits for small-talk & nicknames —————
export const DAYS_OF_WEEK = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

export const HOLIDAYS = [
  "New Year’s Day","Valentine’s Day","St. Patrick’s Day","Easter",
  "Mother’s Day","Father’s Day","Independence Day","Halloween",
  "Thanksgiving","Hanukkah","Christmas","New Year’s Eve"
];

// Phrases your guys can use to nudge (“spit it out” etc.)
export const PROMPT_PHRASES = {
  encourage: [
    "spit it out 😉",
    "use your words for me",
    "tell me—don’t make me guess",
    "out with it, beautiful"
  ]
};

// ————— Onboarding: ask facts in the first few turns —————
// The chat layer can ask these across the first N messages to personalize nicknames.
export const ONBOARDING_ASK_LIMIT = 4; // ask up to 4 quick facts early on

// Ordered list of questions. “key” names are what you store in session/profile.
export const ONBOARDING_QUESTIONS = [
  { key: "age",        prompt: "Quick check—how old are you?",                                   must_be_number: true, min: 18, max: 120 },
  { key: "birthday",   prompt: "When’s your birthday (month & day)?",                            pattern: /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)|\d{1,2}/i },
  { key: "hair_color", prompt: "What color is your hair right now?",                             options: ["blonde","brunette","brown","black","red","ginger","auburn","pink","blue","other"] },
  { key: "pronouns",   prompt: "What pronouns do you want me to use for you?",                   options: ["she/her","they/them","he/him","something else"] },
  { key: "nick_ok",    prompt: "Any nicknames you like—or hate?",                                free_text: true }
];

// Utility: pick a persona nickname with graceful fallback
export function pickPersonaNickname(personaId, fallbackBucket = "soft") {
  const list =
    (personaId && PERSONA_NICKNAMES[personaId?.toLowerCase()]) ||
    NICKNAMES[fallbackBucket] ||
    NICKNAMES.soft;
  return list[Math.floor(Math.random() * list.length)];
}
