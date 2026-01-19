import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    trips: defineTable({
        userId: v.string(),
        destination: v.string(),
        origin: v.optional(v.string()),
        startDate: v.float64(),
        endDate: v.float64(),
        budget: v.union(v.float64(), v.string()),
        travelers: v.float64(),
        interests: v.array(v.string()),
        skipFlights: v.optional(v.boolean()),
        skipHotel: v.optional(v.boolean()),
        preferredFlightTime: v.optional(v.string()),
        status: v.union(
            v.literal("pending"),
            v.literal("generating"),
            v.literal("completed"),
            v.literal("failed"),
            v.literal("archived")
        ),
        // Image fields
        destinationImage: v.optional(v.object({
            url: v.string(),
            photographer: v.string(),
            attribution: v.string(),
        })),
        // Backward compatibility: keep raw itinerary
        itinerary: v.optional(v.any()),
        // New structured itinerary items (optional, for future use)
        itineraryItems: v.optional(v.array(v.object({
            day: v.float64(),
            type: v.union(
                v.literal("flight"),
                v.literal("hotel"),
                v.literal("activity"),
                v.literal("restaurant"),
                v.literal("transport")
            ),
            title: v.string(),
            description: v.optional(v.string()),
            startTime: v.optional(v.float64()),
            endTime: v.optional(v.float64()),
            location: v.optional(v.string()),
            price: v.optional(v.float64()),
            currency: v.optional(v.string()),
            bookingUrl: v.optional(v.string()),
            image: v.optional(v.object({
                url: v.string(),
                photographer: v.string(),
                attribution: v.string(),
            })),
            metadata: v.optional(v.any()),
        }))),
        isMultiCity: v.optional(v.boolean()),
        destinations: v.optional(v.array(v.object({
            city: v.string(),
            country: v.string(),
            days: v.float64(),
            order: v.float64(),
        }))),
        optimizedRoute: v.optional(v.any()),
        errorMessage: v.optional(v.string()),
    })
        .index("by_user", ["userId"])
        .index("by_status", ["status"]),

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
    })
        .index("by_user", ["userId"])
        .index("by_trip", ["tripId"]),

    userSettings: defineTable({
        userId: v.string(),
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        dateOfBirth: v.optional(v.string()),
        profilePicture: v.optional(v.id("_storage")),
        darkMode: v.optional(v.boolean()),
        homeAirport: v.optional(v.string()),
        defaultTravelers: v.optional(v.float64()),
        defaultInterests: v.optional(v.array(v.string())),
        defaultSkipFlights: v.optional(v.boolean()),
        defaultSkipHotel: v.optional(v.boolean()),
        defaultPreferredFlightTime: v.optional(v.string()),
        preferredAirlines: v.optional(v.array(v.string())),
        seatPreference: v.optional(v.string()),
        mealPreference: v.optional(v.string()),
        hotelStarRating: v.optional(v.float64()),
        budgetRange: v.optional(v.string()),
        travelStyle: v.optional(v.string()),
        language: v.optional(v.string()),
        currency: v.optional(v.string()),
        pushNotifications: v.optional(v.boolean()),
        emailNotifications: v.optional(v.boolean()),
        dealAlerts: v.optional(v.boolean()),
        tripReminders: v.optional(v.boolean()),
    }).index("by_user", ["userId"]),

    insights: defineTable({
        userId: v.string(),
        destination: v.optional(v.string()),
        destinationId: v.optional(v.string()),
        tripId: v.optional(v.id("trips")),
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
        moderationStatus: v.optional(v.union(
            v.literal("pending"),
            v.literal("approved"),
            v.literal("rejected"),
            v.literal("flagged")
        )),
        image: v.optional(v.object({
            url: v.string(),
            photographer: v.optional(v.string()),
            attribution: v.optional(v.string()),
        })),
        createdAt: v.float64(),
        updatedAt: v.optional(v.float64()),
    })
        .index("by_destination", ["destinationId"])
        .index("by_user", ["userId"])
        .index("by_moderation_status", ["moderationStatus"]),

    dismissedTrips: defineTable({
        userId: v.string(),
        tripId: v.id("trips"),
        dismissedAt: v.float64(),
    })
        .index("by_user", ["userId"])
        .index("by_user_and_trip", ["userId", "tripId"]),

    // New: Image cache table for storing Unsplash images
    imageCache: defineTable({
        query: v.string(),
        type: v.union(
            v.literal("destination"),
            v.literal("activity"),
            v.literal("restaurant"),
            v.literal("cuisine")
        ),
        url: v.string(),
        photographer: v.string(),
        attribution: v.string(),
        unsplashId: v.string(),
        cachedAt: v.float64(),
    })
        .index("by_query_and_type", ["query", "type"]),

    events: defineTable({
        userId: v.string(),
        eventType: v.union(
            v.literal("generate_trip"),
            v.literal("save_trip"),
            v.literal("click_booking"),
            v.literal("share_insight"),
            v.literal("view_trip"),
            v.literal("subscribe")
        ),
        tripId: v.optional(v.id("trips")),
        metadata: v.optional(v.object({
            destination: v.optional(v.string()),
            bookingType: v.optional(v.string()),
            bookingUrl: v.optional(v.string()),
            duration: v.optional(v.float64()),
            success: v.optional(v.boolean()),
            errorMessage: v.optional(v.string()),
        })),
        timestamp: v.float64(),
    })
        .index("by_user", ["userId"])
        .index("by_event_type", ["eventType"])
        .index("by_user_and_type", ["userId", "eventType"]),

    // Flight bookings table for storing completed Duffel orders
    flightBookings: defineTable({
        userId: v.string(),
        tripId: v.id("trips"),
        // Duffel order details
        duffelOrderId: v.string(),
        bookingReference: v.optional(v.string()),
        // Payment details
        paymentIntentId: v.optional(v.string()),
        totalAmount: v.float64(),
        currency: v.string(),
        // Flight details snapshot
        outboundFlight: v.object({
            airline: v.string(),
            flightNumber: v.string(),
            departure: v.string(),
            arrival: v.string(),
            departureDate: v.string(),
            origin: v.string(),
            destination: v.string(),
        }),
        returnFlight: v.optional(v.object({
            airline: v.string(),
            flightNumber: v.string(),
            departure: v.string(),
            arrival: v.string(),
            departureDate: v.string(),
            origin: v.string(),
            destination: v.string(),
        })),
        // Passengers
        passengers: v.array(v.object({
            givenName: v.string(),
            familyName: v.string(),
            email: v.string(),
        })),
        // Status
        status: v.union(
            v.literal("pending_payment"),
            v.literal("confirmed"),
            v.literal("cancelled"),
            v.literal("failed")
        ),
        // Timestamps
        createdAt: v.float64(),
        confirmedAt: v.optional(v.float64()),
    })
        .index("by_user", ["userId"])
        .index("by_trip", ["tripId"])
        .index("by_duffel_order", ["duffelOrderId"]),
});
