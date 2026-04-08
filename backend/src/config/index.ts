// Configuration for the backend
import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "3001", 10),

  // Twilio configuration
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || "",
    authToken: process.env.TWILIO_AUTH_TOKEN || "",
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || "",
  },

  // OpenAI configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
    model: "gpt-4",
    ttsModel: "tts-1",
    ttsVoice: "alloy",
    // Realtime API configuration (for GPT-4o-Realtime)
    realtimeApiUrl:
      process.env.OPENAI_REALTIME_API_URL || "wss://api.openai.com/v1/realtime",
    realtimeModel:
      process.env.OPENAI_REALTIME_MODEL || "gpt-4o-realtime-preview-2024-12-17",
    /** OpenAI Realtime session voice (e.g. ash, coral). Empty = use per-call voice_preference mapping in handler. */
    realtimeVoice: (process.env.OPENAI_REALTIME_VOICE || "").trim(),
    // Anti-repetition settings (0.0 to 2.0)
    // frequency_penalty: reduces repetition of tokens based on frequency in the text so far
    // presence_penalty: reduces repetition of tokens based on whether they appear in the text so far
    frequencyPenalty: parseFloat(process.env.OPENAI_FREQUENCY_PENALTY || "0.5"),
    presencePenalty: parseFloat(process.env.OPENAI_PRESENCE_PENALTY || "0.3"),
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || "0.7"),
    // Realtime API speech detection settings (MAXIMUM SENSITIVITY - detects user speech immediately)
    // VAD threshold: Lower = more sensitive (default: 0.05 = MAXIMUM sensitivity, range: 0.05-0.2)
    // 0.05 detects even quiet speech immediately - stops AI as soon as user speaks
    vadThreshold: parseFloat(process.env.OPENAI_VAD_THRESHOLD || "0.05"),
    // Prefix padding: Audio buffer before speech start (default: 50ms = MAXIMUM speed, range: 50-200ms)
    // 50ms = fastest detection - catches speech as early as possible
    prefixPaddingMs: parseInt(process.env.OPENAI_PREFIX_PADDING_MS || "50", 10),
    // Silence duration: Wait time after speech ends before AI can respond (default: 2000ms = gives user more time, range: 500-5000ms)
    // Higher values = AI waits longer after user stops speaking, giving user more time to continue
    // 2000ms = 2 seconds - gives user comfortable time to pause and continue speaking
    silenceDurationMs: parseInt(
      process.env.OPENAI_SILENCE_DURATION_MS || "2000",
      10,
    ),
    // Response delay: Delay before requesting AI response (default: 0ms = immediate, range: 0-300ms)
    // 0ms = immediate response - AI responds instantly to user's question
    responseDelayMs: parseInt(process.env.OPENAI_RESPONSE_DELAY_MS || "0", 10),
    // Echo grace period: Time after AI starts speaking before allowing interruption (default: 0ms = immediate, range: 0-2000ms)
    // 0ms = immediate interruption - AI stops instantly when user speaks
    echoGracePeriodMs: parseInt(
      process.env.OPENAI_ECHO_GRACE_PERIOD_MS || "0",
      10,
    ),
  },

  // Deepgram configuration
  deepgram: {
    apiKey: process.env.DEEPGRAM_API_KEY || "",
  },

  // ElevenLabs configuration (optional, can use OpenAI TTS)
  elevenlabs: {
    apiKey: process.env.ELEVENLABS_API_KEY || "",
  },

  // Database configuration (will add later with Prisma)
  database: {
    url:
      process.env.DATABASE_URL ||
      "postgresql://localhost:5432/ai_customer_call",
  },

  // Supabase configuration
  supabase: {
    url: process.env.SUPABASE_URL || "",
    anonKey: process.env.SUPABASE_ANON_KEY || "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  },

  // Google Places / search provider configuration
  googlePlaces: {
    apiKey: process.env.GOOGLE_MAPS_API_KEY || "",
    textSearchUrl:
      process.env.GOOGLE_PLACES_TEXT_SEARCH_URL ||
      "https://maps.googleapis.com/maps/api/place/textsearch/json",
    detailsUrl:
      process.env.GOOGLE_PLACES_DETAILS_URL ||
      "https://maps.googleapis.com/maps/api/place/details/json",
    radiusMeters: parseInt(
      process.env.GOOGLE_PLACES_RADIUS_METERS || "7500",
      10,
    ),
    defaultKeyword: process.env.GOOGLE_PLACES_DEFAULT_KEYWORD || "clinic",
  },

  // Redis cache configuration
  redis: {
    url: process.env.REDIS_URL || "",
    tls: process.env.REDIS_TLS === "true",
    placesCacheTtlSeconds: parseInt(
      process.env.PLACES_CACHE_TTL_SECONDS || "43200",
      10,
    ), // 12 hours default
  },

  // CORS configuration
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  },

  // Call configuration
  call: {
    maxDurationMinutes: 15,
    recordCalls: true,
    /** Max time in ON_HOLD before auto-resuming audio to GPT (0 = no timeout). */
    holdTimeoutMs: parseInt(process.env.CALL_HOLD_TIMEOUT_MS || "600000", 10),
    /**
     * PRE_ANSWER → ACTIVE_CONVERSATION.
     * `immediate` = after Realtime session is configured (default; same effective timing as pre-phases).
     * `first_remote_transcript` = first far-end transcript passing length + quality gates (IVR/menu phase until then).
     */
    preAnswerAdvanceMode:
      process.env.CALL_PRE_ANSWER_ADVANCE_MODE === "first_remote_transcript"
        ? ("first_remote_transcript" as const)
        : ("immediate" as const),
    /** Phase 4: require spectral flatness (plus energy) for music hold; set false for energy-only. */
    holdFlatnessEnabled: process.env.HOLD_FLATNESS_ENABLED !== "false",
    /** Mean flatness ≥ this → broadband / noise-like hold (typical muzak). */
    holdFlatnessMinMean: parseFloat(
      process.env.HOLD_FLATNESS_MIN_MEAN || "0.09",
    ),
    /** Mean flatness ≤ this with high active ratio → tonal loop (optional second cue). */
    holdFlatnessTonalMax: parseFloat(
      process.env.HOLD_FLATNESS_TONAL_MAX || "0.065",
    ),
    /** Phase 5: same IVR line repeated → ON_HOLD. */
    holdRepeatEnabled: process.env.HOLD_REPEAT_ENABLED !== "false",
    holdRepeatMinChars: parseInt(process.env.HOLD_REPEAT_MIN_CHARS || "24", 10),
    holdRepeatWindow: parseInt(process.env.HOLD_REPEAT_WINDOW || "8", 10),
    /** 1 = exact normalized match only; 0.85 = word Jaccard ≥ 0.85 vs any item in window. */
    holdRepeatSimilarity: parseFloat(
      process.env.HOLD_REPEAT_SIMILARITY || "1",
    ),
    /**
     * Agent-initiated hang-up after prolonged user silence (Twilio end).
     * Opt-in via CALL_IDLE_HANGUP_ENABLED=true — conservative defaults.
     */
    /**
     * Auto-send DTMF when transcripts look like IVR menus and a digit aligns with call purpose.
     * Disable with IVR_DTMF_ENABLED=false.
     */
    ivrDtmf: (() => {
      const rawDelay = parseInt(
        process.env.IVR_DTMF_DELAY_MS || "2000",
        10,
      );
      /** Values under ~1.5s routinely fire during prompt audio → IVR ignores DTMF. */
      const minPostPrompt = 1600;
      const maxPostPrompt = 10000;
      const postPromptDelayMs = Number.isFinite(rawDelay)
        ? Math.min(maxPostPrompt, Math.max(minPostPrompt, rawDelay))
        : 2000;
      if (
        process.env.IVR_DTMF_DELAY_MS &&
        Number.isFinite(rawDelay) &&
        rawDelay !== postPromptDelayMs
      ) {
        console.warn(
          `[config] IVR_DTMF_DELAY_MS=${rawDelay} clamped to ${postPromptDelayMs}ms (safe range ${minPostPrompt}–${maxPostPrompt}).`,
        );
      }
      let preDtmfPause = (process.env.IVR_DTMF_PRE_PAUSE || "www").replace(
        /[^w]/gi,
        "",
      );
      if (!preDtmfPause) preDtmfPause = "www";
      /** At least 1.5s lead-in before the digit (Twilio: each w = 0.5s). */
      if (preDtmfPause.length < 3) preDtmfPause = "www";

      return {
        enabled: process.env.IVR_DTMF_ENABLED !== "false",
        postPromptDelayMs,
        cooldownMs: parseInt(process.env.IVR_DTMF_COOLDOWN_MS || "4500", 10),
        minScore: parseFloat(process.env.IVR_DTMF_MIN_SCORE || "0.28"),
        minMargin: parseFloat(process.env.IVR_DTMF_MIN_MARGIN || "0.1"),
        preDtmfPause,
        /**
         * If call purpose + instructions tokenize to nothing, IVR matching cannot score options.
         * Default bias (e.g. leasing) for property-style trees. Override with IVR_DTMF_FALLBACK_PURPOSE.
         */
        fallbackPurposeWhenEmpty: (
          process.env.IVR_DTMF_FALLBACK_PURPOSE || "leasing"
        ).trim(),
      };
    })(),
    idleHangup: {
      enabled: process.env.CALL_IDLE_HANGUP_ENABLED === "true",
      /** User quiet this long before "Are you still there?" (ms). */
      idleMsBeforePing: parseInt(
        process.env.CALL_IDLE_MS_BEFORE_PING || "75000",
        10,
      ),
      /** Silence after ping audio completes before hanging up (ms). */
      silenceMsAfterPing: parseInt(
        process.env.CALL_SILENCE_MS_AFTER_IDLE_PING || "20000",
        10,
      ),
      /** No ping/hang-up until call is at least this old (ms). */
      minCallAgeMs: parseInt(
        process.env.CALL_IDLE_MIN_CALL_AGE_MS || "45000",
        10,
      ),
    },
    /**
     * OpenAI Realtime token metering (per call). Sum of `response.done` usage deltas.
     * CALL_MAX_TOKENS_PER_CALL=0 disables enforcement (still tracks + emits if usage present).
     */
    usage: (() => {
      const maxTokensPerCall = parseInt(
        process.env.CALL_MAX_TOKENS_PER_CALL || "0",
        10,
      );
      const enforceBudget =
        process.env.CALL_TOKEN_BUDGET_ENFORCE !== "false" &&
        Number.isFinite(maxTokensPerCall) &&
        maxTokensPerCall > 0;
      const raw = process.env.CALL_USAGE_WARN_THRESHOLDS || "0.8,0.95";
      const warningThresholds = raw
        .split(",")
        .map((s) => parseFloat(s.trim()))
        .filter((n) => Number.isFinite(n) && n > 0 && n < 1);
      return {
        maxTokensPerCall: Number.isFinite(maxTokensPerCall)
          ? Math.max(0, maxTokensPerCall)
          : 0,
        enforceBudget,
        warningThresholds:
          warningThresholds.length > 0 ? warningThresholds : [0.8, 0.95],
        emitIntervalMs: parseInt(
          process.env.CALL_USAGE_EMIT_INTERVAL_MS || "10000",
          10,
        ),
        dbFlushIntervalMs: parseInt(
          process.env.CALL_USAGE_DB_FLUSH_INTERVAL_MS || "15000",
          10,
        ),
      };
    })(),
  },

  // Auth: when true, requireAuth middleware allows unauthenticated requests (dev/testing only)
  auth: {
    allowNoAuth: process.env.ALLOW_NO_AUTH === "true",
    /** If set, POST /api/calls accepts this Bearer token (server-to-server) instead of Supabase JWT only. */
    callApiToken: process.env.CALL_API_TOKEN || "",
    /** Optional UUID stored on calls created via CALL_API_TOKEN (defaults to a fixed placeholder). */
    callApiTokenUserId:
      process.env.CALL_API_TOKEN_USER_ID ||
      "00000000-0000-4000-8000-000000000001",
  },
};

