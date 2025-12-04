'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@/lib/api';

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

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await api.getCurrentUser();
      if (response.success && response.user) {
        setUser(response.user);
      }
    } catch (error) {
      // Not authenticated
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const response = await api.signIn(email, password);
    if (response.success && response.user) {
      setUser(response.user);
    } else {
      throw new Error(response.error || 'Failed to sign in');
    }
  };

  const signUp = async (name: string, email: string, password: string) => {
    const response = await api.signUp(name, email, password);
    if (response.success && response.user) {
      setUser(response.user);
    } else {
      throw new Error(response.error || 'Failed to create account');
    }
  };

  const signOut = async () => {
    try {
      await api.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setUser(null);
    }
  };

  const refreshAuth = async () => {
    try {
      const response = await api.refreshToken();
      if (response.success && response.user) {
        setUser(response.user);
      }
    } catch (error) {
      // Token expired or invalid, sign out
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

