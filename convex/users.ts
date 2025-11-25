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
            return { plan: "free", tripsGenerated: 0 };
        }

        return userPlan;
    },
});

export const upgradeToPremium = authMutation({
    args: {},
    handler: async (ctx) => {
        const userPlan = await ctx.db
            .query("userPlans")
            .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
            .unique();

        if (userPlan) {
            await ctx.db.patch(userPlan._id, { plan: "premium" });
        } else {
            await ctx.db.insert("userPlans", {
                userId: ctx.user._id,
                plan: "premium",
                tripsGenerated: 0,
            });
        }
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
        preferredAirlines: v.optional(v.array(v.string())),
        seatPreference: v.optional(v.string()),
        mealPreference: v.optional(v.string()),
        hotelStarRating: v.optional(v.number()),
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
