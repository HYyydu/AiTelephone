# 🔧 Vercel Deployment Troubleshooting Guide

Common issues and solutions when deploying to Vercel.

---

## 📊 Quick Diagnostics

Run these checks first:

```bash
# 1. Test backend health
curl https://your-backend.vercel.app/health

# 2. Test backend API endpoint
curl https://your-backend.vercel.app/api/calls

# 3. Check frontend loads
curl -I https://your-frontend.vercel.app
```

---

## 🐛 Common Issues

### 1. Build Fails: "Module not found"

**Symptoms:**

```
Error: Cannot find module 'express'
Error: Cannot find module '@supabase/supabase-js'
```

**Causes:**

- Dependencies in `devDependencies` instead of `dependencies`
- Missing `npm install` in build process
- Cached node_modules

**Solutions:**

**Option A: Fix package.json**

```bash
# Move all runtime dependencies to dependencies section
# Check backend/package.json
{
  "dependencies": {
    "express": "^5.1.0",
    "@supabase/supabase-js": "^2.84.0",
    // ... all packages needed at runtime
  },
  "devDependencies": {
    "@types/express": "^5.0.5",
    "typescript": "^5.9.3",
    // ... only dev tools
  }
}
```

**Option B: Clear cache and rebuild**

```bash
# In Vercel Dashboard:
# Settings → General → Clear Build Cache
# Then redeploy
```

**Option C: Local build test**

```bash
cd backend
rm -rf node_modules package-lock.json dist
npm install
npm run build
# Fix any errors before deploying
```

---

### 2. CORS Errors in Browser Console

**Symptoms:**

```
Access to fetch at 'https://backend.vercel.app' from origin
'https://frontend.vercel.app' has been blocked by CORS policy
```

**Solutions:**

**Check 1: Backend CORS_ORIGIN**

```env
# Backend environment variables must have:
CORS_ORIGIN=https://your-frontend.vercel.app

# ⚠️ Common mistakes:
# ❌ http:// instead of https://
# ❌ Trailing slash: https://frontend.vercel.app/
# ❌ Wrong URL
# ✅ Exact frontend URL: https://frontend.vercel.app
```

**Check 2: Frontend API URL**

```env
# Frontend environment variables:
NEXT_PUBLIC_API_URL=https://your-backend.vercel.app

# Must match exactly (no trailing slash)
```

**Check 3: CORS configuration in server.ts**

```typescript
// backend/src/server.ts should have:
app.use(
  cors({
    origin: config.cors.origin,
    credentials: true,
  })
);
```

**After fixing:** Redeploy backend

---

### 3. Environment Variables Not Working

**Symptoms:**

```
Error: Missing required environment variables
undefined is not a valid API key
```

**Solutions:**

**Step 1: Verify variables are set**

```bash
# In Vercel Dashboard:
# Project → Settings → Environment Variables
# Check ALL variables are present
```

**Step 2: Check environment selection**

- Variables must be set for **Production** environment
- Or set for all: Production, Preview, Development

**Step 3: Redeploy after adding variables**

- Adding variables doesn't auto-redeploy
- Go to Deployments → Three dots → Redeploy

**Step 4: Check variable names**

- Variables are case-sensitive
- No spaces in names
- Match exactly: `TWILIO_ACCOUNT_SID` not `Twilio_Account_Sid`

**Step 5: Check for typos**

```env
# Common typos:
❌ TWILIO_ACCCOUNT_SID (extra C)
❌ OPENAI_API_KEy (lowercase y)
❌ SUPABASE_URL_ (trailing underscore)
✅ TWILIO_ACCOUNT_SID
✅ OPENAI_API_KEY
✅ SUPABASE_URL
```

---

### 4. Database Connection Fails

**Symptoms:**

```
Error: Connection terminated unexpectedly
Error: SSL required
Error: password authentication failed
```

**Solutions:**

**Fix 1: Add SSL mode**

```env
# PostgreSQL/Supabase needs SSL
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require

# Not just:
❌ DATABASE_URL=postgresql://user:pass@host:5432/db
```

**Fix 2: Check password special characters**

```env
# If password has special characters, URL encode them:
# @ becomes %40
# : becomes %3A
# # becomes %23
# etc.

# Example:
# Password: pass@word#123
# Encoded: pass%40word%23123
DATABASE_URL=postgresql://user:pass%40word%23123@host:5432/db
```

**Fix 3: Verify Supabase connection pooling**

```env
# Use connection pooling URL for serverless:
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:6543/postgres?sslmode=require

# Note: Port 6543 (pooler), not 5432
```

**Fix 4: Check Supabase network settings**

- Go to Supabase → Settings → Database
- Check "Allow direct connections" is enabled
- Or add Vercel IPs to allowlist

