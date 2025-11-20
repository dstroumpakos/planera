import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    trips: defineTable({
        userId: v.string(),
        destination: v.string(),
        startDate: v.number(),
        endDate: v.number(),
        budget: v.string(), // e.g. "low", "medium", "high" or specific amount
        travelers: v.number(),
        interests: v.array(v.string()),
        status: v.union(v.literal("generating"), v.literal("completed"), v.literal("failed")),
        itinerary: v.optional(v.any()), // Storing the complex JSON structure of the itinerary
    }).index("by_user", ["userId"]),
});
