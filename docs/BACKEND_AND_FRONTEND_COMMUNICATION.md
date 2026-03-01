# Backend System & Frontend Communication

## What Is Your Backend?

Your backend is a **Node.js server** that runs on one process and does three main things:

1. **HTTP API** (Express) – REST endpoints for calls, auth, webhooks  
2. **Socket.io** – Real-time updates to the **frontend** (transcripts, call status)  
3. **Raw WebSocket** (`ws`) – **Twilio Media Streams** (phone audio) and **OpenAI Realtime** (AI audio/text)

All of this runs on a **single HTTP server** (created with `createServer(app)`). Express handles HTTP, Socket.io attaches to the same server, and the same server handles WebSocket upgrades for `/media-stream`.

---

## Backend Architecture (High Level)

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                  Node.js Backend (server.ts)             │
                    │                                                          │
                    │  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐ │
                    │  │   Express    │  │  Socket.io   │  │  ws (raw WS)   │ │
                    │  │   (HTTP)     │  │  (Frontend) │  │  /media-stream │ │
                    │  └──────┬───────┘  └──────┬───────┘  └───────┬────────┘ │
                    │         │                 │                  │          │
                    │  /api/calls, /api/webhooks, /api/auth        │          │
                    │  /health, CORS, JSON body                     │          │
                    │         │                 │                  │          │
                    └─────────┼─────────────────┼──────────────────┼──────────┘
                              │                 │                  │
         Frontend             │                 │                  │   Twilio
         (Next.js)             │                 │                  │   (phone)
                              ▼                 ▼                  ▼
                    HTTP (fetch)          Socket.io             WebSocket
                    REST API              real-time             media stream
```

- **Frontend** talks to backend over **HTTP** (REST) and **Socket.io** (real-time).  
- **Twilio** talks to backend over **HTTP** (webhooks) and **WebSocket** (`/media-stream`).  
- **OpenAI** is only used **from the backend** (server-to-server), not from the frontend.

---

## 1. HTTP (REST API) – Frontend ↔ Backend

**Protocol:** HTTP/HTTPS  
**Base URL:** `NEXT_PUBLIC_API_URL` (e.g. `http://localhost:3001` or your deployed backend URL)

**What the frontend uses:**

| Method | Path | Purpose |
|--------|------|--------|
| POST   | `/api/auth/signin`, `/api/auth/signup`, etc. | Auth (login, signup, refresh, etc.) |
| POST   | `/api/calls` | Create a call (body: phone_number, purpose, voice_preference, additional_instructions) |
| GET    | `/api/calls` | List calls (for the logged-in user) |
| GET    | `/api/calls/:id` | Get one call |
| GET    | `/api/calls/:id/transcripts` | Get transcripts for a call |
| GET    | `/api/calls/stats/summary` | Call stats |
| DELETE | `/api/calls/:id` | Delete a call |

**How the frontend calls it:**  
- Uses the **API client** in `frontend/lib/api.ts`: same base URL, sends JSON, and attaches the auth token (e.g. `Authorization: Bearer <token>`) from `localStorage` when present.

**Backend side:**  
- **Express** app in `server.ts`  
- Routes: `app.use("/api/calls", callsRouter)`, `app.use("/api/webhooks", webhooksRouter)`, `app.use("/api/auth", authRouter)`  
- CORS is configured so the frontend origin (e.g. localhost:3000, your Vercel domain) is allowed.

So: **backend = Express REST API; frontend = HTTP client (api.ts) with auth.**

---

## 2. Socket.io – Real-Time Frontend ↔ Backend

**Protocol:** Socket.io (over WebSocket or long polling)  
**URL:** Same host as API, e.g. `http://localhost:3001` (Socket.io path is `/socket.io/` by default)

**Purpose:** Push **live** updates to the browser: new transcripts and call status changes, without the frontend polling.

**Connection:**

- **Frontend:** `frontend/lib/websocket.ts` – `wsClient.connect()` uses `io(WS_URL, ...)` with `NEXT_PUBLIC_WS_URL` (same as API URL in practice).
- **Backend:** `server.ts` – `const io = new SocketIOServer(httpServer, { cors: ... })` and `io.on("connection", ...)`.

**Rooms:**

- When the user opens a call page (e.g. call detail), the frontend calls `wsClient.joinCall(callId)`.
- That sends a **Socket.io event** `join_call` with `callId`.
- Backend does `socket.join("call:" + callId)` so that call’s events are only sent to clients in that room.

**Events (backend → frontend):**

| Event          | Emitted by                    | Payload | When |
|----------------|-------------------------------|---------|------|
| `transcript`   | `gpt4o-realtime-handler.ts`   | `Transcript` | Each new transcript line (AI or human) |
| `call_status`  | `webhooks.ts` (Twilio status) | `{ call_id, status, duration? }` | Twilio reports status (e.g. ringing, in-progress, completed) |
| `call_ended`   | `webhooks.ts` (Twilio status) | `{ call_id, outcome?, duration }` | When Twilio says the call ended |

**Emit targets:**

