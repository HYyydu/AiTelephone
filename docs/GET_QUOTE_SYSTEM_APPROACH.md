# Get-a-Quote System: Design + Step-by-Step Approach

This doc updates the get-a-quote design with your mitigations (over-asking, hallucinated confidence, cost control) and walks through **how to approach the setup** step by step—without writing code until you’re ready.

---

## Part A: Design Updates (Your Suggestions Baked In)

### 1️⃣ Over-asking → User Friction

**Problem:** Asking too many questions one-by-one annoys users.

**Mitigations (in design):**

| Mitigation | What it means in practice |
|------------|---------------------------|
| **Ask grouped questions** | One turn: “To get a good quote I’ll need: (1) where to search, (2) your cat’s age and breed if you know them. You can answer in one message.” Don’t ask location, then age, then breed in three separate messages. |
| **Allow “I don’t know” paths** | Treat some fields as **optional**. If user says “I don’t know the breed,” store that (or leave blank) and **do not** re-ask. Script for the call will say “breed unknown” so the AI doesn’t invent it. |
| **Don’t block on non-blocking fields** | Only **required** fields block search/call (e.g. location, procedure). Everything else (age, breed) is “nice to have”—we collect if user offers, and allow “skip” or “I don’t know.” |

**Schema implication:**  
- **Required:** `location`, `procedure` (or service_description).  
- **Optional:** `pet_age`, `pet_breed`, etc.  
- Chat prompt: “Collect required; for optional, ask once in a grouped way and allow ‘I don’t know’ or skip.”

---

### 2️⃣ Hallucinated Confidence in Calls

**Problem:** The AI on the phone sounds sure about details the user never gave (e.g. inventing a breed).

**Mitigation:**  
Script/instructions for the call **explicitly allow uncertainty** and forbid inventing.

**In practice:**

- **Structured “unknown” values:**  
  If user didn’t provide breed (or said “I don’t know”), store `pet_breed: null` or `pet_breed: "unknown"`. The **call script** says: “The owner isn’t sure of the breed” or “Breed not specified.”
- **Prompt for the calling AI:**  
  “Only state facts the user provided. For any missing detail, say ‘The owner didn’t specify’ or ‘They’re not sure.’ Do not guess or invent breed, age, or other details.”

So: **one source of truth** (collected slots + explicit “unknown”) and **call script + caller instructions** that mandate uncertainty phrasing.

---

### 3️⃣ Cost Blow-ups (Calls + Retries)

**Problem:** Calling 20 clinics or retrying too much burns time and money.

**Mitigations:**

| Mitigation | What it means in practice |
|------------|---------------------------|
| **Preview number of calls** | Before calling: “I found 5 clinics near [location]. I can call up to 3 by default. Want me to call all 5, or limit to 2–3?” Show the number so the user sees cost/scope. |
| **Limit default to N clinics** | Default max clinics to call = e.g. **3**. User can say “call all” or “just the first one” to adjust. |
| **Let user stop early** | After each call (or after 1–2), user can say “that’s enough” or “stop”—we don’t force the rest. In UI: “Stop after this one” or “I have enough quotes.” |

**Config:**  
- `DEFAULT_MAX_CLINICS_TO_CALL = 3` (or similar).  
- Always show: “I will call [up to N] clinics” before starting.  
- Flow: search → show list + “I’ll call up to N. Proceed?” → user confirms or changes N → call 1, then optionally “call next?” or “stop.”

---

## Part B: Step-by-Step Approach to “Setting” (How to Build It)

Do these in order. Each step is “setting” (config, prompts, schema, UX rules)—implementation can follow once the step is clear.

---

### Step 1: Define quote type and fields (schema)

**Goal:** One place that defines what we collect and what’s required vs optional.

- **Quote type:** e.g. `vet_clinic` (for “cat spray nearby clinic”).
- **Required:** `location`, `procedure` (or `service_description`).  
  - Nothing else is **blocking**.
- **Optional:** `pet_age`, `pet_breed`, `pet_species` (e.g. cat), notes.  
  - Allow “I don’t know” or skip; never block on these.

**Deliverable:**  
- A small schema (could be a JSON object or a table): quote_type → list of fields with `required: true/false`.  
- Rule: “Only required fields block search/call.”

---

### Step 2: Write the “collection” chat prompt (grouped + optional)

**Goal:** Chat asks in a grouped way and allows “I don’t know” / skip on optional fields.

- **System prompt addition** for get_quote (vet_clinic):  
  - “You must collect: **location** (where to search) and **procedure** (e.g. cat spay). You may also ask for **pet age and breed** in the same message if helpful; if the user says they don’t know or skips, do not ask again.”  
  - “Prefer one grouped question for optional info. Do not ask more than one follow-up for optional fields.”  
