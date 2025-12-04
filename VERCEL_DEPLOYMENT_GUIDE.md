# 🚀 Vercel Deployment Guide

Complete step-by-step guide to deploy your AI Customer Call System to Vercel.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Deployment Strategy](#deployment-strategy)
4. [Step 1: Prepare Your Project](#step-1-prepare-your-project)
5. [Step 2: Deploy Backend to Vercel](#step-2-deploy-backend-to-vercel)
6. [Step 3: Deploy Frontend to Vercel](#step-3-deploy-frontend-to-vercel)
7. [Step 4: Configure Environment Variables](#step-4-configure-environment-variables)
8. [Step 5: Update Twilio Webhooks](#step-5-update-twilio-webhooks)
9. [Step 6: Test Your Deployment](#step-6-test-your-deployment)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, make sure you have:

- ✅ A Vercel account ([Sign up free](https://vercel.com/signup))
- ✅ Git repository (GitHub, GitLab, or Bitbucket)
- ✅ All API keys ready:
  - Twilio (Account SID, Auth Token, Phone Number)
  - OpenAI API Key
  - Deepgram API Key
  - Supabase credentials (URL, Anon Key, Service Role Key)
- ✅ Supabase PostgreSQL database set up

---

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│              Vercel Platform                │
│                                             │
│  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Frontend      │  │   Backend       │ │
│  │   (Next.js)     │  │   (Serverless)  │ │
│  │   vercel.app    │  │   vercel.app    │ │
│  └────────┬────────┘  └────────┬────────┘ │
│           │                    │          │
└───────────┼────────────────────┼──────────┘
            │                    │
            └─────────┬──────────┘
                      │
         ┌────────────┴────────────┐
         │                         │
    ┌────▼────┐             ┌─────▼─────┐
    │ Twilio  │             │ Supabase  │
    │ (Calls) │             │ (Database)│
    └─────────┘             └───────────┘
```

---

## Deployment Strategy

We'll deploy both frontend and backend as separate Vercel projects:

1. **Backend**: Deployed as serverless functions (Express.js → Vercel Serverless)
2. **Frontend**: Deployed as a Next.js application (native Vercel support)

---

## Step 1: Prepare Your Project

### 1.1 Push Your Code to Git

```bash
# Initialize git if not already done
git init

# Add all files
git add .

# Commit changes
git commit -m "Prepare for Vercel deployment"

# Add remote (replace with your repository URL)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Push to main branch
git push -u origin main
```

### 1.2 Create Vercel Configuration Files

#### Backend Configuration

Create `backend/vercel.json`:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "dist/server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "dist/server.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

#### Backend Package.json Updates

Update your `backend/package.json` to include a build script that works with Vercel:

```json
{
  "scripts": {
    "dev": "nodemon --watch src --exec ts-node src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "vercel-build": "npm run build"
  }
}
```

### 1.3 Update Backend Server for Serverless

Modify `backend/src/server.ts` to work with Vercel serverless:

Add at the end of the file:

```typescript
// Export for Vercel serverless
export default app;
```

---

## Step 2: Deploy Backend to Vercel

### 2.1 Import Backend Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import your Git repository
4. Vercel will detect it as a monorepo

### 2.2 Configure Backend Deployment

When configuring the project:

```
Project Name: ai-customer-call-backend
Framework Preset: Other
Root Directory: backend
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

### 2.3 Add Backend Environment Variables

In the Vercel project settings, add these environment variables:

**Required Variables:**

```env
# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# OpenAI
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxx

# Deepgram
DEEPGRAM_API_KEY=your_deepgram_key

# Database
DATABASE_URL=postgresql://user:pass@db.xxx.supabase.co:5432/postgres

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Server Configuration
PORT=3001
NODE_ENV=production

# CORS - Update after frontend deployment
CORS_ORIGIN=https://your-frontend-app.vercel.app
```

**Important:** You'll update `CORS_ORIGIN` and `PUBLIC_URL` after deploying the frontend.

### 2.4 Deploy Backend

1. Click **"Deploy"**
2. Wait for the build to complete (3-5 minutes)
3. Note your backend URL: `https://ai-customer-call-backend.vercel.app`

---

## Step 3: Deploy Frontend to Vercel

### 3.1 Import Frontend Project

1. Go back to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import the same Git repository (Vercel supports multiple projects per repo)

### 3.2 Configure Frontend Deployment

```
Project Name: ai-customer-call-frontend
Framework Preset: Next.js
Root Directory: frontend
Build Command: npm run build (auto-detected)
Output Directory: .next (auto-detected)
Install Command: npm install (auto-detected)
```

### 3.3 Add Frontend Environment Variables

```env
NEXT_PUBLIC_API_URL=https://ai-customer-call-backend.vercel.app
NEXT_PUBLIC_WS_URL=https://ai-customer-call-backend.vercel.app

# Supabase (for client-side auth)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 3.4 Deploy Frontend

1. Click **"Deploy"**
2. Wait for build to complete (2-3 minutes)
3. Note your frontend URL: `https://ai-customer-call-frontend.vercel.app`

---

## Step 4: Configure Environment Variables

### 4.1 Update Backend CORS Settings

1. Go to backend project in Vercel
2. Settings → Environment Variables
3. Update `CORS_ORIGIN`:

```env
CORS_ORIGIN=https://ai-customer-call-frontend.vercel.app
```

4. Redeploy backend (Deployments → three dots → Redeploy)

### 4.2 Add PUBLIC_URL to Backend

1. Add new environment variable:

```env
PUBLIC_URL=https://ai-customer-call-backend.vercel.app
```

2. Redeploy backend

### 4.3 Add Custom Domains (Optional but Recommended)

For better URLs, add custom domains:

**Backend:**

- Go to Settings → Domains
- Add: `api.yourdomain.com`
- Update all environment variables to use this domain

**Frontend:**

- Go to Settings → Domains
- Add: `app.yourdomain.com` or `yourdomain.com`

---

## Step 5: Update Twilio Webhooks

### 5.1 Get Your Backend Webhook URLs

Your webhook URLs will be:

- Status Callback: `https://ai-customer-call-backend.vercel.app/api/webhooks/twilio/status`
- Voice URL: `https://ai-customer-call-backend.vercel.app/api/webhooks/twilio/voice`

### 5.2 Update Twilio Phone Number Configuration

1. Go to [Twilio Console](https://console.twilio.com)
2. Navigate to **Phone Numbers** → **Manage** → **Active Numbers**
3. Click on your phone number
4. Under **Voice Configuration**:
   - **A CALL COMES IN**: Webhook
   - **URL**: `https://ai-customer-call-backend.vercel.app/api/webhooks/twilio/voice`
   - **HTTP Method**: POST
5. Under **Status Callback URL**:
   - **URL**: `https://ai-customer-call-backend.vercel.app/api/webhooks/twilio/status`
   - **HTTP Method**: POST
6. Click **Save**

### 5.3 Configure TwiML App (if using)

If you're using a TwiML App:

1. Go to **Voice** → **TwiML** → **TwiML Apps**
2. Create or edit your TwiML App
3. Set Voice URL to your backend webhook
4. Set Status Callback URL

---

## Step 6: Test Your Deployment

### 6.1 Test Frontend Access

1. Visit your frontend URL: `https://ai-customer-call-frontend.vercel.app`
2. Verify the page loads correctly
3. Check browser console for any errors

### 6.2 Test Backend API

```bash
# Test health check endpoint
curl https://ai-customer-call-backend.vercel.app/health

# Expected response: {"status": "ok"}
```

### 6.3 Test Complete Flow

1. Open your frontend application
2. Fill out the call form with a test phone number
3. Click "Start Call"
4. Verify:
   - Call is initiated
   - Status updates appear
   - Transcripts are received in real-time
   - Call completes successfully

### 6.4 Check Logs

**Backend Logs:**

1. Go to Vercel Dashboard → Backend Project
2. Click **Deployments** → Latest deployment
3. Click **View Function Logs**
4. Monitor for any errors

**Frontend Logs:**

1. Similar process for frontend project
2. Check build logs and runtime logs

---

## Important Considerations for Vercel Deployment

### ⚠️ Serverless Limitations

Vercel serverless functions have some limitations:

1. **Execution Time**: Maximum 60 seconds (Hobby), 300 seconds (Pro)

   - Long-running calls may timeout
   - Consider using Vercel Pro for longer calls

2. **WebSocket Support**: Limited in serverless environment

   - WebSockets work but may be unstable
   - Consider using Vercel's real-time features or external service

3. **Concurrent Connections**: Based on your plan
   - Hobby: Limited concurrency
   - Pro: Higher limits

### 🔧 Alternative: Deploy Backend to Railway/Render

If you encounter issues with Vercel serverless for the backend (especially WebSocket issues), consider:

**Option A: Railway** ([Railway.app](https://railway.app))

- Better for long-running processes
- Native WebSocket support
- Easy deployment from Git

**Option B: Render** ([Render.com](https://render.com))

- Free tier available
- Supports WebSockets
- Long-running processes

**Option C: Keep Backend on Traditional Server**

- Deploy to DigitalOcean, AWS EC2, or similar
- Keep frontend on Vercel
- Update `NEXT_PUBLIC_API_URL` to point to your server

---

## Troubleshooting

### Issue: "Module not found" errors

**Solution:**

```bash
# Make sure all dependencies are in package.json, not just devDependencies
# Rebuild locally first
cd backend
rm -rf node_modules package-lock.json
npm install
npm run build

# Commit and push
git add .
git commit -m "Fix dependencies"
git push
```

### Issue: Environment variables not working

**Solution:**

1. Go to Vercel project → Settings → Environment Variables
2. Make sure variables are set for **Production** environment
3. Redeploy after adding variables
4. Check that variable names match exactly (case-sensitive)

### Issue: CORS errors

**Solution:**

```env
# Make sure CORS_ORIGIN in backend matches frontend URL exactly
CORS_ORIGIN=https://your-exact-frontend-url.vercel.app
```

### Issue: Twilio webhooks not working

**Solution:**

1. Verify `PUBLIC_URL` in backend environment variables
2. Check Twilio webhook URLs are correct
3. Check backend logs for webhook requests
4. Ensure webhooks use HTTPS (not HTTP)

### Issue: Database connection errors

**Solution:**

```env
# Verify DATABASE_URL format
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require

# Make sure Supabase allows connections from Vercel IPs
# Or disable IP restrictions in Supabase settings
```

### Issue: WebSocket connection fails

**Solution:**

- WebSockets can be tricky with serverless
- Consider using Vercel Edge Functions
- Or deploy backend to Railway/Render for better WebSocket support

### Issue: Build fails with TypeScript errors

**Solution:**

```bash
# Fix TypeScript errors locally first
cd backend
npm run build

cd ../frontend
npm run build

# Fix any errors before deploying
```

---

## Post-Deployment Checklist

✅ Frontend loads without errors  
✅ Backend API responds to health checks  
✅ Environment variables are set correctly  
✅ CORS is configured properly  
✅ Twilio webhooks are updated  
✅ Database connection works  
✅ Test call completes successfully  
✅ Transcripts appear in real-time  
✅ Call history is saved  
✅ Authentication works (if enabled)

---

## Monitoring and Maintenance

### Set Up Monitoring

1. **Vercel Analytics**

   - Enable in project settings
   - Monitor frontend performance

2. **Log Monitoring**

   - Check Vercel function logs regularly
   - Set up error alerts

3. **Cost Monitoring**
   - Monitor Vercel usage
   - Track Twilio costs
   - Monitor OpenAI API usage

### Regular Maintenance

- **Weekly**: Check error logs
- **Monthly**: Review API usage and costs
- **As needed**: Update dependencies

---

## Scaling Considerations

### When Your App Grows

1. **Upgrade Vercel Plan**

   - Pro plan for better limits
   - Enterprise for high-volume

2. **Optimize API Calls**

   - Cache responses where possible
   - Implement rate limiting

3. **Database Optimization**

   - Add indexes
   - Use connection pooling
   - Consider read replicas

4. **Consider Microservices**
   - Split backend into services
   - Deploy separately
   - Use message queues

---

## Cost Estimates

### Vercel Costs (Monthly)

**Hobby Plan** (Free):

- Good for testing and personal use
- Limited bandwidth and functions

**Pro Plan** ($20/month):

- Better for production
- Higher limits
- Team collaboration

### Additional Costs

- **Twilio**: ~$0.10-0.15 per call minute
- **OpenAI**: ~$0.05-0.10 per call
- **Deepgram**: ~$0.02 per call
- **Supabase**: Free tier available, Pro $25/month

**Total for 1000 calls/month**: ~$200-400

---

## Next Steps

1. ✅ Deploy to Vercel following this guide
2. 🔐 Set up authentication
3. 📊 Add analytics and monitoring
4. 🚀 Add custom domains
5. 💳 Set up billing alerts
6. 📝 Document your API
7. 🧪 Add automated tests
8. 🔒 Security audit

---

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Twilio Webhooks Guide](https://www.twilio.com/docs/usage/webhooks)
- [Supabase Documentation](https://supabase.com/docs)

---

## Support

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review Vercel function logs
3. Check Twilio debugger
4. Verify all environment variables
5. Test backend API endpoints directly

---

**🎉 Congratulations!** Your AI Customer Call System is now deployed to Vercel and accessible worldwide!

Remember to:

- Monitor your costs
- Check logs regularly
- Keep dependencies updated
- Scale as needed

Happy calling! 📞✨
