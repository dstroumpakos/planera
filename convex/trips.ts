import { v } from "convex/values";
import { authMutation, authQuery, authAction } from "./functions";
import { api } from "./_generated/api";

export const create = authMutation({
    args: {
        destination: v.string(),
        startDate: v.number(),
        endDate: v.number(),
        budget: v.string(),
        travelers: v.number(),
        interests: v.array(v.string()),
    },
    handler: async (ctx, args) => {
        const tripId = await ctx.db.insert("trips", {
            userId: ctx.user._id,
            destination: args.destination,
            startDate: args.startDate,
            endDate: args.endDate,
            budget: args.budget,
            travelers: args.travelers,
            interests: args.interests,
            status: "generating",
        });

        // Schedule the generation action
        await ctx.scheduler.runAfter(0, api.trips.generate, { tripId });

        return tripId;
    },
});

export const generate = authAction({
    args: { tripId: v.id("trips") },
    handler: async (ctx, args) => {
        // Simulate AI generation delay
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Mock itinerary data
        const itinerary = {
            flights: [
                {
                    airline: "SkyHigh Air",
                    flightNumber: "SH123",
                    departure: "10:00 AM",
                    arrival: "2:00 PM",
                    price: 450,
                },
            ],
            hotels: [
                {
                    name: "Grand Plaza Hotel",
                    stars: 4,
                    address: "123 Main St, City Center",
                    pricePerNight: 150,
                },
            ],
            dailyPlan: [
                {
                    day: 1,
                    activities: [
                        { time: "09:00 AM", title: "Breakfast at Tiffany's", description: "Famous cafe." },
                        { time: "11:00 AM", title: "City Museum Tour", description: "Explore the history." },
                        { time: "02:00 PM", title: "Lunch at The Park", description: "Relaxing picnic." },
                    ],
                },
                {
                    day: 2,
                    activities: [
                        { time: "10:00 AM", title: "Beach Visit", description: "Sunny vibes." },
                        { time: "01:00 PM", title: "Seafood Lunch", description: "Fresh catch." },
                    ],
                },
            ],
        };

        await ctx.runMutation(api.trips.updateItinerary, {
            tripId: args.tripId,
            itinerary,
            status: "completed",
        });
    },
});

export const updateItinerary = authMutation({
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
        return await ctx.db.get(args.tripId);
    },
});

export const deleteTrip = authMutation({
    args: { tripId: v.id("trips") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.tripId);
    },
});
