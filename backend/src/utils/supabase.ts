// Supabase client for authentication
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';

// Helper function to create Supabase client with validation
function createSupabaseClient(url: string, key: string, clientType: string): SupabaseClient {
  if (!url || !key) {
    throw new Error(
      `❌ Supabase ${clientType} client requires SUPABASE_URL and ${clientType === 'server' ? 'SUPABASE_SERVICE_ROLE_KEY' : 'SUPABASE_ANON_KEY'} to be set in .env file.\n` +
      `   Please add these to backend/.env:\n` +
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

// Helper function to verify JWT token from Authorization header
export async function verifyAuthToken(token: string) {
  try {
    const { data: { user }, error } = await supabaseClient.auth.getUser(token);
    
    if (error || !user) {
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('Error verifying auth token:', error);
    return null;
  }
}

