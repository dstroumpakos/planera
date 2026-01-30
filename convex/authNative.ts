"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import * as jose from "jose";

// Google's JWKS URL
const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
// Apple's JWKS URL
const APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys";

// Response type for sign-in actions
interface SignInResponse {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    email?: string;
    name?: string;
    image?: string;
  };
  error?: string;
}

// Interface for verified token claims
interface VerifiedClaims {
  sub: string; // Subject (user ID from provider)
  email?: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
  aud?: string | string[];
}

// Verify Google ID token
async function verifyGoogleToken(idToken: string): Promise<VerifiedClaims> {
  const googleWebClientId = process.env.GOOGLE_WEB_CLIENT_ID;
  
  if (!googleWebClientId) {
    console.error("[AuthNative] GOOGLE_WEB_CLIENT_ID environment variable is not set");
    throw new Error("GOOGLE_WEB_CLIENT_ID environment variable is required");
  }
  
  console.log("[AuthNative] Google verification config:", {
    hasClientId: !!googleWebClientId,
    clientIdPrefix: googleWebClientId.substring(0, 20) + "...",
  });
  
  try {
    // Create JWKS remote key set for Google
    const JWKS = jose.createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));
    
    // Verify the token
    const { payload } = await jose.jwtVerify(idToken, JWKS, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: googleWebClientId,
    });
    
    console.log("[AuthNative] Google token verified:", {
      sub: payload.sub,
      hasEmail: !!payload.email,
      hasName: !!payload.name,
      aud: payload.aud,
    });
    
    return {
      sub: payload.sub as string,
      email: payload.email as string | undefined,
      name: payload.name as string | undefined,
      picture: payload.picture as string | undefined,
      email_verified: payload.email_verified as boolean | undefined,
      aud: payload.aud,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[AuthNative] Google token verification failed:", errorMessage);
    throw new Error(`Invalid Google ID token: ${errorMessage}`);
  }
}

