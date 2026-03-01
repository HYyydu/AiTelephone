# Deploy the Backend to Railway (Detailed Steps)

This guide walks you through deploying the **backend only** to Railway so you get a **stable public URL** for Twilio webhooks. You will set `PUBLIC_URL` once and never change it again.

---

## What You’ll Get

- A fixed URL like `https://your-app-name.railway.app` (or a custom domain).
- No more updating `PUBLIC_URL` when a free tunnel (Cloudflare/ngrok) restarts.
- Twilio and your frontend can always use this URL.

---

## Prerequisites

- A [Railway](https://railway.app) account (sign up with GitHub for easy repo connect).
- This repo pushed to **GitHub** (Railway deploys from GitHub by default).
- Your backend **environment values** ready (Twilio, OpenAI, database, etc.) — same as in `backend/.env.example`.

---

## Step 1: Sign in to Railway

1. Go to **[railway.app](https://railway.app)** and click **Login**.
2. Choose **Login with GitHub** and authorize Railway.
3. You’ll land on the Railway dashboard.

---

## Step 2: Create a New Project

1. Click **“New Project”** (or **“Add new project”**).
2. You’ll see: **Deploy from GitHub repo**, **Empty project**, or **Deploy from template**.
3. Choose **“Deploy from GitHub repo”**.
4. If asked, click **“Configure GitHub App”** and allow Railway access to your GitHub account (or the org that owns the repo).
5. Select the repository that contains this code (e.g. `AiCostumerCall` or your fork).
6. Railway may ask **“Which branch?”** — choose your main branch (e.g. `main`).
7. Click **“Deploy”** or **“Add repository”**. Railway will create a project and try to deploy. The first deploy might fail until we set the **root directory** and **environment variables**; that’s expected.

---

## Step 3: Set the Root Directory (Recommended) or Use Root Build

This repo has both **frontend** and **backend**. You can either set Root Directory so only the backend is built, or use the repo-root workaround below.

**Option A — Set Root Directory (cleanest):**

1. In your Railway project, click the **service** that was created (the one linked to your repo).
2. Open the **Settings** tab.
3. Look for **“Source”** (or **“Repository”**) in the left/side menu or in the settings sections. **Root Directory** lives there, not under “Build”.
4. Set **Root Directory** to: **`backend`** (no leading slash).
5. Save. Railway will redeploy using only the `backend` folder.

**Option B — If you can’t find Root Directory (workaround):**

The repo has a **root-level `package.json`** and **`railway.json`** that delegate build and start to the `backend` folder. If you leave Root Directory empty (build from repo root), push the latest code and redeploy: Railpack will detect Node from the root `package.json` and run `npm run build` / `npm start`, which run the backend. No need to set Root Directory for the build to succeed.

---

## Step 4: Set Build and Start Commands (Optional if using repo’s railway.json)

The repo’s `backend/railway.json` already has:

- **Build:** `npm run build` (compiles TypeScript to `dist/`)
- **Start:** `npm start` (runs `node dist/server.js`)

If your service **does not** use this file (e.g. you didn’t set root directory at first), set in the service **Settings**:

- **Build Command:** `npm run build`
- **Start Command:** `npm start`

With **Root Directory** = `backend`, Railway will find `backend/railway.json` and use these automatically.

---

## Step 5: Add Environment Variables

The backend needs the same variables as in `backend/.env` (see `backend/.env.example`). Set them in Railway so the app can start and Twilio can use the deployed URL.

1. In the same **service** → open the **Variables** tab (or **“Variables”** in the left/side menu).
2. Click **“Add variable”** or **“New variable”** / **“Raw Editor”**.
3. Add each variable. You can paste from your local `backend/.env` and then fix values (see table below).

**Required for basic run + Twilio calls:**

| Variable            | Example / description |
|---------------------|------------------------|
| `NODE_ENV`          | `production` |
| `PORT`              | Leave **empty** — Railway sets this automatically. |
| `PUBLIC_URL`        | **Leave empty for the first deploy** (see Step 6). After first deploy, set to your Railway URL, e.g. `https://your-service.railway.app`. |
| `CORS_ORIGIN`       | Your frontend URL, e.g. `https://your-frontend.vercel.app` or `http://localhost:3000` for local dev. |
| `TWILIO_ACCOUNT_SID`| From [Twilio Console](https://console.twilio.com). |
| `TWILIO_AUTH_TOKEN` | From Twilio Console. |
| `TWILIO_PHONE_NUMBER` | Your Twilio number, e.g. `+15551234567`. |
| `OPENAI_API_KEY`    | From [OpenAI API keys](https://platform.openai.com/api-keys). |
| `DATABASE_URL`      | Postgres connection string (e.g. Supabase or Railway Postgres). |

**Optional but recommended:**

| Variable            | Example / description |
|---------------------|------------------------|
| `SUPABASE_URL`      | If you use Supabase. |
| `SUPABASE_ANON_KEY` | If you use Supabase. |
| `SUPABASE_SERVICE_ROLE_KEY` | If you use Supabase auth. |
| `GOOGLE_MAPS_API_KEY` | If you use quote/places. |
| `REDIS_URL`         | If you use Redis (e.g. Upstash). |

**Tip:** Use **“Bulk add”** or **“Raw Editor”** and paste:

```env
NODE_ENV=production
CORS_ORIGIN=https://your-frontend.vercel.app
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+15551234567
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql://...
```

Replace placeholders with your real values. **Do not set `PUBLIC_URL` yet** — we’ll set it after the first deploy.

---

## Step 6: First Deploy and Get Your Stable URL

1. Trigger a deploy:
   - Either push a commit to the connected branch, or  
   - In Railway, open **Deployments** and click **“Redeploy”** (or **“Deploy”**).
2. Wait for the build to finish (Build → **Success**, then Deploy → **Success**).
3. Generate a public URL:
   - Open the **Settings** tab of the service.
   - Find **“Networking”** or **“Public Networking”**.
   - Click **“Generate domain”** (or **“Add domain”**). Railway will assign a URL like `https://your-service-name.railway.app` or `https://xxx-production-xxxx.up.railway.app`.
4. Copy that URL (e.g. `https://aicall-backend-production-abc123.up.railway.app`). This is your **stable** backend URL.

---

## Step 7: Set PUBLIC_URL and Redeploy

1. Go to the **Variables** tab of the same service.
2. Add or edit:
   ```env
   PUBLIC_URL=https://your-actual-railway-url.railway.app
   ```
   Use the **exact** URL from Step 6 (no trailing slash).
3. Save. Railway will redeploy automatically. After this deploy, the backend will use this URL for Twilio webhooks and any links it generates.

You only need to change `PUBLIC_URL` again if you add a **custom domain** (see Step 9).

---

## Step 8: Point Your Frontend at the Backend

- **If the frontend runs locally:**  
  In `frontend/.env.local` set:
  ```env
  NEXT_PUBLIC_API_URL=https://your-actual-railway-url.railway.app
  NEXT_PUBLIC_WS_URL=https://your-actual-railway-url.railway.app
  ```
  Restart the Next.js dev server.

- **If the frontend is deployed (e.g. Vercel):**  
  In the frontend’s environment (e.g. Vercel project → Settings → Environment Variables) set the same:
  ```env
  NEXT_PUBLIC_API_URL=https://your-actual-railway-url.railway.app
  NEXT_PUBLIC_WS_URL=https://your-actual-railway-url.railway.app
  ```
  Redeploy the frontend.

Twilio is already using the backend via `PUBLIC_URL`; the frontend just needs to call and connect to that same URL.

---

## Step 9 (Optional): Add a Custom Domain

If you want a URL like `https://api.yourdomain.com`:

1. In the service **Settings** → **Networking** / **Domains**, click **“Custom domain”**.
2. Enter your domain (e.g. `api.yourdomain.com`).
3. Railway will show a **CNAME** target (e.g. `xxx.railway.app`). In your DNS provider, add a CNAME record: `api` (or your subdomain) → that target.
4. After DNS propagates, Railway will issue SSL and your backend will be reachable at `https://api.yourdomain.com`.
5. Update **Variables** → `PUBLIC_URL` to `https://api.yourdomain.com` and save (Railway will redeploy).

---

## Checklist Summary

- [ ] Railway account created (e.g. Login with GitHub).
- [ ] New project → Deploy from GitHub repo → this repo.
- [ ] **Root Directory** set to **`backend`**.
- [ ] **Variables** set (Twilio, OpenAI, `DATABASE_URL`, `CORS_ORIGIN`, etc.); `PUBLIC_URL` left empty for first deploy.
- [ ] First deploy succeeded; **Generate domain** and copy the HTTPS URL.
- [ ] **Variables** → `PUBLIC_URL` = that URL (no trailing slash) → redeploy.
- [ ] Frontend `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` point to the same backend URL.

After this, your backend has a **stable** URL; no tunnel or `PUBLIC_URL` updates needed unless you change the domain.

---

## Troubleshooting

- **"Error creating build plan with Railpack" / "Script start.sh not found" / "could not determine how to build the app"**  
  Railpack wasn’t detecting Node.js at the repo root. **Fix:** Push the latest code — the repo now has a root **`package.json`** and **`railway.json`** that make the root a Node app and delegate build/start to `backend`. Then trigger a new deploy. Alternatively, in the service **Settings** → **Source**, set **Root Directory** to **`backend`** and redeploy.

- **Build fails with “Cannot find module” or “dist not found”**  
  Ensure **Root Directory** is `backend` and the build command is `npm run build` (either via `backend/railway.json` or in Settings).

- **Deploy succeeds but “Application failed to respond”**  
  The app might be crashing on startup. Check **Deployments** → latest deploy → **View logs**. Common causes: missing `DATABASE_URL`, wrong env vars, or the app not listening on `process.env.PORT` (this backend already uses `PORT` from env).

- **Twilio webhooks return 404**  
  Confirm `PUBLIC_URL` is set to the exact public URL (no trailing slash) and that you redeployed after setting it. Test in a browser: `https://your-backend.railway.app/health` should return 200.

- **CORS errors from the frontend**  
  Set `CORS_ORIGIN` in Railway to your frontend origin (e.g. `https://your-app.vercel.app` or `http://localhost:3000`). No trailing slash.

- **Database connection errors**  
  Use a Postgres URL reachable from the internet (e.g. Supabase or Railway Postgres). If you use Supabase, ensure `DATABASE_URL` and Supabase keys are set in Railway variables.
