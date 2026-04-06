/**
 * Purpose-aware IVR navigation: parse "press N for …" style prompts from transcripts
 * and pick a digit aligned with the call purpose before sending DTMF.
 */

export interface IvrMenuOption {
  digit: string;
  description: string;
}

export interface IvrDtmfPlan {
  digit: string;
  score: number;
  runnerUpScore: number;
  reason: string;
}

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "you",
  "your",
  "our",
  "are",
  "not",
  "with",
  "that",
  "this",
  "from",
  "have",
  "has",
  "was",
  "were",
  "been",
  "being",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "must",
  "can",
  "any",
  "all",
  "please",
  "thank",
  "thanks",
  "call",
  "calling",
]);

/** Map stem -> related tokens for coarse semantic overlap with short IVR blurbs. */
const INTENT_CLUSTERS: Record<string, string[]> = {
  refund: [
    "refund",
    "return",
    "returns",
    "exchange",
    "credit",
    "reimburse",
    "money",
    "back",
  ],
  damaged: [
    "damaged",
    "defective",
    "broken",
    "spoiled",
    "wrong",
    "bad",
    "item",
    "product",
  ],
  /** Omit "customer"/"service" — they match the literal IVR line "customer service" and swamp goals like "leasing" when the user says "help" or "person". */
  human: [
    "representative",
    "agent",
    "operator",
    "person",
    "human",
    "someone",
    "associate",
    "help",
    "live",
  ],
  order: ["order", "orders", "tracking", "shipment", "delivery", "purchase"],
  billing: ["billing", "payment", "invoice", "charge", "card"],
  technical: ["technical", "support", "it", "website", "app", "online"],
  sales: ["sales", "new", "purchase", "buy"],
  /** Property / telecom IVRs: "For leasing, press 1" */
  leasing: [
    "leasing",
    "lease",
    "rent",
    "rental",
    "apartment",
    "tenant",
    "housing",
    "landlord",
  ],
  spanish: ["spanish", "español", "espanol"],
  english: ["english", "inglés", "ingles"],
};

function tokenize(text: string): Set<string> {
  const raw = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0);
  const out = new Set<string>();
  for (const t of raw) {
    if (t.length <= 1 && !/^\d+$/.test(t)) continue;
    if (STOPWORDS.has(t)) continue;
    out.add(t);
  }
  return out;
}

function expandTokens(tokens: Set<string>): Set<string> {
  const expanded = new Set<string>(tokens);
  for (const t of tokens) {
    for (const [stem, related] of Object.entries(INTENT_CLUSTERS)) {
      if (t === stem || related.includes(t)) {
        expanded.add(stem);
        for (const r of related) expanded.add(r);
      }
    }
  }
  return expanded;
}

function scoreOptionAgainstPurpose(
  description: string,
  purposeTokens: Set<string>,
): number {
  const descTokens = expandTokens(tokenize(description));
  if (descTokens.size === 0) return 0;
  const purposeExpanded = expandTokens(purposeTokens);
  let hits = 0;
  for (const d of descTokens) {
    if (purposeExpanded.has(d)) {
      hits++;
      continue;
    }
    for (const p of purposeExpanded) {
      if (p.length >= 4 && (d.includes(p) || p.includes(d))) {
        hits += 0.5;
        break;
      }
    }
  }
  const denom = Math.sqrt(
    Math.max(1, purposeExpanded.size) * Math.max(1, descTokens.size),
  );
  return Math.min(1, hits / denom);
}

/**
 * Menus like "…want to text with an agent, please press 1. To speak with a leasing agent, please press 2."
 * Forward "press N" parsing wrongly labels digit 1 with the *following* clause; here the label is the clause
 * before ", please press N".
 */