---

### 5. Twilio Webhooks Not Working

**Symptoms:**

```
Twilio error: 11200 (HTTP Error)
Twilio error: 12300 (Invalid TwiML)
No webhook received
```

**Solutions:**

**Check 1: Verify webhook URLs**

```
Voice URL: https://your-backend.vercel.app/api/webhooks/twilio/voice
Status URL: https://your-backend.vercel.app/api/webhooks/twilio/status

# Must be HTTPS (not HTTP)
# Must be complete backend URL
# Check in Twilio Console → Phone Numbers
```

**Check 2: Test webhook endpoint**

```bash
# Test voice webhook
curl -X POST https://your-backend.vercel.app/api/webhooks/twilio/voice \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=+15555551234&To=+15555556789&CallSid=CAxxxxx"

# Should return TwiML XML
```

**Check 3: Check Twilio debugger**

- Go to Twilio Console → Monitor → Logs → Errors
- Look for webhook request failures
- Check error messages

**Check 4: Verify PUBLIC_URL**

```env
# Backend must have:
PUBLIC_URL=https://your-backend.vercel.app

# This is used to construct webhook URLs
```

---

### 6. WebSocket Connection Fails

**Symptoms:**

```
WebSocket connection failed
Cannot connect to ws://...
Real-time updates not working
```

**Known Issue:**
Vercel serverless has **limited WebSocket support**. Long-lived connections may not work reliably.

**Solutions:**

**Option A: Use Vercel Edge Functions** (Experimental)

```typescript
// Create API route with Edge Runtime
export const runtime = "edge";
```

**Option B: Use external WebSocket service**

- Pusher
- Ably
- Socket.io with Redis adapter

**Option C: Deploy backend to dedicated server**
Best for production with heavy WebSocket usage:

- Railway.app (recommended)
- Render.com
- DigitalOcean App Platform
- Fly.io

**Quick fix: Use polling instead**

```typescript
// In frontend, use polling for updates
setInterval(async () => {
  const status = await fetch(`${API_URL}/api/calls/${callId}`);
  updateUI(await status.json());
}, 2000);
```

---

### 7. Function Timeout Errors

**Symptoms:**

```
Error: Function execution timed out
Task timed out after 10.00 seconds
```

**Cause:**
Vercel serverless functions have time limits:

- Hobby: 10 seconds
- Pro: 60 seconds
- Enterprise: 300 seconds

**Solutions:**

**Option A: Upgrade to Pro**

```bash
# Gives you 60-second timeouts
# Good for most phone calls
```

**Option B: Optimize long-running tasks**

```typescript
// Use background jobs for long tasks
// Return immediately, process async
app.post("/api/calls", async (req, res) => {
  const callId = generateId();

  // Start call asynchronously
  processCallAsync(callId).catch(console.error);

  // Return immediately
  return res.json({ callId, status: "initiated" });
});
```

**Option C: Deploy backend elsewhere**
For very long calls (>5 minutes), use:

- Railway (unlimited execution time)
- Traditional server
- Dedicated VPS

---

### 8. Build Succeeds but Site Shows 500 Error

**Symptoms:**

- Build completes successfully
- Site loads but shows "500 Internal Server Error"
- Or blank page

**Solutions:**

**Check 1: View function logs**

```bash
# In Vercel Dashboard:
# Deployments → Latest → View Function Logs
# Look for runtime errors
```

**Check 2: Missing runtime dependencies**

```bash
# Make sure ALL packages needed at runtime are in dependencies
# Not in devDependencies
```

**Check 3: Database connection at startup**

```typescript
// backend/src/server.ts
// Database connection might fail at startup
// Make it non-blocking:

testConnection()
  .then(() => console.log("✅ Database connected"))
  .catch((e) => console.warn("⚠️  Database connection failed:", e));

// Don't await it at top level
```

**Check 4: Environment variables missing**

```typescript
// Check required variables exist
if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY not set!");
  // Log but don't crash
}
```

---

### 9. "Cannot find module './dist/server.js'"

**Symptoms:**

```
Error: Cannot find module './dist/server.js'
Module not found: Can't resolve 'dist/server.js'
```

**Solutions:**

**Check 1: Build command**

```json
// backend/package.json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/server.js"
  }
}
```

**Check 2: tsconfig.json output**

```json
// backend/tsconfig.json
{
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

**Check 3: vercel.json points to correct file**

```json
// backend/vercel.json
{
  "builds": [
    {
      "src": "dist/server.js",
      "use": "@vercel/node"
    }
  ]
}
```

**Check 4: Build locally to verify**

```bash
cd backend
npm run build
ls dist/  # Should show server.js
```

---

### 10. Frontend Can't Connect to Backend

**Symptoms:**

```
Failed to fetch
Network error
ERR_CONNECTION_REFUSED
```

**Solutions:**

**Check 1: API URL is correct**

```env
# frontend/.env
NEXT_PUBLIC_API_URL=https://your-backend.vercel.app

