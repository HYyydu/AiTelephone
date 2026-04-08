ALTER TABLE "calls" ADD COLUMN IF NOT EXISTS "input_tokens" integer;
ALTER TABLE "calls" ADD COLUMN IF NOT EXISTS "output_tokens" integer;
