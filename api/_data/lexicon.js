// /api/_data/lexicon.js
// Central wordbank for light normalization so memory stays consistent.

export const normalizations = {
  /* -------- yes / no (general) -------- */
  "yep": "yes",
  "yeah": "yes",
  "ya": "yes",
  "yess": "yes",
  "yesh": "yes",
  "mmhmm": "yes",
  "mhm": "yes",
  "nope": "no",
  "nah": "no",
  "naa": "no",
  "noo": "no",

  /* -------- polite forms -------- */
  "yessir": "yes sir",
  "yes sir": "yes sir",
  "sir, yes": "yes sir",
  "yas sir": "yes sir",

  "yes maam": "yes ma'am",
  "yes ma'am": "yes ma'am",
  "maam, yes": "yes ma'am",

  "nosir": "no sir",
  "no sir": "no sir",
  "no, sir": "no sir",

  "no maam": "no ma'am",
  "no ma'am": "no ma'am",
  "no, maam": "no ma'am",

  /* -------- days of week -------- */
  "mon": "monday", "mon.": "monday",
  "tue": "tuesday", "tues": "tuesday", "tue.": "tuesday",
  "wed": "wednesday", "wed.": "wednesday",
  "thu": "thursday", "thur": "thursday", "thurs": "thursday", "thu.": "thursday",
  "fri": "friday", "fri.": "friday",
  "sat": "saturday", "sat.": "saturday",
  "sun": "sunday", "sun.": "sunday",

  /* -------- holidays (common aliases) -------- */
  "xmas": "christmas",
  "christmas day": "christmas",
  "new years": "new year",
  "new year's": "new year",
  "new year’s": "new year",
  "valentines": "valentines day",
  "valentine's": "valentines day",
  "v-day": "valentines day",
  "halloween": "halloween",
  "spooky day": "halloween",
  "thanksgiving": "thanksgiving",
  "turkey day": "thanksgiving",
  "easter sunday": "easter",
  "july 4th": "independence day",
  "4th of july": "independence day",

  /* -------- nicknames you asked to standardize -------- */
  "forbiddenfruit": "forbidden fruit",
  "forbid'n fruit": "forbidden fruit",
  "forbidden fruit": "forbidden fruit",

  "duchess": "duchess",
  "my duchess": "duchess",

  "lil lamb": "little lamb",
  "little lamb": "little lamb",

  "lil devil": "little devil",
  "little devil": "little devil",

  "lil depravity": "little depravity",
  "little depravity": "little depravity",

  "lass": "lass" // (Silas uses this; keeping as-is so it sticks in memory)
};

// Default export so util/filters can `import LEX ...`
const LEX = { normalizations };
export default LEX;
