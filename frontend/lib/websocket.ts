// WebSocket client for real-time updates
import { io, Socket } from "socket.io-client";
import { Transcript, CallStatus } from "./types";

// Connection state tracking
type ConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

// Normalize WebSocket URL - Socket.io handles protocol conversion automatically
// but we need to ensure the URL is correct for the environment
function getWebSocketUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3001";

  // If running in browser and the env URL is http but we're on https, upgrade it
  if (typeof window !== "undefined") {
    const currentProtocol = window.location.protocol;
    const isSecure = currentProtocol === "https:";

    // If we're on HTTPS but the WS_URL is HTTP, convert to HTTPS
    if (isSecure && envUrl.startsWith("http://")) {
      const httpsUrl = envUrl.replace("http://", "https://");
      console.log(`🔒 Upgrading WebSocket URL from HTTP to HTTPS: ${httpsUrl}`);
      return httpsUrl;
    }

    // If we're on HTTP but the WS_URL is HTTPS, keep HTTPS (might be intentional)
    // Socket.io will handle the protocol negotiation
  }

  return envUrl;
}

const WS_URL = getWebSocketUrl();

class WebSocketClient {
  private socket: Socket | null = null;
  private pendingCallId: string | null = null;
  private connectionCallbacks: Array<() => void> = [];
  private state: ConnectionState = "disconnected";
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 15; // Increased for tunnel stability
  private reconnectTimer: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private lastPongTime: number = 0;
  private connectionStartTime: number = 0;
  private stateChangeCallbacks: Array<(state: ConnectionState) => void> = [];

  /**
   * Calculate exponential backoff delay for reconnection
   * Formula: min(baseDelay * 2^attempt, maxDelay)
   */
  private getReconnectDelay(attempt: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds max
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 1000;
    return delay + jitter;
  }

