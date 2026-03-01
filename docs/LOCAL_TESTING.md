# Test Your Website Locally

Follow these steps to run the frontend and backend on your machine and test the flow.

---

## 1. Prerequisites

- **Node.js** 18+ installed
- **npm** (or pnpm/yarn)
- Backend **.env** and frontend **.env.local** set up (see below)

---

## 2. Backend environment (`.env`)

In **`backend/`**, create or edit **`.env`** (copy from **`.env.example`** if needed). For local testing you need at least:

```env
# Server
PORT=3001
NODE_ENV=development
PUBLIC_URL=http://localhost:3001

# CORS (frontend URL)
CORS_ORIGIN=http://localhost:3000

# Twilio (from https://console.twilio.com)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# OpenAI (from https://platform.openai.com/api-keys)
OPENAI_API_KEY=your_openai_key

# Database – use your Supabase or local Postgres URL
DATABASE_URL=postgresql://...
# If using Supabase:
# SUPABASE_URL=https://xxxx.supabase.co
# SUPABASE_ANON_KEY=...
# SUPABASE_SERVICE_ROLE_KEY=...
```

- **Without real calls:** You can leave Twilio/OpenAI placeholder if you only want to load the UI and see API errors.
- **With real calls:** All of the above must be valid. For Twilio to reach your backend, `PUBLIC_URL` must be a **public** URL (see step 5).

---

## 3. Frontend environment (`.env.local`)

In **`frontend/`**, create **`.env.local`** (or copy from **`.env.local.example`**):

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

This makes the website talk to your local backend. No need to change these for basic local testing.

---

## 4. Install and run (two terminals)

### Terminal 1 – Backend

```bash
cd backend
npm install
npm run dev
```

Wait until you see something like: `AI Customer Call Backend is running!` and `Listening on ... 3001`.

### Terminal 2 – Frontend

```bash
cd frontend
npm install
npm run dev
```

Wait until you see: `Ready on http://localhost:3000` (or similar).

### Browser

Open: **http://localhost:3000**

- You should see your landing/dashboard.
- Sign in if your app uses auth (Supabase).
- You can open the dashboard, create a call (form), and open a call detail page.
- **Without a public URL:** Creating a call may fail when Twilio tries to connect (expected until step 5).
- **With a public URL and valid keys:** Full flow (call + live transcript) will work.

---

## 5. (Optional) Real phone calls from local – expose backend

Twilio needs to send webhooks and media to your backend. On your machine, the backend is only reachable as `localhost`, so you must expose it with a tunnel.

1. **Install a tunnel** (one of):
   - **Cloudflare:** `brew install cloudflared` then run:
     ```bash
     cloudflared tunnel --url http://localhost:3001
     ```
   - **ngrok:** `brew install ngrok` then run:
     ```bash
     ngrok http 3001
     ```

2. **Copy the HTTPS URL** (e.g. `https://xxxx.trycloudflare.com` or `https://xxxx.ngrok.io`).

3. **Set it in backend `.env`:**

   ```env
   PUBLIC_URL=https://xxxx.trycloudflare.com
   ```

   (Use your actual URL; no trailing slash.)

4. **Restart the backend** (Ctrl+C in the backend terminal, then `npm run dev` again).

5. Create a call from the website; Twilio will use `PUBLIC_URL` for webhooks and media, so the call can connect and you’ll see live transcript on **http://localhost:3000**.

**Note:** Quick tunnels (e.g. `trycloudflare.com`, free ngrok) give a **new URL each time** you start the tunnel. See **§5a** below for options that give a **stable** URL so you don’t have to update `PUBLIC_URL` every time.

---

## 5a. Stable PUBLIC_URL (so you don’t have to change it every time)

If you’re tired of updating `PUBLIC_URL` whenever the free tunnel URL changes, use one of these:

### Option A: Deploy the backend (recommended)

Deploy the backend to a host that gives a **permanent URL**. Set `PUBLIC_URL` once in that environment and leave it.

- **Railway** (this repo has `backend/railway.json` and `Procfile`):  
  **→ [Detailed step-by-step: Deploy backend to Railway](RAILWAY_DEPLOY_BACKEND.md)**

