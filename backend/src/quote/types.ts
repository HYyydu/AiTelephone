// Quote flow types - single source of truth for get-a-quote

export type QuoteType = "vet_clinic";

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
  quote_type: QuoteType;
  status: QuoteStatus;
  slots: QuoteSlots;
  clinics?: Array<{ name: string; address?: string; phone: string; distance?: string }>;
  max_clinics_to_call: number;
  clinics_called: number;
  quotes?: Array<{ clinic_name: string; price_or_note?: string; transcript_id?: string }>;
  updated_at: string;
}

export interface QuoteFieldSpec {
  required: boolean;
  description: string;
  allow_unknown?: boolean;
}

export interface QuoteSchema {
  quote_type: QuoteType;
  search_fields: Record<string, QuoteFieldSpec>;
  quote_fields: Record<string, QuoteFieldSpec>;
  limits: {
    default_max_clinics: number;
    absolute_cap: number;
  };
}
