// Database service for calls and transcripts using Drizzle ORM
import { db } from '../db';
import { calls, transcripts } from '../schema';
import { Call, Transcript, CallStatus } from '../../types';
import { eq, and, desc } from 'drizzle-orm';

/**
 * Convert database call record to Call interface
 */
function dbCallToCall(dbCall: typeof calls.$inferSelect): Call {
  return {
    id: dbCall.id,
    user_id: dbCall.user_id || undefined,
    phone_number: dbCall.to_number, // Map to_number -> phone_number
    purpose: dbCall.purpose,
    status: dbCall.status as CallStatus,
    created_at: dbCall.created_at || new Date(),
    started_at: dbCall.started_at || undefined,
    ended_at: dbCall.ended_at || undefined,
    duration_seconds: dbCall.duration || undefined,
    call_sid: dbCall.call_sid || undefined,
    recording_url: dbCall.recording_url || undefined,
    outcome: dbCall.outcome || undefined,
    voice_preference: dbCall.voice_preference as any,
    additional_instructions: dbCall.additional_instructions || undefined,
  };
}

/**
 * Convert Call interface to database call record
 */
function callToDbCall(call: Call): typeof calls.$inferInsert {
  return {
    id: call.id,
    user_id: call.user_id || null,
    to_number: call.phone_number, // Map phone_number -> to_number
    purpose: call.purpose,
    status: call.status,
    created_at: call.created_at,
    started_at: call.started_at || null,
    ended_at: call.ended_at || null,
    duration: call.duration_seconds || null,
    call_sid: call.call_sid || null,
    recording_url: call.recording_url || null,
    outcome: call.outcome || null,
    voice_preference: call.voice_preference || 'professional_female',
    additional_instructions: call.additional_instructions || null,
  };
}

/**
 * Convert database transcript record to Transcript interface
 */
function dbTranscriptToTranscript(dbTranscript: typeof transcripts.$inferSelect): Transcript {
  return {
    id: dbTranscript.id,
    call_id: dbTranscript.call_id,
    speaker: dbTranscript.speaker as 'ai' | 'human',
    message: dbTranscript.message,
    timestamp: dbTranscript.timestamp || new Date(),
    confidence: dbTranscript.confidence || undefined,
  };
}

/**
 * Convert Transcript interface to database transcript record
 */
function transcriptToDbTranscript(transcript: Transcript): typeof transcripts.$inferInsert {
  return {
    id: transcript.id,
    call_id: transcript.call_id,
    speaker: transcript.speaker,
    message: transcript.message,
    timestamp: transcript.timestamp,
    confidence: transcript.confidence || null,
  };
}

/**
 * Call service - handles all database operations for calls
 */
export class CallService {
  /**
   * Create a new call record
   */
  static async createCall(call: Call): Promise<Call> {
    try {
      const dbCall = callToDbCall(call);
      const [inserted] = await db.insert(calls).values(dbCall).returning();
      return dbCallToCall(inserted);
    } catch (error) {
      console.error('Error creating call in database:', error);
      throw error;
    }
  }

  /**
   * Get a call by ID, optionally filtered by user_id
   */
  static async getCall(id: string, userId?: string): Promise<Call | undefined> {
    try {
      const conditions = [eq(calls.id, id)];
      if (userId) {
        conditions.push(eq(calls.user_id, userId));
      }

      const [result] = await db
        .select()
        .from(calls)
        .where(and(...conditions))
        .limit(1);

      return result ? dbCallToCall(result) : undefined;
    } catch (error) {
      console.error('Error fetching call from database:', error);
      throw error;
    }
  }

  /**
   * Get all calls, optionally filtered by user_id
   */
  static async getAllCalls(userId?: string): Promise<Call[]> {
    try {
      let query = db.select().from(calls);
      
      if (userId) {
        query = query.where(eq(calls.user_id, userId)) as any;
      }

      const results = await query.orderBy(desc(calls.created_at));
      return results.map(dbCallToCall);
    } catch (error) {
      console.error('Error fetching calls from database:', error);
      throw error;
    }
  }

