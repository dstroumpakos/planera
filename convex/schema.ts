import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    trips: defineTable({
        userId: v.string(),
        destination: v.string(),
        origin: v.optional(v.string()),
        startDate: v.number(),
        endDate: v.number(),
        budget: v.union(v.string(), v.number()),
        travelers: v.number(),
        interests: v.array(v.string()),
        status: v.union(v.literal("generating"), v.literal("completed"), v.literal("failed")),
        itinerary: v.optional(v.any()),
    }).index("by_user", ["userId"]),
    userPlans: defineTable({
        userId: v.string(),
        plan: v.union(v.literal("free"), v.literal("premium")),
        tripsGenerated: v.number(),
        tripCredits: v.optional(v.number()), // Purchased trip credits
        subscriptionExpiresAt: v.optional(v.number()), // Premium subscription expiry
    }).index("by_user", ["userId"]),
    bookings: defineTable({
        userId: v.string(),
        tripId: v.id("trips"),
        type: v.string(),
        item: v.string(),
        url: v.string(),
        status: v.string(),
        clickedAt: v.number(),
    }).index("by_user", ["userId"]),
    userSettings: defineTable({
        userId: v.string(),
        // Personal Info
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        dateOfBirth: v.optional(v.string()),
        // Travel Preferences
        preferredAirlines: v.optional(v.array(v.string())),
        seatPreference: v.optional(v.string()), // "window", "aisle", "middle"
        mealPreference: v.optional(v.string()), // "vegetarian", "vegan", "halal", "kosher", "none"
        hotelStarRating: v.optional(v.number()), // 3, 4, 5
        budgetRange: v.optional(v.string()), // "budget", "mid-range", "luxury"
        travelStyle: v.optional(v.string()), // "adventure", "relaxation", "culture", "family"
        // App Settings
        language: v.optional(v.string()), // "en", "es", "fr", "de", etc.
        currency: v.optional(v.string()), // "USD", "EUR", "GBP", etc.
        // Notifications
        pushNotifications: v.optional(v.boolean()),
        emailNotifications: v.optional(v.boolean()),
        dealAlerts: v.optional(v.boolean()),
        tripReminders: v.optional(v.boolean()),
    }).index("by_user", ["userId"]),
});
