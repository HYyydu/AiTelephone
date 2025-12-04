# ⚡ Quick Deploy to Vercel - TL;DR

**Fast track guide to deploy your AI Customer Call System in 15 minutes.**

## 🎯 Prerequisites Checklist

Before you start, have these ready:

- [ ] Vercel account ([sign up](https://vercel.com/signup))
- [ ] Git repository pushed to GitHub/GitLab
- [ ] Twilio credentials (Account SID, Auth Token, Phone Number)
- [ ] OpenAI API Key
- [ ] Deepgram API Key
- [ ] Supabase database set up with credentials

---

## 🚀 3-Step Deployment

### Step 1: Deploy Backend (5 minutes)

1. **Push your code to Git:**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push
   ```

2. **Deploy to Vercel:**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your repository
   - **Root Directory**: `backend`
   - **Framework**: Other
   - Click **Deploy**

3. **Add Environment Variables:**
   
   Go to Settings → Environment Variables and add:
   
   ```env
   TWILIO_ACCOUNT_SID=ACxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_token
   TWILIO_PHONE_NUMBER=+1234567890
   OPENAI_API_KEY=sk-xxxxxxxx
   DEEPGRAM_API_KEY=your_key
   DATABASE_URL=postgresql://user:pass@host:5432/db
   SUPABASE_URL=https://xxx.supabase.co
   SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_key
   PORT=3001
   NODE_ENV=production
   ```

4. **Redeploy** after adding variables

5. **Copy your backend URL**: `https://your-backend.vercel.app`

---

### Step 2: Deploy Frontend (3 minutes)

1. **Create new Vercel project:**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import **same repository**
   - **Root Directory**: `frontend`
   - **Framework**: Next.js (auto-detected)
   - Click **Deploy**

2. **Add Environment Variables:**
   
   ```env
   NEXT_PUBLIC_API_URL=https://your-backend.vercel.app
   NEXT_PUBLIC_WS_URL=https://your-backend.vercel.app
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

3. **Redeploy** after adding variables

4. **Copy your frontend URL**: `https://your-frontend.vercel.app`

---

### Step 3: Configure Services (7 minutes)

1. **Update Backend CORS:**
   - Backend project → Settings → Environment Variables
   - Add:
     ```env
     CORS_ORIGIN=https://your-frontend.vercel.app
     PUBLIC_URL=https://your-backend.vercel.app
     ```
   - Redeploy backend

2. **Update Twilio Webhooks:**
   - Go to [Twilio Console](https://console.twilio.com/us1/develop/phone-numbers/manage/incoming)
   - Click your phone number
   - Set **Voice URL**: `https://your-backend.vercel.app/api/webhooks/twilio/voice`
   - Set **Status Callback**: `https://your-backend.vercel.app/api/webhooks/twilio/status`
   - Save

3. **Test Your Deployment:**
   - Visit `https://your-frontend.vercel.app`
   - Make a test call
   - Verify it works! 🎉

---

## 🧪 Quick Test

```bash
# Test backend
curl https://your-backend.vercel.app/health

# Expected: {"status":"ok",...}
```

---

## ⚠️ Common Issues & Quick Fixes

| Issue | Quick Fix |
|-------|-----------|
| "Module not found" | Make sure you ran `npm run build` locally first |
| CORS error | Update `CORS_ORIGIN` in backend to exact frontend URL |
| Webhook not working | Verify `PUBLIC_URL` is set in backend |
| Database connection error | Check `DATABASE_URL` format includes `?sslmode=require` |
| Build failed | Check for TypeScript errors locally first |

---

## 📝 Environment Variables Summary

### Backend (.env in Vercel)
```env
# Required
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
OPENAI_API_KEY=
DEEPGRAM_API_KEY=
DATABASE_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Set after frontend deploy
CORS_ORIGIN=https://your-frontend.vercel.app
PUBLIC_URL=https://your-backend.vercel.app

# Auto-set by Vercel
PORT=3001
NODE_ENV=production
```

### Frontend (.env in Vercel)
```env
NEXT_PUBLIC_API_URL=https://your-backend.vercel.app
NEXT_PUBLIC_WS_URL=https://your-backend.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

---

## 🎯 Next Steps After Deployment

- [ ] Test a real phone call
- [ ] Add custom domain (optional)
- [ ] Set up monitoring
- [ ] Enable analytics
- [ ] Configure billing alerts

---

## 📚 Need More Details?

See the full guide: [VERCEL_DEPLOYMENT_GUIDE.md](./VERCEL_DEPLOYMENT_GUIDE.md)

---

## 🆘 Still Having Issues?

1. Check Vercel function logs (Deployments → View Logs)
2. Verify all environment variables
3. Test backend endpoint directly: `curl https://your-backend.vercel.app/health`
4. Check Twilio debugger for webhook errors

---

**🎉 That's it!** Your AI Customer Call System is now live on Vercel!

Total time: ~15 minutes ⏱️

