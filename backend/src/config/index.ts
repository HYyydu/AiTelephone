// Configuration for the backend
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3001,
  
  // Twilio configuration
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
  },
  
  // OpenAI configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: 'gpt-4',
    ttsModel: 'tts-1',
    ttsVoice: 'alloy',
  },
  
  // Deepgram configuration
  deepgram: {
    apiKey: process.env.DEEPGRAM_API_KEY || '',
  },
  
  // ElevenLabs configuration (optional, can use OpenAI TTS)
  elevenlabs: {
    apiKey: process.env.ELEVENLABS_API_KEY || '',
  },
  
  // Database configuration (will add later with Prisma)
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/ai_customer_call',
  },
  
  // CORS configuration
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
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
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_PHONE_NUMBER',
    'OPENAI_API_KEY',
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.warn(`⚠️  Warning: Missing environment variables: ${missing.join(', ')}`);
    console.warn('The application may not work correctly without these variables.');
  }
}

