import { v } from "convex/values";
import { authMutation, authQuery } from "./functions";
import { paginationOptsValidator } from "convex/server";

// Get user's completed trips (trips where endDate has passed)
export const getCompletedTrips = authQuery({
    args: {},
    returns: v.array(v.object({
        _id: v.id("trips"),
        destination: v.string(),
        startDate: v.float64(),
        endDate: v.float64(),
    })),
    handler: async (ctx, args) => {
        if (!ctx.user) {
            return [];
        }

        const userId = ctx.user._id;
        const now = Date.now();
        const trips = await ctx.db
            .query("trips")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        // Filter to only completed trips (endDate has passed)
        const completedTrips: Array<{
            _id: typeof trips[0]["_id"];
            destination: string;
            startDate: number;
            endDate: number;
        }> = [];

        for (const trip of trips) {
            if (trip.endDate < now && trip.status === "completed") {
                completedTrips.push({
                    _id: trip._id,
                    destination: trip.destination,
                    startDate: trip.startDate,
                    endDate: trip.endDate,
                });
            }
        }

        return completedTrips;
    },
});

// Check if user has a completed trip to a specific destination
export const hasCompletedTripTo = authQuery({
    args: {
        destination: v.string(),
    },
    returns: v.boolean(),
    handler: async (ctx, args) => {
        if (!ctx.user) {
            return false;
        }

        const userId = ctx.user._id;
        const now = Date.now();
        const trips = await ctx.db
            .query("trips")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        // Check if any completed trip matches the destination
        for (const trip of trips) {
            if (
                trip.endDate < now && 
                trip.status === "completed" &&
                trip.destination.toLowerCase().includes(args.destination.toLowerCase())
            ) {
                return true;
            }
        }

        return false;
    },
});

// Traveler insights functions
export const list = authQuery({
    args: {
        destination: v.optional(v.string()),
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        if (args.destination) {
            return await ctx.db
                .query("insights")
                .withIndex("by_destination", (q) => q.eq("destination", args.destination!))
                .order("desc")
                .paginate(args.paginationOpts);
        } else {
            return await ctx.db
                .query("insights")
                .order("desc")
                .paginate(args.paginationOpts);
        }
    },
});

export const create = authMutation({
    args: {
        destination: v.string(),
        content: v.string(),
        category: v.union(
            v.literal("food"),
            v.literal("transport"),
            v.literal("neighborhoods"),
            v.literal("timing"),
            v.literal("hidden_gem"),
            v.literal("avoid"),
            v.literal("other")
        ),
        verified: v.boolean(),
    },
    handler: async (ctx, args) => {
        if (!ctx.user) {
            throw new Error("Unauthorized");
        }

        const insightId = await ctx.db.insert("insights", {
            userId: ctx.user._id,
            destination: args.destination,
            content: args.content,
            category: args.category,
            verified: args.verified,
            likes: 0,
            createdAt: Date.now(),
        });

        return insightId;
    },
});

export const like = authMutation({
    args: {
        insightId: v.id("insights"),
    },
    handler: async (ctx, args) => {
        const insight = await ctx.db.get(args.insightId);
        if (!insight) {
            throw new Error("Insight not found");
        }

        await ctx.db.patch(args.insightId, {
            likes: insight.likes + 1,
        });
    },
});