- **Render, Fly.io, etc.** work the same way: deploy backend, use the provided HTTPS URL as `PUBLIC_URL`, and point the frontend at it when needed.

No tunnel or changing URLs; the backend URL is stable.

### Option B: Cloudflare Named Tunnel (free, stable hostname)

Quick tunnels (`cloudflared tunnel --url ...`) get a new URL each run. **Named tunnels** get a stable tunnel ID and (with a hostname) a stable URL.

1. Install cloudflared: `brew install cloudflared`.
2. Log in: `cloudflared tunnel login` (opens browser; pick a domain in your Cloudflare account).
3. Create a named tunnel: `cloudflared tunnel create aicall-backend`. Note the tunnel ID (e.g. `abc123-def456-...`).
4. Create a config file (e.g. `~/.cloudflared/config.yml`):
   ```yaml
   tunnel: <your-tunnel-id>
   credentials-file: /Users/you/.cloudflared/<tunnel-id>.json
   ingress:
     - hostname: backend.yourdomain.com   # a hostname you control in Cloudflare DNS
       service: http://localhost:3001
     - service: http_status:404
   ```
5. In Cloudflare DNS, add a CNAME: `backend` → `<tunnel-id>.cfargotunnel.com`.
6. Run the tunnel: `cloudflared tunnel run aicall-backend`.
7. Set in backend `.env`: `PUBLIC_URL=https://backend.yourdomain.com`.

You need a domain (or free subdomain) that uses Cloudflare DNS. Once set up, this URL does not change.

### Option C: ngrok reserved domain (paid)

On a paid ngrok plan you can reserve a subdomain (e.g. `yourapp.ngrok.io`). Set `PUBLIC_URL` to that once; it stays the same across restarts.

### Option D: localtunnel with subdomain (free, less reliable)

```bash
npx localtunnel --port 3001 --subdomain my-aicall-backend
```

If the subdomain is free, you get `https://my-aicall-backend.loca.lt`. Set `PUBLIC_URL` to that. It can be stable if no one else claims the subdomain; the service is less reliable than the options above.

---

## 6. Quick checklist

| Step | Action                                                                                                                |
| ---- | --------------------------------------------------------------------------------------------------------------------- |
| 1    | Backend `.env` with PORT, CORS_ORIGIN, Twilio, OpenAI, DATABASE_URL (and Supabase if used)                            |
| 2    | Frontend `.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:3001` and `NEXT_PUBLIC_WS_URL=http://localhost:3001` |
| 3    | Run backend: `cd backend && npm install && npm run dev`                                                               |
| 4    | Run frontend: `cd frontend && npm install && npm run dev`                                                             |
| 5    | Open **http://localhost:3000** in the browser                                                                         |
| 6    | (For real calls) Expose backend (e.g. Cloudflare/ngrok), set `PUBLIC_URL` in backend `.env`, restart backend          |

---

## Troubleshooting

- **"Failed to fetch" / "Network Error"**  
  Backend not running or wrong URL. Check backend is on port 3001 and `NEXT_PUBLIC_API_URL` is `http://localhost:3001`.

- **WebSocket / live transcript not updating**  
  Check `NEXT_PUBLIC_WS_URL` is `http://localhost:3001` and backend is running. Check browser console for Socket.io errors.

- **Call created but "application error" or no audio**  
  Usually Twilio can’t reach your backend. Set `PUBLIC_URL` to your tunnel URL (step 5) and restart backend.

- **Auth / sign-in issues**  
  Ensure Supabase env vars are set in backend and, if the frontend uses Supabase client, that the frontend has the correct Supabase URL and anon key (in env or in code).

- **Database connection errors**  
  Check `DATABASE_URL` (and Supabase vars if used); ensure DB is reachable from your machine.

---

## Summary

- **Website locally:** Backend on **3001**, frontend on **3000**, frontend env points to `http://localhost:3001`. Open **http://localhost:3000**.
- **Real calls from local:** Expose backend with Cloudflare or ngrok, set **`PUBLIC_URL`** in backend `.env`, restart backend, then test again from the same local website.
