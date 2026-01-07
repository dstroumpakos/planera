"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import OpenAI from "openai";
import { generateStyleSpecificPrompt } from "./helpers/travelStyles";
import { fetchRestaurantsFromTripAdvisor, Restaurant } from "./helpers/tripadvisor";

export const generate = internalAction({
    args: { 
        tripId: v.id("trips"), 
        prompt: v.string(), 
        skipFlights: v.optional(v.boolean()),
        skipHotel: v.optional(v.boolean()),
        preferredFlightTime: v.optional(v.string()),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const { tripId, skipFlights, skipHotel, preferredFlightTime } = args;

        console.log("=".repeat(80));
        console.log("🚀 TRIP GENERATION STARTED");
        console.log("=".repeat(80));
        console.log("Trip ID:", tripId);
        console.log("Prompt:", args.prompt);
        console.log("Skip Flights:", skipFlights ? "Yes" : "No");
        console.log("Skip Hotel:", skipHotel ? "Yes" : "No");
        console.log("Preferred Flight Time:", preferredFlightTime || "any");

        // Get trip details
        const trip = await ctx.runQuery(internal.trips.getTripDetails, { tripId });

        if (!trip) {
            console.error("❌ Trip not found!");
            throw new Error("Trip not found");
        }
        
        console.log("📋 Trip details:", JSON.stringify(trip, null, 2));

        // Default origin if not set (for backward compatibility with old trips)
        const origin = trip.origin || "London";

        console.log("✅ Trip details loaded:");
        console.log("  - Destination:", trip.destination);
        console.log("  - Origin:", origin);
        console.log("  - Start Date:", new Date(trip.startDate).toISOString());
        console.log("  - End Date:", new Date(trip.endDate).toISOString());
        console.log("  - Travelers:", trip.travelers);
        console.log("  - Budget:", trip.budget);
        console.log("  - Interests:", trip.interests);

        
        if (!skipFlights && !origin) {
            console.error("❌ Trip origin is missing!");
            await ctx.runMutation(internal.trips.updateItinerary, {
                tripId,
                itinerary: null,
                status: "failed",
            });
            throw new Error("Trip origin is required");
        }

        console.log("\n" + "=".repeat(80));
        console.log("🔑 CHECKING API KEYS");
        console.log("=".repeat(80));

        // Check if API keys are configured
        const hasAmadeusKeys = !!(process.env.AMADEUS_API_KEY && process.env.AMADEUS_API_SECRET);
        const hasOpenAIKey = !!process.env.OPENAI_API_KEY;

        console.log("  - Amadeus API:", hasAmadeusKeys ? "✅ Configured" : "❌ Missing");
        console.log("  - OpenAI API:", hasOpenAIKey ? "✅ Configured" : "❌ Missing");

        if (!hasAmadeusKeys) {
            console.warn("⚠️ Amadeus API keys not configured. Using AI-generated data.");
        }
        if (!hasOpenAIKey) {
            console.warn("⚠️ OpenAI API key not configured. Using basic itinerary.");
        }

        console.log("\n" + "=".repeat(80));
        console.log("🎬 STARTING DATA COLLECTION");
        console.log("=".repeat(80));

        try {
            let flights: any = [];
            let hotels = null;
            let activities: any[] = [];
            let restaurants: Restaurant[] = [];
            let transportation = null;
            let dayByDayItinerary: any[] = [];

            // 1. Fetch flights (with fallback) - SKIP if user already has flights
            if (skipFlights) {
                console.log("✈️ Skipping flight search - user already has flights booked");
                flights = {
                    skipped: true,
                    message: "You indicated you already have flights booked",
                    dataSource: "user-provided",
                };
            } else {
                console.log("✈️ Fetching flights...");
                console.log("  - Preferred time:", preferredFlightTime || "any");
                if (hasAmadeusKeys) {
                    try {
                        flights = await fetchFlights(origin, trip.destination, trip.startDate, trip.travelers, preferredFlightTime);
                        console.log("✅ Flights fetched successfully");
                    } catch (error) {
                        console.warn("⚠️ Amadeus flight fetch failed, using AI-generated data:", error);
                        flights = await generateAIFlights(trip, origin, preferredFlightTime);
                    }
                } else {
                    flights = await generateAIFlights(trip, origin, preferredFlightTime);
                }
            }

            // 2. Fetch hotels (with fallback)
            if (skipHotel) {
                console.log("🏨 Skipping hotel search - user already has accommodation booked");
                hotels = {
                    skipped: true,
                    message: "You indicated you already have accommodation booked",
                    dataSource: "user-provided",
                };
            } else {
                console.log("🏨 Fetching hotels...");
                if (hasAmadeusKeys) {
                    try {
                        hotels = await fetchHotels(trip.destination, trip.startDate, trip.endDate, trip.travelers);
                        console.log("✅ Hotels fetched successfully");
                    } catch (error) {
                        console.warn("⚠️ Amadeus hotel fetch failed, using AI-generated data:", error);
                        hotels = await generateAIHotels(trip);
                    }
                } else {
                    hotels = await generateAIHotels(trip);
                }
            }

            // 3. Fetch activities
            console.log("🎭 Fetching activities...");
            try {
                activities = await fetchActivities(trip.destination, trip.interests);
                console.log(`✅ Fetched ${activities?.length || 0} activities`);
            } catch (error) {
                console.warn("⚠️ Activity fetch failed:", error);
                activities = [];
            }

            // 4. Fetch restaurants
            console.log("🍽️ Fetching restaurants...");
            try {
                restaurants = await fetchRestaurantsFromTripAdvisor(trip.destination);
                console.log(`✅ Fetched ${restaurants?.length || 0} restaurants`);
            } catch (error) {
                console.warn("⚠️ Restaurant fetch failed:", error);
                restaurants = [];
            }

            // 5. Generate transportation info
            console.log("🚗 Generating transportation info...");
            transportation = generateTransportationInfo(trip.destination);

            // 6. Generate day-by-day itinerary using OpenAI
            console.log("📅 Generating day-by-day itinerary...");
            if (hasOpenAIKey) {
                try {
                    const openai = new OpenAI({
                        apiKey: process.env.OPENAI_API_KEY,
                    });

                    const stylePrompt = generateStyleSpecificPrompt(trip.interests);

                    const itineraryPrompt = `You are a travel itinerary planner. Create a detailed day-by-day itinerary for a trip to ${trip.destination}.

Trip Details:
- Destination: ${trip.destination}
- Origin: ${origin}
- Duration: ${Math.ceil((trip.endDate - trip.startDate) / (1000 * 60 * 60 * 24))} days
- Travelers: ${trip.travelers} people
- Budget: €${trip.budget}
- Interests: ${trip.interests.join(", ")}

${stylePrompt}

Available Activities:
${activities?.slice(0, 20).map((a: any) => `- ${a.name} (${a.category}): €${a.price}`).join("\n") || "No specific activities available"}

Available Restaurants:
${restaurants?.slice(0, 15).map((r: any) => `- ${r.name} (${r.cuisine}): €${r.priceRange}`).join("\n") || "No specific restaurants available"}

Transportation:
${transportation}

Requirements:
- Create a realistic, day-by-day itinerary
- Include specific times for each activity (e.g., 09:00 AM, 12:30 PM)
- Mix different types of activities (museums, restaurants, outdoor activities, shopping, etc.)
- Ensure activities match the traveler's interests: ${trip.interests.join(", ")}
- Include realistic entry prices in EUR
- Whether "Skip the Line" tickets are available (for museums, attractions)
- Skip the Line price (usually 5-15€ more than regular)
- A booking URL (use real booking platforms like GetYourGuide, Viator, or official sites)

Include specific activities, restaurants, and attractions for each day. Format as JSON with structure:
{
  "dailyPlan": [
    {
      "day": 1,
      "date": "2024-01-15",
      "title": "Day 1 in ${trip.destination}",
      "activities": [
        {
          "time": "09:00 AM",
          "title": "Activity name",
          "description": "Brief description",
          "type": "attraction|museum|restaurant|tour|free",
          "price": 25,
          "currency": "EUR",
          "skipTheLine": true,
          "skipTheLinePrice": 35,
          "duration": "2-3 hours",
          "bookingUrl": "https://www.getyourguide.com/...",
          "tips": "Best to visit early morning"
        }
      ]
    }
  ]
}

Make sure prices are realistic for ${trip.destination}. Museums typically cost €10-25, skip-the-line adds €5-15. Tours cost €20-80. Restaurants show average meal cost per person.`;
                    const completion = await openai.chat.completions.create({
                        messages: [
                            { role: "system", content: "You are a travel itinerary planner. Return only valid JSON. Always include realistic prices and booking information for activities." },
                            { role: "user", content: itineraryPrompt },
                        ],
                        model: "gpt-4o",
                        response_format: { type: "json_object" },
                    });

                    const itineraryContent = completion.choices[0].message.content;
                    if (itineraryContent) {
                        const itineraryData = JSON.parse(itineraryContent);
                        dayByDayItinerary = itineraryData.dailyPlan || [];
                        console.log(`✅ OpenAI generated ${dayByDayItinerary.length} days of itinerary`);
                        
                        // Merge restaurant data into itinerary
                        dayByDayItinerary = mergeRestaurantDataIntoItinerary(dayByDayItinerary, restaurants);
                    } else {
                        console.warn("⚠️ OpenAI returned empty content, using fallback");
                        dayByDayItinerary = generateBasicItinerary(trip, activities, restaurants);
                    }
                } catch (error) {
                    console.warn("⚠️ OpenAI generation failed, using fallback:", error);
                    dayByDayItinerary = generateBasicItinerary(trip, activities, restaurants);
                }
            } else {
                console.warn("⚠️ OpenAI not configured, using basic itinerary");
                dayByDayItinerary = generateBasicItinerary(trip, activities, restaurants);
            }

            const result = {
                flights,
                hotels,
                activities,
                restaurants,
                transportation,
                dayByDayItinerary,
                estimatedDailyExpenses: calculateDailyExpenses(Number(trip.budget)),
            };

            console.log("✅ Trip generation complete!");

            await ctx.runMutation(internal.trips.updateItinerary, {
                tripId,
                itinerary: result,
                status: "completed",
            });
        } catch (error: any) {
            console.error("❌ Error generating itinerary:", error);
            console.error("Error details:", {
                message: error.message,
                stack: error.stack,
            });
            
            await ctx.runMutation(internal.trips.updateItinerary, {
                tripId,
                itinerary: null,
                status: "failed",
            });
            
            throw new Error(`Failed to generate trip: ${error.message || "Unknown error"}`);
        }
    },
});

