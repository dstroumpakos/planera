// Native-specific auth client implementation
// This file is used on iOS/Android to avoid importing better-auth directly
// which contains webpack-style dynamic imports that crash Hermes

import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Storage keys
const STORAGE_PREFIX = Constants.expoConfig?.scheme || "planera";
const SESSION_KEY = `${STORAGE_PREFIX}_session`;
const TOKEN_KEY = `${STORAGE_PREFIX}_token`;

// Get the base URL for auth requests
const BASE_URL = process.env.EXPO_PUBLIC_CONVEX_SITE_URL;

// Types - exported for use by consumers
export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  image?: string;
  emailVerified?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuthSession {
  id: string;
  userId: string;
  expiresAt: Date;
  token: string;
  user?: AuthUser;
}

export interface AuthResponse<T = any> {
  data: T | null;
  error: Error | null;
}

export interface SessionData {
  session: AuthSession | null;
  user: AuthUser | null;
}

// Helper to safely access SecureStore
async function getSecureItem(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.warn("[Auth] SecureStore read error:", error);
    return null;
  }
}

async function setSecureItem(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    console.warn("[Auth] SecureStore write error:", error);
  }
}

async function deleteSecureItem(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.warn("[Auth] SecureStore delete error:", error);
  }
}

// Get stored token
async function getStoredToken(): Promise<string | null> {
  return getSecureItem(TOKEN_KEY);
}

// Make authenticated fetch request
async function authFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<AuthResponse<T>> {
  try {
    if (!BASE_URL) {
      console.error("[Auth] EXPO_PUBLIC_CONVEX_SITE_URL is not set");
      return { data: null, error: new Error("Auth URL not configured") };
    }

    const token = await getStoredToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const url = `${BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Auth] Request failed:", response.status, errorText);
      return { data: null, error: new Error(errorText || `HTTP ${response.status}`) };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    console.error("[Auth] Fetch error:", error);
    return { data: null, error: error as Error };
  }
}

// Create the auth client with Better Auth compatible API
function createNativeAuthClient() {
  // Session state listeners
  const listeners: Set<(session: SessionData | null) => void> = new Set();
  let currentSession: SessionData | null = null;

  const notifyListeners = (session: SessionData | null) => {
    currentSession = session;
    listeners.forEach((listener) => listener(session));
  };

  // Store session data
  const storeSession = async (session: AuthSession, user: AuthUser) => {
    await setSecureItem(SESSION_KEY, JSON.stringify({ session, user }));
    if (session.token) {
      await setSecureItem(TOKEN_KEY, session.token);
    }
    notifyListeners({ session, user });
  };

  // Clear session data
  const clearSession = async () => {
    await deleteSecureItem(SESSION_KEY);
    await deleteSecureItem(TOKEN_KEY);
    notifyListeners(null);
  };

  // Load stored session on init
  const loadStoredSession = async () => {
    try {
      const stored = await getSecureItem(SESSION_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        currentSession = parsed;
        notifyListeners(parsed);
      }
    } catch (error) {
      console.warn("[Auth] Failed to load stored session:", error);
    }
  };

  // Initialize by loading stored session
  loadStoredSession();

  return {
    // Sign in with email/password
    signIn: {
      email: async ({
        email,
        password,
      }: {
        email: string;
        password: string;
      }): Promise<AuthResponse<SessionData>> => {
        const response = await authFetch<any>("/api/auth/sign-in/email", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });

        if (response.data?.session && response.data?.user) {
          await storeSession(response.data.session, response.data.user);
          return { data: { session: response.data.session, user: response.data.user }, error: null };
        }

        return { data: null, error: response.error };
      },

      // Social sign in (Google, Apple, etc.)
      social: async ({
        provider,
        callbackURL,
      }: {
        provider: string;
        callbackURL?: string;
      }): Promise<AuthResponse<{ url: string }>> => {
        const scheme = Constants.expoConfig?.scheme || "planera";
        const redirectURL = callbackURL || `${scheme}://`;
        
        const response = await authFetch<any>("/api/auth/sign-in/social", {
          method: "POST",
          body: JSON.stringify({ 
            provider, 
            callbackURL: redirectURL,
            mode: "expo",
          }),
        });

        if (response.data?.url) {
          return { data: { url: response.data.url }, error: null };
        }

        return { data: null, error: response.error };
      },

      // Anonymous sign in
      anonymous: async (): Promise<AuthResponse<SessionData>> => {
        const response = await authFetch<any>("/api/auth/sign-in/anonymous", {
          method: "POST",
          body: JSON.stringify({}),
        });

        if (response.data?.session && response.data?.user) {
          await storeSession(response.data.session, response.data.user);
          return { data: { session: response.data.session, user: response.data.user }, error: null };
        }

        return { data: null, error: response.error };
      },
    },

    // Sign up with email/password
    signUp: {
      email: async ({
        email,
        password,
        name,
      }: {
        email: string;
        password: string;
        name?: string;
      }): Promise<AuthResponse<SessionData>> => {
        const response = await authFetch<any>("/api/auth/sign-up/email", {
          method: "POST",
          body: JSON.stringify({ email, password, name }),
        });

        if (response.data?.session && response.data?.user) {
          await storeSession(response.data.session, response.data.user);
          return { data: { session: response.data.session, user: response.data.user }, error: null };
        }

        return { data: null, error: response.error };
      },
    },

    // Sign out
    signOut: async (): Promise<AuthResponse<null>> => {
      try {
        await authFetch("/api/auth/sign-out", { method: "POST" });
      } catch (error) {
        console.warn("[Auth] Sign out request failed:", error);
      }
      await clearSession();
      return { data: null, error: null };
    },

    // Get current session
    getSession: async (): Promise<AuthResponse<SessionData>> => {
      const response = await authFetch<SessionData>("/api/auth/get-session", {
        method: "GET",
      });

      if (response.data?.session) {
        await storeSession(response.data.session, response.data.user!);
        return response;
      }

      // If no valid session from server, clear local storage
      if (!response.error) {
        await clearSession();
      }

      return { data: { session: null, user: null }, error: response.error };
    },

    // React hook for session (returns current state)
    useSession: () => {
      // This is a simplified version - in the real implementation,
      // this would be a proper React hook with useState/useEffect
      // The actual hook behavior is handled by ConvexBetterAuthProvider
      return {
        data: currentSession,
        isPending: false,
        error: null,
      };
    },

    // Fetch wrapper for authenticated requests
    $fetch: authFetch,

    // Store for session state
    $store: {
      listen: (callback: (session: SessionData | null) => void) => {
        listeners.add(callback);
        // Immediately call with current state
        callback(currentSession);
        return () => listeners.delete(callback);
      },
      get: () => currentSession,
      set: (value: SessionData | null) => notifyListeners(value),
      notify: () => notifyListeners(currentSession),
    },

    // For Convex integration
    getToken: getStoredToken,
  };
}

// Export the auth client singleton
export const authClient = createNativeAuthClient();
