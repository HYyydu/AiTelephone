'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@/lib/api';
import { getSupabase } from '@/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

function mapSupabaseUser(su: SupabaseUser): User {
  const name = (su.user_metadata?.name as string) || su.email?.split('@')[0] || 'User';
  return {
    id: su.id,
    name,
    email: su.email ?? '',
  };
}

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = typeof window !== 'undefined' ? getSupabase() : null;

  // Restore session from Supabase (Option A: per-user JWT from frontend)
  const restoreSessionFromSupabase = async () => {
    if (!supabase) return false;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        api.setToken(session.access_token);
        setUser(mapSupabaseUser(session.user));
        return true;
      }
    } catch (e) {
      console.warn('Supabase session restore failed:', e);
    }
    return false;
  };

  // On mount: prefer Supabase session, else fall back to backend /api/auth/me
  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      try {
        const restored = await restoreSessionFromSupabase();
        if (cancelled) return;
        if (restored) {
          setIsLoading(false);
          return;
        }
        // No Supabase session: try backend (e.g. token in localStorage from previous backend sign-in)
        const response = await api.getCurrentUser();
        if (cancelled) return;
        if (response.success && response.user) {
          setUser(response.user);
        } else {
          setUser(null);
        }
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    checkAuth();
    return () => { cancelled = true; };
  }, []);

  // Listen for Supabase auth changes (e.g. token refresh, sign out in another tab)
  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.access_token) {
          api.setToken(session.access_token);
          setUser(mapSupabaseUser(session.user));
        } else {
          api.setToken(null);
          setUser(null);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, [supabase]);

  const signIn = async (email: string, password: string) => {
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      if (!data.session?.access_token) throw new Error('No session');
      api.setToken(data.session.access_token);
      setUser(mapSupabaseUser(data.session.user));
    } else {
      const response = await api.signIn(email, password);
      if (response.success && response.user) {
        setUser(response.user);
      } else {
        throw new Error(response.error || 'Failed to sign in');
      }
    }
  };

  const signUp = async (name: string, email: string, password: string) => {
    if (supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (error) throw new Error(error.message);
      if (data.session?.access_token) {
        api.setToken(data.session.access_token);
        setUser(mapSupabaseUser(data.session.user));
      } else {
        setUser(mapSupabaseUser(data.user!));
        throw new Error('Check your email to confirm your account.');
      }
    } else {
      const response = await api.signUp(name, email, password);
      if (response.success && response.user) {
        setUser(response.user);
      } else {
        throw new Error(response.error || 'Failed to create account');
      }
    }
  };

  const signOut = async () => {
    try {
      if (supabase) await supabase.auth.signOut();
      await api.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setUser(null);
    }
  };

  const refreshAuth = async () => {
    const restored = await restoreSessionFromSupabase();
    if (restored) return;
    try {
      const response = await api.refreshToken();
      if (response.success && response.user) setUser(response.user);
      else setUser(null);
    } catch {
      setUser(null);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    signIn,
    signUp,
    signOut,
    refreshAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
