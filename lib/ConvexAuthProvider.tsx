// Platform-specific Convex Auth Provider
//
// Metro resolution:
// - Native (iOS/Android): ConvexAuthProvider.native.tsx
// - Web: ConvexAuthProvider.tsx (this file)
//
// On native, this file is NEVER loaded because Metro resolves .native.tsx first

import { ReactNode } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { authClient } from "./auth-client";

// Re-export convex/react auth components for web
export { Authenticated, Unauthenticated, AuthLoading, useConvexAuth } from "convex/react";

// Provider props - same interface as native version
interface ConvexAuthProviderProps {
  client: ConvexReactClient;
  children: ReactNode;
}

// Web auth provider using better-auth
export function ConvexNativeAuthProvider({ client, children }: ConvexAuthProviderProps) {
  return (
    <ConvexBetterAuthProvider client={client} authClient={authClient}>
      {children}
    </ConvexBetterAuthProvider>
  );
}
