# Where Is the Frontend & How to Introduce Lovable

## Where Your Frontend Lives

Your frontend is the **`frontend/`** folder at the project root:

```
AiCostumerCall/
├── backend/          ← Node.js API + Socket.io + media WebSocket
└── frontend/         ← Next.js app (this is your frontend)
    ├── app/                    ← Routes & pages
    │   ├── layout.tsx
    │   ├── page.tsx            ← Landing
    │   ├── auth/page.tsx
    │   ├── dashboard/page.tsx
    │   └── call/[id]/page.tsx  ← Call detail + live transcript
    ├── components/             ← Reusable UI
    │   ├── CallForm.tsx, CallList.tsx, TranscriptView.tsx, ...
    │   └── ui/                 ← shadcn-style primitives
    ├── contexts/
    │   └── AuthContext.tsx
    ├── hooks/
    ├── lib/
    │   ├── api.ts              ← Backend REST client
    │   ├── websocket.ts        ← Socket.io client
    │   ├── types.ts
    │   └── utils.ts
    ├── package.json
    ├── next.config.ts
    └── ...
```

**Important files for “frontend that talks to your backend”:**

- **`frontend/lib/api.ts`** – HTTP client to your backend (`/api/calls`, `/api/auth`, etc.)
- **`frontend/lib/websocket.ts`** – Socket.io client for live transcripts and call status
- **`frontend/lib/types.ts`** – Shared types (Call, Transcript, etc.)
- **`frontend/app/call/[id]/page.tsx`** – Call detail page (uses api + websocket)
- **`frontend/app/dashboard/page.tsx`** – Dashboard (calls list, create call)
- **`frontend/contexts/AuthContext.tsx`** – Auth state and token

So: **all frontend code you’d want Lovable to touch lives under `frontend/`.**

---

## What “Introduce Lovable” Can Mean

**Lovable** (lovable.dev) is an AI-powered UI builder that can:

- Edit and generate frontend code (React/Next.js style)
- Sync with GitHub (push/pull)
- Use a custom backend by talking to it via API (e.g. OpenAPI + generated client)

“Introduce Lovable” here can mean one or more of:

1. **Use Lovable as the editor for your existing frontend** (import via GitHub, keep backend as-is).
2. **Optionally restructure the frontend** so it matches Lovable-friendly conventions (easier for Lovable’s AI to work with).
3. **Teach Lovable about your backend** (OpenAPI + `lib/api.ts`) so it can add features that call your API correctly.

Below is a concrete way to do that without breaking your current setup.

---

## Suggested Way to Introduce Lovable

### Option A: Use Lovable to Edit Your Current Frontend (Recommended First Step)

1. **Push your repo to GitHub** (if not already).  
   Your repo already has `frontend/` and `backend/` in one monorepo.

2. **Create a project in Lovable** and **connect it to that GitHub repo** (Lovable docs: “Connect your project to GitHub”).  
   Lovable will see the same repo you have locally.

3. **Point Lovable at the frontend:**  
   - In Lovable, the “app” or “root” of what it edits should be your **frontend** (the Next.js app).  
   - So in Lovable’s project settings, set the **root** or **app path** to **`frontend`** (or wherever Lovable expects the Next.js app to live).  
   - That way Lovable only edits/adds files under `frontend/`, and does not overwrite `backend/`.

4. **Keep backend as-is:**  
   - Backend stays in the same repo, at `backend/`.  
   - You keep running and deploying the backend yourself (Railway, Vercel, etc.).  
   - Frontend (edited by Lovable) still uses `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` to talk to that backend.

5. **Document for Lovable’s AI:**  
   - In Lovable’s “Knowledge” or instructions, add that:  
     - “The app talks to our own backend. API base URL is from `NEXT_PUBLIC_API_URL`, WebSocket from `NEXT_PUBLIC_WS_URL`.”  
     - “REST client and types are in `lib/api.ts` and `lib/types.ts`. Real-time updates use `lib/websocket.ts` (Socket.io).”  
   - So when you ask Lovable to add features, it uses your existing `api.ts` and `websocket.ts` instead of inventing new endpoints.

