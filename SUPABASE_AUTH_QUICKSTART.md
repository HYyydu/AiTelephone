# 🚀 Supabase Auth Quick Start

## What Was Done

✅ Installed `@supabase/supabase-js` package  
✅ Created Supabase client utility (`backend/src/utils/supabase.ts`)  
✅ Updated config to include Supabase credentials  
✅ Updated all auth routes to use Supabase Auth:
   - `/api/auth/signup` - Create account
   - `/api/auth/signin` - Sign in
   - `/api/auth/refresh` - Refresh token
   - `/api/auth/signout` - Sign out
   - `/api/auth/me` - Get current user

## What You Need to Do

### 1. Get Supabase Credentials

1. Go to https://supabase.com and sign in
2. Select your project (or create a new one)
3. Go to **Settings** → **API**
4. Copy these values:
   - **Project URL** → `SUPABASE_URL`
   - **anon public key** → `SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

### 2. Add to Your `.env` File

Add these lines to `backend/.env`:

```env
# Supabase Configuration
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Enable Email Auth in Supabase

1. Go to **Authentication** → **Providers** in Supabase dashboard
2. Enable **Email** provider
3. For development, you can disable "Confirm email" (enable it for production)

### 4. Test It!

```bash
# Start your backend
cd backend
npm run dev

# Test signup (in another terminal)
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123456",
    "name": "Test User"
  }'

# Test signin
curl -X POST http://localhost:3001/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123456"
  }'
```

## API Response Format

### Sign Up / Sign In Response:
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "name": "User Name",
    "email": "user@example.com"
  },
  "token": "jwt_access_token",
  "refreshToken": "jwt_refresh_token",
  "message": "Account created successfully"
}
```

### Get Current User (`/api/auth/me`):
```bash
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Frontend Integration (Next Step)

After backend is working, update your frontend to use Supabase:

```bash
cd frontend
npm install @supabase/supabase-js
```

Then create a Supabase client in your frontend code.

See `SUPABASE_AUTH_SETUP.md` for detailed instructions.

## Troubleshooting

**"Invalid API key"**
- Check your `.env` file has correct values
- No extra spaces or quotes around values

**"User already exists"**
- User is already registered in Supabase
- Go to Authentication → Users to manage

**"Invalid login credentials"**
- Check email/password are correct
- Verify user exists in Supabase dashboard

## Full Documentation

See `SUPABASE_AUTH_SETUP.md` for complete setup guide with screenshots and detailed steps.

