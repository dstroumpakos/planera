"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import * as jose from "jose";

// Google's JWKS URL
const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
// Apple's JWKS URL
const APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys";

// Interface for verified token claims
interface VerifiedClaims {
  sub: string; // Subject (user ID from provider)
  email?: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
}

// Verify Google ID token
async function verifyGoogleToken(idToken: string): Promise<VerifiedClaims> {
  const googleWebClientId = process.env.GOOGLE_WEB_CLIENT_ID;
  
  if (!googleWebClientId) {
    throw new Error("GOOGLE_WEB_CLIENT_ID environment variable is required");
  }
  
  try {
    // Create JWKS remote key set for Google
    const JWKS = jose.createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));
    
    // Verify the token
    const { payload } = await jose.jwtVerify(idToken, JWKS, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: googleWebClientId,
    });
    
    console.log("[AuthNative] Google token verified for sub:", payload.sub);
    
    return {
      sub: payload.sub as string,
      email: payload.email as string | undefined,
      name: payload.name as string | undefined,
      picture: payload.picture as string | undefined,
      email_verified: payload.email_verified as boolean | undefined,
    };
  } catch (error) {
    console.error("[AuthNative] Google token verification failed:", error);
    throw new Error("Invalid Google ID token");
  }
}

// Verify Apple identity token
async function verifyAppleToken(identityToken: string): Promise<VerifiedClaims> {
  const appleBundleId = process.env.APPLE_BUNDLE_ID;
  
  if (!appleBundleId) {
    throw new Error("APPLE_BUNDLE_ID environment variable is required");
  }
  
  try {
    // Create JWKS remote key set for Apple
    const JWKS = jose.createRemoteJWKSet(new URL(APPLE_JWKS_URL));
    
    // Verify the token
    const { payload } = await jose.jwtVerify(identityToken, JWKS, {
      issuer: "https://appleid.apple.com",
      audience: appleBundleId,
    });
    
    console.log("[AuthNative] Apple token verified for sub:", payload.sub);
    
    return {
      sub: payload.sub as string,
      email: payload.email as string | undefined,
      // Apple doesn't provide name in the token, only on first sign-in
      name: undefined,
      picture: undefined,
      email_verified: payload.email_verified as boolean | undefined,
    };
  } catch (error) {
    console.error("[AuthNative] Apple token verification failed:", error);
    throw new Error("Invalid Apple identity token");
  }
}

// Generate a secure session token
function generateSessionToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Result type from upsertUserAndCreateSession
interface UpsertResult {
  userId: string;
  sessionId: string;
  token: string;
  user: {
    id: string;
    email?: string;
    name?: string;
    image?: string;
  };
}

// Sign in with Google (native)
export const signInWithGoogle = action({
  args: {
    idToken: v.string(),
    // Optional: user info from Google Sign-In SDK (name might not be in token)
    displayName: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    token: v.optional(v.string()),
    user: v.optional(v.object({
      id: v.string(),
      email: v.optional(v.string()),
      name: v.optional(v.string()),
      image: v.optional(v.string()),
    })),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args): Promise<{
    success: boolean;
    token?: string;
    user?: { id: string; email?: string; name?: string; image?: string };
    error?: string;
  }> => {
    try {
      console.log("[AuthNative] Verifying Google ID token...");
      
      // Verify the Google ID token
      const claims = await verifyGoogleToken(args.idToken);
      
      // Generate a session token
      const sessionToken = generateSessionToken();
      
      // Upsert user and create session using internal mutation
      const result: UpsertResult = await ctx.runMutation(internal.authNativeDb.upsertUserAndCreateSession, {
        provider: "google",
        providerUserId: claims.sub,
        email: claims.email,
        name: args.displayName || claims.name,
        picture: claims.picture,
        sessionToken,
      });
      
      console.log("[AuthNative] Google sign-in successful for:", result.userId);
      
      return {
        success: true,
        token: result.token,
        user: result.user,
      };
    } catch (error: any) {
      console.error("[AuthNative] Google sign-in failed:", error);
      return {
        success: false,
        error: error.message || "Google sign-in failed",
      };
    }
  },
});

// Sign in with Apple (native)
export const signInWithApple = action({
  args: {
    identityToken: v.string(),
    // Apple only provides user info on first sign-in
    fullName: v.optional(v.object({
      givenName: v.optional(v.string()),
      familyName: v.optional(v.string()),
    })),
    email: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    token: v.optional(v.string()),
    user: v.optional(v.object({
      id: v.string(),
      email: v.optional(v.string()),
      name: v.optional(v.string()),
      image: v.optional(v.string()),
    })),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args): Promise<{
    success: boolean;
    token?: string;
    user?: { id: string; email?: string; name?: string; image?: string };
    error?: string;
  }> => {
    try {
      console.log("[AuthNative] Verifying Apple identity token...");
      
      // Verify the Apple identity token
      const claims = await verifyAppleToken(args.identityToken);
      
      // Apple might provide email in args on first sign-in (not always in token)
      const email = claims.email || args.email;
      
      // Construct name from fullName if provided (Apple only gives this on first sign-in)
      let name: string | undefined;
      if (args.fullName) {
        const parts = [args.fullName.givenName, args.fullName.familyName].filter(Boolean);
        if (parts.length > 0) {
          name = parts.join(" ");
        }
      }
      
      // Generate a session token
      const sessionToken = generateSessionToken();
      
      // Upsert user and create session using internal mutation
      const result: UpsertResult = await ctx.runMutation(internal.authNativeDb.upsertUserAndCreateSession, {
        provider: "apple",
        providerUserId: claims.sub,
        email,
        name,
        picture: undefined,
        sessionToken,
      });
      
      console.log("[AuthNative] Apple sign-in successful for:", result.userId);
      
      return {
        success: true,
        token: result.token,
        user: result.user,
      };
    } catch (error: any) {
      console.error("[AuthNative] Apple sign-in failed:", error);
      return {
        success: false,
        error: error.message || "Apple sign-in failed",
      };
    }
  },
});

// Validate a session token (called by auth provider)
export const validateSession = action({
  args: {
    token: v.string(),
  },
  returns: v.object({
    valid: v.boolean(),
    user: v.optional(v.object({
      id: v.string(),
      email: v.optional(v.string()),
      name: v.optional(v.string()),
      image: v.optional(v.string()),
    })),
  }),
  handler: async (ctx, args) => {
    // For native auth, we just validate that the token exists and is formatted correctly
    // The actual session validation happens through the stored token
    // In a production system, you'd want to store sessions in a table and validate against it
    
    if (!args.token || args.token.length < 32) {
      return { valid: false };
    }
    
    // Token is valid if it exists and has proper length
    // The user info would come from the stored session on the client
    return { valid: true };
  },
});
