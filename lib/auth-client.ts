// Platform-specific auth client
// 
// Metro resolution order:
// 1. iOS/Android: auth-client.native.ts (no better-auth imports)  
// 2. Web: auth-client.ts (this file) -> shimmed by metro for safety
//
// For web, metro.config.js will NOT shim this file's imports because
// better-auth works fine on web. The shims only apply to native platforms.

// Type definitions
export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  image?: string | null;
  emailVerified?: boolean;
}

export interface AuthSession {
  id: string;
  userId: string;
  expiresAt: Date;
  token: string;
}

export interface SessionData {
  session: AuthSession | null;
  user: AuthUser | null;
}

export interface AuthResponse<T = unknown> {
  data: T | null;
  error: Error | null;
}

// Web implementation using better-auth
// These imports are shimmed on native by metro.config.js
import { createAuthClient } from "better-auth/react";
import { anonymousClient } from "better-auth/client/plugins";
import { convexClient, crossDomainClient } from "@convex-dev/better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_CONVEX_SITE_URL,
  plugins: [
    anonymousClient(),
    crossDomainClient(),
    convexClient(),
  ],
});
