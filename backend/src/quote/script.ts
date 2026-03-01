// Generate call script from quote slots - explicit "not specified" for missing optional

import type { QuoteSlots } from "./types";
import { getSchema } from "./schema";

function slotValue(slots: QuoteSlots, key: keyof QuoteSlots): string | null {
  const v = slots[key];
  if (v == null || String(v).trim() === "") return null;
  const trimmed = String(v).trim().toLowerCase();
  if (["unknown", "not specified", "n/a", "skip"].includes(trimmed)) return null;
  return String(v).trim();
}

export function generateCallScript(quoteType: string, slots: QuoteSlots): string {
  const schema = getSchema(quoteType);
  if (!schema) {
    return `I'm calling to ask about pricing. Details: ${JSON.stringify(slots)}.`;
  }

  const procedure = slotValue(slots, "procedure");
  const petAge = slotValue(slots, "pet_age");
  const petBreed = slotValue(slots, "pet_breed");
  const petWeight = slotValue(slots, "pet_weight");

  const procedureText = procedure || "a pet procedure";
  const ageLine = petAge ? `- Age: ${petAge}` : "- Age: Not specified (owner isn't sure)";
  const breedLine = petBreed ? `- Breed: ${petBreed}` : "- Breed: Not specified (owner isn't sure)";
  const weightLine = petWeight ? `- Weight: ${petWeight}` : "- Weight: Not specified";

  return `Hello, I'm calling to ask about pricing.

I'm looking for a quote for ${procedureText}.

Details:
- Species: Cat
${ageLine}
${breedLine}
${weightLine}

Could you tell me:
- The typical price for this procedure
- Whether there are additional fees (exam, blood work, anesthesia)
- Whether pricing varies by age or weight

Thank you.`;
}
