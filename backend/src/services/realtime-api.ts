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
  private sessionConfigured: boolean = false;
  private keepaliveInterval: NodeJS.Timeout | null = null;

  constructor(realtimeConfig: RealtimeConfig = {}) {
    this.realtimeConfig = {
      model: realtimeConfig.model || "gpt-realtime",
      voice: realtimeConfig.voice || "ash",
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

        // Start keepalive ping to prevent timeout (every 20 seconds)
        // OpenAI Realtime API requires periodic pings to keep connection alive
        this.keepaliveInterval = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            try {
              this.ws.ping();
            } catch (error) {
              console.warn("⚠️  Error sending keepalive ping:", error);
            }
          }
        }, 20000); // 20 seconds - OpenAI typically times out after 30-60 seconds of inactivity

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
        this.sessionConfigured = false;

        // Clear keepalive interval
        if (this.keepaliveInterval) {
          clearInterval(this.keepaliveInterval);
          this.keepaliveInterval = null;
        }

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
    console.log(
      `   - VAD Threshold: ${process.env.OPENAI_VAD_THRESHOLD || "0.05"}`
    );
    console.log(
      `   - VAD create_response (API auto-reply per turn): ${process.env.OPENAI_VAD_CREATE_RESPONSE === "true"}`,
    );

    const vadCreateResponse =
      process.env.OPENAI_VAD_CREATE_RESPONSE === "true";

    const sessionConfig = {
      type: "session.update",
      session: {
        type: "realtime",
        model: this.realtimeConfig.model,
        instructions: instructions || this.realtimeConfig.instructions || "",
        output_modalities: ["audio"],
        audio: {
          input: {
            format: {
              type: "audio/pcm",
              rate: 24000,
            },
            transcription: {
              model: "whisper-1",
            },
            turn_detection: {
              type: "server_vad",
              // When false (default), only our explicit response.create runs after transcription.
              create_response: vadCreateResponse,
              threshold: parseFloat(process.env.OPENAI_VAD_THRESHOLD || "0.05"),
              prefix_padding_ms: parseInt(
                process.env.OPENAI_PREFIX_PADDING_MS || "50",
                10
              ),
              silence_duration_ms: config.openai.silenceDurationMs,
            },
          },
          output: {
            format: {
              type: "audio/pcm",
              rate: 24000,
            },
            voice: this.realtimeConfig.voice || "ash",
          },
        },
      },
    };

    this.sessionConfigured = false;
    this.send(sessionConfig);
    console.log("✅ Session configuration sent");
  }

  private buildResponseOptions(
    instructions?: string,
  ): Record<string, unknown> {
    // GA gpt-realtime: response.create accepts output_modalities + optional instructions only
    // (temperature / max_output_tokens are not valid on response.*).
    const response: Record<string, unknown> = {
      output_modalities: ["audio"],
    };
    if (instructions) {
      response.instructions = instructions;
    }
    return response;
  }

  isSessionConfigured(): boolean {
    return this.sessionConfigured;
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
      response: this.buildResponseOptions(),
    });

    return true;
  }

  /**
   * Request a one-off spoken response (e.g. idle check) without user input in context.
   */
  requestResponseWithInstructions(instructions: string) {
    if (!this.ws || !this.isConnected) {
      return false;
    }

    this.send({
      type: "response.create",
      response: this.buildResponseOptions(instructions),
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

    if (messageType === "session.updated") {
      this.sessionConfigured = true;
      console.log("✅ Realtime API session.updated — GA config applied");
    } else if (
      messageType === "error" &&
      message.error?.param?.startsWith?.("session.")
    ) {
      this.sessionConfigured = false;
    }

    // Log message types for debugging
    if (
      !messageType.includes("audio_transcript") &&
      !messageType.includes("output_audio_transcript") &&
      !messageType.includes("audio.delta") &&
      !messageType.includes("output_audio.delta")
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
    // Clear keepalive interval
    if (this.keepaliveInterval) {
      clearInterval(this.keepaliveInterval);
      this.keepaliveInterval = null;
    }

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
