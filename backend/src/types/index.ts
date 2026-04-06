// Shared TypeScript types for the backend

export type CallStatus = 'queued' | 'calling' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

export type SpeakerType = 'ai' | 'human';

/** In-call realtime conversation state (distinct from DB CallStatus). */
export type CallConversationState =
  | 'PRE_ANSWER'
  | 'ACTIVE_CONVERSATION'
  | 'ON_HOLD';

/** Why PRE_ANSWER → ACTIVE_CONVERSATION (for logs / future metrics). */
export type PreAnswerAdvanceReason =
  | 'realtime_session_ready'
  | 'first_remote_transcript';

/** Why we entered ON_HOLD — used by CallStateManager and future detectors. */
export type HoldEnterReason =
  | 'music_vad'
  | 'verbal_signal'
  | 'repeated_announcement';

/** Why we left ON_HOLD. */
export type HoldExitReason =
  | 'speech_return'
  | 'vad_ratio_drop'
  | 'hold_timeout'
  | 'manual';

export type VoiceType = 'professional_female' | 'professional_male' | 'friendly_female' | 'friendly_male';

export interface CallConfig {
  id: string;
  user_id?: string;
  voice_id: VoiceType;
  ai_instructions?: string;
  max_duration_minutes: number;
  created_at: Date;
}

export interface Call {
  id: string;
  user_id?: string; // Associate calls with users
  phone_number: string;
  purpose: string;
  name?: string; // Name the AI uses when introducing itself: "Hi! My name is {name}. I'm calling..."
  status: CallStatus;
  created_at: Date;
  started_at?: Date;
  ended_at?: Date;
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
  timestamp: Date;
  confidence?: number;
}

export interface CreateCallRequest {
  phone_number: string;
  purpose: string;
  name?: string; // Optional. Name for the AI to use: "Hi! My name is {name}. I'm calling..."
  voice_preference?: VoiceType;
  additional_instructions?: string;
}

export interface CallResponse {
  success: boolean;
  call?: Call;
  message?: string;
  error?: string;
}

export interface TranscriptResponse {
  success: boolean;
  transcripts?: Transcript[];
  message?: string;
  error?: string;
}

// WebSocket event types
export interface WebSocketEvents {
  transcript: Transcript;
  call_status: {
    call_id: string;
    status: CallStatus;
    duration?: number;
  };
  call_ended: {
    call_id: string;
    outcome?: string;
    duration: number;
    ended_at?: string; // ISO timestamp when call ended (strong signal for frontend)
  };
  call_hold_status: {
    call_id: string;
    is_on_hold: boolean;
    conversation_state: CallConversationState;
  };
}

