# Step-by-Step Setup Guide: n8n + Vapi + Twilio

## Your Setup Details
- **New Phone Number:** +17723099180
- **Current Webhooks:** Demo URLs (will need to update)
- **Goal:** Set up parallel testing system

---

## Phase 1: Initial Setup (30-45 minutes)

### Step 1: Create Vapi Account

1. **Go to:** https://dashboard.vapi.ai
2. **Sign up** for a free account
3. **Get your API key:**
   - Navigate to Settings → API Keys
   - Copy your API key (save it securely)
4. **Set spending limits:**
   - Go to Settings → Billing
   - Set daily spending limit to **$50** (or your preferred amount)
   - Enable email alerts for spending

**✅ Checkpoint:** You have Vapi API key and spending limits set

---

### Step 2: Setup n8n Instance

**Option A: Local Docker (Recommended for testing)**

**First, start Docker Desktop:**
- Open Docker Desktop application on your Mac
- Wait until it shows "Docker Desktop is running"
- Then run:

```bash
# Run n8n in Docker
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n

# Access at: http://localhost:5678
```

**Option B: Install n8n Locally (No Docker needed)**

```bash
# Install n8n globally
npm install n8n -g

# Start n8n
n8n start

# Access at: http://localhost:5678
```

**Option C: Cloud (Easier, but costs $20/month)**

1. Go to https://n8n.cloud
2. Sign up for free trial
3. Create workspace
4. Access your n8n instance

**✅ Checkpoint:** n8n is running and accessible

---

### Step 3: Expose Your Backend Publicly (for webhooks)

You need a public URL for Twilio and Vapi webhooks. Choose one:

**Option A: Cloudflare Tunnel (Free, Recommended)**
```bash
# Install cloudflared if not installed
brew install cloudflared  # macOS
# or download from: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/

# Run tunnel (in separate terminal)
cloudflared tunnel --url http://localhost:3001

# You'll get a URL like: https://random-words.trycloudflare.com
# Use this as your PUBLIC_URL
```

**Option B: ngrok (Free tier has limitations)**
```bash
# Install ngrok
brew install ngrok  # macOS
# or download from: https://ngrok.com/download

# Run ngrok (in separate terminal)
ngrok http 3001

# Use the HTTPS URL as your PUBLIC_URL
# Note: Free tier has WebSocket limitations
```

**Option C: Deploy Backend (Production-ready)**
- Deploy to Railway, Render, or Vercel
- Use that URL as PUBLIC_URL

**✅ Checkpoint:** You have a public URL (e.g., `https://xxx.trycloudflare.com`)

---

## Phase 2: Configure Vapi (20-30 minutes)

### Step 4: Create Vapi Assistant

1. **Go to Vapi Dashboard:** https://dashboard.vapi.ai
2. **Navigate to:** Assistants → Create Assistant
3. **Configure Assistant:**

   **Basic Settings:**
   - **Name:** "Test Assistant" or "Parallel Test"
   - **Model:** GPT-4o (or GPT-4o-mini for cheaper testing)
   - **Voice:** Choose one (e.g., "alloy", "echo", "shimmer")
   - **First Message:** Leave empty (or customize)

   **System Prompt:**
   - Copy your current system prompt from `backend/src/websocket/gpt4o-realtime-handler.ts`
   - Paste into Vapi's "System Message" field
   - Adjust if needed (Vapi may have different formatting)

   **Voice Settings:**
   - **Voice:** Match your current preferences
   - **Speed:** 1.0 (normal)
   - **Stability:** 0.5-0.7

4. **Save Assistant** and note the Assistant ID

**✅ Checkpoint:** Vapi assistant created with your system prompt

---

### Step 5: Configure Vapi Phone Number

1. **In Vapi Dashboard:** Go to Phone Numbers → Add Phone Number
2. **Select:** "Use Existing Twilio Number"
3. **Enter your Twilio credentials:**
   - Account SID (from Twilio console)
   - Auth Token (from Twilio console)
4. **Select your number:** +17723099180
5. **Configure:**
   - **Assistant:** Select the assistant you just created
   - **Webhook URL:** Will set this in n8n (for now, use placeholder)
   - **Status Callback:** Optional (for monitoring)

**✅ Checkpoint:** Vapi is connected to your Twilio number

---

## Phase 3: Setup n8n Workflow (30-45 minutes)

### Step 6: Create n8n Workflow

**Workflow Structure:**
```
Webhook (Receive Call Request)
  ↓
Store Call in Database
  ↓
Call Vapi API (Create Call)
  ↓
Handle Vapi Webhooks (Status Updates)
  ↓
Store Results
```

### Step 7: Create Webhook Node (Receive Call Requests)