- Transcripts: `io.to("call:" + this.call.id).emit("transcript", transcript)` in `gpt4o-realtime-handler.ts`.
- Status/ended: `io.to("call:" + call.id).emit("call_status", ...)` and `io.to("call:" + call.id).emit("call_ended", ...)` in `webhooks.ts`.

**Frontend usage:**  
- `wsClient.onTranscript(...)`, `wsClient.onCallStatus(...)`, `wsClient.onCallEnded(...)` in `frontend/lib/websocket.ts` register Socket.io listeners for those event names.  
- So: **backend emits into room `call:<id>`; frontend joins that room and subscribes to events.**

Summary: **Backend = Socket.io server; frontend = Socket.io client; communication = join room by call id, then backend pushes transcript and call_status/call_ended.**

---

## 3. WebSocket `/media-stream` – Twilio ↔ Backend (Not Frontend)

**Protocol:** Raw WebSocket (`ws` / `wss`)  
**Path:** `ws://<backend>/media-stream?callSid=...`

**Who uses it:**  
- **Twilio** connects to this URL when a call is answered (as configured in the TwiML from `/api/webhooks/twilio/voice`).  
- The **frontend does not** connect to `/media-stream`. It never sends or receives phone audio.

**What flows:**

- **Twilio → Backend:** Stream of audio (e.g. mulaw) from the phone call.
- **Backend → Twilio:** Stream of audio (e.g. mulaw) to play to the caller (AI speech).

**Backend handling:**  
- `server.ts`: `httpServer.on("upgrade", ...)` checks `pathname === "/media-stream"`, then passes the upgrade to `mediaStreamWss` (raw `ws` server).  
- Each connection is passed to `GPT4oRealtimeHandler(ws)`.  
- Inside the handler: decode Twilio audio → send to **OpenAI Realtime API** (another WebSocket); receive AI audio/text from OpenAI → encode and send back to Twilio; also **save transcripts and emit them via Socket.io** to the frontend (see above).

So: **Backend = bridge between Twilio (media WebSocket) and OpenAI (Realtime API); frontend only gets the result of that (transcripts, status) via Socket.io and REST.**

---

## End-to-End Flow (How Frontend and Backend Work Together)

1. **User starts a call (from frontend)**  
   - Frontend: `api.createCall({ phone_number, purpose, ... })` → **POST /api/calls** with auth.  
   - Backend: creates call in DB, returns call object; calls `initiateCall(call)` (Twilio API) so Twilio dials the number and uses your webhook URLs.

2. **Twilio answers and connects media**  
   - Twilio: **POST /api/webhooks/twilio/voice** → backend returns TwiML with `<Stream url="wss://.../media-stream?callSid=...">`.  
   - Twilio opens **WebSocket** to that URL.  
   - Backend: `GPT4oRealtimeHandler` is created for that WebSocket; it connects to OpenAI Realtime, and runs the conversation (audio in/out, transcripts).

3. **User opens the call page (e.g. /call/[id])**  
   - Frontend: loads call and transcripts via **GET /api/calls/:id** and **GET /api/calls/:id/transcripts**.  
   - Frontend: `wsClient.connect()` (if not already), then `wsClient.joinCall(callId)` so it’s in room `call:<id>`.

4. **During the call – real-time updates**  
   - Backend (GPT4oRealtimeHandler): on each transcript, saves to DB and **Socket.io** `io.to("call:" + call.id).emit("transcript", transcript)`.  
   - Backend (webhooks): on Twilio status callbacks, updates DB and **Socket.io** `io.to("call:" + call.id).emit("call_status", ...)` and optionally `call_ended`.  
   - Frontend: already in room and listening for `transcript`, `call_status`, `call_ended`; updates UI (transcript list, status, duration).

5. **After the call**  
   - Frontend can refresh or refetch **GET /api/calls/:id** and **GET /api/calls/:id/transcripts** to get final state.

So: **Frontend communicates with backend only via HTTP (REST) and Socket.io. It does not talk to Twilio or OpenAI directly; the backend does that and pushes results to the frontend over Socket.io (and stores them for REST).**

---

## Summary Table

| Channel           | Protocol   | Who ↔ Who              | Purpose |
|-------------------|-----------|-------------------------|--------|
| REST API          | HTTP      | Frontend ↔ Backend     | Auth, create/list/get calls, get transcripts, delete call. |
| Socket.io         | WS/polling| Frontend ↔ Backend     | Live transcripts, call_status, call_ended for the current call. |
| /media-stream     | WebSocket | Twilio ↔ Backend       | Phone audio in/out; backend bridges to OpenAI Realtime. |
| (OpenAI Realtime) | WebSocket | Backend ↔ OpenAI       | AI conversation (audio + transcripts); backend only. |
| Twilio webhooks   | HTTP      | Twilio → Backend       | Voice TwiML, status callbacks (ringing, completed, etc.). |

**In one sentence:**  
Your backend is an Express + Socket.io + raw WebSocket server: it serves REST and Socket.io to the frontend, and uses a raw WebSocket for Twilio media plus server-to-server OpenAI Realtime; the frontend only uses REST and Socket.io to talk to the backend.
