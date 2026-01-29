// Native-specific Convex Auth Provider
// This avoids importing @convex-dev/better-auth/react which pulls in better-auth

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";

// Import the native auth client directly to get proper types
// This file only runs on native, so this import is safe
import { authClient } from "./auth-client.native";

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

// Create context
const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  signOut: async () => {},
});

// Hook to use auth context
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

// Native auth provider that works without better-auth imports
export function ConvexNativeAuthProvider({ client, children }: ConvexAuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
  });

  // Check session on mount
  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        const result = await authClient.getSession();
        
        if (!mounted) return;

        if (result.data?.session && result.data?.user) {
          const userData = result.data.user;
          setAuthState({
            isAuthenticated: true,
            isLoading: false,
            user: {
              id: userData.id,
              _id: userData.id,
              email: userData.email,
              name: userData.name,
              image: userData.image ?? undefined,
            },
          });
        } else {
          setAuthState({
            isAuthenticated: false,
            isLoading: false,
            user: null,
          });
        }
      } catch (error) {
        console.error("[Auth] Session check failed:", error);
        if (mounted) {
          setAuthState({
            isAuthenticated: false,
            isLoading: false,
            user: null,
          });
        }
      }
    };

    checkSession();

    // Subscribe to session changes via store
    const unsubscribe = authClient.$store.listen((sessionState) => {
      if (!mounted) return;
      
      if (sessionState?.session && sessionState?.user) {
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          user: {
            id: sessionState.user.id,
            _id: sessionState.user.id,
            email: sessionState.user.email,
            name: sessionState.user.name,
            image: sessionState.user.image ?? undefined,
          },
        });
      } else {
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
        });
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await authClient.signOut();
  }, []);

  const contextValue: AuthContextValue = {
    ...authState,
    signOut,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      <ConvexProvider client={client}>
        {children}
      </ConvexProvider>
    </AuthContext.Provider>
  );
}
