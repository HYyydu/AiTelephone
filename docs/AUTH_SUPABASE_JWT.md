# Option A: Per-user JWT (Supabase token from frontend)

This project supports **Supabase** as the source of auth. The frontend signs in with Supabase and sends the Supabase session’s **access_token (JWT)** as `Authorization: Bearer <token>` to the call backend. The backend verifies that JWT with the same Supabase project (no separate `CALL_API_TOKEN` needed).

---

## Flow

1. **Frontend** – User signs in with `supabase.auth.signInWithPassword` (or signUp). Supabase returns a session with `access_token` (JWT).
2. **Frontend** – The API client stores that token and sends it on every request: `Authorization: Bearer <access_token>` to `/api/calls`, `/api/chat`, `/api/quote`, etc.
3. **Backend (e.g. Railway)** – Uses `verifyAuthToken(token)` (Supabase `getUser(token)`) to validate the JWT and attach `req.user`. No custom API token required.

---

## Frontend environment variables

For the frontend to use Supabase auth (Option A), set these in your frontend app (e.g. `.env.local` or Vercel env):

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL, e.g. `https://xxxx.supabase.co`. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key from Project → Settings → API. |

Same values as in the backend’s `SUPABASE_URL` and `SUPABASE_ANON_KEY` (same Supabase project).

---

## Backend (Railway) requirements

- **SUPABASE_URL** and **SUPABASE_ANON_KEY** (or **SUPABASE_SERVICE_ROLE_KEY** for admin flows) set in Railway so `verifyAuthToken` can validate the JWT.
- Routes that need the user use `authenticateUser` (optional auth) and/or `requireAuth` (enforce auth unless `ALLOW_NO_AUTH=true`).

No `CALL_API_TOKEN` or other shared secret is required when users sign in with Supabase; the JWT is enough.

---

## Behavior summary

- **With Supabase env set on frontend:** Sign-in/sign-up use the Supabase client; the session’s `access_token` is stored and sent as Bearer to the backend. Session restore and auth state changes (e.g. token refresh) are handled via Supabase.
- **Without Supabase env on frontend:** Auth falls back to the backend’s `/api/auth/signin` and `/api/auth/signup`; the backend still returns the Supabase JWT, and the frontend sends it the same way.

In both cases, the call backend only needs to verify the Supabase JWT (Option A).
