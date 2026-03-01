// Vet clinic quote schema - single source of truth for fields and limits

import type { QuoteSchema } from "./types";

export const VET_CLINIC_SCHEMA: QuoteSchema = {
  quote_type: "vet_clinic",
  search_fields: {
    location: {
      required: false,
      description:
        "Where to search for clinics (city, address, or zip). Not needed if user provides a clinic phone number.",
    },
    phone_number: {
      required: false,
      description:
        "Clinic/hospital phone number to call directly. User can provide either location (to search) or phone number (to call).",
    },
  },
  quote_fields: {
    procedure: {
      required: true,
      description: "Procedure to quote (e.g. cat spay / neuter)",
    },
    pet_age: {
      required: false,
      description: "Age of the pet (clinics often ask)",
      allow_unknown: true,
    },
    pet_breed: {
      required: false,
      description: "Breed of the pet (optional)",
      allow_unknown: true,
    },
    pet_weight: {
      required: false,
      description: "Approximate weight if known",
      allow_unknown: true,
    },
  },
  limits: {
    default_max_clinics: 3,
    absolute_cap: 5,
  },
};

const SCHEMAS: Record<string, QuoteSchema> = {
  vet_clinic: VET_CLINIC_SCHEMA,
};

export function getSchema(quoteType: string): QuoteSchema | null {
  return SCHEMAS[quoteType] ?? null;
}

export function getRequiredFieldKeys(quoteType: string): string[] {
  const schema = getSchema(quoteType);
  if (!schema) return [];
  const required: string[] = [];
  for (const [key, spec] of Object.entries(schema.search_fields)) {
    if (spec.required) required.push(key);
  }
  for (const [key, spec] of Object.entries(schema.quote_fields)) {
    if (spec.required) required.push(key);
  }
  return required;
}
