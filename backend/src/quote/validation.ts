// Quote validation - block only on required fields; allow location OR phone_number for vet_clinic

import type { QuoteSlots } from "./types";
import { getRequiredFieldKeys } from "./schema";

const UNKNOWN_VALUES = new Set(["unknown", "not specified", "n/a", "skip", ""]);

function valueExists(value: string | null | undefined): boolean {
  if (value == null) return false;
  const trimmed = String(value).trim();
  if (!trimmed) return false;
  if (UNKNOWN_VALUES.has(trimmed.toLowerCase())) return false;
  return true;
}

export function getMissingRequired(quoteType: string, slots: QuoteSlots): string[] {
  if (quoteType === "vet_clinic") {
    const hasProcedure = valueExists(slots.procedure);
    const hasLocation = valueExists(slots.location);
    const hasPhone = valueExists(slots.phone_number);
    const missing: string[] = [];
    if (!hasProcedure) missing.push("procedure");
    if (!hasLocation && !hasPhone) missing.push("location or clinic phone number");
    return missing;
  }
  const required = getRequiredFieldKeys(quoteType);
  return required.filter((key) =>
    !valueExists(slots[key as keyof QuoteSlots] as string | null | undefined)
  );
}

export function isReadyToSearch(quoteType: string, slots: QuoteSlots): boolean {
  return getMissingRequired(quoteType, slots).length === 0;
}

/** True when we have a phone number to call directly (no search needed). */
export function hasDirectPhone(quoteType: string, slots: QuoteSlots): boolean {
  return valueExists(slots.phone_number) === true;
}