# Common mistakes:
❌ http:// (must be https://)
❌ localhost:3001 (old development URL)
❌ Trailing slash
✅ https://your-backend.vercel.app
```

**Check 2: Backend is actually deployed**

```bash
curl https://your-backend.vercel.app/health
# Should return: {"status":"ok"}
```

**Check 3: CORS is configured**

```env
# Backend must have:
CORS_ORIGIN=https://your-frontend.vercel.app
```

**Check 4: Check browser console**

```javascript
// Open browser DevTools → Console
// Look for actual error message
// Check Network tab for failed requests
```

---

## 🔍 Debugging Tools

### 1. View Logs

**Function Logs:**

```
Vercel Dashboard → Deployments → Latest Deployment → View Function Logs
```

**Build Logs:**

```
Vercel Dashboard → Deployments → Latest Deployment → Building
```

**Runtime Logs:**

```
Vercel Dashboard → Deployments → Latest Deployment → Functions tab
```

### 2. Test Endpoints Directly

```bash
# Health check
curl https://your-backend.vercel.app/health

# API endpoint
curl https://your-backend.vercel.app/api/calls

# Webhook endpoint
curl -X POST https://your-backend.vercel.app/api/webhooks/twilio/voice \
  -H "Content-Type: application/x-www-form-urlencoded"
```

### 3. Check Environment Variables

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Link project
cd backend
vercel link

# List environment variables
vercel env ls
```

### 4. Twilio Debugger

```
https://console.twilio.com/us1/monitor/logs/debugger
```

Shows:

- All webhook requests
- Failed requests
- Response codes
- Error messages

### 5. Browser DevTools

```
F12 → Console → Check for errors
F12 → Network → Check API requests
F12 → Application → Check environment variables
```

---

## 📋 Pre-Deployment Checklist

Before deploying, verify:

- [ ] Code builds locally without errors
- [ ] All environment variables documented
- [ ] TypeScript compiles successfully
- [ ] No console.error in production code
- [ ] Database connection works locally
- [ ] API endpoints tested locally
- [ ] Frontend connects to backend locally
- [ ] All dependencies in package.json
- [ ] .gitignore excludes .env files
- [ ] README.md has deployment instructions

---

## 🆘 Still Having Issues?

### 1. Check Vercel Status

[status.vercel.com](https://www.vercel.com/docs/platform/status)

### 2. Review Vercel Docs

[vercel.com/docs](https://vercel.com/docs)

### 3. Check Vercel Community

[github.com/vercel/vercel/discussions](https://github.com/vercel/vercel/discussions)

### 4. Debug Locally First

```bash
# Always test locally before deploying
npm run build
npm run start
# Fix all errors locally first
```

### 5. Gradual Deployment

```bash
# Deploy one piece at a time:
# 1. Deploy backend only
# 2. Test backend endpoints
# 3. Deploy frontend
# 4. Test integration
```

---

## 💡 Pro Tips

### Tip 1: Use Preview Deployments

```bash
# Test changes before production
git checkout -b test-feature
git push origin test-feature
# Vercel auto-creates preview deployment
```

### Tip 2: Keep Logs Organized

```typescript
// Use structured logging
console.log("🚀 Server started");
console.log("✅ Success");
console.log("⚠️  Warning");
console.log("❌ Error");
```

### Tip 3: Monitor Costs

```bash
# Check usage regularly:
# Vercel Dashboard → Usage
# Twilio Dashboard → Usage
# OpenAI Dashboard → Usage
```

### Tip 4: Set Up Alerts

```bash
# Enable email alerts for:
# - Deployment failures
# - Function errors
# - High usage/costs
```

### Tip 5: Use Vercel CLI for Quick Fixes

```bash
# Quick redeploy
vercel --prod

# Pull environment variables
vercel env pull

# View logs
vercel logs
```

---

## 📚 Additional Resources

- [Vercel Node.js Functions](https://vercel.com/docs/functions/serverless-functions/runtimes/node-js)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Debugging Vercel Deployments](https://vercel.com/docs/deployments/troubleshoot-a-build)
- [Twilio Debugging](https://www.twilio.com/docs/usage/troubleshooting/debugging-tools)

---

**🎯 Remember:** Most deployment issues are due to:

1. Missing/incorrect environment variables (60%)
2. CORS misconfiguration (20%)
3. Build errors (10%)
4. Database connection issues (10%)

Start with these four areas when debugging!
