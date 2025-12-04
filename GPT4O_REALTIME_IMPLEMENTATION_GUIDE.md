# 🚀 GPT-4o-Realtime Implementation Guide

Complete step-by-step guide for implementing OpenAI Realtime API in `gpt4o-realtime-handler.ts`.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Install Dependencies](#step-1-install-dependencies)
3. [Step 2: OpenAI Realtime API Connection](#step-2-openai-realtime-api-connection)
4. [Step 3: Audio Streaming Setup](#step-3-audio-streaming-setup)
5. [Step 4: System Prompt Integration](#step-4-system-prompt-integration)
6. [Step 5: Handle Responses & Transcripts](#step-5-handle-responses--transcripts)
7. [Step 6: Error Handling & Cleanup](#step-6-error-handling--cleanup)
8. [Complete Implementation](#complete-implementation)

---

## Prerequisites

- OpenAI API key with access to Realtime API
- Understanding of WebSocket connections
- Basic audio processing knowledge

---

## Step 1: Install Dependencies

Add the OpenAI SDK to your backend:

```bash
cd backend
npm install openai
```

The `openai` package should already be installed, but ensure you have the latest version:

```bash
npm install openai@latest
```

---

## Step 2: OpenAI Realtime API Connection

### 2.1 Add Configuration

Update `backend/src/config/index.ts`:

```typescript
export const config = {
  // ... existing config
  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
    model: "gpt-4",
    ttsModel: "tts-1",
    ttsVoice: "alloy",
    // Add Realtime API configuration
    realtimeApiUrl:
      process.env.OPENAI_REALTIME_API_URL || "wss://api.openai.com/v1/realtime",
    realtimeModel:
      process.env.OPENAI_REALTIME_MODEL || "gpt-4o-realtime-preview-2024-12-17", // Check OpenAI docs for latest model
    // ... rest of config
  },
};
```

**Add to `.env` file:**

```env
# OpenAI Realtime API (optional - check OpenAI docs for actual endpoint)
OPENAI_REALTIME_API_URL=wss://api.openai.com/v1/realtime
OPENAI_REALTIME_MODEL=gpt-4o-realtime-preview-2024-12-17
```

### 2.2 Create Realtime Connection Helper

Create a new file `backend/src/services/realtime-api.ts`:

```typescript
// OpenAI Realtime API connection helper
import { WebSocket } from "ws";
import { config } from "../config";

export interface RealtimeConfig {
  model: string;
  voice?: string;
  temperature?: number;
  max_response_output_tokens?: number;
}

export class RealtimeAPIConnection {
  private ws: WebSocket | null = null;
  private url: string;
  private config: RealtimeConfig;

  constructor(config: RealtimeConfig) {
    this.config = config;
    // Build WebSocket URL with API key
    const apiKey = config.openai?.apiKey;
    if (!apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    // OpenAI Realtime API WebSocket URL format
    // Note: OpenAI uses bearer token authentication
    this.url = `${config.openai.realtimeApiUrl}?model=${config.model}`;
  }

  async connect(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      // Create WebSocket with authentication header
      const headers = {
        Authorization: `Bearer ${config.openai.apiKey}`,
        "OpenAI-Beta": "realtime=v1", // Required header for Realtime API
      };

      this.ws = new WebSocket(this.url, {
        headers,
      });

      this.ws.on("open", () => {
        console.log("✅ OpenAI Realtime API WebSocket connected");

        // Send configuration session
        this.sendConfig();

        resolve(this.ws!);
      });

      this.ws.on("error", (error) => {
        console.error("❌ OpenAI Realtime API WebSocket error:", error);
        reject(error);
      });

      this.ws.on("close", () => {
        console.log("🔴 OpenAI Realtime API WebSocket closed");
        this.ws = null;
      });
    });
  }

  private sendConfig() {
    if (!this.ws) return;

    // Send session configuration
    const configMessage = {
      type: "session.update",
      session: {
        modalities: ["text", "audio"], // Enable both text and audio
        instructions: "", // Will be set by handler
        voice: this.config.voice || "alloy",
        input_audio_format: "pcm16", // PCM 16-bit for Twilio compatibility
        output_audio_format: "pcm16",
        input_audio_transcription: {
          model: "whisper-1",
        },
        turn_detection: {
          type: "server_vad", // Server-side Voice Activity Detection
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
        },
        tools: [], // Add function calling tools here if needed
        tool_choice: "auto",
        temperature: this.config.temperature || 1.0,
        max_response_output_tokens:
          this.config.max_response_output_tokens || 4096,
      },
    };

    this.ws.send(JSON.stringify(configMessage));
  }

  send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn("⚠️  Cannot send message: WebSocket not connected");
    }
  }

  sendAudio(audioData: Buffer) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Send audio as base64-encoded PCM16
      const base64Audio = audioData.toString("base64");
      const message = {
        type: "input_audio_buffer.append",
        audio: base64Audio,
      };
      this.ws.send(JSON.stringify(message));
    }
  }

  close() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
```

**Note:** The actual OpenAI Realtime API WebSocket URL and authentication may differ. Check OpenAI's latest documentation.

---

## Step 3: Audio Streaming Setup

### 3.1 Audio Format Requirements

- **Twilio → OpenAI**: Twilio sends μ-law 8kHz → Convert to PCM16 → Send to OpenAI
- **OpenAI → Twilio**: OpenAI sends PCM16 → Convert to μ-law 8kHz → Send to Twilio

### 3.2 Update Handler with Audio Pipeline

Add to `gpt4o-realtime-handler.ts`:

```typescript
import { RealtimeAPIConnection } from "../services/realtime-api";
import { decodeTwilioAudio, encodeTwilioAudio } from "../utils/audio";
import { resampleAudio } from "../utils/audio";

export class GPT4oRealtimeHandler {
  // ... existing properties
  private realtimeConnection: RealtimeAPIConnection | null = null;
  private audioBuffer: Buffer[] = [];
  private isProcessingAudio: boolean = false;

  // ... existing methods

  private async initializeRealtimeConnection() {
    try {
      console.log("🔌 Connecting to OpenAI Realtime API...");

      this.realtimeConnection = new RealtimeAPIConnection({
        model:
          config.openai.realtimeModel || "gpt-4o-realtime-preview-2024-12-17",
        voice: this.getVoiceFromPreference(),
        temperature: 0.8,
        max_response_output_tokens: 4096,
      });

      const ws = await this.realtimeConnection.connect();

      // Set up message handlers
      ws.on("message", async (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleRealtimeMessage(message);
        } catch (error) {
          console.error("❌ Error parsing Realtime API message:", error);
        }
      });

      // Send system prompt
      await this.setSystemPrompt();

      console.log("✅ OpenAI Realtime API connected and configured");
    } catch (error) {
      console.error("❌ Failed to connect to OpenAI Realtime API:", error);
      throw error;
    }
  }

  private getVoiceFromPreference(): string {
    const voiceMap: Record<string, string> = {
      professional_female: "nova",
      professional_male: "onyx",
      friendly_female: "shimmer",
      friendly_male: "echo",
    };
    return (
      voiceMap[this.call.voice_preference || "professional_female"] || "nova"
    );
  }

  private async handleAudioData(payload: string) {
    try {
      // Decode Twilio audio (μ-law base64 → PCM16)
      const pcmBuffer = decodeTwilioAudio(payload);

      // OpenAI Realtime API expects PCM16 at 24kHz
      // Twilio sends 8kHz, so we need to resample
      const resampledPcm = resampleAudio(pcmBuffer, 16000, 24000);

      // Buffer audio if connection isn't ready
      if (!this.realtimeConnection?.isConnected()) {
        this.audioBuffer.push(resampledPcm);
        return;
      }

      // Send audio to OpenAI Realtime API
      this.realtimeConnection.sendAudio(resampledPcm);

      // Process buffered audio
      if (this.audioBuffer.length > 0) {
        for (const bufferedAudio of this.audioBuffer) {
          this.realtimeConnection.sendAudio(bufferedAudio);
        }
        this.audioBuffer = [];
      }
    } catch (error) {
      console.error("❌ Error handling audio data:", error);
    }
  }
}
```

---

## Step 4: System Prompt Integration

Reuse the system prompt from `ai-brain.ts`:

```typescript
import { AIBrain } from "../services/ai-brain";

export class GPT4oRealtimeHandler {
  private aiBrain: AIBrain;

  private initializeCall(callSid: string): boolean {
    // ... existing initialization
    this.aiBrain = new AIBrain(this.call);
    // ...
  }

  private async setSystemPrompt() {
    if (!this.realtimeConnection?.isConnected()) {
      console.warn("⚠️  Cannot set system prompt: Realtime API not connected");
      return;
    }

    // Get system prompt from AIBrain (it has the full prompt logic)
    // Note: AIBrain's system prompt is private, so we'll need to extract it
    // or create a shared method. For now, we'll build it here.

    const purpose = this.call.purpose || "";
    const additionalContext = this.call.additional_instructions || "";

    // Parse tone preference
    const toneMatch = additionalContext.match(/tone[:\s]+(polite|firm)/i);
    const communicationTone = toneMatch ? toneMatch[1].toLowerCase() : "polite";

    // Extract user name
    const nameMatch = (purpose + " " + additionalContext).match(
      /(?:user|name|customer)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i
    );
    const userName = nameMatch ? nameMatch[1] : "the user";

    // Build system prompt (same as AIBrain)
    const systemPrompt = `You are Holdless, an AI calling agent that phones customer support on behalf of our users.

Your job is to handle the full customer service call end-to-end, get a clear resolution, and keep the user safe and informed.

User profile:
- User name: ${userName}
- Phone number: ${this.call.phone_number}
- Communication tone preference: ${communicationTone}

Task details:
- Purpose/Issue: ${purpose}
${additionalContext ? `- Additional context: ${additionalContext}` : ""}

[... rest of system prompt from ai-brain.ts ...]`;

    // Send system prompt to Realtime API
    this.realtimeConnection.send({
      type: "session.update",
      session: {
        instructions: systemPrompt,
      },
    });

    console.log("✅ System prompt sent to OpenAI Realtime API");
  }
}
```

**Better approach:** Create a shared method in `AIBrain` to get the system prompt:

```typescript
// In ai-brain.ts, add public method:
public getSystemPrompt(): string {
  return this.systemPrompt; // Make systemPrompt accessible
}
```

---

## Step 5: Handle Responses & Transcripts

### 5.1 Handle Realtime API Messages

```typescript
private async handleRealtimeMessage(message: any) {
  try {
    switch (message.type) {
      case 'response.audio_transcript.delta':
        // Partial transcript from AI
        const delta = message.delta || '';
        console.log(`🤖 AI transcript delta: "${delta}"`);
        // Store partial transcript for UI updates
        break;

      case 'response.audio_transcript.done':
        // Final transcript from AI
        const transcriptText = message.transcript || '';
        console.log(`🤖 AI said: "${transcriptText}"`);

        // Save transcript
        await this.saveTranscript('ai', transcriptText);
        break;

      case 'response.audio.delta':
        // Audio chunk from AI
        const audioBase64 = message.delta || '';
        if (audioBase64) {
          await this.handleRealtimeAudio(audioBase64);
        }
        break;

      case 'response.audio.done':
        // Audio response complete
        console.log('✅ AI audio response complete');
        break;

      case 'conversation.item.input_audio_transcription.completed':
        // User speech transcription (for logging/debugging)
        const userTranscript = message.transcript || '';
        console.log(`👤 User said: "${userTranscript}"`);
        await this.saveTranscript('human', userTranscript);
        break;

      case 'response.created':
        console.log('📝 AI response created');
        break;

      case 'response.done':
        console.log('✅ AI response completed');
        break;

      case 'error':
        console.error('❌ OpenAI Realtime API error:', message.error);
        break;

      default:
        // Log unknown message types for debugging
        if (message.type && !message.type.startsWith('response.audio_transcript')) {
          console.log(`ℹ️  Realtime API message: ${message.type}`);
        }
    }
  } catch (error) {
    console.error('❌ Error handling Realtime API message:', error);
  }
}

private async handleRealtimeAudio(base64Audio: string) {
  try {
    // Decode base64 PCM16 audio
    const pcmBuffer = Buffer.from(base64Audio, 'base64');

    // OpenAI sends 24kHz PCM16, Twilio needs 8kHz μ-law
    // Resample from 24kHz → 8kHz
    const resampledPcm = resampleAudio(pcmBuffer, 24000, 8000);

    // Convert PCM → μ-law and encode to base64
    const encodedAudio = encodeTwilioAudio(resampledPcm, 8000);

    // Send to Twilio
    this.sendAudioToTwilio(encodedAudio);

  } catch (error) {
    console.error('❌ Error handling Realtime audio:', error);
  }
}

private sendAudioToTwilio(base64MulawAudio: string) {
  if (!this.streamSid || !this.ws) return;

  try {
    const message = {
      event: 'media',
      streamSid: this.streamSid,
      media: {
        payload: base64MulawAudio,
      },
    };

    this.ws.send(JSON.stringify(message));
  } catch (error) {
    console.error('❌ Error sending audio to Twilio:', error);
  }
}

private async saveTranscript(speaker: 'ai' | 'human', text: string) {
  if (!text.trim()) return;

  try {
    const transcript = {
      id: uuidv4(),
      call_id: this.call.id,
      speaker,
      message: text,
      timestamp: new Date(),
    };

    store.addTranscript(transcript);
    io.to(`call:${this.call.id}`).emit('transcript', transcript);
  } catch (error) {
    console.error('❌ Error saving transcript:', error);
  }
}
```

### 5.2 Send Initial Greeting

```typescript
private async sendInitialGreeting() {
  try {
    if (!this.realtimeConnection?.isConnected()) {
      console.warn('⚠️  Cannot send greeting: Realtime API not connected');
      return;
    }

    console.log('👋 GPT-4o-Realtime: Sending initial greeting...');

    // Trigger the AI to generate and speak the greeting
    // The greeting logic is in the system prompt, so we just need to start the conversation
    this.realtimeConnection.send({
      type: 'response.create',
      response: {
        modalities: ['audio', 'text'],
        instructions: 'Please introduce yourself as Holdless and state the purpose of the call. Keep it brief and professional.',
      },
    });

  } catch (error) {
    console.error('❌ Error sending initial greeting:', error);
  }
}
```

---

## Step 6: Error Handling & Cleanup

```typescript
private cleanup() {
  console.log('🧹 GPT-4o-Realtime: Cleaning up...');

  try {
    // Close Realtime API connection
    if (this.realtimeConnection) {
      this.realtimeConnection.send({
        type: 'session.update',
        session: {
          modalities: [], // Disable audio/text to signal end
        },
      });

      // Wait a moment for final messages
      setTimeout(() => {
        this.realtimeConnection?.close();
        this.realtimeConnection = null;
      }, 500);
    }

    // Close Twilio WebSocket if still open
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }

    // Clear buffers
    this.audioBuffer = [];

    console.log('✅ GPT-4o-Realtime cleanup complete');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}
```

---

## Complete Implementation

Here's the complete updated `gpt4o-realtime-handler.ts`:

```typescript
// GPT-4o-Realtime Media Stream Handler
import { WebSocket } from "ws";
import { Call } from "../types";
import { store } from "../database/models/store";
import {
  decodeTwilioAudio,
  encodeTwilioAudio,
  resampleAudio,
} from "../utils/audio";
import { v4 as uuidv4 } from "uuid";
import { io } from "../server";
import { config } from "../config";
import { AIBrain } from "../services/ai-brain";

// Import Realtime API connection (you'll need to create this)
import { RealtimeAPIConnection } from "../services/realtime-api";

export class GPT4oRealtimeHandler {
  private ws: WebSocket;
  private call!: Call;
  private streamSid: string | null = null;
  private callSid: string | null = null;
  private isInitialized: boolean = false;
  private realtimeConnection: RealtimeAPIConnection | null = null;
  private audioBuffer: Buffer[] = [];
  private aiBrain: AIBrain | null = null;
  private hasSentGreeting: boolean = false;

  constructor(ws: WebSocket) {
    this.ws = ws;
    this.setupWebSocket();
  }

  private initializeCall(callSid: string): boolean {
    this.callSid = callSid;

    const allCalls = store.getAllCalls();
    const foundCall = allCalls.find((c) => c.call_sid === callSid);

    if (!foundCall) {
      console.error(`❌ Call not found for SID: ${callSid}`);
      this.ws.close();
      return false;
    }

    this.call = foundCall;
    this.aiBrain = new AIBrain(this.call);
    this.isInitialized = true;

    console.log(
      `✅ GPT-4o-Realtime handler initialized for call: ${this.call.id}`
    );

    // Initialize Realtime API connection
    this.initializeRealtimeConnection().catch((error) => {
      console.error("❌ Failed to initialize Realtime API:", error);
      this.ws.close();
    });

    return true;
  }

  private async initializeRealtimeConnection() {
    try {
      console.log("🔌 Connecting to OpenAI Realtime API...");

      this.realtimeConnection = new RealtimeAPIConnection({
        model:
          config.openai.realtimeModel || "gpt-4o-realtime-preview-2024-12-17",
        voice: this.getVoiceFromPreference(),
        temperature: 0.8,
        max_response_output_tokens: 4096,
      });

      const ws = await this.realtimeConnection.connect();

      ws.on("message", async (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleRealtimeMessage(message);
        } catch (error) {
          console.error("❌ Error parsing Realtime API message:", error);
        }
      });

      // Send system prompt
      await this.setSystemPrompt();

      console.log("✅ OpenAI Realtime API connected and configured");
    } catch (error) {
      console.error("❌ Failed to connect to OpenAI Realtime API:", error);
      throw error;
    }
  }

  private getVoiceFromPreference(): string {
    const voiceMap: Record<string, string> = {
      professional_female: "nova",
      professional_male: "onyx",
      friendly_female: "shimmer",
      friendly_male: "echo",
    };
    return (
      voiceMap[this.call.voice_preference || "professional_female"] || "nova"
    );
  }

  private async setSystemPrompt() {
    // Extract and send system prompt
    // Implementation from Step 4
  }

  private async handleRealtimeMessage(message: any) {
    // Implementation from Step 5.1
  }

  private async handleAudioData(payload: string) {
    // Implementation from Step 3.2
  }

  private async sendInitialGreeting() {
    // Implementation from Step 5.2
  }

  private cleanup() {
    // Implementation from Step 6
  }

  // ... rest of existing methods (setupWebSocket, handleMessage, etc.)
}
```

---

## 🧪 Testing Checklist

- [ ] WebSocket connection to OpenAI Realtime API succeeds
- [ ] System prompt is sent and acknowledged
- [ ] Audio from Twilio is decoded and sent to OpenAI
- [ ] Audio from OpenAI is received and sent to Twilio
- [ ] Transcripts are saved correctly
- [ ] Initial greeting is sent
- [ ] Cleanup closes connections properly
- [ ] Error handling works for connection failures

---

## 📚 Additional Resources

- [OpenAI Realtime API Documentation](https://platform.openai.com/docs/guides/realtime)
- [OpenAI Realtime API WebSocket Guide](https://platform.openai.com/docs/guides/realtime-webrtc)
- [OpenAI Realtime API Models](https://platform.openai.com/docs/api-reference/realtime)

---

## ⚠️ Important Notes

1. **API Changes**: OpenAI's Realtime API is in preview. The exact message format and endpoints may change. Always check the latest documentation.

2. **Rate Limits**: Be aware of OpenAI's rate limits for the Realtime API.

3. **Cost**: Realtime API pricing may differ from standard API pricing. Check current pricing.

4. **Audio Quality**: The resampling quality affects audio clarity. The current implementation uses cubic interpolation which is good quality.

5. **Latency**: Minimize buffering for lower latency. Send audio chunks as soon as they arrive.

---

_Last Updated: Check OpenAI docs for latest Realtime API specifications_