// Merge restaurant data into itinerary activities
function mergeRestaurantDataIntoItinerary(dayByDayItinerary: any[], restaurants: any[]): any[] {
    if (!restaurants || restaurants.length === 0) {
        return dayByDayItinerary;
    }
    
    console.log(`🔄 Merging restaurant data for ${restaurants.length} restaurants into itinerary`);
    
    // Create a map of restaurant names (lowercase) to their data
    const restaurantMap = new Map<string, any>();
    for (const restaurant of restaurants) {
        if (restaurant.name) {
            restaurantMap.set(restaurant.name.toLowerCase(), restaurant);
        }
    }
    
    let mergedCount = 0;
    
    // Go through each day and each activity
    for (const day of dayByDayItinerary) {
        if (!day.activities) continue;
        
        for (let i = 0; i < day.activities.length; i++) {
            const activity = day.activities[i];
            
            // Check if this is a restaurant activity
            if (activity.type === "restaurant" || activity.type === "meal" || 
                activity.title?.toLowerCase().includes("lunch") || 
                activity.title?.toLowerCase().includes("dinner") ||
                activity.title?.toLowerCase().includes("breakfast") ||
                activity.title?.toLowerCase().includes("restaurant")) {
                
                // Try to find a matching restaurant
                const activityNameLower = activity.title?.toLowerCase() || "";
                
                // First try exact match
                let matchedRestaurant = restaurantMap.get(activityNameLower);
                
                // If no exact match, try partial match
                if (!matchedRestaurant) {
                    for (const [name, restaurant] of restaurantMap) {
                        if (activityNameLower.includes(name) || name.includes(activityNameLower)) {
                            matchedRestaurant = restaurant;
                            break;
                        }
                    }
                }
                
                // If still no match, assign a restaurant based on meal type
                if (!matchedRestaurant && restaurants.length > 0) {
                    const dayIndex = day.day - 1;
                    const isLunch = activityNameLower.includes("lunch");
                    const isDinner = activityNameLower.includes("dinner");
                    
                    // Distribute restaurants across days
                    const restaurantIndex = (dayIndex + (isLunch ? 0 : isDinner ? 1 : 2)) % restaurants.length;
                    matchedRestaurant = restaurants[restaurantIndex];
                }
                
                // Merge restaurant data into activity
                if (matchedRestaurant) {
                    day.activities[i] = {
                        ...activity,
                        title: matchedRestaurant.name || activity.title,
                        description: matchedRestaurant.description || activity.description,
                        price: matchedRestaurant.priceRange || activity.price,
                        bookingUrl: matchedRestaurant.url || activity.bookingUrl,
                        rating: matchedRestaurant.rating,
                        cuisine: matchedRestaurant.cuisine,
                    };
                    mergedCount++;
                }
            }
        }
    }
    
    console.log(`✅ Merged ${mergedCount} restaurant activities`);
    return dayByDayItinerary;
}

