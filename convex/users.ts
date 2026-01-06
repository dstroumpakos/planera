import { v } from "convex/values";
import { authMutation, authQuery } from "./functions";

export const getPlan = authQuery({
    args: {},
    handler: async (ctx) => {
        const userPlan = await ctx.db
            .query("userPlans")
            .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
            .unique();

        if (!userPlan) {
            return { 
                plan: "free", 
                tripsGenerated: 0,
                tripCredits: 0,
                subscriptionExpiresAt: null,
                isSubscriptionActive: false,
            };
        }

        const isSubscriptionActive = userPlan.plan === "premium" && 
            userPlan.subscriptionExpiresAt && 
            userPlan.subscriptionExpiresAt > Date.now();

        return {
            ...userPlan,
            tripCredits: userPlan.tripCredits ?? 0,
            isSubscriptionActive,
        };
    },
});

export const upgradeToPremium = authMutation({
    args: {
        planType: v.optional(v.union(v.literal("monthly"), v.literal("yearly"))),
    },
    handler: async (ctx, args) => {
        const userPlan = await ctx.db
            .query("userPlans")
            .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
            .unique();

        // Set subscription duration based on plan type
        const planType = args.planType ?? "monthly";
        const durationDays = planType === "yearly" ? 365 : 30;
        const subscriptionExpiresAt = Date.now() + (durationDays * 24 * 60 * 60 * 1000);

        if (userPlan) {
            await ctx.db.patch(userPlan._id, { 
                plan: "premium",
                subscriptionExpiresAt,
                subscriptionType: planType,
            });
        } else {
            await ctx.db.insert("userPlans", {
                userId: ctx.user._id,
                plan: "premium",
                tripsGenerated: 0,
                tripCredits: 0,
                subscriptionExpiresAt,
                subscriptionType: planType,
            });
        }
    },
});

// Purchase trip packs
export const purchaseTripPack = authMutation({
    args: {
        pack: v.union(v.literal("single"), v.literal("triple"), v.literal("ten")),
    },
    handler: async (ctx, args) => {
        const creditsToAdd = args.pack === "single" ? 1 : args.pack === "triple" ? 3 : 10;

        const userPlan = await ctx.db
            .query("userPlans")
            .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
            .unique();

        if (userPlan) {
            const currentCredits = userPlan.tripCredits ?? 0;
            await ctx.db.patch(userPlan._id, { 
                tripCredits: currentCredits + creditsToAdd,
            });
        } else {
            await ctx.db.insert("userPlans", {
                userId: ctx.user._id,
                plan: "free",
                tripsGenerated: 0,
                tripCredits: creditsToAdd,
            });
        }

        return { creditsAdded: creditsToAdd };
    },
});

// Check if user can generate a trip
export const canGenerateTrip = authQuery({
    args: {},
    handler: async (ctx) => {
        const userPlan = await ctx.db
            .query("userPlans")
            .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
            .unique();

        if (!userPlan) {
            // New user gets 1 free trip
            return { canGenerate: true, reason: "free_trial" };
        }

        // Premium subscribers with active subscription
        const isSubscriptionActive = userPlan.plan === "premium" && 
            userPlan.subscriptionExpiresAt && 
            userPlan.subscriptionExpiresAt > Date.now();

        if (isSubscriptionActive) {
            return { canGenerate: true, reason: "premium" };
        }

        // Has trip credits
        const tripCredits = userPlan.tripCredits ?? 0;
        if (tripCredits > 0) {
            return { canGenerate: true, reason: "credits", creditsRemaining: tripCredits };
        }

        // Free users get 1 free trip
        if (userPlan.tripsGenerated < 1) {
            return { canGenerate: true, reason: "free_trial" };
        }

        return { canGenerate: false, reason: "no_credits" };
    },
});

