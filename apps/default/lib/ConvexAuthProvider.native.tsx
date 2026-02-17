// Native-specific Convex Auth Provider
// Uses ConvexProviderWithAuth for proper auth state integration with Convex

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef, ReactNode } from "react";
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

// The Convex site URL for token exchange
const CONVEX_SITE_URL = process.env.EXPO_PUBLIC_CONVEX_SITE_URL;

// Helper to extract session token from session data
function extractSessionToken(session: SessionData | null): string | null {
  if (!session?.session?.token) return null;
  return session.session.token;
}

// JWT cache to avoid hitting the token endpoint on every request
interface JwtCache {
  jwt: string;
  expiresAt: number; // ms timestamp
  sessionToken: string; // the session token it was issued for
}

// Native auth provider that integrates with Convex properly
export function ConvexNativeAuthProvider({ client, children }: ConvexAuthProviderProps) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initComplete, setInitComplete] = useState(false);
  const jwtCacheRef = useRef<JwtCache | null>(null);

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

      // Clear JWT cache when session changes so we get a fresh JWT
      jwtCacheRef.current = null;

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
    jwtCacheRef.current = null;
    await authClient.signOut();
  }, []);

  // Compute auth state
  const isAuthenticated = !!session?.session && !!extractSessionToken(session);

  // Log auth state for debugging
  useEffect(() => {
    console.log("[Auth] State updated - isAuthenticated:", isAuthenticated, "isLoading:", isLoading);
  }, [isAuthenticated, isLoading]);

  // Function to exchange session token for a Convex JWT via custom endpoint
  const exchangeTokenForJWT = useCallback(async (sessionToken: string, forceRefresh: boolean = false): Promise<string | null> => {
    if (!CONVEX_SITE_URL) {
      console.error("[Auth] CONVEX_SITE_URL not set, cannot exchange token");
      return null;
    }

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = jwtCacheRef.current;
      if (cached && cached.sessionToken === sessionToken && cached.expiresAt > Date.now() + 60_000) {
        console.log("[Auth] Using cached JWT");
        return cached.jwt;
      }
    }

    console.log("[Auth] Exchanging session token for Convex JWT...");

    try {
      const url = `${CONVEX_SITE_URL}/api/auth/convex-token`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ sessionToken }),
      });

      console.log("[Auth] convex-token response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("[Auth] convex-token response keys:", Object.keys(data));

        if (data?.token) {
          console.log("[Auth] Got Convex JWT successfully");
          // Cache for 4 minutes (JWT typically valid for 5)
          jwtCacheRef.current = {
            jwt: data.token,
            expiresAt: Date.now() + 4 * 60 * 1000,
            sessionToken,
          };
          return data.token;
        }

        if (data?.error === "jwt_unavailable" && data?.sessionValid) {
          console.warn("[Auth] Session is valid but JWT not available - crossDomain plugin may not support token endpoint");
        }
      }
    } catch (error) {
      console.warn("[Auth] Token exchange error:", error);
    }

    console.warn("[Auth] Could not get JWT, returning null");
    return null;
  }, []);

  // Create the useAuth hook for ConvexProviderWithAuth
  // This MUST be memoized to prevent infinite re-renders
  const useAuth = useMemo(() => {
    return () => {
      // fetchAccessToken is called by Convex to get the token for authenticated requests
      const fetchAccessToken = useCallback(
        async ({ forceRefreshToken }: { forceRefreshToken: boolean }): Promise<string | null> => {
          console.log("[Auth] fetchAccessToken called, forceRefresh:", forceRefreshToken);

          if (forceRefreshToken) {
            // Clear cache on force refresh
            jwtCacheRef.current = null;
          }

          // Get the session token
          const storedToken = await authClient.getToken();
          const sessionToken = storedToken || extractSessionToken(session);

          if (!sessionToken) {
            console.log("[Auth] fetchAccessToken: MISSING - no session token available");
            return null;
          }

          // Try to exchange for a proper JWT
          const jwt = await exchangeTokenForJWT(sessionToken, forceRefreshToken);
          if (jwt) {
            console.log("[Auth] fetchAccessToken: Returning Convex JWT");
            return jwt;
          }

          // Fallback to raw session token
          // This won't work with getAuthUser but at least Convex knows we have a token
          console.log("[Auth] fetchAccessToken: Falling back to session token (getAuthUser may not work)");
          return sessionToken;
        },
        [session, exchangeTokenForJWT]
      );

      return {
        isLoading,
        isAuthenticated,
        fetchAccessToken,
      };
    };
  }, [isLoading, isAuthenticated, session, exchangeTokenForJWT]);

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