// Helper functions for fetching data
async function fetchFlights(origin: string, destination: string, startDate: number, travelers: number, preferredTime?: string): Promise<any> {
    // Placeholder for Amadeus flight API
    console.log(`Fetching flights from ${origin} to ${destination}`);
    return null;
}

async function fetchHotels(destination: string, startDate: number, endDate: number, travelers: number): Promise<any> {
    // Placeholder for Amadeus hotel API
    console.log(`Fetching hotels in ${destination}`);
    return null;
}

async function fetchActivities(destination: string, interests: string[]): Promise<any[]> {
    // Placeholder for Viator/GetYourGuide API
    console.log(`Fetching activities in ${destination} for interests: ${interests.join(", ")}`);
    return [];
}

async function fetchRestaurants(destination: string): Promise<any[]> {
    // Placeholder for TripAdvisor API
    console.log(`Fetching restaurants in ${destination}`);
    return [];
}

function generateTransportationInfo(destination: string): string {
    return `Public transportation in ${destination} includes buses, trams, and metro systems. Consider getting a city pass for unlimited travel.`;
}

function generateAIFlights(trip: any, origin: string, preferredTime?: string): any {
    return {
        dataSource: "ai-generated",
        message: "Flight options generated by AI",
        options: [
            {
                airline: "Sample Airline",
                departure: new Date(trip.startDate).toISOString(),
                arrival: new Date(trip.startDate + 3600000).toISOString(),
                price: Math.floor(Math.random() * 500) + 200,
                duration: "2-4 hours",
            }
        ]
    };
}

