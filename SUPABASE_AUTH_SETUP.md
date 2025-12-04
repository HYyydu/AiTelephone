# 🔐 Supabase Authentication Setup Guide

This guide will walk you through setting up Supabase Authentication for your AI Customer Call System.

## Step 1: Create a Supabase Project (if you don't have one)

1. **Go to Supabase:** https://supabase.com
2. **Sign up or Log in** with your GitHub account (recommended)
3. **Click "New Project"**
4. **Fill in the details:**
   - Project Name: `ai-customer-call` (or any name you like)
   - Database Password: **Create a strong password** (save this!)
   - Region: Choose closest to you
   - Pricing Plan: Free tier is fine for development
5. **Click "Create new project"**
6. **Wait 2-3 minutes** for the project to be ready

## Step 2: Get Your Supabase Credentials

Once your project is ready:

1. **Go to Project Settings** (gear icon in left sidebar)
2. **Click on "API"** in the settings menu
3. **Copy these values:**
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)
   - **service_role key** (starts with `eyJ...`) - Keep this secret!

## Step 3: Configure Authentication in Supabase Dashboard

1. **Go to Authentication** in the left sidebar
2. **Click on "Providers"**
3. **Enable Email provider:**

   - Toggle "Enable Email provider" to ON
   - **Email Auth Settings:**
     - Enable "Confirm email" - OFF (for development, turn ON for production)
     - Enable "Secure email change" - ON
   - Click "Save"

4. **Optional: Enable Phone provider** (requires Twilio):

   - Click on "Phone" provider
   - Toggle "Enable Phone provider" to ON
   - Configure Twilio settings (see `TWILIO_MESSAGE_SERVICE_SETUP.md` for details)
   - You'll need:
     - Twilio Account SID
     - Twilio Auth Token
     - Twilio Message Service SID (see guide for how to get this)
   - Click "Save"

5. **Optional: Enable other providers** (Google, GitHub, etc.) if you want:
   - Click on any provider (e.g., "Google")
   - Toggle it ON
   - Follow the setup instructions

## Step 4: Set Up Database Tables (if not already done)

Your database schema should already have a `users` table. If not:

1. **Go to SQL Editor** in Supabase dashboard
2. **Run this SQL** (or use Drizzle migrations):

```sql
-- This should match your schema.ts file
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255),
  name VARCHAR(255),
  avatar_url TEXT,
  organization_id UUID,
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Note:** Supabase Auth automatically creates an `auth.users` table. You can either:

- **Option A:** Use Supabase Auth's built-in user management (recommended)
- **Option B:** Sync Supabase Auth users to your custom `users` table

We'll use **Option A** (Supabase's built-in auth) which is simpler and more secure.

## Step 5: Add Environment Variables

Add these to your `backend/.env` file:

```env
# Supabase Configuration
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Database URL (if using Supabase database)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
```

**Where to find these:**

- `SUPABASE_URL`: Project Settings → API → Project URL
- `SUPABASE_ANON_KEY`: Project Settings → API → anon/public key
- `SUPABASE_SERVICE_ROLE_KEY`: Project Settings → API → service_role key (secret!)
- `DATABASE_URL`: Project Settings → Database → Connection string (use "Connection pooling" for better performance)

## Step 6: Install Supabase Client Library

```bash
cd backend
npm install @supabase/supabase-js
```

## Step 7: Test Your Setup

1. **Start your backend:**

   ```bash
   cd backend
   npm run dev
   ```

2. **Test signup:**

   ```bash
   curl -X POST http://localhost:3001/api/auth/signup \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "testpassword123",
       "name": "Test User"
     }'
   ```

3. **Test signin:**
   ```bash
   curl -X POST http://localhost:3001/api/auth/signin \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "testpassword123"
     }'
   ```

## How Supabase Auth Works

### User Flow:

1. **Sign Up:** User creates account → Supabase creates user in `auth.users` table
2. **Sign In:** User provides email/password → Supabase validates → Returns JWT token
3. **Authenticated Requests:** Client sends JWT token → Backend verifies with Supabase
4. **Session Management:** Supabase handles refresh tokens automatically

### Security Features:

- ✅ Passwords are hashed with bcrypt (automatic)
- ✅ JWT tokens with expiration
- ✅ Refresh tokens for long-lived sessions
- ✅ Email verification (optional)
- ✅ Password reset flows
- ✅ Rate limiting built-in

## Frontend Integration (Next Steps)

After backend is working, update your frontend:

1. **Install Supabase client:**

   ```bash
   cd frontend
   npm install @supabase/supabase-js
   ```

2. **Create Supabase client:**

   ```typescript
   // frontend/lib/supabase.ts
   import { createClient } from "@supabase/supabase-js";

   const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
   const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

   export const supabase = createClient(supabaseUrl, supabaseAnonKey);
   ```

3. **Use in your components:**

   ```typescript
   // Sign up
   const { data, error } = await supabase.auth.signUp({
     email: "user@example.com",
     password: "password123",
   });

   // Sign in
   const { data, error } = await supabase.auth.signInWithPassword({
     email: "user@example.com",
     password: "password123",
   });

   // Get current user
   const {
     data: { user },
   } = await supabase.auth.getUser();
   ```

## Troubleshooting

### "Invalid API key"

- Double-check your `SUPABASE_ANON_KEY` in `.env`
- Make sure there are no extra spaces or quotes

### "Email already registered"

- User already exists in Supabase
- Go to Authentication → Users in Supabase dashboard to manage users

### "Invalid login credentials"

- Check email/password are correct
- Verify user exists in Supabase dashboard

### "JWT expired"

- Token has expired (default: 1 hour)
- Use refresh token to get new access token

## Next Steps

- ✅ Set up email verification for production
- ✅ Add password reset functionality
- ✅ Configure OAuth providers (Google, GitHub, etc.)
- ✅ Set up Row Level Security (RLS) policies
- ✅ Add user profile management

## Phone Authentication

To enable phone sign-in with SMS OTP:

1. **Set up Twilio Message Service** (see `TWILIO_MESSAGE_SERVICE_SETUP.md`)
2. **Configure in Supabase:**
   - Go to Authentication → Providers → Phone
   - Enable phone provider
   - Add your Twilio credentials
3. **Use the phone auth endpoints:**
   - `POST /api/auth/phone/request` - Request OTP
   - `POST /api/auth/phone/verify` - Verify OTP and sign in

## Resources

- **Supabase Auth Docs:** https://supabase.com/docs/guides/auth
- **Supabase Phone Auth:** https://supabase.com/docs/guides/auth/phone-login
- **Supabase Dashboard:** https://supabase.com/dashboard
- **Supabase JavaScript Client:** https://supabase.com/docs/reference/javascript
- **Twilio Message Service Setup:** See `TWILIO_MESSAGE_SERVICE_SETUP.md`
