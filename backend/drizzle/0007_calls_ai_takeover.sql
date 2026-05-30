-- Support "Let AI take over" after the account owner joined the live conference.
ALTER TABLE "calls" ADD COLUMN IF NOT EXISTS "user_join_call_sid" varchar(255);
ALTER TABLE "calls" ADD COLUMN IF NOT EXISTS "ai_takeover_at" timestamp;