- **Rule:** Required = must have before “search.” Optional = collect if easy, else leave blank or “unknown.”

**Deliverable:**  
- Exact system-prompt snippet (or bullet list) for get_quote + vet_clinic that implements grouped questions and optional handling.

---

### Step 3: Define “unknown” and script rules for the call

**Goal:** No hallucinated confidence; script and caller instructions allow uncertainty.

- **Data:**  
  - If a field is missing or user said “I don’t know,” store `null` or string `"unknown"`.  
  - Never store a guessed value (e.g. don’t infer “Domestic Shorthair” from “I don’t know”).
- **Call script (template):**  
  - “I’m calling for a quote for [procedure]. [If age known: The cat is X years old.] [If breed known: Breed is Y.] [If breed/age unknown: The owner isn’t sure of the breed/age.]”  
  - So the script **explicitly** says “owner isn’t sure” when we don’t have the info.
- **Caller instructions (for the AI on the phone):**  
  - “Only state facts provided by the user. For any missing detail, say ‘The owner didn’t specify’ or ‘They’re not sure.’ Do not guess or invent breed, age, or other details.”

**Deliverable:**  
- Script template with conditional “[If unknown: …]” phrases.  
- Short “caller rules” paragraph to add to the realtime/call system prompt.

---

### Step 4: Set cost controls (preview + limit + stop)

**Goal:** User sees how many calls will happen, default is capped, and they can stop early.

- **Settings to decide:**  
  - **Default max clinics to call:** e.g. 3.  
  - **Max ever (safety cap):** e.g. 5 or 10.  
- **Flow:**  
  1. After search: “I found **5** clinics. I’ll call up to **3** by default. Want to change that (e.g. 1, 2, or 5)?”  
  2. User confirms or says “call 2 only” / “call all.”  
  3. Before first call: “I’ll call [N] clinics now. You can say ‘stop’ after any call if you have enough.”  
  4. After each call: optionally “Call next clinic?” or “That’s enough” → stop.

**Deliverable:**  
- Numbers: `DEFAULT_MAX_CLINICS = 3`, `MAX_CLINICS_CAP = 5` (or your choice).  
- Short flow description: preview → confirm N → call 1..N with option to stop after each.

---

### Step 5: Validation gate (required only)

**Goal:** Backend only checks **required** fields before search/call.

- **Rule:**  
  - Allow “search” only when: `location` and `procedure` (or service_description) are present.  
  - Do **not** require pet_age, pet_breed, or any optional field.  
- **Error message:**  
  - “I still need [list missing required fields] before I can search.”  
  - Never “I need the breed” if breed is optional.

**Deliverable:**  
- List of required fields per quote type.  
- One sentence: “Search/call is allowed when and only when required fields are present.”

---

### Step 6: Order of operations (recap)

**Goal:** So that “setting” is consistent everywhere.

1. **User says** “Get a quote for my cat spray nearby clinic fee.”  
2. **Intent** = get_quote, **quote type** = vet_clinic.  
3. **Chat** (with Step 2 prompt): grouped question for location + procedure + optional (age/breed); allow “I don’t know.”  
4. **Validation** (Step 5): only location + procedure required.  
5. **Search** → list of clinics.  
6. **Preview + limit** (Step 4): “I found X clinics; I’ll call up to N. Proceed?” User can set N and later stop early.  
7. **Call** (Step 3): script uses “owner isn’t sure” for unknown fields; caller instructions forbid inventing.  
8. **Result:** Show quotes; no over-asking, no hallucinated details, bounded calls.

---

## Checklist Before Implementation

- [ ] Schema: required = location, procedure; optional = age, breed, etc.; “I don’t know” allowed for optional.  
- [ ] Chat prompt: grouped questions; one follow-up max for optional; don’t block on optional.  
- [ ] Call script: explicit “[If unknown: The owner isn’t sure …]” and no invented facts.  
- [ ] Caller instructions: “Only state provided facts; for missing say ‘not specified’ / ‘not sure’.”  
- [ ] Default max clinics (e.g. 3) and cap (e.g. 5); preview before calling; user can stop early.

Once these are set, implementation can follow: schema in code, prompt in system message, validation in backend, and cost controls in the “search → confirm N → call” flow.

**Next:** For copy-paste ready schema, prompts, call script, caller instructions, quote state object, and state machine diagram, see **[GET_QUOTE_CONCRETE_SPEC.md](./GET_QUOTE_CONCRETE_SPEC.md)**.
