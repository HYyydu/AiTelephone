-- Record when the account owner was dialed into the same Twilio conference as the CSR (AI stream ended for that leg).
ALTER TABLE "calls" ADD COLUMN IF NOT EXISTS "user_joined_at" timestamp;
