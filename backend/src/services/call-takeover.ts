import { TranscriptService } from "../database/services/call-service";
import { Transcript } from "../types";

function formatTranscriptLine(t: Transcript): string {
  const who = t.speaker === "ai" ? "Holdless (AI)" : "Representative / line";
  const time = t.timestamp.toISOString();
  return `[${time}] ${who}: ${t.message}`;
}

/**
 * Builds a system-prompt supplement so Holdless can resume after the user spoke live with the CSR.
 */
export async function buildTakeoverTranscriptContext(
  callId: string,
  userJoinedAt: Date,
): Promise<string> {
  const all = await TranscriptService.getTranscripts(callId);
  const joinedMs = userJoinedAt.getTime();
  const beforeJoin = all.filter((t) => t.timestamp.getTime() < joinedMs);
  const duringLive = all.filter((t) => t.timestamp.getTime() >= joinedMs);

  const beforeBlock =
    beforeJoin.length > 0
      ? beforeJoin.map(formatTranscriptLine).join("\n")
      : "(no prior transcript segments)";

  const liveBlock =
    duringLive.length > 0
      ? duringLive.map(formatTranscriptLine).join("\n")
      : "(no transcript captured while the account owner was on the line — infer from prior context and what the representative says next)";

  return `

## AI takeover — resume the call (critical)
The account owner briefly joined this call live and spoke with the customer service representative directly. You (Holdless) are now back on the line with the representative. The account owner is no longer on the call.

### Transcript before the account owner joined
${beforeBlock}

### Transcript while the account owner was on the line (representative + mixed conference audio)
${liveBlock}

### How to continue
- Do NOT give your full introduction again. You already introduced yourself earlier unless this is the very first moment on the line.
- Read the transcripts above. Continue naturally: confirm agreements, ask any remaining questions from the call goal, and close professionally when appropriate.
- If the live segment is empty, listen to the representative and pick up from the last known state before the handoff.
- Speak first when you resume — a short, natural continuation (e.g. "Thanks for working with us on that — …") rather than a long recap unless the representative asks for a summary.
`;
}
