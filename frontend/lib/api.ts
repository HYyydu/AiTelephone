// API client for backend communication
import {
  Call,
  CreateCallRequest,
  Transcript,
  CallStats,
  QuoteSlots,
  QuoteValidateResponse,
  QuoteSearchResponse,
} from "./types";

// Normalize API URL - automatically upgrade HTTP to HTTPS if page is on HTTPS
function getApiUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  // If running in browser and the env URL is http but we're on https, upgrade it
  if (typeof window !== "undefined") {
    const currentProtocol = window.location.protocol;
    const isSecure = currentProtocol === "https:";

    // If we're on HTTPS but the API_URL is HTTP, convert to HTTPS
    if (isSecure && envUrl.startsWith("http://")) {
      const httpsUrl = envUrl.replace("http://", "https://");
      console.log(`🔒 Upgrading API URL from HTTP to HTTPS: ${httpsUrl}`);
      return httpsUrl;
    }
  }

  return envUrl;
}

const API_BASE_URL = getApiUrl();

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
  message?: string;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    // Load token from localStorage if available (client-side only)
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem("auth_token");
      if (storedToken) {
        this.token = storedToken;
      }
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== "undefined") {
      if (token) {
        localStorage.setItem("auth_token", token);
      } else {
        localStorage.removeItem("auth_token");
      }
    }
  }

  // Get token from instance or localStorage
  private getToken(): string | null {
    if (this.token) {
      return this.token;
    }
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem("auth_token");
      if (storedToken) {
        this.token = storedToken;
        return storedToken;
      }
    }
    return null;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit,
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options?.headers as Record<string, string>) || {}),
    };

    // Only add auth token if it exists (for optional auth features)
    const token = this.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          message: `Request failed with status ${response.status}`,
        }));
        throw new Error(
          error.message || error.error || `HTTP ${response.status}`,
        );
      }

      return response.json();
    } catch (error) {
      // Handle network errors with better diagnostics
      if (error instanceof TypeError && error.message.includes("fetch")) {
        console.error("❌ Network error connecting to backend");
        console.error(`   Attempted URL: ${url}`);
        console.error(`   API Base URL: ${API_BASE_URL}`);
        console.error(
          `   Environment variable: ${
            process.env.NEXT_PUBLIC_API_URL || "not set"
          }`,
        );
        if (typeof window !== "undefined") {
          console.error(`   Current page origin: ${window.location.origin}`);
          console.error(
            `   Current page protocol: ${window.location.protocol}`,
          );
        }
        throw new Error(
          `Unable to connect to server at ${API_BASE_URL}. ` +
            `Please make sure the backend is running and NEXT_PUBLIC_API_URL is set correctly.`,
        );
      }
      throw error;
    }
  }

  // Auth endpoints
  async signUp(
    name: string,
    email: string,
    password: string,
  ): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
    if (response.success && response.token) {
      this.setToken(response.token);
    }
    return response;
  }

  async signIn(email: string, password: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>("/api/auth/signin", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (response.success && response.token) {
      this.setToken(response.token);
    }
    return response;
  }

  async signOut(): Promise<{ success: boolean }> {
    const response = await this.request<{ success: boolean }>(
      "/api/auth/signout",
      {
        method: "POST",
        body: JSON.stringify({ token: this.token }),
      },
    );
    this.setToken(null);
    return response;
  }

  async refreshToken(): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>("/api/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ token: this.token }),
    });
    if (response.success && response.token) {
      this.setToken(response.token);
    }
    return response;
  }

  async getCurrentUser(): Promise<{ success: boolean; user?: User }> {
    return this.request("/api/auth/me");
  }

  async requestPhoneOTP(phone: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>(
      "/api/auth/phone/request",
      {
        method: "POST",
        body: JSON.stringify({ phone }),
      },
    );
    return response;
  }

  async verifyPhoneOTP(phone: string, token: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>(
      "/api/auth/phone/verify",
      {
        method: "POST",
        body: JSON.stringify({ phone, token }),
      },
    );
    if (response.success && response.token) {
      this.setToken(response.token);
    }
    return response;
  }

  // Call endpoints
  async createCall(
    data: CreateCallRequest,
  ): Promise<{ success: boolean; call: Call }> {
    return this.request("/api/calls", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getCalls(): Promise<{
    success: boolean;
    calls: Call[];
    count: number;
  }> {
    return this.request("/api/calls");
  }

  async getCall(id: string): Promise<{ success: boolean; call: Call }> {
    return this.request(`/api/calls/${id}`);
  }

  async getTranscripts(
    callId: string,
  ): Promise<{ success: boolean; transcripts: Transcript[]; count: number }> {
    return this.request(`/api/calls/${callId}/transcripts`);
  }

  async getStats(): Promise<{ success: boolean; stats: CallStats }> {
    return this.request("/api/calls/stats/summary");
  }

  async deleteCall(id: string): Promise<{ success: boolean }> {
    return this.request(`/api/calls/${id}`, {
      method: "DELETE",
    });
  }

  // Quote (get-a-quote) endpoints
  async validateQuote(
    quoteType: string,
    slots: QuoteSlots,
  ): Promise<QuoteValidateResponse> {
    return this.request("/api/quote/validate", {
      method: "POST",
      body: JSON.stringify({ quoteType, slots }),
    });
  }

  async getQuoteSchema(
    quoteType: string,
  ): Promise<{ success: boolean; schema?: unknown }> {
    return this.request(`/api/quote/schema/${quoteType}`);
  }

  async getQuoteScript(
    quoteType: string,
    slots: QuoteSlots,
  ): Promise<{ success: boolean; script?: string }> {
    return this.request("/api/quote/script", {
      method: "POST",
      body: JSON.stringify({ quoteType, slots }),
    });
  }

  async searchQuoteClinics(
    location: string,
    quoteType?: string,
  ): Promise<QuoteSearchResponse> {
    return this.request("/api/quote/search", {
      method: "POST",
      body: JSON.stringify({
        location: location.trim(),
        quoteType: quoteType ?? "vet_clinic",
      }),
    });
  }
}

export const api = new ApiClient(API_BASE_URL);
