# Create Call API – For External Frontends

This document describes how another frontend can use this backend’s **create call** endpoint and how to get a response in the shape `{ callId, status, callReason, message }`.

---

## Setting Up Another Frontend (CALL_BACKEND_URL / CALL_API_TOKEN)

If the other frontend (e.g. Lovable or a third‑party UI) asks you to **“Set CALL_BACKEND_URL and CALL_API_TOKEN for the GPT-4o Realtime call backend”**, use the following.

### What to set

| Their env var        | What to set                                     | Notes                                                                                                                                        |
| -------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **CALL_BACKEND_URL** | Your backend’s **base URL** (no trailing slash) | Same URL for both REST and WebSocket. Examples: `https://your-app.railway.app`, `https://xxx.trycloudflare.com`, or `http://localhost:3001`. |
| **CALL_API_TOKEN**   | **Not a fixed env value**                       | This backend does **not** use a static API key. It uses **Supabase JWT**. See below.                                                         |

### About “CALL_API_TOKEN”

- There is **no** `CALL_API_TOKEN` (or similar) env var on this backend.
- The backend expects **Supabase JWT** in the `Authorization` header for `POST /api/calls` and other protected routes.
- So in the other frontend you must either:
  1. **Use auth (recommended):** Implement sign-in (and optionally sign-up) against this backend, then use the returned **`token`** as the Bearer token for all call API requests. That token is what they might call “CALL_API_TOKEN” — it’s the **session token**, not a shared secret.
  2. **If their UI only supports a single “token” env var:** You can set that to the **current user’s JWT** after sign-in, and refresh it when it expires (e.g. via `POST /api/auth/refresh`). You cannot use one static token for all users unless you add that kind of API key to the backend (not implemented today).

### Quick mapping for the other frontend

- **CALL_BACKEND_URL** = backend base URL (e.g. `NEXT_PUBLIC_API_URL` in this repo).
- **CALL_API_TOKEN** = **Supabase JWT** from `POST {CALL_BACKEND_URL}/api/auth/signin` (or signup) → response field **`token`**. Send it as `Authorization: Bearer <token>` on every `POST /api/calls` (and other authenticated) request.

For WebSocket (live transcripts, call status), the other frontend should point its Socket.io client at the **same** base URL as **CALL_BACKEND_URL** (this backend serves both HTTP and Socket.io on the same origin).

---

## Create Call Endpoint (Current Backend)

**URL:** `POST http://localhost:3001/api/calls`  
(Port defaults to **3001** via `PORT` env; use `4000` only if you run the backend with `PORT=4000`.)

**Auth:** The route requires authentication. Send a valid JWT:

- Header: `Authorization: Bearer <token>`

