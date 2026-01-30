// Native-specific auth client implementation
// This file is used on iOS/Android to avoid importing better-auth directly
// which contains webpack-style dynamic imports that crash Hermes

// CRITICAL: NO native module calls at module scope!
// All native API calls must happen inside functions called after React mounts.

import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

// Storage keys - these are safe at module scope (just strings)
const getStoragePrefix = () => Constants.expoConfig?.scheme || "planera";
const getSessionKey = () => `${getStoragePrefix()}_session`;
const getTokenKey = () => `${getStoragePrefix()}_token`;
const getUserKey = () => `${getStoragePrefix()}_user`;

// Get the base URL for auth requests - MUST be EXPO_PUBLIC_CONVEX_SITE_URL
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

// Helper to safely access SecureStore - ONLY call after mount
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

// Get stored token - ONLY call after mount
async function getStoredToken(): Promise<string | null> {
  const token = await getSecureItem(getTokenKey());
  console.log("[Auth] getStoredToken:", token ? "FOUND" : "MISSING");
  return token;
}

// Make authenticated fetch request with detailed logging
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
    console.log("[Auth] Fetching:", options.method || "GET", url);

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
    });

    console.log("[Auth] Response status:", response.status);

    // Read body as text first for debugging
    const bodyText = await response.text();
    console.log("[Auth] Response body:", bodyText.substring(0, 500));

    if (!response.ok) {
      console.error("[Auth] Request failed:", response.status, bodyText);
      return { data: null, error: new Error(bodyText || `HTTP ${response.status}`) };
    }

    // Parse JSON from text
    const data = bodyText ? JSON.parse(bodyText) : null;
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
  let initialized = false;
  let initPromise: Promise<void> | null = null;

  const notifyListeners = (session: SessionData | null) => {
    currentSession = session;
    console.log("[Auth] Notifying listeners, authenticated:", !!session?.session);
    listeners.forEach((listener) => listener(session));
  };

  // Store session data - handles Better Auth response format
  const storeSession = async (session: AuthSession, user: AuthUser) => {
    console.log("[Auth] Storing session for user:", user.id);
    await setSecureItem(getSessionKey(), JSON.stringify({ session, user }));
    await setSecureItem(getUserKey(), JSON.stringify(user));
    if (session.token) {
      await setSecureItem(getTokenKey(), session.token);
      console.log("[Auth] Token stored successfully");
    }
    notifyListeners({ session, user });
  };

  // Create session object from Better Auth token+user response
  const createSessionFromResponse = (token: string, user: AuthUser): AuthSession => {
    return {
      id: `native_${Date.now()}`,
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    };
  };

  // Clear session data
  const clearSession = async () => {
    console.log("[Auth] Clearing session");
    await deleteSecureItem(getSessionKey());
    await deleteSecureItem(getTokenKey());
    await deleteSecureItem(getUserKey());
    notifyListeners(null);
  };

  // Load stored session - ONLY called after explicit init or first use
  const loadStoredSession = async () => {
    if (initialized) return;
    initialized = true;

    try {
      console.log("[Auth] Loading stored session...");
      const stored = await getSecureItem(getSessionKey());
      if (stored) {
        const parsed = JSON.parse(stored);
        currentSession = parsed;
        notifyListeners(parsed);
        console.log("[Auth] Restored session from storage, userId:", parsed.user?.id);
      } else {
        console.log("[Auth] No stored session found");
      }
    } catch (error) {
      console.warn("[Auth] Failed to load stored session:", error);
    }
  };

  // Ensure initialized before any operation
  const ensureInit = async () => {
    if (!initPromise) {
      initPromise = loadStoredSession();
    }
    await initPromise;
  };

  // Explicit init function - call from useEffect in root component
  const init = async () => {
    console.log("[Auth] Explicit init called");
    await ensureInit();
  };

  return {
    // Explicit initialization - call from useEffect
    init,

    // Sign in with email/password
    signIn: {
      email: async ({
        email,
        password,
      }: {
        email: string;
        password: string;
      }): Promise<AuthResponse<SessionData>> => {
        await ensureInit();
        console.log("[Auth] Signing in with email:", email);

        const response = await authFetch<any>("/api/auth/sign-in/email", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });

        if (response.error) {
          return { data: null, error: response.error };
        }

        const data = response.data;
        console.log("[Auth] Sign-in response keys:", data ? Object.keys(data) : "null");

        // Better Auth returns: { redirect: true, token: "...", user: {...}, url: "..." }
        // OR: { session: {...}, user: {...} }
        if (data?.token && data?.user) {
          const session = createSessionFromResponse(data.token, data.user);
          await storeSession(session, data.user);
          return { data: { session, user: data.user }, error: null };
        } else if (data?.session && data?.user) {
          await storeSession(data.session, data.user);
          return { data: { session: data.session, user: data.user }, error: null };
        }

        console.error("[Auth] Unexpected sign-in response format:", data);
        return { data: null, error: new Error("Invalid response from server") };
      },

      // Social sign in (Google, Apple, etc.)
      social: async ({
        provider,
        callbackURL,
      }: {
        provider: string;
        callbackURL?: string;
      }): Promise<AuthResponse<{ url: string }>> => {
        await ensureInit();
        const scheme = Constants.expoConfig?.scheme || "planera";
        const redirectURL = callbackURL || `${scheme}://`;

        console.log("[Auth] Starting social sign-in with provider:", provider);

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
        await ensureInit();
        console.log("[Auth] Starting anonymous sign-in");

        const response = await authFetch<any>("/api/auth/sign-in/anonymous", {
          method: "POST",
          body: JSON.stringify({}),
        });

        if (response.error) {
          return { data: null, error: response.error };
        }

        const data = response.data;
        console.log("[Auth] Anonymous sign-in response keys:", data ? Object.keys(data) : "null");

        // Handle both response formats
        if (data?.token && data?.user) {
          const session = createSessionFromResponse(data.token, data.user);
          await storeSession(session, data.user);
          return { data: { session, user: data.user }, error: null };
        } else if (data?.session && data?.user) {
          await storeSession(data.session, data.user);
          return { data: { session: data.session, user: data.user }, error: null };
        }

        console.error("[Auth] Unexpected anonymous sign-in response format:", data);
        return { data: null, error: new Error("Invalid response from server") };
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
        await ensureInit();
        console.log("[Auth] Signing up with email:", email);

        const response = await authFetch<any>("/api/auth/sign-up/email", {
          method: "POST",
          body: JSON.stringify({ email, password, name }),
        });

        if (response.error) {
          return { data: null, error: response.error };
        }

        const data = response.data;
        console.log("[Auth] Sign-up response keys:", data ? Object.keys(data) : "null");

        // Handle both response formats
        if (data?.token && data?.user) {
          const session = createSessionFromResponse(data.token, data.user);
          await storeSession(session, data.user);
          return { data: { session, user: data.user }, error: null };
        } else if (data?.session && data?.user) {
          await storeSession(data.session, data.user);
          return { data: { session: data.session, user: data.user }, error: null };
        }

        console.error("[Auth] Unexpected sign-up response format:", data);
        return { data: null, error: new Error("Invalid response from server") };
      },
    },

    // Sign out
    signOut: async (): Promise<AuthResponse<null>> => {
      await ensureInit();
      console.log("[Auth] Signing out");
      try {
        await authFetch("/api/auth/sign-out", { method: "POST" });
      } catch (error) {
        console.warn("[Auth] Sign out request failed:", error);
      }
      await clearSession();
      return { data: null, error: null };
    },

    // Get current session from server
    getSession: async (): Promise<AuthResponse<SessionData>> => {
      await ensureInit();
      console.log("[Auth] Getting session from server");

      const response = await authFetch<any>("/api/auth/get-session", {
        method: "GET",
      });

      if (response.error) {
        return { data: { session: null, user: null }, error: response.error };
      }

      const data = response.data;
      console.log("[Auth] Get-session response keys:", data ? Object.keys(data) : "null");

      // Handle various response formats
      if (data?.session && data?.user) {
        await storeSession(data.session, data.user);
        return { data: { session: data.session, user: data.user }, error: null };
      } else if (data?.token && data?.user) {
        const session = createSessionFromResponse(data.token, data.user);
        await storeSession(session, data.user);
        return { data: { session, user: data.user }, error: null };
      } else if (data?.user && !data?.session) {
        // Some Better Auth versions return just user
        const token = await getStoredToken();
        if (token) {
          const session = createSessionFromResponse(token, data.user);
          await storeSession(session, data.user);
          return { data: { session, user: data.user }, error: null };
        }
      }

      // No valid session from server, clear local storage
      console.log("[Auth] No valid session from server");
      await clearSession();
      return { data: { session: null, user: null }, error: null };
    },

    // React hook for session (returns current state)
    useSession: () => {
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

    // For Convex integration - returns the stored token
    getToken: getStoredToken,
  };
}

// Export the auth client singleton
// CRITICAL: createNativeAuthClient() no longer calls SecureStore at import time
export const authClient = createNativeAuthClient();
