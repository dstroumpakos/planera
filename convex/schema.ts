import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    trips: defineTable({
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
        // Multi-city trip fields
        isMultiCity: v.optional(v.boolean()),
        destinations: v.optional(v.array(v.object({
            city: v.string(),
            country: v.string(),
            days: v.number(),
            order: v.number(),
        }))),
        optimizedRoute: v.optional(v.object({
            totalDistance: v.optional(v.number()),
            totalTravelTime: v.optional(v.string()),
            segments: v.optional(v.array(v.object({
                from: v.string(),
                to: v.string(),
                transportMethod: v.string(),
                duration: v.string(),
                distance: v.optional(v.string()),
                estimatedCost: v.optional(v.string()),
            }))),
        })),
        status: v.string(),
        itinerary: v.optional(v.any()),
    }).index("by_user", ["userId"]),
    userPlans: defineTable({
        userId: v.string(),
        plan: v.union(v.literal("free"), v.literal("premium")),
        tripsGenerated: v.number(),
        tripCredits: v.optional(v.number()),
        subscriptionExpiresAt: v.optional(v.number()),
        subscriptionType: v.optional(v.union(v.literal("monthly"), v.literal("yearly"))),
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
    // Cart for storing selected trip items before checkout
    cart: defineTable({
        userId: v.string(),
        tripId: v.id("trips"),
        items: v.array(v.object({
            type: v.string(), // "flight", "hotel", "activity"
            name: v.string(),
            price: v.number(),
            currency: v.string(),
            quantity: v.number(),
            day: v.optional(v.number()), // For activities - which day
            bookingUrl: v.optional(v.string()),
            productCode: v.optional(v.string()), // Viator product code
            skipTheLine: v.optional(v.boolean()),
            image: v.optional(v.string()),
            details: v.optional(v.any()), // Additional booking details
        })),
        totalAmount: v.number(),
        currency: v.string(),
        status: v.union(v.literal("pending"), v.literal("checkout"), v.literal("completed")),
        createdAt: v.number(),
        updatedAt: v.number(),
    }).index("by_user", ["userId"]).index("by_trip", ["tripId"]),
    userSettings: defineTable({
        userId: v.string(),
        // Personal Info
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        dateOfBirth: v.optional(v.string()),
        // Travel Preferences
        preferredAirlines: v.optional(v.array(v.string())),
        seatPreference: v.optional(v.string()),
        mealPreference: v.optional(v.string()),
        hotelStarRating: v.optional(v.number()),
        budgetRange: v.optional(v.string()),
        travelStyle: v.optional(v.string()),
        // App Settings
        language: v.optional(v.string()),
        currency: v.optional(v.string()),
        // Notifications
        pushNotifications: v.optional(v.boolean()),
        emailNotifications: v.optional(v.boolean()),
        dealAlerts: v.optional(v.boolean()),
        tripReminders: v.optional(v.boolean()),
    }).index("by_user", ["userId"]),
});
