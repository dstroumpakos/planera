import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    trips: defineTable({
        userId: v.string(),
        destination: v.string(),
        origin: v.optional(v.string()), // Optional for backward compatibility with old trips
        startDate: v.float64(),
        endDate: v.float64(),
        budget: v.union(v.float64(), v.string()), // Accept both for backward compatibility
        travelers: v.float64(),
        interests: v.array(v.string()),
        skipFlights: v.optional(v.boolean()),
        skipHotel: v.optional(v.boolean()),
        preferredFlightTime: v.optional(v.string()), // "morning", "afternoon", "evening", "night", "any"
        status: v.string(),
        itinerary: v.optional(v.any()),
        isMultiCity: v.optional(v.boolean()), // Legacy field for backward compatibility
        destinations: v.optional(v.array(v.object({
            city: v.string(),
            country: v.string(),
            days: v.float64(),
            order: v.float64(),
        }))), // For multi-city trips
        optimizedRoute: v.optional(v.any()), // For multi-city trips with optimized routing
    }).index("by_user", ["userId"]),
    userPlans: defineTable({
        userId: v.string(),
        plan: v.union(v.literal("free"), v.literal("premium")),
        tripsGenerated: v.float64(),
        tripCredits: v.optional(v.float64()),
        subscriptionExpiresAt: v.optional(v.float64()),
        subscriptionType: v.optional(v.union(v.literal("monthly"), v.literal("yearly"))),
    }).index("by_user", ["userId"]),
    bookings: defineTable({
        userId: v.string(),
        tripId: v.id("trips"),
        type: v.string(),
        item: v.string(),
        url: v.string(),
        status: v.string(),
        clickedAt: v.float64(),
    }).index("by_user", ["userId"]),
    // Cart for storing selected trip items before checkout
    cart: defineTable({
        userId: v.string(),
        tripId: v.id("trips"),
        items: v.array(v.object({
            type: v.string(), // "flight", "hotel", "activity"
            name: v.string(),
            price: v.float64(),
            currency: v.string(),
            quantity: v.float64(),
            day: v.optional(v.float64()), // For activities - which day
            bookingUrl: v.optional(v.string()),
            productCode: v.optional(v.string()), // Viator product code
            skipTheLine: v.optional(v.boolean()),
            image: v.optional(v.string()),
            details: v.optional(v.any()), // Additional booking details
        })),
        totalAmount: v.float64(),
        currency: v.string(),
        status: v.union(v.literal("pending"), v.literal("checkout"), v.literal("completed")),
        createdAt: v.float64(),
        updatedAt: v.float64(),
    }).index("by_user", ["userId"]).index("by_trip", ["tripId"]),
    userSettings: defineTable({
        userId: v.string(),
        // Personal Info
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        dateOfBirth: v.optional(v.string()),
        // Travel Preferences
        homeAirport: v.optional(v.string()),
        defaultBudget: v.optional(v.float64()),
        defaultTravelers: v.optional(v.float64()),
        defaultInterests: v.optional(v.array(v.string())),
        defaultSkipFlights: v.optional(v.boolean()),
        defaultSkipHotel: v.optional(v.boolean()),
        defaultPreferredFlightTime: v.optional(v.string()),
        
        // Legacy fields (keeping for now)
        preferredAirlines: v.optional(v.array(v.string())),
        seatPreference: v.optional(v.string()),
        mealPreference: v.optional(v.string()),
        hotelStarRating: v.optional(v.float64()),
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
    insights: defineTable({
        userId: v.string(),
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
        likes: v.float64(),
        createdAt: v.float64(),
    }).index("by_destination", ["destination"]).index("by_user", ["userId"]),
});
