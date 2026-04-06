// Hard guardrails for quote / price-gathering calls - no hallucinated confidence

export const QUOTE_CALLER_INSTRUCTIONS = `Caller rules (STRICT):
- You are the CUSTOMER / caller (you need a quote or price). You are NOT their employee, agent, or support desk. Never speak as if you work for the place you called.
- You are calling on behalf of your user. Only state facts explicitly listed under AUTHORITATIVE FACTS below.
- Never invent or assume names, dates, times, pet details, preferences, or availability.
- If a detail is missing from AUTHORITATIVE FACTS, say "not specified" or "I'll need to confirm with my user" — never guess.
- Your ONLY job is to fulfill the goal described in AUTHORITATIVE FACTS (usually: obtain pricing or fee information).
- Do NOT schedule, book, reserve, or hold appointments. Do NOT pick a date, time, or "morning vs afternoon" unless AUTHORITATIVE FACTS explicitly tell you to.
- If they list multiple prices or service tiers, do NOT choose one for the user (no "I'll go with the $X option") unless AUTHORITATIVE FACTS explicitly say which option to take. You may repeat the options neutrally or ask one brief clarifying question only if the user's goal requires it.
- If the representative offers times or tries to schedule, decline once: you are only gathering information; then use the mandatory closing line below.
- When you have the pricing (or fee) information the user asked for — or they clearly cannot provide it — say exactly: "Thanks so much for telling this information, I will get back to my users." Then stop; do not add scheduling or new requests.
- After that closing line, stay silent unless the representative speaks again. If they only say goodbye, thanks, or "you're welcome", answer once as the customer with at most "Thanks", "Thank you", "You too", or "Bye" (one short phrase). Do NOT say "You're welcome", "anything else I can help", "further assistance", "reach out", or "have a great day" — those are things the business says, not you.`;

export const QUOTE_CALL_MARKER = "[QUOTE_CALL]";

export function getQuoteCallerInstructions(): string {
  return QUOTE_CALLER_INSTRUCTIONS;
}

export function isQuoteCall(additionalInstructions: string | null | undefined): boolean {
  return Boolean(additionalInstructions?.trim().startsWith(QUOTE_CALL_MARKER));
}

/** Strip marker and leading whitespace from additional_instructions (if present). */
export function stripQuoteCallMarker(additionalInstructions: string): string {
  const t = additionalInstructions.trim();
  if (t.startsWith(QUOTE_CALL_MARKER)) {
    return t.slice(QUOTE_CALL_MARKER.length).trim();
  }
  return t;
}

/**
 * True when the call is clearly about obtaining price/quote/cost info only,
 * without booking or scheduling as part of the stated goal.
 * Used so these calls do not use the generic refund prompt (which pushes appointments).
 */
export function isPriceOnlyInformationGatheringCall(
  purpose: string,
  additionalInstructions: string | null | undefined,
): boolean {
  const extra = stripQuoteCallMarker((additionalInstructions || "").trim());
  const combined = `${purpose.trim()} ${extra}`.toLowerCase();

  const priceIntent =
    /\b(price|pricing|quote|quoted|cost|how much|fees?\b|rate for|rates for)\b/.test(combined) ||
    /\b(get|find|obtain|asking|ask about|ask for)\b[\s\S]{0,60}\b(price|pricing|quote|cost|how much)\b/.test(
      combined,
    );

  if (!priceIntent) return false;

  const bookingIntent =
    /\b(book|schedule|set up|make)\s+(an\s+)?(appointment|visit|slot)\b/.test(combined) ||
    /\b(schedule|book)\b[\s\S]{0,50}\b(appointment|visit)\b/.test(combined);

  return !bookingIntent;
}

/** Quote-marker calls OR heuristic price-only calls — shared prompt / IVR behavior. */
export function usesPriceGatheringCallBehavior(
  purpose: string,
  additionalInstructions: string | null | undefined,
): boolean {
  return isQuoteCall(additionalInstructions) || isPriceOnlyInformationGatheringCall(purpose, additionalInstructions);
}
