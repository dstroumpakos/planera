import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get trips that need feedback (ended 1-3 days ago and no feedback yet)
export const getTripsNeedingFeedback = query({
  args: { userId: v.string() },
  returns: v.array(v.object({
    _id: v.id("trips"),
    destination: v.string(),
    endDate: v.float64(),
  })),
  handler: async (ctx, args) => {
    const now = Date.now();
    const oneDayAgo = now - (1 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);

    // Get user's trips
    const trips = await ctx.db
      .query("trips")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Filter trips that ended 1-7 days ago
    const recentlyEndedTrips = trips.filter(
      (trip) => trip.endDate <= oneDayAgo && trip.endDate >= sevenDaysAgo
    );

    // Check which trips don't have feedback yet
    const tripsNeedingFeedback: Array<{
      _id: typeof recentlyEndedTrips[0]["_id"];
      destination: string;
      endDate: number;
    }> = [];

    for (const trip of recentlyEndedTrips) {
      const existingFeedback = await ctx.db
        .query("tripFeedback")
        .withIndex("by_trip", (q) => q.eq("tripId", trip._id))
        .first();

      if (!existingFeedback) {
        tripsNeedingFeedback.push({
          _id: trip._id,
          destination: trip.destination,
          endDate: trip.endDate,
        });
      }
    }

    return tripsNeedingFeedback;
  },
});

// Submit feedback - user did NOT take the trip
export const submitDidNotTakeTrip = mutation({
  args: { tripId: v.id("trips") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const trip = await ctx.db.get(args.tripId);
    if (!trip) {
      throw new Error("Trip not found");
    }

    // Check if feedback already exists
    const existingFeedback = await ctx.db
      .query("tripFeedback")
      .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
      .first();

    if (existingFeedback) {
      return null; // Already submitted
    }

    // Store that user did not take the trip (no tip will be stored)
    await ctx.db.insert("tripFeedback", {
      tripId: args.tripId,
      completed: false,
      destination: trip.destination,
      submittedAt: Date.now(),
    });

    return null;
  },
});

// Submit feedback - user took the trip and optionally shares a tip
export const submitTripTip = mutation({
  args: {
    tripId: v.id("trips"),
    tip: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const trip = await ctx.db.get(args.tripId);
    if (!trip) {
      throw new Error("Trip not found");
    }

    // Check if feedback already exists
    const existingFeedback = await ctx.db
      .query("tripFeedback")
      .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
      .first();

    if (existingFeedback) {
      return null; // Already submitted
    }

    // Store feedback with optional tip (anonymous - no userId stored)
    await ctx.db.insert("tripFeedback", {
      tripId: args.tripId,
      completed: true,
      tip: args.tip || undefined,
      destination: trip.destination,
      submittedAt: Date.now(),
    });

    return null;
  },
});

// Get traveler tips for a destination (only from confirmed travelers)
export const getTipsForDestination = query({
  args: { destination: v.string() },
  returns: v.array(v.object({
    tip: v.string(),
    submittedAt: v.float64(),
  })),
  handler: async (ctx, args) => {
    // Normalize destination for matching (case-insensitive)
    const normalizedDestination = args.destination.toLowerCase().trim();

    // Get all feedback and filter for matching destinations with tips
    const allTripFeedback = await ctx.db.query("tripFeedback").collect();
    
    const matchingFeedback = allTripFeedback.filter(
      (f) =>
        f.completed &&
        f.tip &&
        f.destination.toLowerCase().trim().includes(normalizedDestination)
    );

    return matchingFeedback.map((f) => ({
      tip: f.tip as string,
      submittedAt: f.submittedAt,
    }));
  },
});

// Check if a specific trip has feedback
export const hasFeedback = query({
  args: { tripId: v.id("trips") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const feedback = await ctx.db
      .query("tripFeedback")
      .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
      .first();

    return feedback !== null;
  },
});
