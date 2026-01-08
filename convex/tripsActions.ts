"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import OpenAI from "openai";

// Helper function to generate travel style guidance for OpenAI prompt
function generateTravelStyleGuidance(interests: string[]): string {
    if (!interests || interests.length === 0) {
        return "Create a balanced itinerary with a mix of attractions, dining, and cultural experiences.";
    }

    const styleGuidance: Record<string, string> = {
        "Shopping": "Prioritize shopping experiences throughout the itinerary. Include major shopping districts, malls, boutique areas, and local markets. For each day, suggest at least one shopping activity or visit. Recommend best shopping neighborhoods, flagship stores, and unique local shops. Include shopping tips like best times to visit and local shopping customs.",
        "Nightlife": "Emphasize evening and nighttime activities. Include rooftop bars, nightclubs, live music venues, late-night dining, and evening entertainment. For each day, suggest evening activities and nightlife spots. Recommend the best neighborhoods for nightlife, popular venues, and what to expect. Include tips on dress codes and reservation requirements.",
        "Food": "Make food the centerpiece of the itinerary. Include diverse dining experiences from street food to fine dining. For each day, suggest multiple food-related activities: breakfast spots, lunch venues, dinner restaurants, and food tours. Highlight local specialties, food markets, and culinary experiences. Include food tours, cooking classes, and market visits.",
        "Culture": "Emphasize cultural and historical experiences. Prioritize museums, historical landmarks, galleries, cultural sites, and heritage attractions. For each day, include at least one major cultural attraction. Recommend UNESCO sites, local history museums, art galleries, and cultural events. Include information about local history and cultural significance.",
        "Nature": "Prioritize outdoor and natural experiences. Include parks, gardens, hiking trails, viewpoints, and outdoor activities. For each day, suggest outdoor experiences and nature-based activities. Recommend scenic viewpoints, nature walks, outdoor adventures, and the best times for outdoor activities. Include information about weather and what to bring.",
    };

    const guidance = interests
        .map(interest => styleGuidance[interest])
        .filter(Boolean)
        .join(" ");

    if (interests.length > 1) {
        return `Blend these travel styles naturally throughout the itinerary: ${guidance} Ensure recommendations reflect all selected interests while maintaining a cohesive daily flow. Distribute activities across the day to balance all interests.`;
    }

    return guidance;
}

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
            let flights = null;
            let hotels;
            let activities;
            let restaurants;

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
                        const amadeusToken = await getAmadeusToken();
                        flights = await searchFlights(
                            amadeusToken,
                            origin,
                            trip.destination,
                            new Date(trip.startDate).toISOString().split('T')[0],
                            new Date(trip.endDate).toISOString().split('T')[0],
                            trip.travelers,
                            preferredFlightTime || "any"
                        );
                    } catch (error) {
                        console.error("❌ Amadeus flights failed:", error);
                        flights = await generateRealisticFlights(
                            origin,
                            extractIATACode(origin),
                            trip.destination,
                            extractIATACode(trip.destination),
                            new Date(trip.startDate).toISOString().split('T')[0],
                            new Date(trip.endDate).toISOString().split('T')[0],
                            trip.travelers,
                            preferredFlightTime || "any"
                        );
                    }
                } else {
                    flights = await generateRealisticFlights(
                        origin,
                        extractIATACode(origin),
                        trip.destination,
                        extractIATACode(trip.destination),
                        new Date(trip.startDate).toISOString().split('T')[0],
                        new Date(trip.endDate).toISOString().split('T')[0],
                        trip.travelers,
                        preferredFlightTime || "any"
                    );
                }
                console.log("✅ Flights ready:", flights.dataSource);
            }

            // 2. Fetch hotels (with fallback)
            console.log("🏨 Fetching hotels...");
            if (skipHotel) {
                console.log("✈️ Skipping hotel search - user already has accommodation booked");
                hotels = {
                    skipped: true,
                    message: "You indicated you already have accommodation booked",
                    dataSource: "user-provided",
                };
            } else if (hasAmadeusKeys) {
                try {
                    const amadeusToken = await getAmadeusToken();
                    hotels = await searchHotels(
                        amadeusToken,
                        extractIATACode(trip.destination),
                        new Date(trip.startDate).toISOString().split('T')[0],
                        new Date(trip.endDate).toISOString().split('T')[0],
                        trip.travelers
                    );
                    if (hotels.length === 0) {
                        console.warn("⚠️ No hotels from Amadeus, using fallback");
                        hotels = getFallbackHotels(trip.destination);
                    }
                } catch (error) {
                    console.error("❌ Amadeus hotels failed:", error);
                    hotels = getFallbackHotels(trip.destination);
                }
            } else {
                hotels = getFallbackHotels(trip.destination);
            }
            console.log(`✅ Hotels ready: ${typeof hotels === 'object' && 'skipped' in hotels ? "Skipped" : (Array.isArray(hotels) ? hotels.length + " options" : "Unknown")}`);

            // 3. Fetch activities (with fallback)
            console.log("🎯 Fetching activities...");
            activities = await searchActivities(trip.destination);
            console.log(`✅ Activities ready: ${activities.length} options`);

            // 4. Fetch restaurants (with fallback)
            console.log("🍽️ Fetching restaurants...");
            restaurants = await searchRestaurants(trip.destination);
            console.log(`✅ Restaurants ready: ${restaurants.length} options`);

            // 5. Generate transportation options
            console.log("🚗 Generating transportation options...");
            const transportation = generateTransportationOptions(trip.destination, origin, trip.travelers);
            console.log(`✅ Transportation ready: ${transportation.length} options`);

            // 6. Generate day-by-day itinerary with OpenAI
            console.log("📝 Generating itinerary with OpenAI...");
            let dayByDayItinerary;
            if (hasOpenAIKey) {
                try {
                    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
                    const budgetDisplay = typeof trip.budget === "number" ? `€${trip.budget}` : trip.budget;
                    const itineraryPrompt = `Create a detailed day-by-day itinerary for a trip to ${trip.destination} from ${new Date(trip.startDate).toDateString()} to ${new Date(trip.endDate).toDateString()}.

Budget: ${budgetDisplay}
Travelers: ${trip.travelers}
Interests: ${trip.interests.join(", ")}

${generateTravelStyleGuidance(trip.interests)}

IMPORTANT: For each activity, include:
- Realistic entry prices in EUR
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
                        
                        // Merge TripAdvisor data into restaurant activities
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

// Helper function to get fallback restaurants
function getFallbackRestaurants(destination: string): any[] {
    const destLower = destination.toLowerCase();
    
    // Destination-specific fallback restaurants
    const fallbackMap: Record<string, any[]> = {
        "athens": [
            { name: "Taverna Psaras", cuisine: "Greek", rating: 4.6, reviewCount: 2100, priceRange: "€€", address: "Plaka, Athens", description: "Traditional Greek taverna with fresh seafood", bookingUrl: "https://www.tripadvisor.com" },
            { name: "O Thanasis", cuisine: "Greek", rating: 4.5, reviewCount: 1800, priceRange: "€", address: "Monastiraki, Athens", description: "Famous souvlaki and grilled meats", bookingUrl: "https://www.tripadvisor.com" },
            { name: "Kyclades", cuisine: "Seafood", rating: 4.7, reviewCount: 2500, priceRange: "€€€", address: "Plaka, Athens", description: "Upscale seafood restaurant with Aegean views", bookingUrl: "https://www.tripadvisor.com" },
        ],
        "paris": [
            { name: "Café de Flore", cuisine: "French", rating: 4.4, reviewCount: 3200, priceRange: "€€€", address: "Saint-Germain-des-Prés", description: "Historic café with classic French cuisine", bookingUrl: "https://www.tripadvisor.com" },
            { name: "L'Ami Jean", cuisine: "French", rating: 4.6, reviewCount: 2800, priceRange: "€€", address: "Latin Quarter", description: "Cozy bistro with traditional French dishes", bookingUrl: "https://www.tripadvisor.com" },
            { name: "Le Jules Verne", cuisine: "French", rating: 4.8, reviewCount: 1500, priceRange: "€€€€", address: "Eiffel Tower", description: "Michelin-starred restaurant in the Eiffel Tower", bookingUrl: "https://www.tripadvisor.com" },
        ],
        "rome": [
            { name: "Flavio al Velavevodetto", cuisine: "Italian", rating: 4.7, reviewCount: 2200, priceRange: "€€", address: "Monti, Rome", description: "Traditional Roman cuisine in a charming setting", bookingUrl: "https://www.tripadvisor.com" },
            { name: "Armando al Pantheon", cuisine: "Italian", rating: 4.6, reviewCount: 2600, priceRange: "€€", address: "Pantheon, Rome", description: "Family-run restaurant near the Pantheon", bookingUrl: "https://www.tripadvisor.com" },
            { name: "Pipero Roma", cuisine: "Italian", rating: 4.5, reviewCount: 1900, priceRange: "€€€", address: "Centro Storico", description: "Modern take on classic Roman dishes", bookingUrl: "https://www.tripadvisor.com" },
        ],
        "barcelona": [
            { name: "Cervecería Catalana", cuisine: "Spanish", rating: 4.5, reviewCount: 3100, priceRange: "€€", address: "Passeig de Gràcia", description: "Popular tapas bar with excellent selection", bookingUrl: "https://www.tripadvisor.com" },
            { name: "Tickets Bar", cuisine: "Spanish", rating: 4.7, reviewCount: 2400, priceRange: "€€€€", address: "Parallel", description: "Innovative tapas by Albert Adrià", bookingUrl: "https://www.tripadvisor.com" },
            { name: "Cal Pep", cuisine: "Seafood", rating: 4.6, reviewCount: 2000, priceRange: "€€", address: "Gothic Quarter", description: "Fresh seafood and traditional Catalan dishes", bookingUrl: "https://www.tripadvisor.com" },
        ],
    };
    
    // Return destination-specific restaurants or generic fallback
    if (fallbackMap[destLower]) {
        return fallbackMap[destLower];
    }
    
    // Generic fallback for unknown destinations
    return [
        { name: "Local Restaurant", cuisine: "International", rating: 4.3, reviewCount: 500, priceRange: "€€", address: "City Center", description: "Popular local restaurant", bookingUrl: "https://www.tripadvisor.com" },
        { name: "Traditional Cuisine", cuisine: "Local", rating: 4.4, reviewCount: 450, priceRange: "€€", address: "Downtown", description: "Authentic local cuisine", bookingUrl: "https://www.tripadvisor.com" },
        { name: "Fine Dining", cuisine: "International", rating: 4.6, reviewCount: 600, priceRange: "€€€", address: "Upscale District", description: "Upscale dining experience", bookingUrl: "https://www.tripadvisor.com" },
    ];
}

// Helper function to search restaurants
async function searchRestaurants(destination: string) {
    const tripAdvisorKey = process.env.TRIPADVISOR_API_KEY;
    
    if (!tripAdvisorKey) {
        console.warn("⚠️ TripAdvisor API key not configured. Using destination-specific fallback restaurants.");
        return getFallbackRestaurants(destination);
    }

    console.log(`🍽️ Searching restaurants in ${destination} via TripAdvisor`);
    try {
        const restaurants = await searchTripAdvisorRestaurants(destination, tripAdvisorKey);
        if (restaurants.length > 0) {
            console.log(`✅ Found ${restaurants.length} restaurants via TripAdvisor`);
            return restaurants;
        }
        console.warn("⚠️ No restaurants found via TripAdvisor. Using fallback.");
        return getFallbackRestaurants(destination);
    } catch (error) {
        console.error("❌ TripAdvisor restaurants failed:", error);
        return getFallbackRestaurants(destination);
    }
}

// Helper function to convert airline carrier codes to full names
function getAirlineName(carrierCode: string): string {
    const airlineMap: Record<string, string> = {
        "AA": "American Airlines",
        "BA": "British Airways",
        "AF": "Air France",
        "LH": "Lufthansa",
        "EK": "Emirates",
        "QR": "Qatar Airways",
        "TK": "Turkish Airlines",
        "KL": "KLM Royal Dutch Airlines",
        "IB": "Iberia",
        "AZ": "ITA Airways",
        "LX": "Swiss International Air Lines",
        "OS": "Austrian Airlines",
        "SN": "Brussels Airlines",
        "TP": "TAP Air Portugal",
        "SK": "SAS Scandinavian Airlines",
        "AY": "Finnair",
        "FR": "Ryanair",
        "U2": "easyJet",
        "W6": "Wizz Air",
        "VY": "Vueling",
        "A3": "Aegean Airlines",
        "OA": "Olympic Air",
        "DL": "Delta Air Lines",
        "UA": "United Airlines",
        "AC": "Air Canada",
        "NH": "All Nippon Airways",
        "JL": "Japan Airlines",
        "SQ": "Singapore Airlines",
        "CX": "Cathay Pacific",
        "QF": "Qantas",
        "EY": "Etihad Airways",
        "SV": "Saudia",
        "MS": "EgyptAir",
        "ET": "Ethiopian Airlines",
        "KE": "Korean Air",
        "OZ": "Asiana Airlines",
        "CI": "China Airlines",
        "BR": "EVA Air",
        "TG": "Thai Airways",
        "MH": "Malaysia Airlines",
        "GA": "Garuda Indonesia",
        "PR": "Philippine Airlines",
        "VN": "Vietnam Airlines",
    };

    return airlineMap[carrierCode] || `${carrierCode} Airlines`;
}
