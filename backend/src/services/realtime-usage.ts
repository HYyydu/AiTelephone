/**
 * Parse OpenAI Realtime `response.done` usage (shape varies slightly by API version).
 * Returns per-response token deltas to accumulate for budgeting and display.
 */
export function extractRealtimeResponseUsage(message: unknown): {
  input_tokens: number;
  output_tokens: number;
} | null {
  const m = message as Record<string, unknown> | null;
  const response = (m?.response ?? m) as Record<string, unknown> | undefined;
  const u = response?.usage as Record<string, unknown> | undefined;
  if (!u || typeof u !== "object") return null;

  let input = Number(u.input_tokens ?? u.prompt_tokens ?? 0);
  let output = Number(u.output_tokens ?? u.completion_tokens ?? 0);
  const total = Number(u.total_tokens ?? 0);

  const inOk = Number.isFinite(input) && input >= 0;
  const outOk = Number.isFinite(output) && output >= 0;
  if (!inOk && !outOk) {
    if (Number.isFinite(total) && total > 0) {
      input = 0;
      output = total;
    } else {
      return null;
    }
  } else {
    if (!inOk) input = 0;
    if (!outOk) output = 0;
  }

  return {
    input_tokens: Math.floor(input),
    output_tokens: Math.floor(output),
  };
}
