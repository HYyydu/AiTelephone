// Shared TypeScript types for the frontend

export type CallStatus = 'queued' | 'calling' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

export type SpeakerType = 'ai' | 'human';

export type VoiceType = 'professional_female' | 'professional_male' | 'friendly_female' | 'friendly_male';

export interface Call {
  id: string;
  phone_number: string;
  purpose: string;
  status: CallStatus;
  created_at: string;
  started_at?: string;
  ended_at?: string;
  duration_seconds?: number;
  recording_url?: string;
  call_sid?: string;
  outcome?: string;
  voice_preference?: VoiceType;
  additional_instructions?: string;
}

export interface Transcript {
  id: string;
  call_id: string;
  speaker: SpeakerType;
  message: string;
  timestamp: string;
  confidence?: number;
}

export interface CreateCallRequest {
  phone_number: string;
  purpose: string;
  voice_preference?: VoiceType;
  additional_instructions?: string;
}

export interface CallStats {
  totalCalls: number;
  completedCalls: number;
  failedCalls: number;
  inProgressCalls: number;
  averageDuration: number;
}