function extractCommaPleasePressOptions(text: string): IvrMenuOption[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  const options: IvrMenuOption[] = [];
  const re = /,\s*please\s+press\s+([0-9*#])\b/gi;
  let lastEnd = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(normalized)) !== null) {
    const chunk = normalized.slice(lastEnd, m.index).trim();
    lastEnd = m.index + m[0].length;
    const sentences = chunk
      .split(/\.\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 3);
    let desc =
      sentences.length > 0 ? sentences[sentences.length - 1]! : chunk.slice(-160).trim();
    if (desc.length > 140) desc = `${desc.slice(0, 140)}…`;
    if (desc.length >= 4) options.push({ digit: m[1], description: desc });
  }
  return options;
}

function extractForwardPressOptions(text: string): IvrMenuOption[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  const options: IvrMenuOption[] = [];
  const re = /\bpress\s+([0-9*#])\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(normalized)) !== null) {
    const digit = m[1];
    const tail = normalized.slice(m.index + m[0].length).trim();
    const stop = tail.search(/\b(?:press|dial|enter|or\s+press)\b/i);
    let desc =
      stop >= 0 ? tail.slice(0, stop) : tail.slice(0, 140);
    desc = desc.replace(/^\s*(?:,|\.|for|to|if)\s+/i, "").trim();
    desc = desc.replace(/[,;.]+$/, "").trim();
    options.push({
      digit,
      description: desc.length > 0 ? desc : `option ${digit}`,
    });
  }
  return options;
}

function extractReverseForPressOptions(text: string): IvrMenuOption[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  const options: IvrMenuOption[] = [];
  const re =
    /\bfor\s+([^.!?\n]{4,90}?)\s*,?\s*(?:press|dial|enter)\s+([0-9*#])\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(normalized)) !== null) {
    options.push({
      digit: m[2],
      description: m[1].trim().replace(/^[\s,]+|[\s,]+$/g, ""),
    });
  }
  return options;
}

function extractDialEnterOptions(text: string): IvrMenuOption[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  const options: IvrMenuOption[] = [];
  const re = /\b(?:dial|enter|push|key)\s+([0-9*#])\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(normalized)) !== null) {
    const digit = m[1];
    const tail = normalized.slice(m.index + m[0].length).trim();
    const stop = tail.search(/\b(?:press|dial|enter)\b/i);
    let desc =
      stop >= 0 ? tail.slice(0, stop) : tail.slice(0, 100);
    desc = desc.replace(/^[,.\s]+|[,.\s]+$/g, "").trim();
    options.push({
      digit,
      description: desc.length > 0 ? desc : `option ${digit}`,
    });
  }
  return options;
}

/**
 * Merge options for the same digit. First non-empty description wins.
 * Forward "press N" parsing often mis-attributes the *next* menu clause to digit N
 * (e.g. "press 1" labeled as "For maintenance…"); reverse "for X, press N" is reliable,
 * so we collect reverse matches first.
 */
function mergeOptionsByDigitFirstWins(candidates: IvrMenuOption[]): IvrMenuOption[] {
  const map = new Map<string, string>();
  for (const { digit, description } of candidates) {
    const d = description.trim();
    if (!map.has(digit) && d.length > 0) {
      map.set(digit, d);
    }
  }
  return [...map.entries()].map(([digit, description]) => ({
    digit,
    description,
  }));
}

export function extractIvrMenuOptions(text: string): IvrMenuOption[] {
  const raw = [
    ...extractCommaPleasePressOptions(text),
    ...extractReverseForPressOptions(text),
    ...extractDialEnterOptions(text),
    ...extractForwardPressOptions(text),
  ];
  return mergeOptionsByDigitFirstWins(raw);
}

export function transcriptLooksLikeIvrPrompt(text: string): boolean {
  if (!text || text.length < 8) return false;
  return extractIvrMenuOptions(text).length > 0;
}

/**
 * IVR repeated the menu after a failed keypress; allow sending DTMF again even if
 * the menu text matches the last attempt.
 */
export function transcriptSuggestsIvrKeypressFailed(text: string): boolean {
  if (!text || !transcriptLooksLikeIvrPrompt(text)) return false;
  const t = text.toLowerCase();
  return /\b(don'?t detect|do not detect|did not detect|invalid response|invalid option|didn'?t get that|did not get that|no valid response|try again)\b/.test(
    t,
  );
}

/**
 * Recording/privacy disclaimers often arrive as a separate ASR segment before
 * "for X, press N". There is no keypad step yet — the LLM must stay silent;
 * saying "one" out loud is not DTMF and causes "invalid response" on many IVRs.
 */
export function isLikelyAutomatedDisclosureWithoutMenu(text: string): boolean {
  if (transcriptLooksLikeIvrPrompt(text)) return false;
  const t = text.toLowerCase().trim();
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length < 8) return false;

  const hasRecording = /\b(recorded|recording)\b/.test(t);
  const hasPrivacy =
    /\b(privacy policy|personal data|quality assurance)\b/.test(t);
  const agreeingContinuing =
    /\bagreeing\b/.test(t) &&
    /\b(continu|continuing)\b/.test(t) &&
    hasRecording;

  return (
    (hasRecording && hasPrivacy) ||
    agreeingContinuing ||
    (/\bprivacy policy\b/.test(t) && hasRecording)
  );
}

export interface PlanIvrDtmfParams {
  transcript: string;
  purpose: string;
  additionalInstructions?: string;
  minScore: number;
  minMargin: number;
  /** When purpose + instructions yield no tokens (empty fields / stopwords only). */
  fallbackPurposeWhenEmpty?: string;
}

/**
 * Returns a DTMF plan or null if ambiguous / low confidence.
 */
export function planIvrDtmf(params: PlanIvrDtmfParams): IvrDtmfPlan | null {
  const { transcript, purpose, additionalInstructions, minScore, minMargin } =
    params;
  const options = extractIvrMenuOptions(transcript);
  if (options.length === 0) return null;

  const purposeText = `${purpose} ${additionalInstructions || ""}`.trim();
  let purposeTokens = tokenize(purposeText);
  if (
    purposeTokens.size === 0 &&
    params.fallbackPurposeWhenEmpty &&
    params.fallbackPurposeWhenEmpty.trim()
  ) {
    purposeTokens = tokenize(params.fallbackPurposeWhenEmpty.trim());
  }
  if (purposeTokens.size === 0) return null;

  const scored = options.map((opt) => ({
    opt,
    score: scoreOptionAgainstPurpose(opt.description, purposeTokens),
  }));
  scored.sort((a, b) => b.score - a.score);

  const best = scored[0];
  const second = scored[1];
  const effectiveMin =
    options.length === 1 ? minScore * 0.85 : minScore;

  if (best.score < effectiveMin) return null;
  if (
    second &&
    options.length > 1 &&
    best.score - second.score < minMargin
  ) {
    const purposeLower = purposeText.toLowerCase();
    const wantsText = /\b(text|sms)\b/.test(purposeLower);
    const topTwo = [scored[0]!, scored[1]!];
    const speak = topTwo.find((s) =>
      /\bspeak\s+with\b|\btalk\s+to\b/i.test(s.opt.description),
    );
    const textSms = topTwo.find((s) =>
      /\btext\s+with\b|\bwant\s+to\s+text\b|\bsms\b/i.test(s.opt.description),
    );
    if (!wantsText && speak && textSms && speak !== textSms) {
      return {
        digit: speak.opt.digit,
        score: speak.score,
        runnerUpScore: textSms.score,
        reason: `IVR option "${speak.opt.description}" (digit ${speak.opt.digit}) — tie-break vs text/SMS option (purpose did not request text)`,
      };
    }
    return null;
  }

  return {
    digit: best.opt.digit,
    score: best.score,
    runnerUpScore: second?.score ?? 0,
    reason: `IVR option "${best.opt.description}" (digit ${best.opt.digit}) best matches purpose (score ${best.score.toFixed(2)} vs ${(second?.score ?? 0).toFixed(2)})`,
  };
}
