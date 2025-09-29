// api/util/filters.js — top
// Shared input safety + normalization for both chat endpoints.

import LEX_MOD from "../_data/lexicon.js";

// Be tolerant to different export shapes but avoid dynamic import / top-level await.
const LEX = (LEX_MOD?.default) ||
            (LEX_MOD?.lexicon) ||
            (LEX_MOD?.LEXICON) ||
            LEX_MOD || {};


// ---------- Banned / allowed patterns ----------
// Keep "consensual knife play" allowed. Block the rest that you listed.
const RULES = [
  { id: "minors", re: /(minor(s)?|barely\s*legal|school\s*(boy|girl))/i, reason: "minors/“barely legal”/school boy-girl" },
  { id: "incest", re: /(incest|step[\s-]*family)/i, reason: "incest/step-family" },
  { id: "nonconsent", re: /(non[\s-]*consent|coercion)/i, reason: "non-consent or coercion" },
  { id: "capacity", re: /intoxication\s+without\s+capacity/i, reason: "intoxication without capacity" },
  { id: "bestiality", re: /bestiality|zoophilia/i, reason: "bestiality" },
  { id: "necrophilia", re: /necrophilia/i, reason: "necrophilia" },
  { id: "trafficking", re: /trafficking/i, reason: "trafficking" },
  { id: "fluids", re: /(extreme\s+bodily\s*fluids|scat)/i, reason: "extreme bodily fluids / scat" },
  { id: "hate", re: /(hate\s+slurs?|racial\s+slurs?)/i, reason: "hate slurs or targeted harassment" },
];

// Phrases we explicitly allow (still blocked if paired with non-consent etc.)
const ALLOW = [/knife\s*play/i];

function hasAllow(text) {
  return ALLOW.some((r) => r.test(text));
}

export function gateText(text = "") {
  const t = String(text);

  // If any banned rule matches, block (unless it’s an allow-only thing and no conflicting rule)
  for (const rule of RULES) {
    if (rule.re.test(t)) {
      // If the only match someone hits is "knife play", don't block (we don't list it as banned).
      // For other matches, block immediately.
      return {
        ok: false,
        reason: `Blocked topic: ${rule.reason}`,
        redactedText: t.replace(rule.re, "▇▇▇"),
      };
    }
  }

  // Explicit allow isn’t needed to pass, but it’s here in case you add
  // patterns later that overlap with “knife play”.
  return { ok: true, redactedText: t };
}

// ---------- Normalization (wordbank) ----------
// We normalize a few things so memory stays consistent (nicknames, yes/no forms,
// days, holidays, etc.). Add/extend mappings in /api/_data/lexicon.js
function buildMap() {
  // LEX.normalizations is expected like: { "yes ma'am": "yes maam", "lass": "lass", ... }
  const m = (LEX.normalizations && typeof LEX.normalizations === "object") ? LEX.normalizations : {};
  return m;
}

const NORM_MAP = buildMap();

export function normalizeSlang(text = "") {
  let out = " " + String(text) + " ";

  // Replace phrases first (longest keys first)
  const keys = Object.keys(NORM_MAP).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    const v = NORM_MAP[k];
    const re = new RegExp(`\\b${escapeReg(k)}\\b`, "gi");
    out = out.replace(re, (m) => preserveCase(v, m));
  }

  // Squash excess spaces
  out = out.replace(/\s{2,}/g, " ").trim();
  return out;
}

// ---------- helpers ----------
function escapeReg(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function preserveCase(replacement, matched) {
  // Simple case preservation: if original is Title Case, title-case the replacement.
  if (/^[A-Z][a-z]+(?:\s[A-Z][a-z]+)*$/.test(matched)) {
    return replacement.replace(/\b\w/g, (c) => c.toUpperCase());
  }
  if (matched === matched.toUpperCase()) return replacement.toUpperCase();
  if (matched === matched.toLowerCase()) return replacement.toLowerCase();
  return replacement;
}
