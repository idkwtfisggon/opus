import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '~/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

export type AuthUser = {
  id: string;
  email: string;
  user_metadata: {
    username?: string;
    first_name?: string;
    last_name?: string;
    role?: string;
    migrated_from_clerk?: boolean;
    clerk_user_id?: string;
  };
  created_at: string;
  last_sign_in_at?: string;
};

type AuthContextType = {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signUp: (email: string, password: string, metadata?: any) => Promise<{ data: any; error: any }>;
  signOut: () => Promise<void>;
  userId: string | null;
  isSignedIn: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for existing session
    const storedToken = localStorage.getItem('supabase_token');
    if (storedToken) {
      // Verify token with our API
      fetch('/api/extension/auth', {
        headers: {
          'Authorization': `Bearer ${storedToken}`
        }
      })
      .then(response => response.json())
      .then(data => {
        if (data.ok) {
          const sessionData = {
            access_token: storedToken,
            refresh_token: storedToken,
            expires_in: 3600,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            token_type: 'bearer',
            user: data.user
          };
          setSession(sessionData as any);
          setUser(data.user as AuthUser);
        } else {
          localStorage.removeItem('supabase_token');
        }
        setLoading(false);
      })
      .catch(() => {
        localStorage.removeItem('supabase_token');
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔥 AUTH CONTEXT signIn called from:', new Error().stack);
      console.log('Starting sign in...');
      const response = await fetch('/api/extension/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      console.log('Response received:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok) {
        console.log('Response not ok:', data.error);
        return { data: null, error: { message: data.error || 'Sign in failed' } };
      }

      // Store the token in localStorage AND cookie for server-side access
      console.log('About to store token...');
      localStorage.setItem('supabase_token', data.sessionId);
      // Set cookie for server-side auth (remove secure for localhost)
      document.cookie = `supabase_token=${data.sessionId}; path=/; max-age=3600; samesite=lax`;
      console.log('Token stored in localStorage and cookie... TIMESTAMP:', Date.now());
      
      
      console.log('Creating mock session...');
      // Create a mock session object
      const mockSession = {
        access_token: data.sessionId,
        refresh_token: data.sessionId,
        expires_in: 3600,
        token_type: 'bearer',
        user: data.user
      };
      console.log('Mock session created:', mockSession);

      console.log('Setting user state...');
      // Set user and session state manually
      setUser(data.user as AuthUser);
      console.log('User state set');
      
      setSession(mockSession as any);
      console.log('Session state set');
      
      console.log('User and session set successfully');
      console.log('🎯 About to return from signIn:', { session: mockSession, user: data.user });


      return { data: { session: mockSession, user: data.user }, error: null };
    } catch (error) {
      console.log('Sign in error:', error);
      return { data: null, error: { message: 'Network error' } };
    }
  };

  const signUp = async (email: string, password: string, metadata?: any) => {
    const result = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    });
    return result;
  };

  const signOut = async () => {
    try {
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear local storage and cookies
      localStorage.removeItem('supabase_token');
      document.cookie = 'supabase_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      
      // Reset state
      setUser(null);
      setSession(null);
      
      // Redirect to home or sign-in
      window.location.href = '/';
    } catch (error) {
      console.error('Sign out error:', error);
      // Still clear local state even if Supabase call fails
      localStorage.removeItem('supabase_token');
      document.cookie = 'supabase_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      setUser(null);
      setSession(null);
      window.location.href = '/';
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    userId: user?.id || null,
    isSignedIn: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Server-side auth helper
export async function getServerAuth(request: Request) {
  // Try Authorization header first
  let token = null;
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  }
  
  // If no Authorization header, check for cookie
  if (!token) {
    const cookies = request.headers.get('Cookie');
    if (cookies) {
      const tokenMatch = cookies.match(/supabase_token=([^;]+)/);
      if (tokenMatch) {
        token = tokenMatch[1];
      }
    }
  }
  
  if (!token) {
    return { userId: null, user: null };
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return { userId: null, user: null };
    }

    return { userId: user.id, user };
  } catch (error) {
    return { userId: null, user: null };
  }
}