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
        skipHotel: v.optional(v.boolean()),
        preferredFlightTime: v.optional(v.string()),
        localExperience: v.optional(v.boolean()),
    },
    returns: v.id("trips"),
    handler: async (ctx, args) => {
        console.log("🚀 Creating trip with args:", JSON.stringify(args, null, 2));

        // Validate numeric fields
        if (isNaN(args.startDate)) throw new Error("Invalid startDate: NaN");
        if (isNaN(args.endDate)) throw new Error("Invalid endDate: NaN");
        if (isNaN(args.travelers)) throw new Error("Invalid travelers: NaN");

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
            skipHotel: args.skipHotel ?? false,
            preferredFlightTime: args.preferredFlightTime ?? "any",
            localExperience: args.localExperience ?? false,
        });

        const flightInfo = args.skipFlights 
            ? "Note: User already has flights booked, so DO NOT include flight recommendations."
            : `Flying from: ${args.origin}. Preferred flight time: ${args.preferredFlightTime || "any"}`;

        const localExperiencePrompt = args.localExperience 
            ? `
IMPORTANT - LOCAL EXPERIENCE MODE ENABLED:
The traveler wants an AUTHENTIC LOCAL experience, NOT a typical tourist trip. Please focus on:
- Hidden gems and off-the-beaten-path locations that only locals know about
- Local neighborhood restaurants, cafes, and street food spots (avoid tourist traps and chain restaurants)
- Authentic cultural experiences and local traditions
- Local markets, artisan shops, and family-owned businesses
- Neighborhoods where locals actually live and hang out
- Local festivals, events, or gatherings if happening during the trip dates
- Public transportation tips that locals use
- Lesser-known viewpoints and photo spots
- Local etiquette and customs to follow
- Authentic local cuisine and dishes to try (not tourist versions)
- Small local tours run by residents rather than big tour companies
- Places to interact with locals and learn about daily life
AVOID: Major tourist attractions, tourist-heavy areas, international chain restaurants, and typical "must-see" lists.
`
            : "";

        const prompt = `Plan a trip to ${args.destination} for ${args.travelers} people.
        ${flightInfo}
        Budget: ${args.budget}.
        Dates: ${new Date(args.startDate).toDateString()} to ${new Date(args.endDate).toDateString()}.
        Interests: ${args.interests.join(", ")}.
        ${localExperiencePrompt}`;

        // Schedule the generation action from tripsActions.ts
        await ctx.scheduler.runAfter(0, internal.tripsActions.generate, { 
            tripId, 
            prompt, 
            skipFlights: args.skipFlights ?? false,
            preferredFlightTime: args.preferredFlightTime ?? "any",
            localExperience: args.localExperience ?? false,
        });

        return tripId;
    },
});

// Internal query to get trip details
export const getTripDetails = internalQuery({
    args: { tripId: v.id("trips") },
    returns: v.union(
        v.null(),
        v.object({
            _id: v.id("trips"),
            _creationTime: v.number(),
            userId: v.string(),
            destination: v.string(),
            origin: v.optional(v.string()),
            startDate: v.number(),
            endDate: v.number(),
            budget: v.union(v.number(), v.string()),
            travelers: v.number(),
            interests: v.array(v.string()),
            skipFlights: v.optional(v.boolean()),
            skipHotel: v.optional(v.boolean()),
            preferredFlightTime: v.optional(v.string()),
            localExperience: v.optional(v.boolean()),
            status: v.string(),
            itinerary: v.optional(v.any()),
        })
    ),
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
    returns: v.null(),
    handler: async (ctx, args) => {
        await ctx.db.patch(args.tripId, {
            itinerary: args.itinerary,
            status: args.status,
        });
        return null;
    },
});

export const list = authQuery({
    args: {},
    returns: v.array(
        v.object({
            _id: v.id("trips"),
            _creationTime: v.number(),
            userId: v.string(),
            destination: v.string(),
            origin: v.optional(v.string()),
            startDate: v.number(),
            endDate: v.number(),
            budget: v.union(v.number(), v.string()),
            travelers: v.number(),
            interests: v.array(v.string()),
            skipFlights: v.optional(v.boolean()),
            skipHotel: v.optional(v.boolean()),
            preferredFlightTime: v.optional(v.string()),
            localExperience: v.optional(v.boolean()),
            status: v.string(),
            itinerary: v.optional(v.any()),
        })
    ),
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

        // Check if user has full access (premium subscription OR has/used trip credits)
        const isSubscriptionActive = userPlan?.plan === "premium" && 
            userPlan?.subscriptionExpiresAt && 
            userPlan.subscriptionExpiresAt > Date.now();
        
        const tripCredits = userPlan?.tripCredits ?? 0;
        const tripsGenerated = userPlan?.tripsGenerated ?? 0;
        
        // User has full access if:
        // 1. They have an active premium subscription, OR
        // 2. They have trip credits (paid for trips), OR
        // 3. They used their free trial (tripsGenerated >= 1 means they've generated at least one trip)
        const hasFullAccess = isSubscriptionActive || tripCredits > 0 || tripsGenerated >= 1;

        return {
            ...trip,
            userPlan: userPlan?.plan ?? "free",
            hasFullAccess,
            isSubscriptionActive,
            tripCredits,
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
        budget: v.optional(v.union(v.number(), v.string())),
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

        const localExperiencePrompt = trip.localExperience 
            ? `\nIMPORTANT - LOCAL EXPERIENCE MODE ENABLED:\nThe traveler wants an AUTHENTIC LOCAL experience, NOT a typical tourist trip. Please focus on:\n- Hidden gems and off-the-beaten-path locations that only locals know about\n- Local neighborhood restaurants, cafes, and street food spots (avoid tourist traps and chain restaurants)\n- Authentic cultural experiences and local traditions\n- Local markets, artisan shops, and family-owned businesses\n- Neighborhoods where locals actually live and hang out\n- Local festivals, events, or gatherings if happening during the trip dates\n- Public transportation tips that locals use\n- Lesser-known viewpoints and photo spots\n- Local etiquette and customs to follow\n- Authentic local cuisine and dishes to try (not tourist versions)\n- Small local tours run by residents rather than big tour companies\n- Places to interact with locals and learn about daily life\nAVOID: Major tourist attractions, tourist-heavy areas, international chain restaurants, and typical \"must-see\" lists.\n`
            : "";

        const prompt = `Plan a trip to ${trip.destination} from ${trip.origin} for ${trip.travelers} people.
        Budget: ${trip.budget}.
        Dates: ${new Date(trip.startDate).toDateString()} to ${new Date(trip.endDate).toDateString()}.
        Interests: ${trip.interests.join(", ")}.
        ${localExperiencePrompt}`;

        await ctx.scheduler.runAfter(0, internal.tripsActions.generate, { 
            tripId: args.tripId, 
            prompt,
            skipFlights: trip.skipFlights ?? false,
            preferredFlightTime: trip.preferredFlightTime ?? "any",
            localExperience: trip.localExperience ?? false,
        });
    },
});

export const deleteTrip = authMutation({
    args: { tripId: v.id("trips") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.tripId);
    },
});
