# Order Number Hallucination Analysis

## Summary

When a user starts a call **without** providing an order number (e.g. "damaged strawberries" with no order number in purpose/context), the AI sometimes **says a made-up order number** — specifically the string **"A, D, F, A, S, D, G, A, S, D, G"** (or "ADFASDGASDG"). This is not random generation; it is **hallucination from a hardcoded example** in the real-time agent’s system prompt.

---

## Root Cause

### 1. Origin of the hallucination

- The value **"A, D, F, A, S, D, G, A, S, D, G"** is **developer placeholder text** (home-row keys on a QWERTY keyboard: A, S, D, F, G).
- It appears in **`backend/src/websocket/gpt4o-realtime-handler.ts`** as a **concrete example** meant to teach the model:
  - How to spell out an order number character-by-character.
  - That it must **not** add "Thank you for your help. Goodbye" after giving the number.

### 2. Where it appears in code

In `buildSystemPrompt()` inside `gpt4o-realtime-handler.ts`, the instructions include:

```text
→ Example CORRECT response: "The order number is A, D, F, A, S, D, G, A, S, D, G."
→ Example WRONG response: "The order number is A, D, F, A, S, D, G, A, S, D, G. Thank you for your help. Goodbye." ❌ NEVER DO THIS
```

These lines are in the **"WHEN ASKED FOR SPECIFIC INFORMATION (order number, email, etc.)"** section and are **always** present, regardless of whether the call actually has an order number.

### 3. How the call context is set

- Order number is **only** taken from `purpose` and `additional_instructions` via regex, e.g.:
  - `Order Number: 12345`, `order number 12345`, `order #X`, etc.
- If the user does **not** include an order number, `orderNumber` is **`null`** and **no** order number is added to **"Available info"**.

So for a call like “damaged strawberries” with no order number:

1. **Data extraction:** `orderNumber === null`, so “Available info” has no order number.
2. **Rep asks:** “What’s your order number?”
3. **Model behavior:** The prompt tells it to “provide it immediately” and gives a **concrete** example with a specific string. With no real order number in context, the model can **default to repeating that example** instead of following the “if you don’t have it, say so” instruction.
4. **Result:** The model says the placeholder out loud → **hallucination**.

So the hallucination comes from **using a single, fixed example string** in the prompt. When the model has no real order number, it can treat that example as the thing to say.

---

## Why it happens (mechanism)

1. **Strong “provide order number” framing**  
   The prompt heavily emphasizes: when asked for order number, spell it out and only say the number (no goodbye). The **concrete** example is the only spelled-out order number in the prompt.

2. **Example is too literal**  
   “A, D, F, A, S, D, G, A, S, D, G” is a full, valid-looking answer. The model is not given a **real** order number for this call, so it can copy the only example it has.

3. **“If you don’t have it” is weaker than the example**  
   The instruction to say “I don’t have that information…” is present but competes with a very salient, copy-paste-ready phrase. Under pressure to “provide it immediately,” the model can follow the example instead of the “don’t have it” branch.

4. **No conditional on having an order number**  
   The same example text is injected whether or not `orderNumber` is null. So the model is always shown a **specific** order number phrase, even when the system actually has **no** order number for this call.

---

## Recommended fixes (implemented and optional)

### Fix 1: Remove literal placeholder from the prompt (implemented)

- **When the call has an order number:**  
  Use the **actual** spelled form (e.g. `orderNumberSpelled`) in the example so the model sees the correct format with real data:
  - `Example CORRECT: "The order number is ${orderNumberSpelled}."`

- **When the call does not have an order number:**  
  - Do **not** show any concrete fake order number (no “A, D, F, A, S, D, G…”).
  - Only describe the format: e.g. “The order number is [spelled character by character].”
  - Add an explicit rule: **If order number is not in Available info, say you don’t have it; NEVER make up or use an example/fake order number.**

This prevents the model from having a single “canonical” fake string to repeat.

### Fix 2: Strengthen “no fabrication” (optional)

- In the **VERIFICATION & PRIVACY** (or similar) section, add:
  - “Only provide information that appears in **Available info** above. If order number is not listed there, you do **not** have an order number — do not say one.”
- Optionally repeat a short version of this in the “WHEN ASKED FOR SPECIFIC INFORMATION” block.

### Fix 3: General principle for prompts

- Avoid **literal placeholder values** (like “ADFASDG” or “example@email.com”) in examples when the model might output them verbatim.
- Prefer:
  - **Abstract placeholders:** “[spelled out]”, “[your order number]”, or
  - **Dynamic examples:** when the field exists in context, inject the real value (e.g. `orderNumberSpelled`) so the example is both correct and impossible to confuse with “fake data.”

---

## Files to change

- **`backend/src/websocket/gpt4o-realtime-handler.ts`**  
  - In `buildSystemPrompt()`, replace the hardcoded “A, D, F, A, S, D, G, A, S, D, G” example with:
    - Conditional on `orderNumber` / `orderNumberSpelled`: real spelled value in the example when present.
    - When absent: only format description + explicit “do not have it / never make up” instruction, no concrete fake string.

---

## Verification

After the fix:

1. Start a call **without** an order number (e.g. purpose: “Customer needs help with damaged strawberries”, no “Order Number: …”).
2. When the rep asks “What’s your order number?”, the AI should respond with the “I don’t have that information with me right now…” (or similar) line and **never** say “A, D, F, A, S, D, G” or any other invented number.
3. Start a call **with** an order number; when asked, the AI should spell out the **actual** order number from context, not a placeholder.

This document can be updated when additional guardrails (e.g. post-processing or logging) are added.
