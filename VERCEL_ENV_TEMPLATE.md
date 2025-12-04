# 🔐 Vercel Environment Variables - Copy & Paste Template

Use this template to quickly set up your environment variables in Vercel.

---

## 📦 Backend Environment Variables

**Copy these to:** Backend Project → Settings → Environment Variables

```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
DEEPGRAM_API_KEY=your_deepgram_api_key
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
PORT=3001
NODE_ENV=production
```

### ⚠️ Update After Frontend Deployment

After deploying frontend, add these (replace with your actual URLs):

```
CORS_ORIGIN=https://your-frontend-app.vercel.app
PUBLIC_URL=https://your-backend-app.vercel.app
```

### 🎛️ Optional: OpenAI Fine-Tuning Settings

```
OPENAI_TEMPERATURE=0.7
OPENAI_FREQUENCY_PENALTY=0.5
OPENAI_PRESENCE_PENALTY=0.3
OPENAI_VAD_THRESHOLD=0.05
OPENAI_PREFIX_PADDING_MS=50
OPENAI_SILENCE_DURATION_MS=2000
OPENAI_RESPONSE_DELAY_MS=0
OPENAI_ECHO_GRACE_PERIOD_MS=0
```

---

## 🎨 Frontend Environment Variables

**Copy these to:** Frontend Project → Settings → Environment Variables

### Initial Setup

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### ⚠️ Update After Backend Deployment

After deploying backend, add these (replace with your actual backend URL):

```
NEXT_PUBLIC_API_URL=https://your-backend-app.vercel.app
NEXT_PUBLIC_WS_URL=https://your-backend-app.vercel.app
```

---

## 📋 How to Add Variables in Vercel

### Method 1: Web Interface (Recommended)

1. Go to your Vercel project
2. Click **Settings** → **Environment Variables**
3. For each variable:
   - Enter **Key** (e.g., `TWILIO_ACCOUNT_SID`)
   - Enter **Value** (your actual value)
   - Select **Production, Preview, Development** (or just Production)
   - Click **Add**
4. After adding all variables, go to **Deployments**
5. Click the three dots on latest deployment → **Redeploy**

### Method 2: Vercel CLI (Advanced)

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Add environment variable
vercel env add VARIABLE_NAME production

# Pull environment variables
vercel env pull
```

### Method 3: Import from File (Advanced)

Create a `.env.production` file:

```bash
# In backend directory
cat > .env.production << 'EOF'
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=your_token
# ... (all your variables)
EOF

# Import using Vercel CLI
vercel env import .env.production
```

---

## ✅ Verification Checklist

After setting environment variables:

### Backend Variables
- [ ] `TWILIO_ACCOUNT_SID` - Starts with "AC"
- [ ] `TWILIO_AUTH_TOKEN` - 32 characters
- [ ] `TWILIO_PHONE_NUMBER` - Format: +1234567890
- [ ] `OPENAI_API_KEY` - Starts with "sk-"
- [ ] `DEEPGRAM_API_KEY` - Not empty
- [ ] `DATABASE_URL` - Valid PostgreSQL connection string
- [ ] `SUPABASE_URL` - Starts with "https://"
- [ ] `SUPABASE_ANON_KEY` - Not empty
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Not empty
- [ ] `CORS_ORIGIN` - Your frontend URL (set after frontend deploy)
- [ ] `PUBLIC_URL` - Your backend URL

### Frontend Variables
- [ ] `NEXT_PUBLIC_API_URL` - Your backend URL (set after backend deploy)
- [ ] `NEXT_PUBLIC_WS_URL` - Your backend URL (set after backend deploy)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Same as backend SUPABASE_URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Same as backend SUPABASE_ANON_KEY

---

## 🔍 Where to Find Your Credentials

### Twilio
1. Go to [console.twilio.com](https://console.twilio.com)
2. **Account SID & Auth Token**: Dashboard (main page)
3. **Phone Number**: Phone Numbers → Manage → Active Numbers

### OpenAI
1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Create new API key or use existing

### Deepgram
1. Go to [console.deepgram.com](https://console.deepgram.com)
2. API Keys section
3. Create new key or use existing

### Supabase
1. Go to [app.supabase.com](https://app.supabase.com)
2. Select your project
3. Settings → API
4. Copy **URL**, **anon/public key**, and **service_role key**

### Database URL (Supabase)
1. Go to [app.supabase.com](https://app.supabase.com)
2. Select your project
3. Settings → Database → Connection string → URI
4. Example format:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres?sslmode=require
   ```

---

## 🚨 Security Best Practices

- ✅ **Never commit** `.env` files to Git
- ✅ **Never expose** service role keys in frontend (use `SUPABASE_SERVICE_ROLE_KEY` only in backend)
- ✅ **Rotate keys** regularly
- ✅ **Use different keys** for development and production
- ✅ **Enable IP restrictions** if available
- ✅ **Set up billing alerts** for all services
- ✅ **Monitor usage** regularly

---

## 🔄 Deployment Order

**Correct order to avoid errors:**

1. ✅ Set up backend with initial variables (without CORS_ORIGIN and PUBLIC_URL)
2. ✅ Deploy backend → Note the URL
3. ✅ Set up frontend with initial variables (without API URLs)
4. ✅ Deploy frontend → Note the URL
5. ✅ Update backend variables:
   - Add `CORS_ORIGIN` with frontend URL
   - Add `PUBLIC_URL` with backend URL
6. ✅ Redeploy backend
7. ✅ Update frontend variables:
   - Add `NEXT_PUBLIC_API_URL` with backend URL
   - Add `NEXT_PUBLIC_WS_URL` with backend URL
8. ✅ Redeploy frontend
9. ✅ Update Twilio webhooks with backend URL
10. ✅ Test the complete flow

---

## 💡 Pro Tips

### Tip 1: Use Vercel Environment Groups
Group related variables together for easier management:
- `twilio_` prefix for Twilio variables
- `openai_` prefix for OpenAI variables
- etc.

### Tip 2: Test Variables Locally First
```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with your values
npm run dev

# Frontend
cd frontend
cp .env.local.example .env.local
# Edit .env.local with your values
npm run dev
```

### Tip 3: Use Preview Deployments
Set different variables for Preview vs Production:
- Production: Real API keys
- Preview: Test/sandbox API keys

### Tip 4: Document Custom Values
Keep a secure note of:
- Which Twilio number you're using
- Which OpenAI model settings work best
- Any custom configuration values

---

## 🆘 Troubleshooting Variable Issues

### Issue: "Environment variable not found"
```bash
# Solution: Check spelling and redeploy
# Variables must match exactly (case-sensitive)
```

### Issue: Variables work locally but not on Vercel
```bash
# Solution: Make sure you:
# 1. Added variables in Vercel UI
# 2. Selected correct environment (Production)
# 3. Redeployed after adding variables
```

### Issue: Frontend can't connect to backend
```bash
# Solution: Check that:
# 1. NEXT_PUBLIC_API_URL is set correctly
# 2. CORS_ORIGIN in backend matches frontend URL exactly
# 3. Both use https:// (not http://)
```

### Issue: Database connection fails
```bash
# Solution: Verify DATABASE_URL includes:
# 1. Correct username and password
# 2. ?sslmode=require at the end
# 3. No special characters need URL encoding
```

---

## 📚 Additional Resources

- [Vercel Environment Variables Docs](https://vercel.com/docs/concepts/projects/environment-variables)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Securing API Keys](https://vercel.com/docs/concepts/projects/environment-variables#securing-environment-variables)

---

**✅ Done!** All environment variables should now be configured correctly.