// Validate required environment variables
export function validateConfig() {
  const required = [
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_PHONE_NUMBER",
    "OPENAI_API_KEY",
    "DEEPGRAM_API_KEY",
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(
      `❌ ERROR: Missing required environment variables: ${missing.join(", ")}`,
    );
    console.error("❌ The AI agent WILL NOT WORK without these variables!");
    console.error("❌ Please add them to backend/.env file");
  } else {
    console.log("✅ All required environment variables are set");
  }

  // Check Supabase configuration (optional but recommended for auth)
  if (
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    console.log("✅ Supabase authentication is configured");
  } else {
    console.warn(
      "⚠️  Supabase credentials not set - authentication will not work",
    );
    console.warn(
      "⚠️  Add SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY to .env",
    );
  }

  if (!process.env.GOOGLE_MAPS_API_KEY) {
    console.warn(
      "⚠️  GOOGLE_MAPS_API_KEY not set - clinic search will fall back to mock data",
    );
  }

  if (!process.env.REDIS_URL) {
    console.warn(
      "⚠️  REDIS_URL not set - quote search caching will be disabled",
    );
  }

  // Show which optional keys are set
  if (process.env.PUBLIC_URL) {
    console.log(`✅ PUBLIC_URL set: ${process.env.PUBLIC_URL}`);
  } else {
    console.warn(
      "⚠️  PUBLIC_URL not set - using localhost (Twilio webhooks will not work)",
    );
  }

  if (process.env.ALLOW_NO_AUTH === "true") {
    console.warn(
      "⚠️  ALLOW_NO_AUTH=true: unauthenticated requests are allowed (dev/testing only; do not use in production)",
    );
  }

  if (process.env.CALL_IDLE_HANGUP_ENABLED === "true") {
    console.log(
      "📞 CALL_IDLE_HANGUP_ENABLED=true: agent may end Twilio call after idle ping + silence",
    );
  }

  const maxTok = parseInt(process.env.CALL_MAX_TOKENS_PER_CALL || "0", 10);
  if (Number.isFinite(maxTok) && maxTok > 0) {
    console.log(
      `📊 CALL_MAX_TOKENS_PER_CALL=${maxTok}: token budget enforced (Twilio hang-up when reached unless CALL_TOKEN_BUDGET_ENFORCE=false)`,
    );
  } else {
    console.log(
      "📊 CALL_MAX_TOKENS_PER_CALL=0: per-call token limit disabled (usage still tracked when API sends usage)",
    );
  }
}
