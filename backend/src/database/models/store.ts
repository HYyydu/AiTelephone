// In-memory database store (will be replaced with PostgreSQL later)
import { Call, Transcript } from '../../types';

interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  created_at: Date;
}

interface Session {
  token: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
}

class InMemoryStore {
  private calls: Map<string, Call> = new Map();
  private transcripts: Map<string, Transcript[]> = new Map();
  private users: Map<string, User> = new Map();
  private sessions: Map<string, Session> = new Map();

  // Call operations
  createCall(call: Call): Call {
    this.calls.set(call.id, call);
    this.transcripts.set(call.id, []);
    return call;
  }

  getCall(id: string, userId?: string): Call | undefined {
    const call = this.calls.get(id);
    
    // If userId is provided, verify the call belongs to that user
    if (call && userId && call.user_id !== userId) {
      return undefined; // Call doesn't belong to this user
    }
    
    return call;
  }

  getAllCalls(userId?: string): Call[] {
    let allCalls = Array.from(this.calls.values());
    
    // Filter by user_id if provided
    if (userId) {
      allCalls = allCalls.filter(call => call.user_id === userId);
    }
    
    return allCalls.sort(
      (a, b) => b.created_at.getTime() - a.created_at.getTime()
    );
  }

  updateCall(id: string, updates: Partial<Call>): Call | undefined {
    const call = this.calls.get(id);
    if (!call) return undefined;

    const updatedCall = { ...call, ...updates };
    this.calls.set(id, updatedCall);
    return updatedCall;
  }

  deleteCall(id: string): boolean {
    const deleted = this.calls.delete(id);
    if (deleted) {
      this.transcripts.delete(id);
    }
    return deleted;
  }

  // Transcript operations
  addTranscript(transcript: Transcript): Transcript {
    const callTranscripts = this.transcripts.get(transcript.call_id) || [];
    callTranscripts.push(transcript);
    this.transcripts.set(transcript.call_id, callTranscripts);
    return transcript;
  }

  getTranscripts(callId: string): Transcript[] {
    return this.transcripts.get(callId) || [];
  }

  // Stats
  getStats(userId?: string) {
    const allCalls = this.getAllCalls(userId);
    return {
      totalCalls: allCalls.length,
      completedCalls: allCalls.filter(c => c.status === 'completed').length,
      failedCalls: allCalls.filter(c => c.status === 'failed').length,
      inProgressCalls: allCalls.filter(c => c.status === 'in_progress').length,
      averageDuration: this.calculateAverageDuration(allCalls),
    };
  }

  private calculateAverageDuration(calls: Call[]): number {
    const completedCalls = calls.filter(c => c.duration_seconds);
    if (completedCalls.length === 0) return 0;
    
    const total = completedCalls.reduce((sum, c) => sum + (c.duration_seconds || 0), 0);
    return Math.round(total / completedCalls.length);
  }

  // User operations
  createUser(user: User): User {
    this.users.set(user.id, user);
    return user;
  }

  getUser(id: string): User | undefined {
    return this.users.get(id);
  }

  getUserByEmail(email: string): User | undefined {
    return Array.from(this.users.values()).find(u => u.email === email);
  }

  // Session operations
  createSession(userId: string): string {
    const token = `token_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const session: Session = {
      token,
      userId,
      createdAt: now,
      expiresAt,
    };

    this.sessions.set(token, session);
    return token;
  }

  getSession(token: string): Session | undefined {
    const session = this.sessions.get(token);
    if (!session) return undefined;

    // Check if expired
    if (new Date() > session.expiresAt) {
      this.sessions.delete(token);
      return undefined;
    }

    return session;
  }

  deleteSession(token: string): boolean {
    return this.sessions.delete(token);
  }
}

export const store = new InMemoryStore();

