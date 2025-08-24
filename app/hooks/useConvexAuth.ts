import { useAuth } from "~/contexts/auth";
import { useCallback } from "react";

/**
 * Custom hook that provides Convex-compatible auth interface using Supabase
 * This bridges our Supabase auth with Convex's expected auth format
 */
export function useConvexAuth() {
  const { user, session, loading } = useAuth();

  const fetchAccessToken = useCallback(async () => {
    if (!session?.access_token) {
      return null;
    }
    
    // Return the Supabase JWT token that Convex will validate
    return session.access_token;
  }, [session]);

  return {
    isLoading: loading,
    isAuthenticated: !!user && !!session,
    fetchAccessToken,
  };
}