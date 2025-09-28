// /api/util/filters.js
import { BANNED_PATTERNS, NORMALIZE_MAP } from "../_data/lexicon.js";

// Returns { ok: boolean, reason?: string, redactedText: string }
export function gateText(userText) {
  const text = String(userText || "");

  for (const rx of BANNED_PATTERNS) {
    if (rx.test(text)) {
      return {
        ok: false,
        reason:
          "That topic isn’t allowed here (minors, incest/step-family, non-consent/no capacity, bestiality, necrophilia, trafficking, scat, or blood). Please steer to safe, consensual fantasy.",
        redactedText: ""
      };
    }
  }
  return { ok: true, redactedText: text };
}

// Normalize casual slang to a canonical token (helps embeddings/memory)
export function normalizeSlang(text) {
  let out = " " + String(text || "") + " ";
  for (const [from, to] of Object.entries(NORMALIZE_MAP)) {
    const rx = new RegExp(`\\b${escapeReg(from)}\\b`, "gi");
    out = out.replace(rx, ` ${to} `);
  }
  return out.trim().replace(/\s+/g, " ");
}

function escapeReg(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
