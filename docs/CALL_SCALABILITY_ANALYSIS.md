# Call Scalability Analysis

This document analyzes how the system handles **multiple calls at the same time** and **how many calls can be initiated asynchronously**.

---

## 1. Current Architecture Summary

- **Single Node.js process**: One HTTP server, one WebSocket server (`/media-stream`), one Socket.IO server.
- **Call creation**: `POST /api/calls` creates a DB record, then calls `initiateCall(call)` **without awaiting** and returns `201` immediately.
- **Per active call**: One Twilio call → one Twilio→backend WebSocket (media stream) → one `GPT4oRealtimeHandler` → one OpenAI Realtime API WebSocket.

So from the API’s perspective, many requests can be accepted in parallel; there is **no in-app queue or cap** on how many `initiateCall()` run at once beyond rate limiting.

---

## 2. How Many Calls Can Come In at the Same Time?

### 2.1 Application-level limits

| Limit | Location | Value | Effect |
|-------|----------|--------|--------|
| **Call creation rate** | `backend/src/utils/rate-limiter.ts` | **20 calls per hour per IP** | Hard cap: after 20 creations from one IP in an hour, further `POST /api/calls` get `429` until the window resets. |
| **General API rate** | Same file | 100 requests per 15 min per IP (on `/api/`) | Other endpoints (e.g. GET /api/calls) share this; call creation is further limited by the 20/hour rule above. |

So **“multiple calls at the same time”** in a short burst:

- **Up to 20** can be **accepted** in quick succession (if they are the first 20 in that hour for that IP).
- All 20 will trigger `initiateCall()` in parallel; the server does **not** serialize or queue them.

### 2.2 Database

- **PostgreSQL pool** (`backend/src/database/db.ts`): `max: 20` connections.
- Each call creation/initiation does several DB operations (create, update to `calling`, update with `call_sid`). Under a burst of many creations, you can hit pool contention (requests waiting for a free connection). In practice, **on the order of ~10–20 concurrent creations** can start to stress the pool depending on other API traffic.

### 2.3 Single process and CPU/memory

- All Twilio media WebSockets and OpenAI Realtime WebSockets run in **one process**.
- Each active call uses:
  - One Twilio ↔ backend WebSocket
  - One backend ↔ OpenAI Realtime WebSocket
  - In-memory state (audio buffers, conversation state) and CPU for audio processing and realtime handling.

There is **no coded limit** on the number of **active** (in-progress) calls. The practical limit is **single-process CPU and memory**, and external services (Twilio, OpenAI). For small to moderate concurrency (e.g. &lt; 20–50 active calls), the design is generally fine; for higher concurrency you’d want horizontal scaling and/or per-call resource caps.

---

## 3. How Many Calls Can We “Call Out” Asynchronously?

### 3.1 What “call out asynchronously” means here

- Client sends `POST /api/calls` → server creates the call record and starts `initiateCall(call)` in the background (fire-and-forget).
- Response is returned immediately; the actual Twilio outbound call and media setup happen asynchronously.

So “how many can we call out asynchronously” = how many such requests the system will accept and start, and how many can actually reach “calling”/“in progress” without being blocked.

### 3.2 In-app answer

- **Acceptance**: Up to **20 per hour per IP** (call-creation rate limit). So in one burst, **up to 20** call creations can be accepted and up to 20 `initiateCall()` can run in parallel.
- **No application-level cap** on concurrent `initiateCall()`: there is no semaphore, worker pool, or queue that limits “how many at once.”
- So **asynchronously, the app can start as many outbound calls as the rate limiter allows** (20 per IP per hour in a burst, or spread over the hour).

### 3.3 External limits (actual bottleneck for “how many at once”)

Once the app tries to open many Twilio calls and many Realtime sessions at once, **Twilio and OpenAI** become the real limit.

