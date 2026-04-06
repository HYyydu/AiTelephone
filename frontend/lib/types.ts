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

// Get-a-quote flow
export type QuoteStatus =
  | "collecting_info"
  | "ready_to_search"
  | "search_done"
  | "calling"
  | "done";

export interface QuoteSlots {
  location?: string | null;
  /** Clinic phone number to call directly (alternative to location search) */
  phone_number?: string | null;
  procedure?: string | null;
  pet_age?: string | null;
  pet_breed?: string | null;
  pet_weight?: string | null;
}

export interface QuoteState {
  quote_type: "vet_clinic";
  status: QuoteStatus;
  slots: QuoteSlots;
  max_clinics_to_call: number;
  clinics_called: number;
  updated_at: string;
}

export interface QuoteValidateResponse {
  success: boolean;
  valid: boolean;
  missingRequired: string[];
  readyToSearch: boolean;
}

export interface ClinicSearchResult {
  id: string;
  name: string;
  address: string;
  phone: string;
  distance?: string;
}

export interface QuoteSearchResponse {
  success: boolean;
  clinics: ClinicSearchResult[];
  count: number;
  location: string;
}

export interface CallStats {
  totalCalls: number;
  completedCalls: number;
  failedCalls: number;
  inProgressCalls: number;
  averageDuration: number;
}

