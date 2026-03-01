# Get-a-Quote: Concrete Specs (Copy-Paste Ready)

This doc holds the **literal** schema, prompts, script, caller rules, quote state, and state machine you can drop into code or config. It extends [GET_QUOTE_SYSTEM_APPROACH.md](./GET_QUOTE_SYSTEM_APPROACH.md).

---

## 1. Schema (backend, single source of truth)

**Goal:** Block only on **required**; allow `"unknown"` / `"not_specified"` for optional; drive chat + validation + call script from the same object.

**Example: `vet_clinic` schema (JSON)**

```json
{
  "quote_type": "vet_clinic",
  "search_fields": {
    "location": {
      "required": true,
      "description": "Where to search for clinics (city, address, or 'near me')"
    }
  },
  "quote_fields": {
    "procedure": {
      "required": true,
      "description": "Procedure to quote (e.g. cat spay / neuter)"
    },
    "pet_age": {
      "required": false,
      "description": "Age of the pet (clinics often ask)",
      "allow_unknown": true
    },
    "pet_breed": {
      "required": false,
      "description": "Breed of the pet (optional)",
      "allow_unknown": true
    },
    "pet_weight": {
      "required": false,
      "description": "Approximate weight if known",
      "allow_unknown": true
    }
  },
  "limits": {
    "default_max_clinics": 3,
    "absolute_cap": 5
  }
}
```

**Validation rule (pseudocode):**

```ts
// before search or call
requiredMissing = requiredFields.filter(f => !valueExists(f))
if (requiredMissing.length > 0) block()

// optional fields may be: value | "unknown" | null (treated as unknown)
// optional fields are NEVER blocking
```

**Design win:** Optional fields are explicitly represented (or `"unknown"`), not silently missing.

---

## 2. Chat Prompt Snippet (grouped, one follow-up)

**Principle:** Ask required + optional together; at most one follow-up for optional; never loop.

**System prompt snippet (inject when quote_type = vet_clinic):**

```
You are helping the user get a price quote.

Quote type: vet_clinic

Required before proceeding:
- location
- procedure

Optional but recommended (do NOT block if missing):
- pet_age
- pet_breed
- pet_weight

Rules:
- Ask grouped questions when possible.
- You may ask at most ONE follow-up for optional details.
- If the user says they don't know an optional detail, accept it and continue.
- Before searching or calling, summarize collected info and ask for explicit confirmation.
```

**Example assistant message (first pass):**

> I can help with that.
>
> To get an accurate quote, I just need a couple things:
>
> - **Where should I search for clinics?** (city or "near me")
> - **Just to confirm, is this for a cat spay or neuter?**
>
> Clinics often also ask about the cat's **age and breed** — if you know them, that helps, but it's okay if you don't.

**Optional follow-up (only once):**

> No worries. If you happen to know your cat's age, that can help the clinic give a more accurate price — otherwise I can proceed without it.

After that → **stop asking**.

---

## 3. Call Script (no hallucinations, explicit unknowns)

**Rule:** Script = template + filled slots. Missing optional → explicit "not specified".

**Example generated call script:**

```
Hello, I'm calling to ask about pricing.

I'm looking for a quote for a cat spay procedure.

Details:
- Species: Cat
- Age: Not specified
- Breed: Domestic shorthair (if known) OR not specified

Could you tell me:
- The typical price for this procedure
- Whether there are additional fees (exam, blood work, anesthesia)
- Whether pricing varies by age or weight

Thank you.
```

**Critical rule:** Every field is either a real value or an explicit "not specified". Never leave ambiguity.

---

## 4. Caller Instructions (hard guardrails)

**Non-negotiable, system-level.** Add to Vapi / GPT Realtime caller instructions.

```
Caller rules (STRICT):
- Only state facts explicitly provided in the quote context.
- Never invent or assume details.
- If a detail is missing, say "not specified" or "the owner isn't sure."
- Do not guess age, breed, weight, or urgency.
- Your role is only to ask for pricing information.
```

**Example enforced phrasing:**

- ✅ "The owner isn't sure of the cat's breed."
- ❌ "It's probably a domestic shorthair."

---

## 5. Default Max Clinics + Preview + Early Stop

**From schema:** `default_max_clinics: 3`, `absolute_cap: 5`.

**After search, before calling — assistant says:**

> I found **3 cat clinics near you**:
>
> 1. ABC Veterinary (1.2 miles)
> 2. Green Paws Clinic (2.0 miles)
> 3. City Animal Hospital (2.3 miles)
>
> I can call all three to ask for pricing, or we can start with just one. Should I go ahead?

**User options:** "Call all" | "Just the closest one" | "Stop" | "Only call #1 and #2"

