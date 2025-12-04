// Configuration for the backend
import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: process.env.PORT || 3001,

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
      10
    ),
    // Response delay: Delay before requesting AI response (default: 0ms = immediate, range: 0-300ms)
    // 0ms = immediate response - AI responds instantly to user's question
    responseDelayMs: parseInt(process.env.OPENAI_RESPONSE_DELAY_MS || "0", 10),
    // Echo grace period: Time after AI starts speaking before allowing interruption (default: 0ms = immediate, range: 0-2000ms)
    // 0ms = immediate interruption - AI stops instantly when user speaks
    echoGracePeriodMs: parseInt(
      process.env.OPENAI_ECHO_GRACE_PERIOD_MS || "0",
      10
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

  // CORS configuration
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  },

  // Call configuration
  call: {
    maxDurationMinutes: 15,
    recordCalls: true,
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
      `❌ ERROR: Missing required environment variables: ${missing.join(", ")}`
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
      "⚠️  Supabase credentials not set - authentication will not work"
    );
    console.warn(
      "⚠️  Add SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY to .env"
    );
  }

  // Show which optional keys are set
  if (process.env.PUBLIC_URL) {
    console.log(`✅ PUBLIC_URL set: ${process.env.PUBLIC_URL}`);
  } else {
    console.warn(
      "⚠️  PUBLIC_URL not set - using localhost (Twilio webhooks will not work)"
    );
  }
}