  /**
   * Update connection state and notify callbacks
   */
  private setState(newState: ConnectionState) {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;
      console.log(`🔄 Connection state: ${oldState} → ${newState}`);
      this.stateChangeCallbacks.forEach((callback) => callback(newState));
    }
  }

  /**
   * Validate tunnel URL is still accessible
   */
  private async validateTunnelUrl(): Promise<boolean> {
    if (
      !WS_URL.includes("trycloudflare.com") &&
      !WS_URL.includes("cfargotunnel.com")
    ) {
      // Not a tunnel URL, skip validation
      return true;
    }

    try {
      // Try to fetch the health endpoint (or any endpoint) to validate tunnel
      const response = await fetch(`${WS_URL}/api/webhooks/diagnostics`, {
        method: "GET",
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      return response.ok;
    } catch (error) {
      console.warn("⚠️ Tunnel URL validation failed:", error);
      return false;
    }
  }

  /**
   * Start connection health monitoring
   */
  private startHealthCheck() {
    this.stopHealthCheck();

    this.healthCheckInterval = setInterval(() => {
      if (!this.socket?.connected) {
        return;
      }

      // Check if we've received a pong recently (Socket.io sends pong automatically)
      // If connection is stale, force reconnection
      const timeSinceLastPong = Date.now() - this.lastPongTime;
      const maxSilenceTime = 60000; // 60 seconds without activity = stale connection

      if (this.lastPongTime > 0 && timeSinceLastPong > maxSilenceTime) {
        console.warn("⚠️ Connection appears stale, reconnecting...");
        this.handleReconnect();
      }
    }, 10000); // Check every 10 seconds
  }

  /**
   * Stop connection health monitoring
   */
  private stopHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Handle reconnection with exponential backoff
   */
  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("❌ Max reconnection attempts reached");
      this.setState("error");
      return;
    }

    // Clear any existing reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const delay = this.getReconnectDelay(this.reconnectAttempts);
    console.log(
      `🔄 Reconnecting in ${Math.round(delay / 1000)}s (attempt ${
        this.reconnectAttempts + 1
      }/${this.maxReconnectAttempts})`,
    );

    this.setState("reconnecting");
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    // If socket exists but not connected, disconnect and recreate
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    // Reset reconnect attempts if we're manually connecting
    if (this.state !== "reconnecting") {
      this.reconnectAttempts = 0;
    }

    this.setState("connecting");
    console.log(`🔌 Connecting to WebSocket at: ${WS_URL}`);
    console.log(
      `   Environment variable: ${process.env.NEXT_PUBLIC_WS_URL || "not set"}`,
    );

    // Validate tunnel URL before connecting (async, but don't block)
    if (typeof window !== "undefined") {
      this.validateTunnelUrl().then((isValid) => {
        if (!isValid) {
          console.warn("⚠️ Tunnel URL validation failed - connection may fail");
          console.warn(
            "💡 Tip: Check if your Cloudflare tunnel is still running",
          );
        }
      });
    }

    // Socket.io configuration
    // Note: Socket.io automatically handles protocol upgrades (http->ws, https->wss)
    // The transports order matters: try websocket first, fallback to polling
    this.socket = io(WS_URL, {
      transports: ["websocket", "polling"],
      reconnection: false, // We handle reconnection manually for better control
      // Add timeout to detect connection issues faster
      timeout: 20000, // 20 seconds timeout for tunnel connections
      // Force new connection to avoid reusing old connections
      forceNew: true,
      // Allow credentials for CORS
      withCredentials: true,
      // Auto-upgrade to websocket when available
      upgrade: true,
    });

    this.socket.on("connect", () => {
      console.log("✅ WebSocket connected");
      console.log(`   Socket ID: ${this.socket?.id || "unknown"}`);
      console.log(
        `   Transport: ${this.socket?.io?.engine?.transport?.name || "unknown"}`,
      );
      if (typeof window !== "undefined") {
        console.log(`   Page origin: ${window.location.origin}`);
      }

      // Reset reconnect attempts on successful connection
      this.reconnectAttempts = 0;
      this.connectionStartTime = Date.now();
      this.lastPongTime = Date.now();
      this.setState("connected");

      // Start health monitoring
      this.startHealthCheck();

      // Join pending call if there is one
      if (this.pendingCallId && this.socket) {
        console.log(`📞 Joining call room: ${this.pendingCallId}`);
        this.socket.emit("join_call", this.pendingCallId);
        this.pendingCallId = null;
      }

      // Execute any pending connection callbacks
      this.connectionCallbacks.forEach((callback) => callback());
      this.connectionCallbacks = [];
    });

    // Track connection activity for health monitoring
    // Socket.io handles ping/pong internally, we just track when we last saw activity
    this.socket.onAny(() => {
      // Any event from server indicates connection is alive
      this.lastPongTime = Date.now();
    });

    this.socket.on("disconnect", (reason) => {
      console.log(`❌ WebSocket disconnected: ${reason}`);
      this.setState("disconnected");
      this.stopHealthCheck();

      // Handle reconnection based on disconnect reason
      if (reason === "io server disconnect") {
        // Server disconnected us, don't auto-reconnect
        console.log("   Server initiated disconnect, not reconnecting");
        this.setState("error");
      } else if (reason === "io client disconnect") {
        // Client disconnected, don't auto-reconnect
        console.log("   Client initiated disconnect, not reconnecting");
      } else {
        // Network error or other issues - attempt reconnection
        console.log("   Network issue detected, will attempt reconnection");
        this.handleReconnect();
      }
    });

    this.socket.on("connect_error", (error: any) => {
      console.error("❌ WebSocket connection error:", error);
      console.error(`   Attempted URL: ${WS_URL}`);
      console.error(`   Error type: ${error?.type || "unknown"}`);
      console.error(`   Error message: ${error?.message || "no message"}`);
      if (error?.data) {
        console.error(`   Error data:`, error.data);
      }

      // Diagnostic information
      if (typeof window !== "undefined") {
        console.error(`   Current page origin: ${window.location.origin}`);
        console.error(`   Current page protocol: ${window.location.protocol}`);
        console.error(
          `   WebSocket URL protocol: ${
            WS_URL.startsWith("https")
              ? "https"
              : WS_URL.startsWith("http")
                ? "http"
                : "unknown"
          }`,
        );
      }

      // Check if it's a CORS error
      if (error.message?.includes("CORS") || error.message?.includes("cors")) {
        console.error(
          "   🚨 CORS ERROR DETECTED - Backend may be blocking this origin",
        );
        console.error(
          `   Current origin: ${
            typeof window !== "undefined" ? window.location.origin : "unknown"
          }`,
        );
        console.error(
          "   💡 Solution: Check backend CORS configuration allows this origin",
        );
        console.error(
          "   💡 For Cloudflare tunnel, ensure backend allows *.trycloudflare.com origins",
        );
      }

      // Check if it's a timeout
      if (
        error.message?.includes("timeout") ||
        error.message?.includes("xhr poll error")
      ) {
        console.error(
          "   🚨 TIMEOUT ERROR - Backend may be unreachable or slow",
        );
        console.error(
          "   💡 Solution: Check if backend is running and accessible",
        );
        console.error(
          "   💡 For Cloudflare tunnel, verify tunnel is active and pointing to localhost:3001",
        );
        console.error(
          "   💡 Tip: Quick tunnel URLs change on restart - check if tunnel URL needs updating",
        );
      }

      // Check if it's a protocol mismatch
      if (
        error.message?.includes("Mixed Content") ||
        error.message?.includes("SSL")
      ) {
        console.error(
          "   🚨 PROTOCOL MISMATCH - HTTPS page trying to connect to HTTP",
        );
        console.error(
          "   💡 Solution: Ensure NEXT_PUBLIC_WS_URL uses https:// for Cloudflare tunnel",
        );
      }

      // Check if it's a tunnel-specific error
      if (
        WS_URL.includes("trycloudflare.com") ||
        WS_URL.includes("cfargotunnel.com")
      ) {
        console.error("   🚨 TUNNEL CONNECTION ERROR");
        console.error(
          "   💡 Your Cloudflare tunnel URL may have changed or expired",
        );
        console.error(
          "   💡 Quick tunnels (trycloudflare.com) are temporary and change on restart",
        );
        console.error(
          "   💡 Solution: Check tunnel terminal for new URL, or use named tunnel for stability",
        );
        console.error(
          "   💡 See CLOUDFLARE_STABLE_URL_SETUP.md for stable tunnel setup",
        );
      }

      // Attempt reconnection with exponential backoff
      this.handleReconnect();
    });

    this.socket.on("error", (error) => {
      console.error("❌ WebSocket error:", error);
      // Log more detailed error information
      if (error instanceof Error) {
        console.error("   Error message:", error.message);
        console.error("   Error stack:", error.stack);
      } else if (typeof error === "object" && error !== null) {
        console.error("   Error details:", JSON.stringify(error, null, 2));
      } else {
        console.error("   Error value:", String(error));
      }
      console.error(
        "   Connection state:",
        this.socket?.connected ? "connected" : "disconnected",
      );
      console.error("   Socket ID:", this.socket?.id || "none");
    });

    return this.socket;
  }

  disconnect() {
    // Clear reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Stop health monitoring
    this.stopHealthCheck();

    // Disconnect socket
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    // Reset state
    this.pendingCallId = null;
    this.connectionCallbacks = [];
    this.reconnectAttempts = 0;
    this.setState("disconnected");
  }

  joinCall(callId: string) {
    if (this.socket?.connected) {
      console.log(`📞 Joining call room: ${callId}`);
      this.socket.emit("join_call", callId);
    } else {
      console.log(`⏳ Call join queued (waiting for connection): ${callId}`);
      this.pendingCallId = callId;
      // Ensure we're trying to connect
      this.connect();
    }
  }

  leaveCall(callId: string) {
    if (this.socket?.connected) {
      this.socket.emit("leave_call", callId);
    }
  }

  onTranscript(callback: (transcript: Transcript) => void) {
    // Register listener immediately, even if not connected
    // Socket.io will queue events if needed
    const socket = this.socket || this.connect();
    socket.on("transcript", callback);
  }

  onCallStatus(
    callback: (data: {
      call_id: string;
      status: CallStatus;
      duration?: number;
    }) => void,
  ) {
    const socket = this.socket || this.connect();
    socket.on("call_status", callback);
  }

  onCallEnded(
    callback: (data: {
      call_id: string;
      outcome?: string;
      duration: number;
    }) => void,
  ) {
    const socket = this.socket || this.connect();
    socket.on("call_ended", callback);
  }

  off(event: string, callback?: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Subscribe to connection state changes
   */
  onStateChange(callback: (state: ConnectionState) => void) {
    this.stateChangeCallbacks.push(callback);
    // Immediately call with current state
    callback(this.state);

    // Return unsubscribe function
    return () => {
      const index = this.stateChangeCallbacks.indexOf(callback);
      if (index > -1) {
        this.stateChangeCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Get connection statistics
   */
  getConnectionStats() {
    return {
      state: this.state,
      connected: this.isConnected(),
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      uptime:
        this.connectionStartTime > 0
          ? Date.now() - this.connectionStartTime
          : 0,
      lastPongTime: this.lastPongTime,
      socketId: this.socket?.id || null,
      transport: this.socket?.io?.engine?.transport?.name || null,
    };
  }

  /**
   * Manually trigger reconnection (useful for UI buttons)
   */
  reconnect() {
    console.log("🔄 Manual reconnection triggered");
    this.reconnectAttempts = 0; // Reset attempts
    this.disconnect();
    setTimeout(() => this.connect(), 500); // Small delay before reconnecting
  }
}

export const wsClient = new WebSocketClient();
