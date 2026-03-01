// Hard guardrails for quote calls - no hallucinated confidence

export const QUOTE_CALLER_INSTRUCTIONS = `Caller rules (STRICT):
- Only state facts explicitly provided in the quote context.
- Never invent or assume details.
- If a detail is missing, say "not specified" or "the owner isn't sure."
- Do not guess age, breed, weight, or urgency.
- Your role is only to ask for pricing information.`;

export const QUOTE_CALL_MARKER = "[QUOTE_CALL]";

export function getQuoteCallerInstructions(): string {
  return QUOTE_CALLER_INSTRUCTIONS;
}

export function isQuoteCall(additionalInstructions: string | null | undefined): boolean {
  return Boolean(additionalInstructions?.trim().startsWith(QUOTE_CALL_MARKER));
}