| Provider | Limit | Notes |
|----------|--------|--------|
| **Twilio (trial)** | **4 concurrent calls** | Trial accounts; error 10004 if exceeded. |
| **Twilio (paid)** | Concurrent: typically unlimited (with approved profile); **CPS (calls per second)** often **1 CPS** default, up to **5 CPS** with approved Business Profile | Outbound calls created via API are rate-limited by CPS; excess is queued by Twilio. |
| **OpenAI Realtime API** | Depends on your plan and key | Rate limits (e.g. concurrent sessions, RPM) are per API key; not configured in this repo. Check [OpenAI rate limits](https://platform.openai.com/docs/guides/rate-limits) and Realtime API docs. |

So in practice:

- **Trial Twilio**: You can only have **4 concurrent calls** (any additional `initiateCall` after 4 active will either queue at Twilio or fail depending on how you use the API).
- **Paid Twilio**: You can have many concurrent calls if your account is approved, but **starting** them is limited by **CPS** (e.g. 1–5 new calls per second). So “20 at the same time” in one second may be throttled to 1–5 started per second; the rest would be queued by Twilio.

---

## 4. Summary Table

| Question | Answer |
|----------|--------|
| Multiple calls at the same time (creation) | **Up to 20 per hour per IP** can be accepted; all can be “in progress” (initiating) at once from the app’s perspective. |
| How many can we call out asynchronously? | **Up to 20 in a burst** (same hour window) from one IP; no extra app-level cap. Actual concurrency is then limited by **Twilio** (4 concurrent on trial; CPS 1–5 on paid) and **OpenAI Realtime** (plan-dependent). |
| In-app bottlenecks | **Rate limiter (20/hour per IP)**, **DB pool (20 connections)**, **single process** CPU/memory for many active media + Realtime sessions. |
| External bottlenecks | **Twilio** concurrent calls and CPS; **OpenAI Realtime** concurrent sessions and rate limits. |

---

## 5. Recommendations

1. **Rate limiter**: The 20/hour per IP is the **effective cap** on “how many calls at the same time” you can create from one client. If you need more:
    - Consider **per-user** limits (e.g. by `user_id`) instead of or in addition to per-IP.
    - Optionally increase the limit or use a sliding window; document the choice (cost vs. abuse).

2. **Concurrent initiation**: If you want to avoid overloading Twilio/OpenAI when many users (or one user) create calls in a burst:
    - Add an **in-app queue** or **semaphore** (e.g. max N concurrent `initiateCall()`), or
    - Respect **Twilio CPS** (e.g. delay or throttle so you don’t send more than 1–5 `calls.create` per second).

3. **Observability**: Add metrics or logs for:
    - Concurrent active calls (Twilio WebSockets or `in_progress` count).
    - DB pool usage (e.g. `getPoolStatus()`).
    - Rate-limit hits (429) and Twilio/OpenAI errors (e.g. 10004, 429).

4. **Scaling**: For more than ~tens of concurrent **active** calls:
    - Run multiple backend instances behind a load balancer (Twilio can hit any instance for webhooks/WebSocket URL).
    - Ensure **PUBLIC_URL** (or equivalent) points to the load balancer so Twilio always reaches an instance that can serve the call.
    - Consider a **shared** store (e.g. Redis) for call state if you need coordination across instances.

5. **Twilio/OpenAI**: Confirm your **Twilio** concurrent and CPS limits and your **OpenAI** Realtime concurrency/rate limits; they are the ultimate cap on how many calls can be started and active at once.

---

## 6. References in Codebase

- Call creation and async initiation: `backend/src/api/routes/calls.ts` (POST `/`, `initiateCall` not awaited).
- Rate limiters: `backend/src/utils/rate-limiter.ts` (`callCreationLimiter`: 20/hour).
- Telephony: `backend/src/services/telephony.ts` (`initiateCall`).
- DB pool: `backend/src/database/db.ts` (max 20).
- Server and WebSocket: `backend/src/server.ts` (single process, one `/media-stream` WebSocket server).
- Per-call handler and OpenAI Realtime: `backend/src/websocket/gpt4o-realtime-handler.ts`, `backend/src/services/realtime-api.ts`.
