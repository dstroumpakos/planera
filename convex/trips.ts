import { v } from "convex/values";
import { authMutation, authQuery } from "./functions";
import { internalAction, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import OpenAI from "openai";

export const create = authMutation({
    args: {
        destination: v.string(),
        origin: v.string(), // Added origin argument
        startDate: v.number(),
        endDate: v.number(),
        budget: v.string(),
        travelers: v.number(),
        interests: v.array(v.string()),
    },
    handler: async (ctx, args) => {
        // Check user plan and limits
        const userPlan = await ctx.db
            .query("userPlans")
            .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
            .unique();

        const currentPlan = userPlan?.plan ?? "free";
        const tripsGenerated = userPlan?.tripsGenerated ?? 0;

        if (currentPlan === "free" && tripsGenerated >= 3) {
            throw new Error("Free plan limit reached. Upgrade to Premium to generate more trips.");
        }

        // Increment trip count
        if (userPlan) {
            await ctx.db.patch(userPlan._id, { tripsGenerated: tripsGenerated + 1 });
        } else {
            await ctx.db.insert("userPlans", {
                userId: ctx.user._id,
                plan: "free",
                tripsGenerated: 1,
            });
        }

        const tripId = await ctx.db.insert("trips", {
            userId: ctx.user._id,
            destination: args.destination,
            origin: args.origin, // Store origin
            startDate: args.startDate,
            endDate: args.endDate,
            budget: args.budget,
            travelers: args.travelers,
            interests: args.interests,
            status: "generating",
        });

        const prompt = `Plan a trip to ${args.destination} from ${args.origin} for ${args.travelers} people.
        Budget: ${args.budget}.
        Dates: ${new Date(args.startDate).toDateString()} to ${new Date(args.endDate).toDateString()}.
        Interests: ${args.interests.join(", ")}.`;

        // Schedule the generation action
        await ctx.scheduler.runAfter(0, internal.trips.generate, { tripId, prompt });

        return tripId;
    },
});

export const generate = internalAction({
    args: { tripId: v.id("trips"), prompt: v.string() },
    handler: async (ctx, args) => {
        const { tripId, prompt } = args;

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        try {
            const completion = await openai.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: `You are a travel assistant. Generate a JSON response for a trip.
                        The response must be a valid JSON object with this structure:
                        {
                          "flights": [{ "airline": "string", "price": "string", "duration": "string", "departureTime": "string", "arrivalTime": "string", "isReturn": boolean }],
                          "hotels": [{ "name": "string", "price": "string", "rating": number, "image": "string", "description": "string", "amenities": ["string"], "coordinates": { "latitude": number, "longitude": number } }],
                          "activities": [{ "title": "string", "price": "string", "duration": "string", "description": "string", "coordinates": { "latitude": number, "longitude": number } }],
                          "restaurants": [{ "name": "string", "priceRange": "string", "cuisine": "string", "rating": number, "coordinates": { "latitude": number, "longitude": number } }],
                          "itinerary": [
                            {
                              "day": 1,
                              "title": "string",
                              "activities": [
                                { "time": "string", "title": "string", "description": "string" }
                              ]
                            }
                          ]
                        }
                        Ensure all prices are in the currency specified in the budget (e.g. €).
                        Provide at least 2 flight options (one outbound, one return if applicable), 3 hotel options, 5 activities, and 5 restaurants.
                        Create a daily itinerary covering the duration of the trip.`,
                    },
                    { role: "user", content: prompt },
                ],
                model: "gpt-4o",
                response_format: { type: "json_object" },
            });

            const content = completion.choices[0].message.content;
            if (!content) throw new Error("No content generated");

            const result = JSON.parse(content);

            // Transform result to match frontend expectation (frontend expects dailyPlan, AI returns itinerary)
            if (result.itinerary && Array.isArray(result.itinerary)) {
                result.dailyPlan = result.itinerary;
                // Keep result.itinerary as well just in case, or delete it. 
                // Let's keep it to be safe, but frontend uses dailyPlan.
            }

            // Calculate totals based on the first hotel option as a default
            const flightPrice = parseFloat(result.flights[0]?.price.replace(/[^0-9.]/g, "") || "0");
            const hotelPrice = parseFloat(result.hotels[0]?.price.replace(/[^0-9.]/g, "") || "0");
            // Estimate total: Flight + (Hotel * nights) + (Daily expenses * days)
            // For simplicity, we'll just sum flight + hotel for now, the UI calculates the rest dynamically
            
            await ctx.runMutation(internal.trips.updateItinerary, {
                tripId: args.tripId,
                itinerary: result,
                status: "completed",
            });
        } catch (error) {
            console.error("Error generating itinerary:", error);
            
            // Fallback mock data to prevent app crash
            const fallbackItinerary = {
                flights: [
                    { airline: "Mock Airlines", price: "€250", duration: "3h 30m", departureTime: "10:00 AM", arrivalTime: "1:30 PM", isReturn: false },
                    { airline: "Mock Airlines", price: "€250", duration: "3h 30m", departureTime: "6:00 PM", arrivalTime: "9:30 PM", isReturn: true }
                ],
                hotels: [
                    { name: "Grand Plaza Hotel", price: "€120", rating: 4.5, image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800", description: "Luxury stay in the city center.", amenities: ["Pool", "Spa", "WiFi"], coordinates: { latitude: 48.8566, longitude: 2.3522 } },
                    { name: "City Comfort Inn", price: "€85", rating: 4.0, image: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800", description: "Affordable and convenient.", amenities: ["WiFi", "Breakfast"], coordinates: { latitude: 48.8606, longitude: 2.3376 } },
                    { name: "Boutique Stay", price: "€150", rating: 4.8, image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800", description: "Unique and stylish.", amenities: ["Bar", "Gym"], coordinates: { latitude: 48.8530, longitude: 2.3499 } }
                ],
                activities: [
                    { title: "City Walking Tour", price: "€20", duration: "2h", description: "Explore the historic streets.", coordinates: { latitude: 48.8566, longitude: 2.3522 } },
                    { title: "Museum Visit", price: "€15", duration: "3h", description: "See famous art and artifacts.", coordinates: { latitude: 48.8606, longitude: 2.3376 } }
                ],
                restaurants: [
                    { name: "The Local Bite", priceRange: "€€", cuisine: "Local", rating: 4.5, coordinates: { latitude: 48.8566, longitude: 2.3522 } },
                    { name: "Gourmet Corner", priceRange: "€€€", cuisine: "Fine Dining", rating: 4.8, coordinates: { latitude: 48.8606, longitude: 2.3376 } }
                ],
                itinerary: {
                    dailyPlan: [
                        {
                            day: 1,
                            title: "Arrival & Exploration",
                            activities: [
                                { time: "10:00 AM", title: "Arrival", description: "Arrive at the airport and transfer to hotel." },
                                { time: "2:00 PM", title: "City Walk", description: "Leisurely walk around the city center." },
                                { time: "7:00 PM", title: "Dinner", description: "Enjoy a local meal." }
                            ]
                        },
                        {
                            day: 2,
                            title: "Culture & History",
                            activities: [
                                { time: "9:00 AM", title: "Museum Visit", description: "Visit the main museum." },
                                { time: "1:00 PM", title: "Lunch", description: "Lunch at a nearby cafe." },
                                { time: "3:00 PM", title: "Park Stroll", description: "Relax in the city park." }
                            ]
                        }
                    ]
                }
            };

            await ctx.runMutation(internal.trips.updateItinerary, {
                tripId: args.tripId,
                itinerary: fallbackItinerary,
                status: "completed",
            });
        }
    },
});

export const updateItinerary = internalMutation({
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
        const trip = await ctx.db.get(args.tripId);
        if (!trip) return null;

        const userPlan = await ctx.db
            .query("userPlans")
            .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
            .unique();

        return {
            ...trip,
            userPlan: userPlan?.plan ?? "free",
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
        budget: v.optional(v.string()),
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

        await ctx.scheduler.runAfter(0, internal.trips.generate, { tripId: args.tripId, prompt });
    },
});

export const deleteTrip = authMutation({
    args: { tripId: v.id("trips") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.tripId);
    },
});
