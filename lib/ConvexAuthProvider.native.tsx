// Native-specific Convex Auth Provider
// Uses ConvexProviderWithAuth for proper auth state integration with Convex

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from "react";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";

// Import the native auth client directly to get proper types
import { authClient, SessionData } from "./auth-client.native";

// Types
interface User {
  id: string;
  _id: string;
  email?: string;
  name?: string;
  image?: string | null;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
}

interface AuthContextValue extends AuthState {
  signOut: () => Promise<void>;
}

// Create context for additional auth info (user object, signOut)
const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  signOut: async () => {},
});

// Hook to use auth context - returns Convex-compatible auth state
export function useConvexAuth() {
  const context = useContext(AuthContext);
  return {
    isAuthenticated: context.isAuthenticated,
    isLoading: context.isLoading,
  };
}

// Authenticated component
export function Authenticated({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  if (isLoading || !isAuthenticated) return null;
  return <>{children}</>;
}

// Unauthenticated component
export function Unauthenticated({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  if (isLoading || isAuthenticated) return null;
  return <>{children}</>;
}

// AuthLoading component
export function AuthLoading({ children }: { children: ReactNode }) {
  const { isLoading } = useConvexAuth();
  if (!isLoading) return null;
  return <>{children}</>;
}

// Provider props
interface ConvexAuthProviderProps {
  client: ConvexReactClient;
  children: ReactNode;
}

// Helper to extract access token from session
function extractAccessToken(session: SessionData | null): string | null {
  if (!session?.session?.token) return null;
  return session.session.token;
}

// Native auth provider that integrates with Convex properly
export function ConvexNativeAuthProvider({ client, children }: ConvexAuthProviderProps) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initComplete, setInitComplete] = useState(false);

  // Initialize auth and check session on mount
  useEffect(() => {
    let mounted = true;
    console.log("[BOOT_AUTH_01] ConvexNativeAuthProvider useEffect starting");

    const initAuth = async () => {
      try {
        // CRITICAL: Initialize auth client first (loads from SecureStore)
        console.log("[BOOT_AUTH_02] Calling authClient.init()...");
        await authClient.init();
        console.log("[BOOT_AUTH_03] authClient.init() complete");

        if (!mounted) return;

        // Get current session state from store
        const currentSession = authClient.$store.get();
        console.log("[BOOT_AUTH_04] Initial session state:", currentSession ? "HAS_SESSION" : "NO_SESSION");

        if (currentSession?.session && currentSession?.user) {
          setSession(currentSession);
        }

        // Mark init complete before verifying with server
        setInitComplete(true);

        // Now verify with server (but don't block on this)
        console.log("[BOOT_AUTH_05] Verifying session with server...");
        const result = await authClient.getSession();
        console.log("[BOOT_AUTH_06] Server session check complete");

        if (!mounted) return;

        if (result.data?.session && result.data?.user) {
          console.log("[BOOT_AUTH_07] User authenticated:", result.data.user.email || result.data.user.id);
          setSession(result.data);
        } else {
          console.log("[BOOT_AUTH_07] No authenticated user from server");
          setSession(null);
        }

        setIsLoading(false);
      } catch (error) {
        console.error("[BOOT_AUTH_ERROR] Session check failed:", error);
        if (mounted) {
          setSession(null);
          setIsLoading(false);
          setInitComplete(true);
        }
      }
    };

    initAuth();

    // Subscribe to session changes via store
    const unsubscribe = authClient.$store.listen((sessionState) => {
      if (!mounted) return;

      console.log("[Auth] Store listener fired, session:", sessionState ? "HAS_SESSION" : "NO_SESSION");
      setSession(sessionState);

      // If we get a session update after init, we're no longer loading
      if (initComplete) {
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [initComplete]);

  const signOut = useCallback(async () => {
    await authClient.signOut();
  }, []);

  // Compute auth state
  const isAuthenticated = !!session?.session && !!extractAccessToken(session);

  // Log auth state for debugging
  useEffect(() => {
    console.log("[Auth] State updated - isAuthenticated:", isAuthenticated, "isLoading:", isLoading);
  }, [isAuthenticated, isLoading]);

  // Create the useAuth hook for ConvexProviderWithAuth
  // This MUST be memoized to prevent infinite re-renders
  const useAuth = useMemo(() => {
    return () => {
      // fetchAccessToken is called by Convex to get the token for authenticated requests
      const fetchAccessToken = useCallback(
        async ({ forceRefreshToken }: { forceRefreshToken: boolean }): Promise<string | null> => {
          console.log("[Auth] fetchAccessToken called, forceRefresh:", forceRefreshToken);

          // First try: get token from SecureStore directly
          const storedToken = await authClient.getToken();
          if (storedToken) {
            console.log("[Auth] fetchAccessToken: FOUND token from SecureStore");
            return storedToken;
          }

          // Second try: get from current session state
          const tokenFromSession = extractAccessToken(session);
          if (tokenFromSession) {
            console.log("[Auth] fetchAccessToken: FOUND token from session state");
            return tokenFromSession;
          }

          // Third try: refresh session from server
          if (forceRefreshToken) {
            console.log("[Auth] fetchAccessToken: Refreshing from server...");
            const result = await authClient.getSession();
            if (result.data?.session?.token) {
              console.log("[Auth] fetchAccessToken: FOUND token after refresh");
              return result.data.session.token;
            }
          }

          console.log("[Auth] fetchAccessToken: MISSING - no token available");
          return null;
        },
        [session]
      );

      return {
        isLoading,
        isAuthenticated,
        fetchAccessToken,
      };
    };
  }, [isLoading, isAuthenticated, session]);

  // Build user object for context
  const user: User | null = session?.user
    ? {
        id: session.user.id,
        _id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image ?? undefined,
      }
    : null;

  const contextValue: AuthContextValue = {
    isAuthenticated,
    isLoading,
    user,
    signOut,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      <ConvexProviderWithAuth client={client} useAuth={useAuth}>
        {children}
      </ConvexProviderWithAuth>
    </AuthContext.Provider>
  );
}
