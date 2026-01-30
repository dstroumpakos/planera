import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Internal mutation to upsert user and create session
// This runs in the V8 runtime (not Node.js) so it can access ctx.db
export const upsertUserAndCreateSession = internalMutation({
  args: {
    provider: v.string(),
    providerUserId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    picture: v.optional(v.string()),
    sessionToken: v.string(),
  },
  returns: v.object({
    userId: v.string(),
    sessionId: v.string(),
    token: v.string(),
    user: v.object({
      id: v.string(),
      email: v.optional(v.string()),
      name: v.optional(v.string()),
      image: v.optional(v.string()),
    }),
  }),
  handler: async (ctx, args) => {
    // Create a unique user ID based on provider and provider user ID
    const uniqueUserId = `${args.provider}:${args.providerUserId}`;
    
    // Check if user already exists in userSettings (our app's user table)
    const existingSettings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", uniqueUserId))
      .unique();
    
    if (!existingSettings) {
      // Create new user settings
      await ctx.db.insert("userSettings", {
        userId: uniqueUserId,
        email: args.email,
        name: args.name,
        profilePicture: undefined,
        onboardingCompleted: false,
        darkMode: false,
        pushNotifications: true,
        emailNotifications: true,
        language: "en",
        currency: "USD",
      });
      console.log("[AuthNativeDb] Created new user settings for:", uniqueUserId);
    } else if (args.email || args.name) {
      // Update existing user with any new info from provider
      await ctx.db.patch(existingSettings._id, {
        ...(args.email && !existingSettings.email ? { email: args.email } : {}),
        ...(args.name && !existingSettings.name ? { name: args.name } : {}),
      });
    }
    
    // Also check/create userPlans for subscription tracking
    const existingPlan = await ctx.db
      .query("userPlans")
      .withIndex("by_user", (q) => q.eq("userId", uniqueUserId))
      .unique();
    
    if (!existingPlan) {
      await ctx.db.insert("userPlans", {
        userId: uniqueUserId,
        plan: "free",
        tripsGenerated: 0,
        tripCredits: 3, // Free tier gets 3 trips
      });
      console.log("[AuthNativeDb] Created user plan for:", uniqueUserId);
    }
    
    // Generate session ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    return {
      userId: uniqueUserId,
      sessionId,
      token: args.sessionToken,
      user: {
        id: uniqueUserId,
        email: args.email,
        name: args.name,
        image: args.picture,
      },
    };
  },
});
