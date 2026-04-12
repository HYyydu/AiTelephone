// Supabase client for authentication
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { jwtVerify } from 'jose';
import { config } from '../config';

// Helper function to create Supabase client with validation
function createSupabaseClient(url: string, key: string, clientType: string): SupabaseClient {
  if (!url || !key) {
    throw new Error(
      `❌ Supabase ${clientType} client requires SUPABASE_URL and ${clientType === 'server' ? 'SUPABASE_SERVICE_ROLE_KEY' : 'SUPABASE_ANON_KEY'}.\n` +
      `   Set them in the process environment (e.g. Railway → Variables), or in backend/.env for local dev:\n` +
      `   SUPABASE_URL=https://xxxxx.supabase.co\n` +
      `   SUPABASE_ANON_KEY=eyJ...\n` +
      `   SUPABASE_SERVICE_ROLE_KEY=eyJ...\n` +
      `   See SUPABASE_AUTH_SETUP.md for instructions.`
    );
  }
  
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Create Supabase client for server-side operations
export const supabase = createSupabaseClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  'server'
);

// Create Supabase client for client-side operations (with anon key)
// This is used when you need to verify tokens from the frontend
export const supabaseClient = createSupabaseClient(
  config.supabase.url,
  config.supabase.anonKey,
  'client'
);

/**
 * Verify Supabase access token using the project's JWT secret (HS256).
 * Used when getUser() fails (e.g. wrong anon key in deployment) but JWT is valid.
 */
async function verifyAuthTokenWithJwtSecret(token: string): Promise<User | null> {
  const secret = config.supabase.jwtSecret?.trim();
  if (!secret) {
    return null;
  }
  try {
    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
    });
    const sub = payload.sub;
    if (!sub || typeof sub !== 'string') {
      return null;
    }
    const email =
      typeof payload.email === 'string' ? payload.email : undefined;
    const userMetadata =
      payload.user_metadata &&
      typeof payload.user_metadata === 'object' &&
      !Array.isArray(payload.user_metadata)
        ? (payload.user_metadata as User['user_metadata'])
        : {};
    return {
      id: sub,
      email,
      user_metadata: userMetadata ?? {},
      app_metadata: {},
      aud: typeof payload.aud === 'string' ? payload.aud : 'authenticated',
      created_at: '',
      updated_at: '',
    } as User;
  } catch {
    return null;
  }
}

// Helper function to verify JWT token from Authorization header
export async function verifyAuthToken(token: string) {
  try {
    const { data: { user }, error } = await supabaseClient.auth.getUser(token);

    if (user && !error) {
      return user;
    }

    // Fallback: this codebase never read SUPABASE_JWT_SECRET before; production often sets
    // only JWT secret while getUser() fails if URL/anon key mismatch or network issues.
    const localUser = await verifyAuthTokenWithJwtSecret(token);
    if (localUser) {
      return localUser;
    }

    if (error) {
      console.warn(
        'verifyAuthToken: getUser failed and JWT secret verification did not succeed:',
        error.message,
      );
    }
    return null;
  } catch (error) {
    console.error('Error verifying auth token:', error);
    return null;
  }
}