// Use a trip credit (called when generating a trip)
export const useTripCredit = authMutation({
    args: {},
    handler: async (ctx) => {
        const userPlan = await ctx.db
            .query("userPlans")
            .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
            .unique();

        if (!userPlan) {
            // Create new user plan with 1 trip used
            await ctx.db.insert("userPlans", {
                userId: ctx.user._id,
                plan: "free",
                tripsGenerated: 1,
                tripCredits: 0,
            });
            return;
        }

        // Premium subscribers don't use credits
        const isSubscriptionActive = userPlan.plan === "premium" && 
            userPlan.subscriptionExpiresAt && 
            userPlan.subscriptionExpiresAt > Date.now();

        if (isSubscriptionActive) {
            // Just increment trips generated for stats
            await ctx.db.patch(userPlan._id, { 
                tripsGenerated: userPlan.tripsGenerated + 1,
            });
            return;
        }

        // Use trip credit if available
        const tripCredits = userPlan.tripCredits ?? 0;
        if (tripCredits > 0) {
            await ctx.db.patch(userPlan._id, { 
                tripCredits: tripCredits - 1,
                tripsGenerated: userPlan.tripsGenerated + 1,
            });
            return;
        }

        // Free trial
        if (userPlan.tripsGenerated < 1) {
            await ctx.db.patch(userPlan._id, { 
                tripsGenerated: 1,
            });
            return;
        }

        throw new Error("No trip credits available");
    },
});

export const getSettings = authQuery({
    args: {},
    returns: v.any(),
    handler: async (ctx) => {
        const settings = await ctx.db
            .query("userSettings")
            .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
            .unique();

        if (!settings) {
            // Return default settings
            return {
                name: ctx.user.name || "",
                email: ctx.user.email || "",
                phone: "",
                dateOfBirth: "",
                preferredAirlines: [],
                seatPreference: "window",
                mealPreference: "none",
                hotelStarRating: 4,
                budgetRange: "mid-range",
                travelStyle: "relaxation",
                language: "en",
                currency: "USD",
                pushNotifications: true,
                emailNotifications: true,
                dealAlerts: true,
                tripReminders: true,
            };
        }

        return settings;
    },
});

export const updatePersonalInfo = authMutation({
    args: {
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        dateOfBirth: v.optional(v.string()),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const settings = await ctx.db
            .query("userSettings")
            .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
            .unique();

        if (settings) {
            await ctx.db.patch(settings._id, args);
        } else {
            await ctx.db.insert("userSettings", {
                userId: ctx.user._id,
                ...args,
            });
        }

        return null;
    },
});

export const updateTravelPreferences = authMutation({
    args: {
        // Travel preference fields only (no budget)
        homeAirport: v.optional(v.string()),
        defaultInterests: v.optional(v.array(v.string())),
        defaultSkipFlights: v.optional(v.boolean()),
        defaultSkipHotel: v.optional(v.boolean()),
        defaultPreferredFlightTime: v.optional(v.string()),

        // Legacy fields
        preferredAirlines: v.optional(v.array(v.string())),
        seatPreference: v.optional(v.string()),
        mealPreference: v.optional(v.string()),
        hotelStarRating: v.optional(v.float64()),
        budgetRange: v.optional(v.string()),
        travelStyle: v.optional(v.string()),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const settings = await ctx.db
            .query("userSettings")
            .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
            .unique();

        if (settings) {
            await ctx.db.patch(settings._id, args);
        } else {
            await ctx.db.insert("userSettings", {
                userId: ctx.user._id,
                ...args,
            });
        }

        return null;
    },
});

export const updateAppSettings = authMutation({
    args: {
        language: v.optional(v.string()),
        currency: v.optional(v.string()),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const settings = await ctx.db
            .query("userSettings")
            .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
            .unique();

        if (settings) {
            await ctx.db.patch(settings._id, args);
        } else {
            await ctx.db.insert("userSettings", {
                userId: ctx.user._id,
                ...args,
            });
        }

        return null;
    },
});

export const updateNotifications = authMutation({
    args: {
        pushNotifications: v.optional(v.boolean()),
        emailNotifications: v.optional(v.boolean()),
        dealAlerts: v.optional(v.boolean()),
        tripReminders: v.optional(v.boolean()),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const settings = await ctx.db
            .query("userSettings")
            .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
            .unique();

        if (settings) {
            await ctx.db.patch(settings._id, args);
        } else {
            await ctx.db.insert("userSettings", {
                userId: ctx.user._id,
                ...args,
            });
        }

        return null;
    },
});

export const cancelSubscription = authMutation({
    args: {},
    returns: v.object({ success: v.boolean() }),
    handler: async (ctx) => {
        const userPlan = await ctx.db
            .query("userPlans")
            .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
            .unique();

        if (!userPlan) {
            throw new Error("No subscription found");
        }

        if (userPlan.plan !== "premium") {
            throw new Error("No active subscription to cancel");
        }

        await ctx.db.patch(userPlan._id, {
            plan: "free",
            subscriptionExpiresAt: undefined,
            subscriptionType: undefined,
        });

        return { success: true };
    },
});