**Summary:**  
Frontend path = **`frontend/`**. Introduce Lovable by connecting the repo to Lovable and setting the app root to **`frontend`**; no need to move the backend or change how the frontend communicates (HTTP + Socket.io) with the backend.

---

### Option B: (Optional) Align Frontend Structure With Lovable Conventions

Lovable often works well with a clear split between:

- **Screens/pages** – one folder (e.g. `app/` or `screens/`)
- **Reusable components** – e.g. `components/`
- **API / backend logic** – e.g. `lib/` or `services/`
- **Shared state** – e.g. `contexts/`

Your layout is already close:

| Lovable-style | Your project |
|---------------|--------------|
| Screens/pages | `frontend/app/` (page.tsx files) |
| Components    | `frontend/components/` |
| API / backend | `frontend/lib/api.ts`, `lib/websocket.ts` |
| Context       | `frontend/contexts/AuthContext.tsx` |

So you **don’t have to** restructure to “introduce” Lovable. If you want to go closer to Lovable’s defaults later, you could:

- Keep all **API and WebSocket** usage inside `lib/` (you already do).
- Keep **pages** in `app/` and **reusable UI** in `components/`.  
No file moves are strictly required; this is optional polish.

---

### Option C: Let Lovable Generate a Type-Safe API Layer (If You Add OpenAPI)

If you want Lovable to be able to **generate or extend** the API client safely:

1. **Add an OpenAPI spec for your backend** (e.g. `openapi.yaml` or `openapi.json`) describing `/api/calls`, `/api/auth`, etc., and put it in the repo (e.g. root or `frontend/`).

2. **Generate a TypeScript client** from that spec (e.g. `openapi-fetch` or `orval`) into something like `frontend/lib/api-client.ts` (or keep enhancing `frontend/lib/api.ts` from the generated types).

3. **In Lovable’s Knowledge**, tell it: “We use the generated client in `lib/api-client.ts` (or `lib/api.ts`) for all backend calls; do not create new ad-hoc fetch calls to the backend.”

Then Lovable can add new UI that calls your backend in a consistent, type-safe way.  
This is an enhancement; Option A works without it.

---

## What to Change (Minimal)

- **Repo:** Push to GitHub and connect that repo to Lovable.
- **Lovable project:** Set **application root** to **`frontend`** so Lovable only edits the Next.js app.
- **Env:** In Lovable (or in your deployment), keep **`NEXT_PUBLIC_API_URL`** and **`NEXT_PUBLIC_WS_URL`** pointing at your backend.
- **Docs for AI:** In Lovable, add a short note that the frontend uses `lib/api.ts` and `lib/websocket.ts` to talk to the backend and that the backend is in `backend/`.

You do **not** need to:

- Move the frontend to a different repo (unless you want to).
- Change how the backend is run or deployed.
- Replace your existing `api.ts` or `websocket.ts` unless you decide to use a generated client (Option C).

---

## Quick Reference

| Question | Answer |
|----------|--------|
| Where is the frontend? | **`frontend/`** at repo root. |
| Where are the “entry” pages? | **`frontend/app/`** (e.g. `page.tsx`, `dashboard/page.tsx`, `call/[id]/page.tsx`). |
| Where does the frontend talk to the backend? | **`frontend/lib/api.ts`** (HTTP), **`frontend/lib/websocket.ts`** (Socket.io). |
| How to introduce Lovable? | Connect repo to Lovable, set app root to **`frontend`**, document `lib/api.ts` and `lib/websocket.ts` in Lovable’s Knowledge. |
| Do I need to move files? | No. Optional: add OpenAPI and a generated client later (Option C). |

If you tell me whether you prefer “Lovable only edits existing frontend” vs “I want to add OpenAPI and a generated client,” I can suggest exact steps (or file changes) for that path next.