**Early stop:** After each call, if user is present → ask "Want me to continue?" If async → stop once `default_max_clinics` reached.

**Hard cap:** Never exceed `absolute_cap` unless explicitly overridden (advanced).

---

## 6. Full vet_clinic system prompt (chat collection phase)

Use this as the **system prompt** when the conversation is in "get_quote" and quote_type is `vet_clinic`. Merge with your existing Holdless persona if needed.

```
You are Holdless, an AI assistant helping the user get a price quote from vet clinics.

Quote type: vet_clinic

You must collect before we can search or call:
- location (where to search: city, address, or "near me")
- procedure (e.g. cat spay, neuter, vaccination)

Optional details (clinics often ask; do NOT block if missing):
- pet_age
- pet_breed
- pet_weight

Rules:
- Ask for required and optional in a grouped way when possible (e.g. one message: location + procedure + "if you know age/breed, that helps").
- You may ask at most ONE follow-up for optional details. If the user says "I don't know" or skips, accept and move on.
- Never ask for the same optional field twice.
- When you have location and procedure, summarize: "I'll search for clinics near [location] for [procedure]. [Optional: Cat is [age], [breed].] Should I go ahead?"
- Only after user confirms, say we're ready to search (or trigger search/call per your integration).
- Be concise and friendly. Do not over-explain.
```

---

## 7. Quote state object (in-memory or DB)

Use this shape to track progress. Persist per conversation or user session so you can resume and validate.

```ts
interface QuoteState {
  quote_type: "vet_clinic";  // extend union for other types later
  status:
    | "collecting_info"   // chat gathering required + optional
    | "ready_to_search"   // required filled, awaiting user confirm
    | "search_done"       // clinics list ready, user chose N
    | "calling"           // calls in progress
    | "done";             // quotes collected or user stopped

  // Filled from chat (required + optional; null | "unknown" for missing optional)
  slots: {
    location?: string | null;
    procedure?: string | null;
    pet_age?: string | null;
    pet_breed?: string | null;
    pet_weight?: string | null;
  };

  // Set after search
  clinics?: Array<{ name: string; address?: string; phone: string; distance?: string }>;
  max_clinics_to_call: number;  // from schema default or user choice, capped by absolute_cap
  clinics_called: number;       // 0 .. max_clinics_to_call

  // Set after each call (optional)
  quotes?: Array<{ clinic_name: string; price_or_note?: string; transcript_id?: string }>;

  updated_at: string;  // ISO
}
```

**Validation (before transition to ready_to_search):**  
`location` and `procedure` present and non-empty. Optional slots can be `null` or `"unknown"`.

---

## 8. State machine (get-a-quote flow)

```
                    ┌─────────────────────┐
                    │   collecting_info   │
                    │ (chat asks grouped, │
                    │  one optional f/u)  │
                    └──────────┬──────────┘
                               │
                    required (location, procedure) filled
                    + user confirmed
                               ▼
                    ┌─────────────────────┐
                    │  ready_to_search    │
                    │ (validate required) │
                    └──────────┬──────────┘
                               │
                    search ran, clinics list + N
                               ▼
                    ┌─────────────────────┐
                    │    search_done       │
                    │ (preview + "call N?")│
                    └──────────┬──────────┘
                               │
                    user confirms N (≤ absolute_cap)
                               ▼
                    ┌─────────────────────┐
                    │      calling         │◄──────┐
                    │ (call 1..N, script   │       │
                    │  explicit unknown)   │       │ "call next?"
                    └──────────┬──────────┘       │
                               │                  │
              user stops OR N reached              │
                               ▼                  │
                    ┌─────────────────────┐       │
                    │        done          │       │
                    │ (quotes shown,       │───────┘
                    │  or "that's enough") │  more clinics to call
                    └─────────────────────┘
```

**Transitions:**

| From              | To               | Condition |
|-------------------|------------------|-----------|
| collecting_info   | ready_to_search  | Required slots filled + user said "go" / "yes" |
| ready_to_search   | search_done      | Search returned list; user sees preview |
| search_done       | calling          | User chose N (≤ cap); first call starts |
| calling           | calling          | User said "call next" and more clinics left |
| calling           | done             | User said "stop" / "enough" OR N calls completed |

---

## How it all fits together

```
Schema (truth)
   ↓
Chat (asks naturally, once)
   ↓
Validation (blocks only on required)
   ↓
Preview (cost + scope control)
   ↓
Call script (explicit unknowns)
   ↓
Result (exact / range / no-quote)
```

Designing **constraints first** (schema, caller rules, caps) keeps prompts and behavior consistent and buildable. This setup prevents hallucination, controls cost, respects user time, and scales to other quote types (plumber, auto, legal) later.
