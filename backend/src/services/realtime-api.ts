// OpenAI Realtime API connection helper
// IMPORTANT: This is a template based on OpenAI's Realtime API structure
// Check OpenAI's latest documentation for exact message formats and endpoints
// https://platform.openai.com/docs/guides/realtime

import { WebSocket } from "ws";
import { config } from "../config";

export interface RealtimeConfig {
  model?: string;
  voice?: string;
  temperature?: number;
  max_response_output_tokens?: number;
  instructions?: string;
}

/**
 * Connection to OpenAI Realtime API via WebSocket
 *
 * Note: OpenAI Realtime API is in preview. The exact API format may differ.
 * Check OpenAI's latest documentation before implementing.
 */
export class RealtimeAPIConnection {
  private ws: WebSocket | null = null;
  private url: string;
  private realtimeConfig: RealtimeConfig;
  private messageHandlers: Map<string, (data: any) => void> = new Map();
  private isConnected: boolean = false;

  constructor(realtimeConfig: RealtimeConfig = {}) {
    this.realtimeConfig = {
      model: realtimeConfig.model || "gpt-4o-realtime-preview-2024-12-17",
      voice: realtimeConfig.voice || "alloy",
      temperature: realtimeConfig.temperature || 1.0,
      max_response_output_tokens:
        realtimeConfig.max_response_output_tokens || 4096,
      instructions: realtimeConfig.instructions || "",
      ...realtimeConfig,
    };

    // Use the imported config object (not the parameter)
    const apiKey = config.openai.apiKey;
    if (!apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    // Build WebSocket URL
    // Note: Check OpenAI docs for exact URL format and authentication method
    const baseUrl =
      config.openai.realtimeApiUrl || "wss://api.openai.com/v1/realtime";
    this.url = `${baseUrl}?model=${this.realtimeConfig.model}`;
  }

  /**
   * Connect to OpenAI Realtime API
   */
  async connect(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const headers: { [key: string]: string } = {
        Authorization: `Bearer ${config.openai.apiKey}`,
        "OpenAI-Beta": "realtime=v1", // Required for Realtime API access
      };

      console.log(
        `🔌 Connecting to OpenAI Realtime API: ${this.realtimeConfig.model}`
      );

      this.ws = new WebSocket(this.url, {
        headers,
      });

      this.ws.on("open", () => {
        console.log("✅ OpenAI Realtime API WebSocket connected");
        this.isConnected = true;
        resolve(this.ws!);
      });

      this.ws.on("message", (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          console.error("❌ Error parsing Realtime API message:", error);
        }
      });

      this.ws.on("error", (error) => {
        console.error("❌ OpenAI Realtime API WebSocket error:", error);
        this.isConnected = false;
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          reject(error);
        }
      });