1. **In n8n:** Create new workflow
2. **Add Webhook node:**
   - **Method:** POST
   - **Path:** `/vapi/create-call`
   - **Response Mode:** "Last Node"
   - **Click "Listen for Test Event"** to get webhook URL
   - **Copy the webhook URL** (you'll use this)

**Expected Input:**
```json
{
  "phone_number": "+15551234567",
  "purpose": "Customer needs refund for order #12345",
  "voice_preference": "professional_female",
  "additional_instructions": "Be polite and empathetic"
}
```

---

### Step 8: Add Database Node (Store Call Request)

**Using Supabase (recommended if you already use it):**  
See **[docs/N8N_SUPABASE_SETUP.md](docs/N8N_SUPABASE_SETUP.md)** for step-by-step Supabase + n8n setup.

**Quick summary for Supabase:**
1. In n8n, add a **Supabase** node (search "Supabase" in the node panel).
2. Create credential: **Host** = your Supabase Project URL, **Service Role Secret** = your `service_role` key (from Supabase → Settings → API).
3. **Resource:** Row → **Operation:** Create → **Table:** `vapi_test_calls`.
4. Map columns from Webhook: `phone_number`, `purpose`, `voice_preference`, `additional_instructions` (use `{{ $json.body.phone_number }}` etc. or `{{ $json.phone_number }}` depending on how the Webhook parses the body).

**Create the table in Supabase first:**  
Supabase Dashboard → SQL Editor → run the SQL below (or use the version in `docs/N8N_SUPABASE_SETUP.md`).

**Create Table SQL (Supabase / PostgreSQL):**
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INT,
  transcript TEXT,
  outcome TEXT,
  cost_usd DECIMAL(10, 4)
);
```

---

### Step 9: Add HTTP Request Node (Call Vapi API)

1. **Add HTTP Request node**
2. **Configure:**
   - **Method:** POST
   - **URL:** `https://api.vapi.ai/call`
   - **Authentication:** Header Auth
     - **Name:** `Authorization`
     - **Value:** `Bearer YOUR_VAPI_API_KEY`
   - **Headers:**
     - `Content-Type: application/json`
   - **Body:** (include `assistantOverrides.variableValues` so each call gets the right purpose/instructions—see note below)
   ```json
   {
     "phoneNumberId": "YOUR_VAPI_PHONE_NUMBER_ID",
     "assistantId": "YOUR_ASSISTANT_ID",
     "customer": {
       "number": "{{ $json.phone_number }}"
     },
     "assistantOverrides": {
       "variableValues": {
         "purpose": "{{ $json.purpose }}",
         "additional_instructions": "{{ $json.additional_instructions }}"
       }
     }
   }
   ```
   In your **Vapi assistant** system prompt, use placeholders `{{purpose}}` and `{{additional_instructions}}` so the AI follows the per-call context instead of making up details (e.g. "shoes").

3. **Get Phone Number ID:**
   - In Vapi Dashboard → Phone Numbers
   - Click on your number (+17723099180)
   - Copy the Phone Number ID

4. **Get Assistant ID:**
   - In Vapi Dashboard → Assistants
   - Click on your assistant
   - Copy the Assistant ID

**✅ Checkpoint:** n8n can create calls via Vapi

---

### Step 10: Handle Vapi Webhooks

**Create separate workflow for webhooks:**

1. **Create new workflow:** "Vapi Webhooks Handler"
2. **Add Webhook node:**
   - **Method:** POST
   - **Path:** `/vapi/webhook`
   - **Get webhook URL**

3. **In Vapi Dashboard:**
   - Go to Settings → Webhooks
   - Add webhook URL from n8n
   - Enable events:
     - `call-status-update`
     - `call-end`
     - `function-call`
     - `speech-update`
     - `transcript`

4. **Add Switch node** to handle different event types:
   - `call-status-update` → Update call status
   - `call-end` → Store final results
   - `transcript` → Store transcript chunks

5. **Add Database nodes** to update records

---

## Phase 4: Update Twilio Configuration

### Step 11: Update Twilio Phone Number Webhooks

**IMPORTANT:** Your current phone number has demo webhooks. For Vapi, you have two options:

**Option A: Use Vapi's Direct Integration (Recommended)**
- Vapi handles Twilio webhooks directly
- No need to update Twilio webhooks manually
- Vapi manages the connection

**Option B: Custom Webhook Routing**
- Update Twilio webhooks to point to your n8n workflow
- More control but more complex

**For Option A (Recommended):**
- Vapi already configured your number in Step 5
- Twilio webhooks are handled by Vapi
- No changes needed in Twilio console

**For Option B (If you want custom routing):**
1. **Go to Twilio Console:** https://console.twilio.com
2. **Navigate to:** Phone Numbers → Manage → Active Numbers
3. **Click on:** +17723099180
4. **Update Voice Configuration:**
   - **A CALL COMES IN:** Set to your n8n webhook URL
   - **Save**