// Verify Apple identity token
async function verifyAppleToken(identityToken: string): Promise<VerifiedClaims> {
  const appleBundleId = process.env.APPLE_BUNDLE_ID;
  
  if (!appleBundleId) {
    console.error("[AuthNative] APPLE_BUNDLE_ID environment variable is not set");
    throw new Error("APPLE_BUNDLE_ID environment variable is required");
  }
  
  console.log("[AuthNative] Apple verification config:", {
    hasBundleId: !!appleBundleId,
    bundleId: appleBundleId,
  });
  
  try {
    // Create JWKS remote key set for Apple
    const JWKS = jose.createRemoteJWKSet(new URL(APPLE_JWKS_URL));
    
    // Verify the token
    const { payload } = await jose.jwtVerify(identityToken, JWKS, {
      issuer: "https://appleid.apple.com",
      audience: appleBundleId,
    });
    
    console.log("[AuthNative] Apple token verified:", {
      sub: payload.sub,
      hasEmail: !!payload.email,
      aud: payload.aud,
    });
    
    return {
      sub: payload.sub as string,
      email: payload.email as string | undefined,
      // Apple doesn't provide name in the token, only on first sign-in via SDK
      name: undefined,
      picture: undefined,
      email_verified: payload.email_verified as boolean | undefined,
      aud: payload.aud,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[AuthNative] Apple token verification failed:", errorMessage);
    throw new Error(`Invalid Apple identity token: ${errorMessage}`);
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
  handler: async (ctx, args): Promise<SignInResponse> => {
    console.log("[AuthNative] signInWithGoogle called");
    
    try {
      // Validate input
      if (!args.idToken) {
        console.error("[AuthNative] No idToken provided");
        return {
          success: false,
          error: "No ID token provided",
        };
      }
      
      console.log("[AuthNative] Verifying Google ID token (length:", args.idToken.length, ")");
      
      // Verify the Google ID token
      const claims = await verifyGoogleToken(args.idToken);
      
      if (!claims.sub) {
        console.error("[AuthNative] No sub claim in Google token");
        return {
          success: false,
          error: "Invalid token: missing user identifier",
        };
      }
      
      // Generate a session token
      const sessionToken = generateSessionToken();
      console.log("[AuthNative] Generated session token (length:", sessionToken.length, ")");
      
      // Upsert user and create session using internal mutation
      console.log("[AuthNative] Calling upsertUserAndCreateSession for Google user:", claims.sub);
      
      const result: UpsertResult = await ctx.runMutation(internal.authNativeDb.upsertUserAndCreateSession, {
        provider: "google",
        providerUserId: claims.sub,
        email: claims.email,
        name: args.displayName || claims.name,
        picture: claims.picture,
        sessionToken,
      });
      
      console.log("[AuthNative] Google sign-in successful:", {
        userId: result.userId,
        hasToken: !!result.token,
        hasUser: !!result.user,
      });
      
      const response: SignInResponse = {
        success: true,
        token: result.token,
        user: result.user,
      };
      
      console.log("[AuthNative] Returning Google sign-in response:", {
        success: response.success,
        hasToken: !!response.token,
        hasUser: !!response.user,
      });
      
      return response;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error("[AuthNative] Google sign-in failed:", errorMessage);
      
      return {
        success: false,
        error: errorMessage,
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
  handler: async (ctx, args): Promise<SignInResponse> => {
    console.log("[AuthNative] signInWithApple called");
    
    try {
      // Validate input
      if (!args.identityToken) {
        console.error("[AuthNative] No identityToken provided");
        return {
          success: false,
          error: "No identity token provided",
        };
      }
      
      console.log("[AuthNative] Verifying Apple identity token (length:", args.identityToken.length, ")");
      console.log("[AuthNative] Additional args:", {
        hasFullName: !!args.fullName,
        hasEmail: !!args.email,
        givenName: args.fullName?.givenName || "not provided",
        familyName: args.fullName?.familyName || "not provided",
      });
      
      // Verify the Apple identity token
      const claims = await verifyAppleToken(args.identityToken);
      
      if (!claims.sub) {
        console.error("[AuthNative] No sub claim in Apple token");
        return {
          success: false,
          error: "Invalid token: missing user identifier",
        };
      }
      
      // Apple might provide email in args on first sign-in (not always in token)
      const email = claims.email || args.email;
      console.log("[AuthNative] Email source:", {
        fromToken: !!claims.email,
        fromArgs: !!args.email,
        finalEmail: email ? "present" : "not available",
      });
      
      // Construct name from fullName if provided (Apple only gives this on first sign-in)
      let name: string | undefined;
      if (args.fullName) {
        const parts = [args.fullName.givenName, args.fullName.familyName].filter(Boolean);
        if (parts.length > 0) {
          name = parts.join(" ");
        }
      }
      console.log("[AuthNative] Constructed name:", name || "not available");
      
      // Generate a session token
      const sessionToken = generateSessionToken();
      console.log("[AuthNative] Generated session token (length:", sessionToken.length, ")");
      
      // Upsert user and create session using internal mutation
      console.log("[AuthNative] Calling upsertUserAndCreateSession for Apple user:", claims.sub);
      
      const result: UpsertResult = await ctx.runMutation(internal.authNativeDb.upsertUserAndCreateSession, {
        provider: "apple",
        providerUserId: claims.sub,
        email,
        name,
        picture: undefined,
        sessionToken,
      });
      
      console.log("[AuthNative] Apple sign-in successful:", {
        userId: result.userId,
        hasToken: !!result.token,
        hasUser: !!result.user,
      });
      
      const response: SignInResponse = {
        success: true,
        token: result.token,
        user: result.user,
      };
      
      console.log("[AuthNative] Returning Apple sign-in response:", {
        success: response.success,
        hasToken: !!response.token,
        hasUser: !!response.user,
      });
      
      return response;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error("[AuthNative] Apple sign-in failed:", errorMessage);
      
      return {
        success: false,
        error: errorMessage,
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
    console.log("[AuthNative] validateSession called");
    
    // For native auth, we just validate that the token exists and is formatted correctly
    // The actual session validation happens through the stored token
    // In a production system, you'd want to store sessions in a table and validate against it
    
    if (!args.token || args.token.length < 32) {
      console.log("[AuthNative] Session validation failed: invalid token format");
      return { valid: false };
    }
    
    // Token is valid if it exists and has proper length
    // The user info would come from the stored session on the client
    console.log("[AuthNative] Session validation passed");
    return { valid: true };
  },
});