      this.ws.on("close", (code, reason) => {
        console.log(
          `🔴 OpenAI Realtime API WebSocket closed: ${code} ${reason}`
        );
        this.isConnected = false;
        this.ws = null;
      });
    });
  }

  /**
   * Send session configuration
   */
  sendConfig(instructions?: string) {
    if (!this.ws || !this.isConnected) {
      console.warn("⚠️  Cannot send config: WebSocket not connected");
      return;
    }

    console.log("📋 Configuring OpenAI Realtime API session:");
    console.log(`   - Model: ${this.realtimeConfig.model}`);
    console.log(`   - Voice: ${this.realtimeConfig.voice}`);
    console.log(`   - Audio format: PCM16, 24kHz`);
    console.log(`   - Transcription: Enabled (whisper-1)`);
    console.log(`   - VAD Threshold: ${process.env.OPENAI_VAD_THRESHOLD || "0.05"}`);
    
    const sessionConfig = {
      type: "session.update",
      session: {
        modalities: ["text", "audio"],
        instructions: instructions || this.realtimeConfig.instructions || "",
        voice: this.realtimeConfig.voice || "alloy",
        input_audio_format: "pcm16", // PCM 16-bit, 24kHz
        output_audio_format: "pcm16",
        input_audio_transcription: {
          model: "whisper-1",
        },
        turn_detection: {
          type: "server_vad",
          // VAD threshold: Lower = more sensitive to speech (0.05-0.2 range)
          // 0.05-0.08 = MAXIMUM sensitivity - detects even quiet speech immediately
          // Default: 0.05 for maximum sensitivity to catch user speech as early as possible
          threshold: parseFloat(process.env.OPENAI_VAD_THRESHOLD || "0.05"),
          // Prefix padding: Audio to include before speech start (ms)
          // Lower values = faster detection, higher = more context
          // 50ms = MAXIMUM speed - detects speech as early as possible
          prefix_padding_ms: parseInt(
            process.env.OPENAI_PREFIX_PADDING_MS || "50",
            10
          ),
          // Silence duration: How long to wait after speech ends before turn completion (ms)
          // Lower = faster turn-taking, higher = waits for longer pauses (gives user more time)
          // 2000ms = 2 seconds - gives user comfortable time to pause and continue speaking
          // This prevents AI from interrupting user's natural pauses
          silence_duration_ms: parseInt(
            process.env.OPENAI_SILENCE_DURATION_MS || "2000",
            10
          ),
        },
        temperature: this.realtimeConfig.temperature || 1.0,
        max_response_output_tokens:
          this.realtimeConfig.max_response_output_tokens || 4096,
      },
    };

    this.send(sessionConfig);
    console.log("✅ Session configuration sent");
  }

  /**
   * Send a message (JSON object)
   */
  send(message: any) {
    if (!this.ws || !this.isConnected) {
      console.warn("⚠️  Cannot send message: WebSocket not connected");
      return false;
    }

    try {
      const jsonMessage =
        typeof message === "string" ? message : JSON.stringify(message);
      this.ws.send(jsonMessage);
      return true;
    } catch (error) {
      console.error("❌ Error sending message to Realtime API:", error);
      return false;
    }
  }

  /**
   * Send audio data (PCM16 buffer)
   */
  sendAudio(audioData: Buffer) {
    if (!this.ws || !this.isConnected) {
      return false;
    }

    try {
      // Encode audio as base64
      const base64Audio = audioData.toString("base64");

      const message = {
        type: "input_audio_buffer.append",
        audio: base64Audio,
      };

      this.send(message);
      return true;
    } catch (error) {
      console.error("❌ Error sending audio to Realtime API:", error);
      return false;
    }
  }

  /**
   * Commit audio buffer (tell API to process the buffered audio)
   */
  commitAudio() {
    if (!this.ws || !this.isConnected) {
      return false;
    }

    this.send({
      type: "input_audio_buffer.commit",
    });

    return true;
  }

  /**
   * Request a response from the AI
   */
  requestResponse() {
    if (!this.ws || !this.isConnected) {
      return false;
    }

    this.send({
      type: "response.create",
      response: {
        modalities: ["audio", "text"],
      },
    });

    return true;
  }

  /**
   * Cancel current response
   */
  cancelResponse() {
    if (!this.ws || !this.isConnected) {
      return false;
    }

    try {
      this.send({
        type: "response.cancel",
      });
      return true;
    } catch (error) {
      // If cancel fails, it might be because response already finished
      // Don't throw error, just return false
      console.warn("⚠️  Could not cancel response - may already be finished");
      return false;
    }
  }

  /**
   * Handle incoming messages from Realtime API
   */
  private handleMessage(message: any) {
    const messageType = message.type || "unknown";

    // Log message types for debugging
    if (
      !messageType.includes("audio_transcript") &&
      !messageType.includes("audio.delta")
    ) {
      console.log(`📨 Realtime API message: ${messageType}`);
    }

    // Call registered handlers
    const handler = this.messageHandlers.get(messageType);
    if (handler) {
      handler(message);
    }

    // Also call wildcard handler if registered
    const wildcardHandler = this.messageHandlers.get("*");
    if (wildcardHandler) {
      wildcardHandler(message);
    }
  }

  /**
   * Register a message handler
   */
  onMessageType(messageType: string, handler: (data: any) => void) {
    this.messageHandlers.set(messageType, handler);
  }

  /**
   * Remove a message handler
   */
  offMessageType(messageType: string) {
    this.messageHandlers.delete(messageType);
  }

  /**
   * Check if connected
   */
  isConnectedToAPI(): boolean {
    return (
      this.isConnected &&
      this.ws !== null &&
      this.ws.readyState === WebSocket.OPEN
    );
  }

  /**
   * Close connection
   */
  close() {
    if (this.ws) {
      // Close the WebSocket directly - don't send invalid session update
      // The API doesn't allow empty modalities array
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close();
      }
      this.ws = null;
      this.isConnected = false;
    }
  }
}
