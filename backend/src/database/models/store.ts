// In-memory database store (will be replaced with PostgreSQL later)
import { Call, Transcript } from '../../types';

class InMemoryStore {
  private calls: Map<string, Call> = new Map();
  private transcripts: Map<string, Transcript[]> = new Map();

  // Call operations
  createCall(call: Call): Call {
    this.calls.set(call.id, call);
    this.transcripts.set(call.id, []);
    return call;
  }

  getCall(id: string): Call | undefined {
    return this.calls.get(id);
  }

  getAllCalls(): Call[] {
    return Array.from(this.calls.values()).sort(
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
  getStats() {
    const allCalls = this.getAllCalls();
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
}

export const store = new InMemoryStore();

