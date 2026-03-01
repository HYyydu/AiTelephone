# Adding Supabase Database Node in n8n

## Step 1: Create the table in Supabase

1. Go to **Supabase Dashboard** → your project → **SQL Editor**.
2. Run this SQL to create the Vapi test calls table:

```sql
CREATE TABLE vapi_test_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  purpose TEXT NOT NULL,
  voice_preference TEXT,
  additional_instructions TEXT,
  status TEXT DEFAULT 'queued',
  vapi_call_id TEXT,
  twilio_call_sid TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INT,
  transcript TEXT,
  outcome TEXT,
  cost_usd DECIMAL(10, 4)
);

-- Optional: enable Row Level Security (RLS) and allow service role
ALTER TABLE vapi_test_calls ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (n8n will use service role key)
CREATE POLICY "Service role can do all" ON vapi_test_calls
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

3. Click **Run**. The table `vapi_test_calls` will appear under **Table Editor**.

---

## Step 2: Get Supabase credentials

1. In Supabase: **Project Settings** (gear) → **API**.
2. Copy:
   - **Project URL** (e.g. `https://xxxxx.supabase.co`) → this is your **Host** in n8n.
   - **service_role** key (under "Project API keys") → this is your **API key** in n8n.  
   Use the service role so n8n can insert/update rows; do not expose it in frontend code.

---

## Step 3: Add Supabase node in n8n

1. In your workflow, click **+** on the right of the **Webhook** node (or drag from the node panel).
2. Search for **Supabase**.
3. Add the **Supabase** node.
4. Connect **Webhook** → **Supabase**.

---

## Step 4: Configure Supabase credentials in n8n

1. Click the **Supabase** node.
2. Under **Credential to connect with**, click **Create New Credential**.
3. Choose **Supabase API**.
4. Fill in:
   - **Host:** your Project URL, e.g. `https://xxxxx.supabase.co`  
     (use the full URL, including `https://`)
   - **Service Role Secret:** paste the **service_role** key from Step 2.
5. Click **Save** (or **Create**).

---

## Step 5: Configure the Supabase node (Insert row)

Your Webhook node outputs data with the payload **inside `body`** (e.g. `body.phone_number`, `body.purpose`). The table has no `body` column, so you must map **fields inside `body`** to table columns.

### Option A: Manual mapping (recommended when data is in `body`)

1. With the Supabase node selected:
   - **Resource:** **Row**
   - **Operation:** **Create**
   - **Table:** **vapi_test_calls**
2. In **Data to Send**, change from **"Auto-Map Input Data to Columns"** to **"Define Below"** (or **"Map Each Column Manually"** / the option that shows column fields).
3. Add each column and set the value to the **body** field:

   | Column name           | Value (expression) |
   |-----------------------|---------------------|
   | `phone_number`        | `{{ $json.body.phone_number }}` |
   | `purpose`             | `{{ $json.body.purpose }}` |
   | `voice_preference`    | `{{ $json.body.voice_preference }}` |
   | `additional_instructions` | `{{ $json.body.additional_instructions }}` |
   | `status`              | `queued` (literal) |

   Use the expression/settings panel for each column; for `status` you can type `queued` or use a fixed value.

### Option B: Use a Set node so Auto-Map works

1. Add a **Set** node between **Webhook** and **Supabase**.
2. In the Set node, map Webhook `body` fields to new top-level keys:
   - `phone_number` → `{{ $json.body.phone_number }}`
   - `purpose` → `{{ $json.body.purpose }}`
   - `voice_preference` → `{{ $json.body.voice_preference }}`
   - `additional_instructions` → `{{ $json.body.additional_instructions }}`
   - `status` → `queued`
3. Connect: **Webhook** → **Set** → **Supabase**.
4. In the Supabase node, keep **Data to Send** as **"Auto-Map Input Data to Columns"** (the Set node output has the right top-level keys).

3. Optional: in **Options**, set **Return All** to **Yes** if you want the created row back for the next node.

---

## Step 6: Check the Webhook payload shape

1. In the **Webhook** node, click **Listen for test event**.
2. Send a POST request, e.g.:

   ```bash
   curl -X POST http://localhost:5678/webhook-test/vapi/create-call \
     -H "Content-Type: application/json" \
     -d '{"phone_number":"+15551234567","purpose":"Test refund","voice_preference":"professional_female"}'
   ```

3. After the event is received, look at the **Webhook** node output:
   - If you see `body.phone_number`, use `{{ $json.body.phone_number }}` in Supabase.
   - If you see `phone_number` at the top level, use `{{ $json.phone_number }}`.

Use the same pattern for `purpose`, `voice_preference`, `additional_instructions`.

---

## Step 7: Optional – Return the created row

If the next node (e.g. HTTP Request to Vapi) needs the new row’s `id`:

1. In the Supabase node **Options**, enable **Return All** (or equivalent “return row” option).
2. In the next node you can reference the new id with something like `{{ $json.id }}` (adjust to the exact key n8n returns).

---

## Summary

| Step | Action |
|------|--------|
| 1 | Create `vapi_test_calls` in Supabase SQL Editor |
| 2 | Copy Project URL and **service_role** from Supabase → Settings → API |
| 3 | Add Supabase node after Webhook |
| 4 | Create Supabase credential: Host = Project URL, Service Role Secret = service_role key |
| 5 | Supabase node: Resource = Row, Operation = Create, Table = vapi_test_calls, map columns from `$json` or `$json.body` |
| 6 | Test with a POST to the webhook and confirm rows in Supabase Table Editor |

---

## If you don’t see “Supabase” in n8n

- Update n8n to the latest version (Supabase is built-in in recent versions).
- If still missing, use the **HTTP Request** node and call Supabase REST API:
  - URL: `https://YOUR_PROJECT_REF.supabase.co/rest/v1/vapi_test_calls`
  - Method: POST
  - Headers:  
    `apikey: YOUR_SERVICE_ROLE_KEY`  
    `Authorization: Bearer YOUR_SERVICE_ROLE_KEY`  
    `Content-Type: application/json`
  - Body: JSON with `phone_number`, `purpose`, etc., from `$json` or `$json.body`.
