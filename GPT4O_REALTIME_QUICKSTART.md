# 🚀 GPT-4o-Realtime Quick Start

Quick reference for implementing GPT-4o-Realtime in your handler.

## Files Created/Updated

1. ✅ **`backend/src/services/realtime-api.ts`** - Realtime API connection helper (CREATED)
2. ✅ **`backend/src/config/index.ts`** - Added Realtime API config (UPDATED)
3. ⏳ **`backend/src/websocket/gpt4o-realtime-handler.ts`** - Main handler (NEEDS IMPLEMENTATION)

## Quick Implementation Steps

### 1. Add Environment Variables

Add to `backend/.env`:

```env
# OpenAI Realtime API (check OpenAI docs for latest model name)
OPENAI_REALTIME_API_URL=wss://api.openai.com/v1/realtime
OPENAI_REALTIME_MODEL=gpt-4o-realtime-preview-2024-12-17
```

### 2. Use the RealtimeAPIConnection Helper

The `RealtimeAPIConnection` class is already created in `backend/src/services/realtime-api.ts`.

**Key Methods:**
- `connect()` - Establish WebSocket connection
- `sendConfig(instructions)` - Send session configuration and system prompt
- `sendAudio(buffer)` - Send PCM16 audio data
- `requestResponse()` - Trigger AI to respond
- `onMessageType(type, handler)` - Handle specific message types

### 3. Implement in Handler

In `gpt4o-realtime-handler.ts`, use the helper like this:

```typescript
import { RealtimeAPIConnection } from '../services/realtime-api';

// In your handler class:
private realtimeConnection: RealtimeAPIConnection | null = null;

// Initialize connection
private async initializeRealtimeConnection() {
  this.realtimeConnection = new RealtimeAPIConnection({
    model: config.openai.realtimeModel,
    voice: this.getVoiceFromPreference(),
  });

  await this.realtimeConnection.connect();
  this.realtimeConnection.sendConfig(this.getSystemPrompt());

  // Register message handlers
  this.realtimeConnection.onMessageType('response.audio.delta', (msg) => {
    // Handle audio chunks
  });

  this.realtimeConnection.onMessageType('response.audio_transcript.done', (msg) => {
    // Handle transcripts
  });
}
```

### 4. Audio Flow

```
Twilio (μ-law 8kHz)
  ↓ decodeTwilioAudio()
PCM16 (16kHz)
  ↓ resampleAudio() to 24kHz
PCM16 (24kHz)
  ↓ realtimeConnection.sendAudio()
OpenAI Realtime API

OpenAI Realtime API
  ↓ response.audio.delta events
PCM16 (24kHz)
  ↓ resampleAudio() to 8kHz
PCM16 (8kHz)
  ↓ encodeTwilioAudio()
Twilio (μ-law 8kHz)
```

### 5. Key Message Types to Handle

- `response.audio.delta` - Audio chunks from AI
- `response.audio_transcript.done` - Final AI transcript
- `conversation.item.input_audio_transcription.completed` - User transcript
- `response.done` - Response complete

## Testing

1. **Start with logging**: Add console.logs to see what messages you receive
2. **Test connection**: Verify WebSocket connects successfully
3. **Test audio**: Send test audio and verify it's processed
4. **Test responses**: Verify AI responses come through

## Common Issues

- **Connection fails**: Check API key and URL format
- **No audio**: Verify audio format (PCM16, 24kHz)
- **No responses**: Ensure you call `requestResponse()` after sending audio

## Full Implementation Guide

See `GPT4O_REALTIME_IMPLEMENTATION_GUIDE.md` for complete step-by-step instructions.

## OpenAI Documentation

⚠️ **IMPORTANT**: Check OpenAI's latest documentation for:
- Exact WebSocket URL format
- Authentication method
- Message format
- Audio format requirements
- Model names

Latest docs: https://platform.openai.com/docs/guides/realtime

