import { v } from "convex/values";
import { authMutation, authQuery } from "./functions";
import { internalMutation, internalQuery } from "./_generated/server";
import { api, internal } from "./_generated/api";

export const create = authMutation({
    args: {
        destination: v.string(),
        origin: v.string(),
        startDate: v.number(),
        endDate: v.number(),
        budget: v.union(v.number(), v.string()), // Accept both for backward compatibility
        travelers: v.number(),
        interests: v.array(v.string()),
        skipFlights: v.optional(v.boolean()),
        preferredFlightTime: v.optional(v.string()),
    },
    returns: v.id("trips"),
    handler: async (ctx, args) => {
        // Check if user can generate a trip
        const userPlan = await ctx.db
            .query("userPlans")
            .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
            .unique();

        // Check permissions
        const isSubscriptionActive = userPlan?.plan === "premium" && 
            userPlan?.subscriptionExpiresAt && 
            userPlan.subscriptionExpiresAt > Date.now();
        
        const tripCredits = userPlan?.tripCredits ?? 0;
        const tripsGenerated = userPlan?.tripsGenerated ?? 0;
        const hasFreeTrial = tripsGenerated < 1;

        if (!isSubscriptionActive && tripCredits <= 0 && !hasFreeTrial) {
            throw new Error("No trip credits available. Please purchase a trip pack or subscribe to Premium.");
        }

        // Deduct credit or use free trial
        if (userPlan) {
            if (isSubscriptionActive) {
                // Premium users just increment stats
                await ctx.db.patch(userPlan._id, { 
                    tripsGenerated: tripsGenerated + 1,
                });
            } else if (tripCredits > 0) {
                // Use a trip credit
                await ctx.db.patch(userPlan._id, { 
                    tripCredits: tripCredits - 1,
                    tripsGenerated: tripsGenerated + 1,
                });
            } else {
                // Free trial
                await ctx.db.patch(userPlan._id, { 
                    tripsGenerated: 1,
                });
            }
        } else {
            // New user - create plan with 1 trip used (free trial)
            await ctx.db.insert("userPlans", {
                userId: ctx.user._id,
                plan: "free",
                tripsGenerated: 1,
                tripCredits: 0,
            });
        }

        const tripId = await ctx.db.insert("trips", {
            userId: ctx.user._id,
            destination: args.destination,
            origin: args.origin,
            startDate: args.startDate,
            endDate: args.endDate,
            budget: args.budget,
            travelers: args.travelers,
            interests: args.interests,
            status: "generating",
            skipFlights: args.skipFlights ?? false,
            preferredFlightTime: args.preferredFlightTime ?? "any",
        });

        const flightInfo = args.skipFlights 
            ? "Note: User already has flights booked, so DO NOT include flight recommendations."
            : `Flying from: ${args.origin}. Preferred flight time: ${args.preferredFlightTime || "any"}`;

        const prompt = `Plan a trip to ${args.destination} for ${args.travelers} people.
        ${flightInfo}
        Budget: ${args.budget}.
        Dates: ${new Date(args.startDate).toDateString()} to ${new Date(args.endDate).toDateString()}.
        Interests: ${args.interests.join(", ")}.`;

        // Schedule the generation action from tripsActions.ts
        await ctx.scheduler.runAfter(0, internal.tripsActions.generate, { 
            tripId, 
            prompt, 
            skipFlights: args.skipFlights ?? false,
            preferredFlightTime: args.preferredFlightTime ?? "any",
        });

        return tripId;
    },
});

// Internal query to get trip details
export const getTripDetails = internalQuery({
    args: { tripId: v.id("trips") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.tripId);
    },
});

export const updateItinerary = internalMutation({
    args: {
        tripId: v.id("trips"),
        itinerary: v.any(),
        status: v.union(v.literal("generating"), v.literal("completed"), v.literal("failed")),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.tripId, {
            itinerary: args.itinerary,
            status: args.status,
        });
    },
});

export const list = authQuery({
    args: {},
    handler: async (ctx) => {
        return await ctx.db
            .query("trips")
            .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
            .order("desc")
            .collect();
    },
});

export const get = authQuery({
    args: { tripId: v.id("trips") },
    handler: async (ctx, args) => {
        const trip = await ctx.db.get(args.tripId);
        if (!trip) return null;

        const userPlan = await ctx.db
            .query("userPlans")
            .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
            .unique();

        return {
            ...trip,
            userPlan: userPlan?.plan ?? "free",
        };
    },
});

export const update = authMutation({
    args: {
        tripId: v.id("trips"),
        destination: v.optional(v.string()),
        origin: v.optional(v.string()),
        startDate: v.optional(v.number()),
        endDate: v.optional(v.number()),
        budget: v.optional(v.number()),
        travelers: v.optional(v.number()),
        interests: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        const { tripId, ...updates } = args;
        await ctx.db.patch(tripId, updates);
    },
});

export const regenerate = authMutation({
    args: { tripId: v.id("trips") },
    handler: async (ctx, args) => {
        const trip = await ctx.db.get(args.tripId);
        if (!trip) throw new Error("Trip not found");

        await ctx.db.patch(args.tripId, { status: "generating" });

        const prompt = `Plan a trip to ${trip.destination} from ${trip.origin} for ${trip.travelers} people.
        Budget: ${trip.budget}.
        Dates: ${new Date(trip.startDate).toDateString()} to ${new Date(trip.endDate).toDateString()}.
        Interests: ${trip.interests.join(", ")}.`;

        await ctx.scheduler.runAfter(0, internal.tripsActions.generate, { tripId: args.tripId, prompt });
    },
});

export const deleteTrip = authMutation({
    args: { tripId: v.id("trips") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.tripId);
    },
});