function generateAIHotels(trip: any): any {
    return {
        dataSource: "ai-generated",
        message: "Hotel options generated by AI",
        options: [
            {
                name: "Sample Hotel",
                rating: 4.5,
                price: Math.floor(Math.random() * 200) + 80,
                description: "A comfortable hotel in the city center",
            }
        ]
    };
}

function generateBasicItinerary(trip: any, activities: any[], restaurants: any[]): any[] {
    const days = Math.ceil((trip.endDate - trip.startDate) / (1000 * 60 * 60 * 24));
    const itinerary = [];

    for (let day = 1; day <= days; day++) {
        const date = new Date(trip.startDate + (day - 1) * 24 * 60 * 60 * 1000);
        itinerary.push({
            day,
            date: date.toISOString().split("T")[0],
            title: `Day ${day} in ${trip.destination}`,
            activities: [
                {
                    time: "09:00 AM",
                    title: "Breakfast",
                    description: "Start your day with a local breakfast",
                    type: "restaurant",
                    price: 15,
                    currency: "EUR",
                },
                {
                    time: "11:00 AM",
                    title: "Explore the city",
                    description: "Discover local attractions and landmarks",
                    type: "tour",
                    price: 30,
                    currency: "EUR",
                },
                {
                    time: "01:00 PM",
                    title: "Lunch",
                    description: "Enjoy local cuisine",
                    type: "restaurant",
                    price: 20,
                    currency: "EUR",
                },
                {
                    time: "03:00 PM",
                    title: "Visit a museum or attraction",
                    description: "Learn about local culture and history",
                    type: "museum",
                    price: 15,
                    currency: "EUR",
                },
                {
                    time: "07:00 PM",
                    title: "Dinner",
                    description: "Experience local dining",
                    type: "restaurant",
                    price: 25,
                    currency: "EUR",
                },
            ]
        });
    }

    return itinerary;
}

function calculateDailyExpenses(budget: number): number {
    return Math.floor(budget / 7); // Rough estimate
}
