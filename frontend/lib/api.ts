// API client for backend communication
import { Call, CreateCallRequest, Transcript, CallStats } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('auth_token');
      if (storedToken) {
        this.token = storedToken;
      }
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('auth_token', token);
      } else {
        localStorage.removeItem('auth_token');
      }
    }
  }

  // Get token from instance or localStorage
  private getToken(): string | null {
    if (this.token) {
      return this.token;
    }
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('auth_token');
      if (storedToken) {
        this.token = storedToken;
        return storedToken;
      }
    }
    return null;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string> || {}),
    };

    // Only add auth token if it exists (for optional auth features)
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ 
          message: `Request failed with status ${response.status}` 
        }));
        throw new Error(error.message || error.error || `HTTP ${response.status}`);
      }

      return response.json();
    } catch (error) {
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Unable to connect to server. Please make sure the backend is running.');
      }
      throw error;
    }
  }

  // Auth endpoints
  async signUp(name: string, email: string, password: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    if (response.success && response.token) {
      this.setToken(response.token);
    }
    return response;
  }

  async signIn(email: string, password: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (response.success && response.token) {
      this.setToken(response.token);
    }
    return response;
  }

  async signOut(): Promise<{ success: boolean }> {
    const response = await this.request<{ success: boolean }>('/api/auth/signout', {
      method: 'POST',
      body: JSON.stringify({ token: this.token }),
    });
    this.setToken(null);
    return response;
  }

  async refreshToken(): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ token: this.token }),
    });
    if (response.success && response.token) {
      this.setToken(response.token);
    }
    return response;
  }

  async getCurrentUser(): Promise<{ success: boolean; user?: User }> {
    return this.request('/api/auth/me');
  }

  async requestPhoneOTP(phone: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/api/auth/phone/request', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
    return response;
  }

  async verifyPhoneOTP(phone: string, token: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/api/auth/phone/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, token }),
    });
    if (response.success && response.token) {
      this.setToken(response.token);
    }
    return response;
  }

  // Call endpoints
  async createCall(data: CreateCallRequest): Promise<{ success: boolean; call: Call }> {
    return this.request('/api/calls', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCalls(): Promise<{ success: boolean; calls: Call[]; count: number }> {
    return this.request('/api/calls');
  }

  async getCall(id: string): Promise<{ success: boolean; call: Call }> {
    return this.request(`/api/calls/${id}`);
  }

  async getTranscripts(callId: string): Promise<{ success: boolean; transcripts: Transcript[]; count: number }> {
    return this.request(`/api/calls/${callId}/transcripts`);
  }

  async getStats(): Promise<{ success: boolean; stats: CallStats }> {
    return this.request('/api/calls/stats/summary');
  }

  async deleteCall(id: string): Promise<{ success: boolean }> {
    return this.request(`/api/calls/${id}`, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiClient(API_BASE_URL);
