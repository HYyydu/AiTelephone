# Supabase: Transcripts Schema & Where to Check

This document provides the SQL schema for storing call transcripts in Supabase and where to view them after a call.

## SQL Schema

Run this in **Supabase Dashboard → SQL Editor**. It creates the `calls` and `transcripts` tables if they don't exist, and adds a foreign key so transcripts are correctly linked to calls.

### Option A: Fresh setup (tables don't exist yet)

```sql
-- ============================================================
-- Calls table (must exist before transcripts)
-- ============================================================
CREATE TABLE IF NOT EXISTS "calls" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid,
  "organization_id" uuid,
  "call_sid" varchar(255),
  "to_number" varchar(50) NOT NULL,
  "purpose" text NOT NULL,
  "additional_instructions" text,
  "voice_preference" varchar(50) DEFAULT 'professional_female',
  "status" varchar(50) DEFAULT 'pending',
  "outcome" text,
  "recording_url" text,
  "duration" integer,
  "cost" integer,
  "created_at" timestamp DEFAULT now(),
  "started_at" timestamp,
  "ended_at" timestamp
);

-- ============================================================
-- Transcripts table (stores conversation during & after calls)
-- ============================================================
CREATE TABLE IF NOT EXISTS "transcripts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "call_id" uuid NOT NULL REFERENCES "calls"("id") ON DELETE CASCADE,
  "speaker" varchar(50) NOT NULL,
  "message" text NOT NULL,
  "confidence" integer,
  "timestamp" timestamp DEFAULT now()
);

-- Index for fast lookup of transcripts by call
CREATE INDEX IF NOT EXISTS "transcripts_call_id_idx" ON "transcripts" ("call_id");

-- Index for chronological ordering
CREATE INDEX IF NOT EXISTS "transcripts_timestamp_idx" ON "transcripts" ("timestamp");
```

### Option B: Add FK + indexes when tables already exist (e.g. from Drizzle)

If you already ran Drizzle migrations and `transcripts` exists **without** a foreign key:

```sql
-- Add foreign key (only if it doesn't already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'transcripts_call_id_fkey'
  ) THEN
    ALTER TABLE "transcripts"
    ADD CONSTRAINT "transcripts_call_id_fkey"
    FOREIGN KEY ("call_id") REFERENCES "calls"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS "transcripts_call_id_idx" ON "transcripts" ("call_id");
CREATE INDEX IF NOT EXISTS "transcripts_timestamp_idx" ON "transcripts" ("timestamp");
```

---

## Column reference: `transcripts` table

| Column       | Type      | Description                                      |
| ------------ | --------- | ------------------------------------------------ |
| `id`         | uuid      | Primary key (auto-generated)                     |
| `call_id`    | uuid      | References `calls.id` – which call this belongs to |
| `speaker`    | varchar   | `"ai"` or `"human"`                              |
| `message`    | text      | The spoken text                                  |
| `confidence` | integer  | Optional transcription confidence (0–100)        |
| `timestamp`  | timestamp | When the segment was captured (default: now)     |

---

## Where to check transcripts after a call

### 1. Table Editor (point-and-click)

1. Go to **[Supabase Dashboard](https://supabase.com/dashboard)** → your project.
2. Click **Table Editor** in the left sidebar.
3. Select the **`transcripts`** table.
4. Rows are shown; you can sort by `timestamp` (click the column header) to see the conversation in order.

### 2. SQL Editor (for custom queries)

**Recent transcripts across all calls (most recent first):**

```sql
SELECT t.id, t.call_id, t.speaker, t.message, t.timestamp
FROM transcripts t
ORDER BY t.timestamp DESC
LIMIT 50;
```

**Transcripts for a specific call (by `call_id`):**

```sql
SELECT id, speaker, message, timestamp
FROM transcripts
WHERE call_id = 'YOUR_CALL_ID_HERE'
ORDER BY timestamp ASC;
```

**Transcripts plus call details (phone number, purpose):**

```sql
SELECT
  t.speaker,
  t.message,
  t.timestamp,
  c.to_number AS phone_number,
  c.purpose,
  c.status AS call_status
FROM transcripts t
JOIN calls c ON c.id = t.call_id
WHERE c.id = 'YOUR_CALL_ID_HERE'
ORDER BY t.timestamp ASC;
```

Replace `'YOUR_CALL_ID_HERE'` with the actual call UUID (from `calls.id` or the `call.id` returned when creating the call).

### 3. Getting a `call_id`

- From the app: After creating a call via `POST /api/calls`, the response includes `call.id`.
- From Supabase: In **Table Editor → `calls`**, pick a row and copy the `id` value.

---

## Verifying storage

After a call ends:

1. Backend saves each transcript via `TranscriptService.addTranscript()` during the call.
2. Data is persisted in the `transcripts` table in Supabase.
3. Use **Table Editor → transcripts** or the SQL queries above to confirm rows exist.
4. For a given call, transcripts are ordered by `timestamp` (ascending) to reconstruct the conversation.