  /**
   * Get a call by Twilio CallSid
   */
  static async getCallByCallSid(callSid: string): Promise<Call | undefined> {
    try {
      const [result] = await db
        .select()
        .from(calls)
        .where(eq(calls.call_sid, callSid))
        .limit(1);

      return result ? dbCallToCall(result) : undefined;
    } catch (error) {
      console.error('Error fetching call by CallSid from database:', error);
      throw error;
    }
  }

  /**
   * Update a call record
   */
  static async updateCall(id: string, updates: Partial<Call>): Promise<Call | undefined> {
    try {
      // Convert updates to database format
      const dbUpdates: any = {};
      if (updates.phone_number !== undefined) dbUpdates.to_number = updates.phone_number;
      if (updates.purpose !== undefined) dbUpdates.purpose = updates.purpose;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.started_at !== undefined) dbUpdates.started_at = updates.started_at;
      if (updates.ended_at !== undefined) dbUpdates.ended_at = updates.ended_at;
      if (updates.duration_seconds !== undefined) dbUpdates.duration = updates.duration_seconds;
      if (updates.call_sid !== undefined) dbUpdates.call_sid = updates.call_sid;
      if (updates.recording_url !== undefined) dbUpdates.recording_url = updates.recording_url;
      if (updates.outcome !== undefined) dbUpdates.outcome = updates.outcome;
      if (updates.voice_preference !== undefined) dbUpdates.voice_preference = updates.voice_preference;
      if (updates.additional_instructions !== undefined) dbUpdates.additional_instructions = updates.additional_instructions;

      const [updated] = await db
        .update(calls)
        .set(dbUpdates)
        .where(eq(calls.id, id))
        .returning();

      return updated ? dbCallToCall(updated) : undefined;
    } catch (error) {
      console.error('Error updating call in database:', error);
      throw error;
    }
  }

  /**
   * Delete a call record
   */
  static async deleteCall(id: string): Promise<boolean> {
    try {
      // First delete all transcripts for this call
      await db.delete(transcripts).where(eq(transcripts.call_id, id));
      
      // Then delete the call
      const result = await db.delete(calls).where(eq(calls.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting call from database:', error);
      throw error;
    }
  }

  /**
   * Get call statistics
   */
  static async getStats(userId?: string): Promise<{
    totalCalls: number;
    completedCalls: number;
    failedCalls: number;
    inProgressCalls: number;
    averageDuration: number;
  }> {
    try {
      let query = db.select().from(calls);
      
      if (userId) {
        query = query.where(eq(calls.user_id, userId)) as any;
      }

      const allCalls = await query;
      const callsList = allCalls.map(dbCallToCall);

      const completedCalls = callsList.filter(c => c.status === 'completed');
      const totalDuration = completedCalls.reduce((sum, c) => sum + (c.duration_seconds || 0), 0);
      const averageDuration = completedCalls.length > 0 
        ? Math.round(totalDuration / completedCalls.length) 
        : 0;

      return {
        totalCalls: callsList.length,
        completedCalls: completedCalls.length,
        failedCalls: callsList.filter(c => c.status === 'failed').length,
        inProgressCalls: callsList.filter(c => c.status === 'in_progress' || c.status === 'calling').length,
        averageDuration,
      };
    } catch (error) {
      console.error('Error fetching stats from database:', error);
      throw error;
    }
  }
}

/**
 * Transcript service - handles all database operations for transcripts
 */
export class TranscriptService {
  /**
   * Add a transcript record
   */
  static async addTranscript(transcript: Transcript): Promise<Transcript> {
    try {
      const dbTranscript = transcriptToDbTranscript(transcript);
      const [inserted] = await db.insert(transcripts).values(dbTranscript).returning();
      return dbTranscriptToTranscript(inserted);
    } catch (error) {
      console.error('Error adding transcript to database:', error);
      throw error;
    }
  }

  /**
   * Get all transcripts for a call
   */
  static async getTranscripts(callId: string): Promise<Transcript[]> {
    try {
      const results = await db
        .select()
        .from(transcripts)
        .where(eq(transcripts.call_id, callId))
        .orderBy(transcripts.timestamp);

      return results.map(dbTranscriptToTranscript);
    } catch (error) {
      console.error('Error fetching transcripts from database:', error);
      throw error;
    }
  }
}