---

## Phase 5: Testing (15-30 minutes)

### Step 12: Test End-to-End

1. **Make test call via n8n:**
   ```bash
   curl -X POST http://localhost:5678/webhook/vapi/create-call \
     -H "Content-Type: application/json" \
     -d '{
       "phone_number": "+15551234567",
       "purpose": "Test call for comparison",
       "voice_preference": "professional_female"
     }'
   ```

2. **Monitor:**
   - **n8n:** Check workflow execution logs
   - **Vapi Dashboard:** See call status
   - **Twilio Console:** See call details
   - **Database:** Check stored data

3. **Compare with current system:**
   - Make same call with current system
   - Compare metrics side-by-side

---

## Phase 6: Comparison Setup

### Step 13: Create Comparison Dashboard (Optional)

**Create simple comparison queries:**

```sql
-- Get comparison data
SELECT 
  'current' as system,
  AVG(duration_seconds) as avg_duration,
  AVG(cost_usd) as avg_cost,
  COUNT(*) as total_calls
FROM calls
WHERE created_at > NOW() - INTERVAL '7 days'

UNION ALL

SELECT 
  'vapi' as system,
  AVG(duration_seconds) as avg_duration,
  AVG(cost_usd) as avg_cost,
  COUNT(*) as total_calls
FROM vapi_test_calls
WHERE created_at > NOW() - INTERVAL '7 days';
```

---

## Quick Reference: Key URLs and IDs

### Vapi
- **Dashboard:** https://dashboard.vapi.ai
- **API Base URL:** https://api.vapi.ai
- **API Key:** (Get from Settings → API Keys)
- **Assistant ID:** (Get from Assistants page)
- **Phone Number ID:** (Get from Phone Numbers page)

### n8n
- **Local URL:** http://localhost:5678
- **Webhook Base:** http://localhost:5678/webhook/ (or your public URL)
- **Workflow URLs:** Generated when you create webhook nodes

### Twilio
- **Console:** https://console.twilio.com
- **Phone Number:** +17723099180
- **Account SID:** (From Twilio console)
- **Auth Token:** (From Twilio console)

### Your Backend
- **Public URL:** (From cloudflared/ngrok/deployment)
- **Current Webhooks:** `/api/webhooks/twilio/...`
- **Vapi Webhooks:** `/api/webhooks/vapi/...` (if custom routing)

---

## Troubleshooting

### Issue: Vapi can't connect to Twilio
**Solution:**
- Verify Twilio credentials in Vapi
- Check Twilio phone number is active
- Ensure phone number has Voice capability

### Issue: n8n webhook not receiving requests
**Solution:**
- Check webhook URL is publicly accessible
- Verify webhook path is correct
- Check n8n workflow is active
- Test with curl/Postman

### Issue: Calls not being created
**Solution:**
- Verify Vapi API key is correct
- Check Assistant ID and Phone Number ID
- Review n8n execution logs for errors
- Check Vapi dashboard for call status

### Issue: High costs
**Solution:**
- Check Vapi spending limits are set
- Use test phone numbers only
- Monitor daily spending
- Use GPT-4o-mini for cheaper testing

---

## Next Steps After Setup

1. **Run 5-10 test calls** to validate setup
2. **Compare with current system** using same test scenarios
3. **Document findings** in comparison spreadsheet
4. **Scale up testing** gradually (10 → 30 → 50 calls)
5. **Make decision** based on data

---

## Cost Monitoring

**Set up daily cost tracking:**

1. **Vapi Dashboard:** Check daily spending
2. **Twilio Console:** Check call costs
3. **Database:** Track per-call costs
4. **Set alerts:** Email when spending exceeds threshold

**Expected Costs (per 5-minute call):**
- Twilio: ~$0.10-0.15
- Vapi: ~$0.50-1.00
- **Total: ~$0.60-1.15 per call**

**For 10 test calls:** ~$6-12
**For 50 test calls:** ~$30-60

---

## Checklist

- [ ] Vapi account created
- [ ] Vapi API key obtained
- [ ] Spending limits set ($50/day)
- [ ] n8n instance running
- [ ] Public URL for webhooks (cloudflared/ngrok)
- [ ] Vapi assistant created with system prompt
- [ ] Vapi connected to Twilio number (+17723099180)
- [ ] n8n workflow created
- [ ] Database table created (vapi_test_calls)
- [ ] Test call made successfully
- [ ] Comparison tracking set up

---

## Support Resources

- **Vapi Docs:** https://docs.vapi.ai
- **n8n Docs:** https://docs.n8n.io
- **Twilio Docs:** https://www.twilio.com/docs
- **Vapi Discord:** (Check Vapi website for community)

---

Good luck with your testing! Start with Step 1 and work through systematically.
