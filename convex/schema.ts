import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    trips: defineTable({
        userId: v.string(),
        destination: v.string(),
        origin: v.optional(v.string()), // Added origin field
        startDate: v.number(),
        endDate: v.number(),
        budget: v.string(), // e.g. "low", "medium", "high" or specific amount
        travelers: v.number(),
        interests: v.array(v.string()),
        status: v.union(v.literal("generating"), v.literal("completed"), v.literal("failed")),
        itinerary: v.optional(v.any()), // Storing the complex JSON structure of the itinerary
    }).index("by_user", ["userId"]),
    userPlans: defineTable({
        userId: v.string(),
        plan: v.union(v.literal("free"), v.literal("premium")),
        tripsGenerated: v.number(),
    }).index("by_user", ["userId"]),
    bookings: defineTable({
        userId: v.string(),
        tripId: v.id("trips"),
        type: v.string(), // "flight", "hotel", "activity"
        item: v.string(), // Name of the item
        url: v.string(),
        status: v.string(), // "clicked", "booked"
        clickedAt: v.number(),
    }).index("by_user", ["userId"]),
});
