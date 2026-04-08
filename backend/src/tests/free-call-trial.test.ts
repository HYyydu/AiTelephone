import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";

type ConsumeRow = {
  allowed: boolean;
  remaining: number;
};

async function consume(
  pool: Pool,
  userId: string,
): Promise<ConsumeRow> {
  const result = await pool.query<ConsumeRow>(
    "select * from public.consume_free_call_request($1::uuid)",
    [userId],
  );
  const row = result.rows[0];
  if (!row) {
    throw new Error("consume_free_call_request returned no rows");
  }
  return row;
}

async function run() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to run free trial tests");
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes("supabase")
      ? { rejectUnauthorized: false }
      : false,
  });

  try {
    // Test: new user first request allowed with remaining=4.
    {
      const userId = randomUUID();
      const first = await consume(pool, userId);
      assert.equal(first.allowed, true);
      assert.equal(first.remaining, 4);
    }

    // Test: 5th request allowed, 6th rejected.
    {
      const userId = randomUUID();
      let fifth: ConsumeRow | undefined;
      let sixth: ConsumeRow | undefined;

      for (let i = 1; i <= 6; i += 1) {
        const row = await consume(pool, userId);
        if (i === 5) fifth = row;
        if (i === 6) sixth = row;
      }

      assert.ok(fifth);
      assert.ok(sixth);
      assert.equal(fifth.allowed, true);
      assert.equal(fifth.remaining, 0);
      assert.equal(sixth.allowed, false);
      assert.equal(sixth.remaining, 0);
    }

    // Test: concurrent requests do not overspend limit.
    {
      const userId = randomUUID();
      const results = await Promise.all(
        Array.from({ length: 12 }, () => consume(pool, userId)),
      );
      const allowedCount = results.filter((r) => r.allowed).length;
      const deniedCount = results.filter((r) => !r.allowed).length;

      assert.equal(allowedCount, 5);
      assert.equal(deniedCount, 7);
      assert.ok(results.every((r) => r.remaining >= 0));
    }

    console.log("✅ Free trial RPC tests passed");
  } finally {
    await pool.end();
  }
}

run().catch((error) => {
  console.error("❌ Free trial RPC tests failed:", error);
  process.exit(1);
});