There is **no** `CALL_API_TOKEN` (or similar) environment variable. The token is a **Supabase JWT** that you get by signing in (or signing up) through the backend’s auth API. See [How to get the token](#how-to-get-the-token) below.

**Request body (JSON):**

The backend expects **snake_case** and uses `purpose` (not `callReason`):

```json
{
  "phone_number": "+15551234567",
  "purpose": "Customer needs help with refund for order #123"
}
```

Optional fields: `voice_preference`, `additional_instructions`, and for quote flows: `quote_type`, `quote_slots`.

So the other frontend must send at least:

- `phone_number` (required)
- `purpose` (required) — this is the “call reason”

If their API uses `phoneNumber` and `callReason`, they can map before calling:

```js
body: JSON.stringify({
  phone_number: phoneNumber,
  purpose: callReason,
});
```

---

## How to get the token

The backend does **not** use a fixed API key like `CALL_API_TOKEN`. It uses **Supabase Auth**: the token is the **session access token** returned when a user signs in (or signs up).

### Option 1: Sign in (recommended for another frontend)

Have the user sign in (or your app sign in with a dedicated service account), then use the returned `token` as the Bearer token for create-call.

**Request:**

```http
POST http://localhost:3001/api/auth/signin
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your_password"
}
```

**Success response (200):**

```json
{
  "success": true,
  "user": { "id": "...", "name": "...", "email": "..." },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "...",
  "message": "Signed in successfully"
}
```

Use the **`token`** value in the `Authorization` header when calling `POST /api/calls`:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Option 2: Sign up

**Request:**

```http
POST http://localhost:3001/api/auth/signup
Content-Type: application/json

{
  "name": "User Name",
  "email": "user@example.com",
  "password": "at_least_6_chars"
}
```

On success (201), the response also includes `token` and `refreshToken`; use `token` as above.

### Option 3: Refresh an expired token

If the token expires, call:

```http
POST http://localhost:3001/api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "<the refresh_token from signin/signup>"
}
```

The response includes a new `token` (and optionally a new `refreshToken`).

### Summary: no env token

| Question                             | Answer                                                                                |
| ------------------------------------ | ------------------------------------------------------------------------------------- |
| Is there a `CALL_API_TOKEN` env var? | **No.**                                                                               |
| What token do I send?                | The **Supabase JWT** from `POST /api/auth/signin` (or signup) response field `token`. |
| Where do I send it?                  | Header: `Authorization: Bearer <token>`.                                              |

For another frontend: implement a sign-in (or signup) flow, store the returned `token`, and send it with every `POST /api/calls` request.

---

## Response Shape (What the Backend Returns Today)

**Success (201):**

```json
{
  "success": true,
  "call": {
    "id": "uuid",
    "user_id": "user-uuid",
    "phone_number": "+15551234567",
    "purpose": "Customer needs help with...",
    "status": "queued",
    "created_at": "2026-02-07T...",
    "voice_preference": "professional_female"
  },
  "message": "Call queued successfully"
}
```

**Error (4xx/5xx):**

```json
{
  "success": false,
  "error": "Missing required fields: ...",
  "message": "..."
}
```

The backend does **not** return `{ callId, status, callReason, message }` directly; it returns `{ success, call, message }` (and on error `error` / `message`).

---

## Getting `{ callId, status, callReason, message }` From the Same Backend

Without changing the backend, the other frontend can call the endpoint and normalize the response.

---

## Getting Live Transcripts (Socket.io)

Other frontends receive **live transcripts** and call lifecycle events over **Socket.io** on the same backend base URL (no separate WebSocket URL). The backend does not use a separate WS path for frontend clients; it serves Socket.io on the same origin as the HTTP API.

### 1. Socket.io URL

- **URL:** Use the same base URL as for REST (e.g. `CALL_BACKEND_URL`).  
  Examples: `https://your-app.railway.app`, `https://xxx.trycloudflare.com`, `http://localhost:3001`
- Socket.io attaches to that origin (e.g. `https://your-app.railway.app/socket.io/`).  
  **No auth** is required on the Socket.io connection; the server does not validate tokens for `join_call`.

### 2. Join the call room

After creating a call with `POST /api/calls`, use the returned **`call.id`** to subscribe to that call’s events:

1. Connect the Socket.io client to the backend base URL.
2. Emit **`join_call`** with the **call ID** (string):

```js
socket.emit("join_call", callId); // callId = data.call.id from create call response
```

The server joins the socket to the room `call:${callId}`. Only clients that have joined that room receive transcript and status events for that call.

To stop receiving events for a call, emit **`leave_call`** with the same call ID:

```js
socket.emit("leave_call", callId);
```

### 3. Events and payloads

All of these are emitted **to the room** for that call (so only sockets that have called `join_call` with that `callId` receive them).

| Event             | When it’s emitted                                            | Payload shape                                             |
| ----------------- | ------------------------------------------------------------ | --------------------------------------------------------- |
| **`transcript`**  | Each time a segment of speech is finalized (AI or human)     | See below                                                 |
| **`call_status`** | Call status changes (e.g. ringing → in progress → completed) | `{ call_id: string, status: string, duration?: number }`  |
| **`call_ended`**  | When the call is completed or failed                         | `{ call_id: string, outcome?: string, duration: number }` |

**`transcript` payload:**

```ts
{
  id: string; // UUID for this transcript segment
  call_id: string; // Same as the call you joined
  speaker: "ai" | "human";
  message: string; // Text of what was said
  timestamp: string; // ISO 8601 date (e.g. "2026-02-07T12:34:56.789Z")
}
```

- **`speaker`**: `"human"` = caller/customer, `"ai"` = assistant.
- **`message`**: Finalized transcript of that segment (not partial).
- **`timestamp`**: Server time when the segment was saved.

### 4. Example: connect, join, and log transcripts

```js
import { io } from "socket.io-client";

const BACKEND_URL = "https://your-app.railway.app"; // or CALL_BACKEND_URL

const socket = io(BACKEND_URL, {
  transports: ["websocket", "polling"],
  withCredentials: true,
});

socket.on("connect", () => {
  // After you have callId from POST /api/calls
  socket.emit("join_call", callId);
});

socket.on("transcript", (data) => {
  console.log(`[${data.speaker}] ${data.message}`);
  // data: { id, call_id, speaker: "ai"|"human", message, timestamp }
});

socket.on("call_status", (data) => {
  console.log("Call status:", data.status, data);
});

socket.on("call_ended", (data) => {
  console.log("Call ended:", data.duration, data.outcome);
  socket.emit("leave_call", data.call_id);
});
```

### 5. Summary: live transcript flow

| Step | Action                                                                              |
| ---- | ----------------------------------------------------------------------------------- |
| 1    | Create call: `POST /api/calls` with `Authorization: Bearer <token>`, get `call.id`. |
| 2    | Connect Socket.io client to backend base URL (same as `CALL_BACKEND_URL`).          |
| 3    | On `connect`, emit `join_call` with `call.id`.                                      |
| 4    | Listen for `transcript`, `call_status`, `call_ended` and render/store as needed.    |
| 5    | Optionally emit `leave_call` when the call ends or the user leaves the screen.      |

The backend does not currently authenticate Socket.io connections or `join_call`; anyone who knows a call ID can join that room. Call IDs are UUIDs, so they are not enumerable. If you need strict access control, the backend would need to be extended (e.g. verify JWT and call ownership on `join_call`).

---

**Example `fetch` and mapping:**

```js
const response = await fetch("http://localhost:3001/api/calls", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    phone_number: phoneNumber, // or their field name
    purpose: callReason, // or their field name
  }),
});

const data = await response.json();

if (!response.ok) {
  throw new Error(data.error || data.message || "Create call failed");
}

// Map to the shape they want
const result = {
  callId: data.call.id,
  status: data.call.status,
  callReason: data.call.purpose,
  message: data.message,
};
// result = { callId, status, callReason, message }
```

---

## Summary

| Item                 | Value                                                                         |
| -------------------- | ----------------------------------------------------------------------------- |
| **Endpoint**         | `POST http://localhost:3001/api/calls` (or your deployed backend URL)         |
| **Request**          | `{ phone_number, purpose }` + `Authorization: Bearer <token>`                 |
| **Response (today)** | `{ success, call, message }` where `call` has `id`, `status`, `purpose`       |
| **Normalized shape** | Map to `{ callId, status, callReason, message }` on the client as shown above |

---

## Troubleshooting: "fetch failed" / signin proxy / placeCall

If your frontend (e.g. chat server on port 3001) logs:

- `[CallBackend Auth] signin proxy error: fetch failed`
- `[Call] backend placeCall exception: TypeError fetch failed`
- `callBackendToken received: false`

**Cause:** The frontend is calling the **call backend** URL (e.g. `CALL_BACKEND_URL`) and the request is failing. In Node, "fetch failed" usually means **connection refused** — nothing is listening on that host/port, or the URL is wrong.

### Fix

1. **Run this backend on the port your frontend expects**
   - Your frontend says: *"Calls: GPT-4o Realtime call backend at http://localhost:4000"* → the frontend expects the backend on **port 4000**.
   - This backend defaults to **port 3001** (see `PORT` in `backend/.env`).
   - So either:
     - **Option A (recommended when chat server uses 3001):** Run this backend on **4000** so it doesn’t conflict. In `backend/.env` set:
       ```env
       PORT=4000
       ```
       Then start the backend (e.g. `cd backend && npm run dev`). Keep the frontend’s `CALL_BACKEND_URL=http://localhost:4000`.
     - **Option B:** If the backend runs on 3001, set the frontend’s `CALL_BACKEND_URL=http://localhost:3001`. Only do this if nothing else (e.g. chat server) is using 3001.

2. **Start the backend before using the frontend**
   - In a separate terminal, from the repo root:
     ```bash
     cd backend && npm run dev
     ```
   - Confirm the backend logs that it is listening on the expected port (e.g. `Listening on port 4000` or `3001`).

3. **Check URL and env**
   - In the frontend (or chat server) ensure `CALL_BACKEND_URL` has **no trailing slash** and matches the backend’s base URL, e.g. `http://localhost:4000`.
   - If you use a tunnel (e.g. Cloudflare), use that URL as `CALL_BACKEND_URL` and run the backend with the same `PORT` it’s exposed on.

4. **Auth token**
   - After the backend is reachable, the sign-in proxy should succeed and `callBackendToken` will be set from `POST {CALL_BACKEND_URL}/api/auth/signin`. No need to set a static `CALL_API_TOKEN` if you use sign-in; the token comes from that response.

---

## Allowing unauthenticated requests (dev only)

To call `POST /api/calls` (and any other route protected by `requireAuth`) **without** a JWT, you can enable the **allow-no-auth** option. Use this only for local development or testing; do **not** use in production.

### 1. Set the env var

In the **call backend** project (e.g. `AiCostumerCall/backend`), add to `.env`:

```env
ALLOW_NO_AUTH=true
```

Or leave it unset (or set to anything other than `true`) to require auth as usual.

### 2. Start the call backend with the option enabled

From the repo root:

```bash
cd backend
# Ensure .env contains ALLOW_NO_AUTH=true, then:
npm run dev
```

Or set it only for one run (Unix/macOS):

```bash
cd backend
ALLOW_NO_AUTH=true npm run dev
```

On startup you should see:

```text
⚠️  ALLOW_NO_AUTH=true: unauthenticated requests are allowed (dev/testing only; do not use in production)
```

### 3. Call the API without a token

With `ALLOW_NO_AUTH=true`, you can create a call without an `Authorization` header:

```bash
curl -X POST http://localhost:4000/api/calls \
  -H "Content-Type: application/json" \
  -d '{"phone_number":"+15551234567","purpose":"Test call"}'
```

Calls created this way are stored with no `user_id` (anonymous). Other routes that use `requireAuth` (e.g. `DELETE /api/calls/:id`) also skip the 401 when this option is set.
