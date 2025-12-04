# ✅ Vercel Deployment Checklist

Print this checklist or keep it open during deployment. Check off each item as you complete it.

---

## 📋 Pre-Deployment (Before You Start)

### Credentials Gathered
- [ ] Twilio Account SID
- [ ] Twilio Auth Token
- [ ] Twilio Phone Number
- [ ] OpenAI API Key
- [ ] Deepgram API Key
- [ ] Supabase URL
- [ ] Supabase Anon Key
- [ ] Supabase Service Role Key
- [ ] Database URL (PostgreSQL connection string)

### Accounts Created
- [ ] Vercel account (free tier is fine)
- [ ] Git repository (GitHub/GitLab/Bitbucket)

### Code Ready
- [ ] Code pushed to Git repository
- [ ] Backend builds locally: `cd backend && npm run build`
- [ ] Frontend builds locally: `cd frontend && npm run build`
- [ ] No TypeScript errors
- [ ] Database migrations run (if any)

---

## 🔧 Backend Deployment

### Deploy Backend to Vercel
- [ ] Go to [vercel.com/new](https://vercel.com/new)
- [ ] Click "Import Project"
- [ ] Select your Git repository
- [ ] Set **Root Directory**: `backend`
- [ ] Set **Framework Preset**: Other
- [ ] Leave other settings as default
- [ ] Click "Deploy"
- [ ] Wait for build to complete (3-5 min)
- [ ] **Copy Backend URL**: `_________________________.vercel.app`

### Add Backend Environment Variables
Go to: Backend Project → Settings → Environment Variables

- [ ] `TWILIO_ACCOUNT_SID` = `_________________________________`
- [ ] `TWILIO_AUTH_TOKEN` = `_________________________________`
- [ ] `TWILIO_PHONE_NUMBER` = `_________________________________`
- [ ] `OPENAI_API_KEY` = `_________________________________`
- [ ] `DEEPGRAM_API_KEY` = `_________________________________`
- [ ] `DATABASE_URL` = `_________________________________`
- [ ] `SUPABASE_URL` = `_________________________________`
- [ ] `SUPABASE_ANON_KEY` = `_________________________________`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = `_________________________________`
- [ ] `PORT` = `3001`
- [ ] `NODE_ENV` = `production`

### Redeploy Backend
- [ ] Go to Deployments tab
- [ ] Click three dots on latest deployment
- [ ] Click "Redeploy"
- [ ] Wait for completion

### Test Backend
- [ ] Open terminal
- [ ] Run: `curl https://YOUR-BACKEND-URL.vercel.app/health`
- [ ] Expected response: `{"status":"ok",...}`
- [ ] ✅ Backend is working!

---

## 🎨 Frontend Deployment

### Deploy Frontend to Vercel
- [ ] Go to [vercel.com/new](https://vercel.com/new) again
- [ ] Click "Import Project"
- [ ] Select the **SAME** Git repository
- [ ] Set **Root Directory**: `frontend`
- [ ] Set **Framework Preset**: Next.js (should auto-detect)
- [ ] Leave other settings as default
- [ ] Click "Deploy"
- [ ] Wait for build to complete (2-3 min)
- [ ] **Copy Frontend URL**: `_________________________.vercel.app`

### Add Frontend Environment Variables
Go to: Frontend Project → Settings → Environment Variables

- [ ] `NEXT_PUBLIC_SUPABASE_URL` = `_________________________________`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `_________________________________`

### Test Frontend (Initial)
- [ ] Visit your frontend URL in browser
- [ ] Page should load (may not work completely yet)
- [ ] Check browser console for errors (F12)

---

## 🔗 Integration & Configuration

### Update Backend Environment Variables
Go back to: Backend Project → Settings → Environment Variables

- [ ] Add `CORS_ORIGIN` = `https://YOUR-FRONTEND-URL.vercel.app`
  - ⚠️ Use **exact** frontend URL (no trailing slash)
  - ⚠️ Must be `https://` not `http://`
- [ ] Add `PUBLIC_URL` = `https://YOUR-BACKEND-URL.vercel.app`
  - ⚠️ Use **exact** backend URL

### Redeploy Backend
- [ ] Go to Backend Deployments tab
- [ ] Redeploy latest deployment
- [ ] Wait for completion

### Update Frontend Environment Variables
Go back to: Frontend Project → Settings → Environment Variables

- [ ] Add `NEXT_PUBLIC_API_URL` = `https://YOUR-BACKEND-URL.vercel.app`
  - ⚠️ Use **exact** backend URL (no trailing slash)
- [ ] Add `NEXT_PUBLIC_WS_URL` = `https://YOUR-BACKEND-URL.vercel.app`
  - ⚠️ Same as API URL

### Redeploy Frontend
- [ ] Go to Frontend Deployments tab
- [ ] Redeploy latest deployment
- [ ] Wait for completion

---

## 📞 Twilio Configuration

### Update Twilio Webhooks
- [ ] Go to [console.twilio.com](https://console.twilio.com)
- [ ] Navigate to: Phone Numbers → Manage → Active Numbers
- [ ] Click on your phone number

### Voice Configuration
- [ ] Set "A CALL COMES IN" to: **Webhook**
- [ ] Set URL to: `https://YOUR-BACKEND-URL.vercel.app/api/webhooks/twilio/voice`
  - ⚠️ Replace with your actual backend URL
  - ⚠️ Must be `https://`
- [ ] Set HTTP Method to: **POST**

### Status Callback
- [ ] Set "Status Callback URL" to: `https://YOUR-BACKEND-URL.vercel.app/api/webhooks/twilio/status`
  - ⚠️ Replace with your actual backend URL
- [ ] Set HTTP Method to: **POST**

### Save Twilio Configuration
- [ ] Click "Save" button
- [ ] ✅ Twilio is configured!

---

## ✅ Testing & Verification

### Test Backend Endpoints
```bash
# Health check
curl https://YOUR-BACKEND-URL.vercel.app/health

# API endpoint
curl https://YOUR-BACKEND-URL.vercel.app/api/calls
```

- [ ] Health check returns `{"status":"ok"}`
- [ ] API endpoint responds (may return empty array)

### Test Frontend
- [ ] Visit `https://YOUR-FRONTEND-URL.vercel.app`
- [ ] Page loads completely
- [ ] No errors in browser console (F12)
- [ ] Can see the call form
- [ ] UI looks correct

### Test Complete Call Flow
- [ ] Fill out call form with test phone number
- [ ] Enter purpose and instructions
- [ ] Click "Start Call"
- [ ] Call is created successfully
- [ ] Call status updates appear
- [ ] Phone rings
- [ ] Answer phone
- [ ] AI speaks
- [ ] AI responds to your speech
- [ ] Transcripts appear in real-time
- [ ] Call completes successfully
- [ ] Call appears in history
- [ ] ✅ Everything works!

### Check Logs (if issues)
- [ ] Backend logs: Backend Project → Deployments → View Function Logs
- [ ] Frontend logs: Frontend Project → Deployments → View Logs
- [ ] Twilio logs: [console.twilio.com/monitor/logs/debugger](https://console.twilio.com/us1/monitor/logs/debugger)

---

## 🎯 Post-Deployment

### Optional: Add Custom Domains
- [ ] Backend: Settings → Domains → Add `api.yourdomain.com`
- [ ] Frontend: Settings → Domains → Add `yourdomain.com`
- [ ] Update all URLs if using custom domains

### Set Up Monitoring
- [ ] Enable Vercel Analytics (Backend)
- [ ] Enable Vercel Analytics (Frontend)
- [ ] Set up error alerts
- [ ] Set up usage alerts

### Set Up Billing Alerts
- [ ] Vercel: Settings → Usage → Set alert thresholds
- [ ] Twilio: Console → Usage → Set up alerts
- [ ] OpenAI: Dashboard → Usage → Set limits
- [ ] Deepgram: Console → Usage → Set alerts

### Document Your Deployment
- [ ] Save backend URL: `_________________________________`
- [ ] Save frontend URL: `_________________________________`
- [ ] Save deployment date: `_________________________________`
- [ ] Note any custom configurations: `_________________________________`

### Security Review
- [ ] All environment variables are set correctly
- [ ] No `.env` files committed to Git
- [ ] Service role keys only in backend (not frontend)
- [ ] CORS is configured properly
- [ ] Rate limiting is enabled
- [ ] Database uses SSL (`?sslmode=require`)

---

## 📊 Final Verification

### Functionality Checklist
- [ ] ✅ Frontend loads and displays correctly
- [ ] ✅ Backend API responds
- [ ] ✅ Database connection works
- [ ] ✅ Authentication works (if enabled)
- [ ] ✅ Can create calls
- [ ] ✅ Calls connect via Twilio
- [ ] ✅ AI speech recognition works
- [ ] ✅ AI text-to-speech works
- [ ] ✅ Real-time transcripts work
- [ ] ✅ Call history saves
- [ ] ✅ No errors in logs

### Performance Checklist
- [ ] Frontend loads in < 3 seconds
- [ ] API responses in < 1 second
- [ ] Calls connect in < 5 seconds
- [ ] Real-time updates are instant
- [ ] No timeout errors

### Monitoring Setup
- [ ] Analytics enabled
- [ ] Error tracking configured
- [ ] Logs are accessible
- [ ] Alerts are configured
- [ ] Cost monitoring set up

---

## 🎉 Congratulations!

- [ ] ✅ **DEPLOYMENT COMPLETE!**
- [ ] 🌍 Your app is live at: `_________________________________`
- [ ] 📞 Ready to make AI-powered calls!
- [ ] 🚀 Share with your team!

---

## 📝 Deployment Notes

Use this space for any custom notes or issues encountered:

```
Date deployed: _______________

Backend URL: _________________________________

Frontend URL: _________________________________

Custom configurations:
_________________________________________________
_________________________________________________
_________________________________________________

Issues encountered:
_________________________________________________
_________________________________________________
_________________________________________________

Solutions applied:
_________________________________________________
_________________________________________________
_________________________________________________

Next steps:
_________________________________________________
_________________________________________________
_________________________________________________
```

---

## 🆘 Having Issues?

If you checked everything but still have issues:

1. **Check logs:**
   - Backend: Vercel → Backend Project → Deployments → Function Logs
   - Frontend: Vercel → Frontend Project → Deployments → Logs
   - Twilio: console.twilio.com/monitor/logs/debugger

2. **Verify environment variables:**
   - All variables set correctly
   - No typos
   - Values are correct

3. **Test individually:**
   - Backend health: `curl https://backend/health`
   - Frontend access: Visit in browser
   - Database: Check backend logs for connection

4. **Consult guides:**
   - [VERCEL_TROUBLESHOOTING.md](./VERCEL_TROUBLESHOOTING.md)
   - [VERCEL_DEPLOYMENT_GUIDE.md](./VERCEL_DEPLOYMENT_GUIDE.md)

---

## 📚 Quick Reference

### Important URLs
```
Vercel Dashboard:     https://vercel.com/dashboard
Twilio Console:       https://console.twilio.com
OpenAI Dashboard:     https://platform.openai.com
Deepgram Console:     https://console.deepgram.com
Supabase Dashboard:   https://app.supabase.com
```

### Deployment Commands
```bash
# Test backend health
curl https://YOUR-BACKEND.vercel.app/health

# Test backend API
curl https://YOUR-BACKEND.vercel.app/api/calls

# View backend logs (requires Vercel CLI)
vercel logs YOUR-BACKEND

# Redeploy (requires Vercel CLI)
vercel --prod
```

---

**Total Estimated Time:** 40-60 minutes (first time)  
**Experience Level Required:** Intermediate (with guides)  
**Cost:** $0 for testing, $20-400/month for production

---

**🎊 You did it!** Your AI Customer Call System is now deployed and ready to use!

