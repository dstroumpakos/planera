import { v } from "convex/values";
import { authMutation, authQuery } from "./functions";
import { internalMutation, internalQuery } from "./_generated/server";
import { api, internal } from "./_generated/api";

export const create = authMutation({
    args: {
        destination: v.string(),
        origin: v.string(),
        startDate: v.float64(),
        endDate: v.float64(),
        budget: v.union(v.float64(), v.string()), // Accept both for backward compatibility
        travelers: v.float64(),
        interests: v.array(v.string()),
        skipFlights: v.optional(v.boolean()),
        skipHotel: v.optional(v.boolean()),
        preferredFlightTime: v.optional(v.string()),
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
        });

        const flightInfo = args.skipFlights 
            ? "Note: User already has flights booked, so DO NOT include flight recommendations."
            : `Flying from: ${args.origin}. Preferred flight time: ${args.preferredFlightTime || "any"}`;

        const hotelInfo = args.skipHotel
            ? "Note: User already has accommodation booked, so DO NOT include hotel recommendations."
            : "";

        const prompt = `Plan a trip to ${args.destination} for ${args.travelers} people.
        ${flightInfo}
        ${hotelInfo}
        Budget: ${args.budget}.
        Dates: ${new Date(args.startDate).toDateString()} to ${new Date(args.endDate).toDateString()}.
        Interests: ${args.interests.join(", ")}.`;

        // Schedule the generation action from tripsActions.ts
        await ctx.scheduler.runAfter(0, internal.tripsActions.generate, { 
            tripId, 
            prompt, 
            skipFlights: args.skipFlights ?? false,
            skipHotel: args.skipHotel ?? false,
            preferredFlightTime: args.preferredFlightTime ?? "any",
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
            status: v.string(),
            itinerary: v.optional(v.any()),
            isMultiCity: v.optional(v.boolean()),
            optimizedRoute: v.optional(v.any()),
            destinations: v.optional(v.any()),
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

export const getTrendingDestinations = authQuery({
    args: {},
    returns: v.array(v.object({
        destination: v.string(),
        count: v.float64(),
        avgBudget: v.float64(),
        avgRating: v.float64(),
        interests: v.array(v.string()),
    })),
    handler: async (ctx) => {
        // Get completed trips only (using status index)
        const completedTrips = await ctx.db
            .query("trips")
            .withIndex("by_status", (q) => q.eq("status", "completed"))
            .collect();

        // Filter for trips from the last 30 days
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        const recentTrips = completedTrips.filter((trip) => 
            trip._creationTime >= thirtyDaysAgo
        );

        // If no recent trips, return empty array
        if (recentTrips.length === 0) {
            return [];
        }

        // Group by destination and aggregate data
        const destinationMap: Record<string, {
            count: number;
            budgets: number[];
            allInterests: string[];
            ratings: number[];
        }> = {};

        recentTrips.forEach((trip) => {
            if (!destinationMap[trip.destination]) {
                destinationMap[trip.destination] = {
                    count: 0,
                    budgets: [],
                    allInterests: [],
                    ratings: [],
                };
            }

            destinationMap[trip.destination].count += 1;
            
            // Parse budget if it's a string
            const budgetNum = typeof trip.budget === "string" 
                ? parseFloat(trip.budget) 
                : trip.budget;
            if (!isNaN(budgetNum)) {
                destinationMap[trip.destination].budgets.push(budgetNum);
            }

            // Collect interests
            destinationMap[trip.destination].allInterests.push(...trip.interests);
            
            // Add a default rating (you can enhance this later with actual ratings)
            destinationMap[trip.destination].ratings.push(4.5 + Math.random() * 0.5);
        });

        // Convert to array and sort by count
        const trending = Object.entries(destinationMap)
            .map(([destination, data]) => ({
                destination,
                count: data.count,
                avgBudget: data.budgets.length > 0 
                    ? data.budgets.reduce((a, b) => a + b, 0) / data.budgets.length 
                    : 0,
                avgRating: data.ratings.length > 0
                    ? data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length
                    : 4.5,
                interests: [...new Set(data.allInterests)].slice(0, 3), // Top 3 unique interests
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5); // Return top 5

        return trending;
    },
});
