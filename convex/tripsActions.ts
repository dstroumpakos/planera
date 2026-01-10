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

        try {
            // Fetch trip details
            const trip: any = await ctx.runQuery(internal.trips.getTripForGeneration, { tripId });
            
            if (!trip) {
                throw new Error("Trip not found");
            }

            console.log("📍 Trip Details:", {
                destination: trip.destination,
                startDate: trip.startDate,
                endDate: trip.endDate,
                travelers: trip.travelers,
                budget: trip.budget,
                interests: trip.interests,
            });

            let flights: any = null;
            let hotels: any = null;
            let activities: any = [];
            let restaurants: any = [];

            const hasAmadeusKeys = !!process.env.AMADEUS_API_KEY && !!process.env.AMADEUS_API_SECRET;
            const origin = trip.origin || "New York (JFK)";

            // 1. Fetch flights (unless skipped)
            if (!skipFlights) {
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
                console.log(`✅ Flights ready: ${flights?.length || 0} options`);
            } else {
                console.log("⏭️ Skipping flights");
            }

            // 2. Fetch hotels (unless skipped)
            if (!skipHotel) {
                console.log("🏨 Fetching hotels...");
                if (hasAmadeusKeys) {
                    try {
                        const amadeusToken = await getAmadeusToken();
                        hotels = await searchHotels(
                            amadeusToken,
                            extractIATACode(trip.destination),
                            new Date(trip.startDate).toISOString().split('T')[0],
                            new Date(trip.endDate).toISOString().split('T')[0],
                            trip.travelers
                        );
                    } catch (error) {
                        console.error("❌ Amadeus hotels failed:", error);
                        hotels = getFallbackHotels(trip.destination);
                    }
                } else {
                    hotels = getFallbackHotels(trip.destination);
                }
                if (!hotels || hotels.length === 0) {
                    hotels = getFallbackHotels(trip.destination);
                }
                console.log(`✅ Hotels ready: ${hotels?.length || 0} options`);
            } else {
                console.log("⏭️ Skipping hotels");
            }

            // 3. Fetch activities
            console.log("🎯 Fetching activities...");
            activities = await searchActivities(trip.destination);
            console.log(`✅ Activities ready: ${activities.length} options`);

            // 4. Fetch restaurants (with fallback)
            console.log("🍽️ Fetching restaurants...");
            try {
                restaurants = await searchRestaurants(trip.destination);
            } catch (error) {
                console.error("⚠️ Restaurant search failed, using fallback:", error);
                restaurants = getFallbackRestaurants(trip.destination);
            }
            console.log(`✅ Restaurants ready: ${restaurants.length} options`);

            // 5. Generate transportation options
            console.log("🚗 Generating transportation options...");
            const transportation = await generateTransportationOptions(trip.destination);
            console.log(`✅ Transportation ready: ${transportation.length} options`);

            // 6. Generate itinerary with OpenAI
            console.log("🤖 Generating itinerary with OpenAI...");
            const travelStyleGuidance = generateTravelStyleGuidance(trip.interests || []);
            
            const openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY,
            });

            const systemPrompt = `You are an expert travel itinerary planner. Create detailed, personalized travel itineraries based on user preferences. 
${travelStyleGuidance}
Format your response as a JSON object with this exact structure:
{
  "title": "Trip title",
  "overview": "Brief overview of the trip",
  "itinerary": [
    {
      "day": 1,
      "title": "Day title",
      "description": "Day description",
      "activities": [
        {
          "time": "09:00",
          "title": "Activity title",
          "description": "Activity description",
          "duration": "2 hours",
          "type": "attraction|dining|shopping|nightlife|nature|culture"
        }
      ]
    }
  ],
  "highlights": ["highlight 1", "highlight 2"],
  "tips": ["tip 1", "tip 2"]
}`;

            const userPrompt = args.prompt;

            const response = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.7,
            });

            const content = response.choices[0]?.message?.content;
            if (!content) {
                throw new Error("No response from OpenAI");
            }

            let itineraryData: any;
            try {
                itineraryData = JSON.parse(content);
            } catch (e) {
                console.error("Failed to parse OpenAI response:", content);
                // Try to extract JSON from markdown code fences
                const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
                if (jsonMatch && jsonMatch[1]) {
                    try {
                        itineraryData = JSON.parse(jsonMatch[1].trim());
                    } catch (e2) {
                        console.error("Failed to parse extracted JSON:", jsonMatch[1]);
                        itineraryData = await generateBasicItinerary(trip.destination, trip.startDate, trip.endDate);
                    }
                } else {
                    itineraryData = await generateBasicItinerary(trip.destination, trip.startDate, trip.endDate);
                }
            }

            // 7. Merge restaurant data into itinerary
            console.log("🔗 Merging restaurant data...");
            const finalItinerary = await mergeRestaurantDataIntoItinerary(
                itineraryData,
                restaurants,
                trip.destination
            );

            // 8. Calculate daily expenses
            const dailyExpenses = calculateDailyExpenses(trip.budget);

            // 9. Save trip
            console.log("💾 Saving trip...");
            await ctx.runMutation(internal.trips.saveTripGeneration, {
                tripId,
                itinerary: finalItinerary,
                flights: skipFlights ? null : flights,
                hotels: skipHotel ? null : hotels,
                activities,
                restaurants,
                transportation,
                dailyExpenses,
                itineraryRaw: content,
            });

            console.log("=".repeat(80));
            console.log("✅ TRIP GENERATION COMPLETED SUCCESSFULLY");
            console.log("=".repeat(80));
        } catch (error) {
            console.error("❌ TRIP GENERATION FAILED:", error);
            await ctx.runMutation(internal.trips.setTripError, {
                tripId,
                error: error instanceof Error ? error.message : "Unknown error",
            });
            throw error;
        }
    },
});

// Helper function to get fallback restaurants
function getFallbackRestaurants(destination: string): any[] {
    const destLower = destination.toLowerCase();
    
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
    
    if (fallbackMap[destLower]) {
        return fallbackMap[destLower];
    }
    
    return [
        { name: "Local Restaurant", cuisine: "International", rating: 4.3, reviewCount: 500, priceRange: "€€", address: "City Center", description: "Popular local restaurant", bookingUrl: "https://www.tripadvisor.com" },
        { name: "Traditional Cuisine", cuisine: "Local", rating: 4.4, reviewCount: 450, priceRange: "€€", address: "Downtown", description: "Authentic local cuisine", bookingUrl: "https://www.tripadvisor.com" },
        { name: "Fine Dining", cuisine: "International", rating: 4.6, reviewCount: 600, priceRange: "€€€", address: "Upscale District", description: "Upscale dining experience", bookingUrl: "https://www.tripadvisor.com" },
    ];
}

// Helper function to search restaurants
async function searchRestaurants(destination: string) {
    return await searchTripAdvisorRestaurants(destination);
}

// Helper function to search hotels
async function searchHotels(
    token: string,
    cityCode: string,
    checkInDate: string,
    checkOutDate: string,
    adults: number
) {
    console.log(`🔍 Searching hotels via Amadeus in ${cityCode}`);

    try {
        // Use v2 endpoint for hotel search (not v3 which requires hotelIds)
        const url = `https://test.api.amadeus.com/v2/shopping/hotel-offers?cityCode=${cityCode}&checkInDate=${checkInDate}&checkOutDate=${checkOutDate}&adults=${adults}&max=10`;

        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("❌ Amadeus Hotel Search API error:", response.status, errorText);
            throw new Error(`Amadeus API error: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.data || data.data.length === 0) {
            console.warn("⚠️ No hotels found via Amadeus");
            throw new Error("No hotels found");
        }

        const hotelOptions = data.data.slice(0, 5).map((hotel: any, index: number) => ({
            id: index + 1,
            name: hotel.hotel?.name || "Hotel",
            rating: hotel.hotel?.rating || 4,
            address: hotel.hotel?.address?.cityName || cityCode,
            pricePerNight: hotel.offers?.[0]?.price?.total || "N/A",
            currency: hotel.offers?.[0]?.price?.currency || "EUR",
            description: "Quality accommodation",
            amenities: ["WiFi", "Breakfast", "Parking"],
        }));

        console.log(`✅ Found ${hotelOptions.length} hotels`);
        return hotelOptions;
    } catch (error) {
        console.error("❌ Hotel search error:", error);
        throw error;
    }
}

// Helper function to get fallback hotels
function getFallbackHotels(destination: string): any[] {
    console.log(`📋 Using fallback hotels for ${destination}`);
    return [
        {
            id: 1,
            name: `${destination} Grand Hotel`,
            rating: 5,
            address: destination,
            pricePerNight: "€150",
            currency: "EUR",
            description: "Luxury accommodation in the heart of the city",
            amenities: ["WiFi", "Breakfast", "Parking", "Spa", "Restaurant"],
        },
        {
            id: 2,
            name: `${destination} Comfort Inn`,
            rating: 4,
            address: destination,
            pricePerNight: "€100",
            currency: "EUR",
            description: "Comfortable mid-range hotel",
            amenities: ["WiFi", "Breakfast", "Parking"],
        },
        {
            id: 3,
            name: `${destination} Budget Hotel`,
            rating: 3,
            address: destination,
            pricePerNight: "€60",
            currency: "EUR",
            description: "Affordable accommodation",
            amenities: ["WiFi", "Parking"],
        },
    ];
}

// Helper function to get fallback activities
function getFallbackActivities(destination: string): any[] {
    console.log(`📋 Using fallback activities for ${destination}`);
    return [
        {
            title: `${destination} City Tour`,
            description: "Explore the main attractions and landmarks of the city",
            type: "cultural",
            price: 45,
            duration: "3 hours",
            bookingUrl: "https://www.viator.com",
            image: null,
        },
        {
            title: `${destination} Food Tour`,
            description: "Taste local cuisine and visit traditional restaurants",
            type: "food",
            price: 65,
            duration: "2.5 hours",
            bookingUrl: "https://www.viator.com",
            image: null,
        },
        {
            title: `${destination} Museum Visit`,
            description: "Discover art and history at the local museum",
            type: "cultural",
            price: 25,
            duration: "2 hours",
            bookingUrl: "https://www.viator.com",
            image: null,
        },
        {
            title: `${destination} Sunset Experience`,
            description: "Watch the sunset from a scenic viewpoint",
            type: "nature",
            price: 35,
            duration: "1.5 hours",
            bookingUrl: "https://www.viator.com",
            image: null,
        },
    ];
}

// Helper function to generate transportation options
async function generateTransportationOptions(destination: string): Promise<any[]> {
    return [
        { type: "Taxi", description: "Direct taxi service", estimatedCost: 25, duration: "30 mins" },
        { type: "Public Transport", description: "Metro/Bus system", estimatedCost: 5, duration: "45 mins" },
        { type: "Rental Car", description: "Self-drive option", estimatedCost: 50, duration: "Flexible" },
        { type: "Walking Tour", description: "Explore on foot", estimatedCost: 0, duration: "Variable" },
    ];
}

// Helper function to merge restaurant data into itinerary
async function mergeRestaurantDataIntoItinerary(itinerary: any, restaurants: any[], destination: string): Promise<any> {
    if (!itinerary.itinerary) {
        return itinerary;
    }

    const updatedItinerary = { ...itinerary };
    updatedItinerary.itinerary = itinerary.itinerary.map((day: any, dayIndex: number) => {
        const updatedDay = { ...day };
        if (updatedDay.activities) {
            updatedDay.activities = updatedDay.activities.map((activity: any) => {
                if (activity.type === "dining" && restaurants.length > 0) {
                    const restaurantIndex = dayIndex % restaurants.length;
                    return {
                        ...activity,
                        restaurant: restaurants[restaurantIndex],
                    };
                }
                return activity;
            });
        }
        return updatedDay;
    });

    return updatedItinerary;
}

// Helper function to generate basic itinerary
async function generateBasicItinerary(destination: string, startDate: number, endDate: number): Promise<any> {
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const itinerary = [];

    for (let i = 1; i <= days; i++) {
        itinerary.push({
            day: i,
            title: `Day ${i} in ${destination}`,
            description: `Explore ${destination}`,
            activities: [
                {
                    time: "09:00",
                    title: "Breakfast",
                    description: "Start your day with a local breakfast",
                    duration: "1 hour",
                    type: "dining",
                },
                {
                    time: "11:00",
                    title: "Main Activity",
                    description: "Explore local attractions",
                    duration: "3 hours",
                    type: "attraction",
                },
                {
                    time: "14:00",
                    title: "Lunch",
                    description: "Enjoy local cuisine",
                    duration: "1.5 hours",
                    type: "dining",
                },
                {
                    time: "18:00",
                    title: "Evening Activity",
                    description: "Relax and explore",
                    duration: "2 hours",
                    type: "attraction",
                },
                {
                    time: "20:00",
                    title: "Dinner",
                    description: "Dinner at a local restaurant",
                    duration: "2 hours",
                    type: "dining",
                },
            ],
        });
    }

    return {
        title: `${days}-Day Trip to ${destination}`,
        overview: `Explore the best of ${destination}`,
        itinerary,
        highlights: ["Main attractions", "Local cuisine", "Cultural experiences"],
        tips: ["Book in advance", "Wear comfortable shoes", "Try local specialties"],
    };
}

// Helper function to calculate daily expenses
function calculateDailyExpenses(budget: string | number): number {
    if (typeof budget === "string") {
        const budgetMap: Record<string, number> = {
            "Low": 1000,
            "Medium": 2000,
            "High": 4000,
            "Luxury": 8000,
        };
        budget = budgetMap[budget] || 2000;
    }
    
    const estimatedDailyExpense = (budget * 0.3) / 7;
    return Math.max(50, Math.round(estimatedDailyExpense));
}

// Helper function to get Amadeus access token
async function getAmadeusToken(): Promise<string> {
    const apiKey = process.env.AMADEUS_API_KEY;
    const apiSecret = process.env.AMADEUS_API_SECRET;

    if (!apiKey || !apiSecret) {
        throw new Error("Amadeus API credentials not configured");
    }

    const response = await fetch("https://test.api.amadeus.com/v1/security/oauth2/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `grant_type=client_credentials&client_id=${apiKey}&client_secret=${apiSecret}`,
    });

    const data = await response.json();
    
    if (!response.ok) {
        console.error("❌ Failed to get Amadeus token:", data);
        throw new Error(`Amadeus authentication failed: ${data.error_description || data.error || "Unknown error"}`);
    }
    
    if (!data.access_token) {
        console.error("❌ No access token in response:", data);
        throw new Error("Amadeus API did not return an access token");
    }
    
    console.log("✅ Amadeus token obtained successfully");
    return data.access_token;
}

// Helper function to search flights
async function searchFlights(
    token: string,
    origin: string,
    destination: string,
    departureDate: string,
    returnDate: string,
    adults: number,
    preferredFlightTime: string = "any"
) {
    const originCode = extractIATACode(origin);
    const destCode = extractIATACode(destination);

    console.log(`🔍 Searching flights via Amadeus: ${originCode} -> ${destCode}`);

    try {
        const url = `https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=${originCode}&destinationLocationCode=${destCode}&departureDate=${departureDate}&returnDate=${returnDate}&adults=${adults}&currencyCode=EUR&max=10`;

        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("❌ Amadeus Flight Search API error:", response.status, errorText);
            throw new Error(`Amadeus API error: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.data || data.data.length === 0) {
            console.warn("⚠️ No flights found via Amadeus");
            throw new Error("No flights found");
        }

        const flightOptions = data.data.slice(0, 5).map((offer: any, index: number) => {
            const itinerary = offer.itineraries[0];
            const returnItinerary = offer.itineraries[1];
            const segment = itinerary.segments[0];
            const returnSegment = returnItinerary?.segments[0];
            
            return {
                id: index + 1,
                outbound: {
                    departure: segment.departure.at,
                    arrival: segment.arrival.at,
                    airline: getAirlineName(segment.operating?.carrierCode || segment.carrierCode),
                    flightNumber: segment.carrierCode + segment.number,
                    duration: itinerary.duration,
                },
                return: returnSegment ? {
                    departure: returnSegment.departure.at,
                    arrival: returnSegment.arrival.at,
                    airline: getAirlineName(returnSegment.operating?.carrierCode || returnSegment.carrierCode),
                    flightNumber: returnSegment.carrierCode + returnSegment.number,
                    duration: returnItinerary.duration,
                } : null,
                price: offer.price.total,
                currency: offer.price.currency,
            };
        });

        console.log(`✅ Found ${flightOptions.length} flights`);
        return flightOptions;
    } catch (error) {
        console.error("❌ Flight search error:", error);
        throw error;
    }
}

// Helper function to search activities
async function searchActivities(destination: string): Promise<any[]> {
    try {
        return await searchViatorActivities(destination);
    } catch (error) {
        console.error("⚠️ Viator search failed, using fallback:", error);
        return getFallbackActivities(destination);
    }
}

// Helper function to search Viator activities
async function searchViatorActivities(destination: string): Promise<any[]> {
    const apiKey = process.env.VIATOR_API_KEY;
    if (!apiKey) {
        console.warn("⚠️ Viator API key not configured");
        return getFallbackActivities(destination);
    }

    // Validate destination
    if (!destination || typeof destination !== "string" || destination.trim().length === 0) {
        console.warn("⚠️ Invalid destination provided to Viator search");
        return getFallbackActivities(destination || "Unknown");
    }

    try {
        console.log(`🎯 Searching activities in ${destination} via Viator`);
        
        const searchQuery = destination.split(",")[0].trim();
        
        // Validate searchQuery
        if (!searchQuery || searchQuery.length === 0) {
            console.warn("⚠️ Empty search query for Viator");
            return getFallbackActivities(destination);
        }
        
        const url = `https://api.viator.com/partner/search/products?searchQuery=${encodeURIComponent(searchQuery)}&limit=10`;
        console.log(`📍 Viator API URL: ${url}`);
        console.log(`🔑 API Key present: ${apiKey ? "Yes" : "No"}`);

        const response = await fetch(url, {
            headers: {
                "Accept": "application/json;version=2.0",
                "exp-api-key": apiKey,
            }
        });

        console.log(`📊 Viator API Response Status: ${response.status}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.warn(`⚠️ Viator API error: ${response.status} - ${errorText}`);
            return getFallbackActivities(destination);
        }

        const data = await response.json();
        console.log(`📦 Viator API Response:`, JSON.stringify(data).substring(0, 500));
        
        if (!data.products || data.products.length === 0) {
            console.warn("⚠️ No activities found via Viator");
            return getFallbackActivities(destination);
        }

        const activities = await Promise.all(
            data.products.slice(0, 10).map(async (product: any) => {
                try {
                    const details = await getViatorProductDetails(product.productCode);
                    return {
                        title: product.title,
                        description: product.shortDescription || product.title,
                        type: product.categoryId === 10001 ? "cultural" : "activity",
                        price: product.fromPrice || 0,
                        duration: details?.duration || "2 hours",
                        bookingUrl: `https://www.viator.com/tours/${product.productCode}?pid=P00278826&mcid=42383&medium=link&medium_version=selector&campaign=Planera`,
                        image: details?.images?.[0]?.imageSource || null,
                    };
                } catch (e) {
                    return {
                        title: product.title,
                        description: product.shortDescription || product.title,
                        type: "activity",
                        price: product.fromPrice || 0,
                        duration: "2 hours",
                        bookingUrl: `https://www.viator.com/tours/${product.productCode}?pid=P00278826&mcid=42383&medium=link&medium_version=selector&campaign=Planera`,
                        image: null,
                    };
                }
            })
        );

        console.log(`✅ Found ${activities.length} activities`);
        return activities;
    } catch (error) {
        console.error("❌ Viator search error:", error);
        return getFallbackActivities(destination);
    }
}

// Helper function to get Viator product details
async function getViatorProductDetails(productCode: string): Promise<any> {
    const apiKey = process.env.VIATOR_API_KEY;
    if (!apiKey) return null;

    try {
        const url = `https://api.viator.com/partner/products/${productCode}`;
        console.log(`🔍 Fetching product details for: ${productCode}`);
        
        const response = await fetch(url, {
            headers: {
                "Accept": "application/json;version=2.0",
                "exp-api-key": apiKey,
            }
        });

        console.log(`📊 Product details response status: ${response.status}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.warn(`⚠️ Failed to fetch product details for ${productCode}: ${response.status} - ${errorText}`);
            return null;
        }

        const data = await response.json();
        console.log(`✅ Product details fetched:`, JSON.stringify(data).substring(0, 300));
        return data;
    } catch (error) {
        console.error(`❌ Error fetching Viator product details: ${error}`);
        return null;
    }
}

// Helper function to search TripAdvisor restaurants
async function searchTripAdvisorRestaurants(destination: string): Promise<any[]> {
    const apiKey = process.env.TRIPADVISOR_API_KEY;
    if (!apiKey) {
        console.warn("⚠️ TripAdvisor API key not configured");
        return getFallbackRestaurants(destination);
    }

    // Validate destination
    if (!destination || typeof destination !== "string" || destination.trim().length === 0) {
        console.warn("⚠️ Invalid destination provided to TripAdvisor search");
        return getFallbackRestaurants(destination || "Unknown");
    }

    try {
        console.log(`🍽️ Searching restaurants in ${destination} via TripAdvisor`);
        
        const searchQuery = destination.split(",")[0].trim();
        
        // Validate searchQuery
        if (!searchQuery || searchQuery.length === 0) {
            console.warn("⚠️ Empty search query for TripAdvisor");
            return getFallbackRestaurants(destination);
        }
        
        const locationUrl = `https://api.content.tripadvisor.com/api/v1/location/search?query=${encodeURIComponent(searchQuery)}&key=${apiKey}`;

        const locationResponse = await fetch(locationUrl);
        if (!locationResponse.ok) {
            console.warn(`⚠️ TripAdvisor location search failed: ${locationResponse.status}`);
            return getFallbackRestaurants(destination);
        }

        const locationData = await locationResponse.json();
        if (!locationData.data || locationData.data.length === 0) {
            console.warn("⚠️ No location found on TripAdvisor");
            return getFallbackRestaurants(destination);
        }

        const locationId = locationData.data[0].location_id;
        const restaurantsUrl = `https://api.content.tripadvisor.com/api/v1/location/${locationId}/details?key=${apiKey}&language=en`;

        const restaurantsResponse = await fetch(restaurantsUrl);
        if (!restaurantsResponse.ok) {
            console.warn(`⚠️ TripAdvisor restaurants search failed: ${restaurantsResponse.status}`);
            return getFallbackRestaurants(destination);
        }

        const restaurantsData = await restaurantsResponse.json();
        
        if (!restaurantsData.nearby_restaurants || restaurantsData.nearby_restaurants.length === 0) {
            console.warn("⚠️ No restaurants found on TripAdvisor");
            return getFallbackRestaurants(destination);
        }

        const restaurants = restaurantsData.nearby_restaurants.slice(0, 15).map((restaurant: any) => ({
            name: restaurant.name,
            cuisine: restaurant.cuisine?.[0]?.name || "International",
            rating: restaurant.rating || 4.0,
            reviewCount: restaurant.num_reviews || 0,
            priceRange: restaurant.price_level || "€€",
            address: restaurant.address || destination,
            description: restaurant.description || "Popular restaurant",
            bookingUrl: restaurant.web_url || "https://www.tripadvisor.com",
        }));

        console.log(`✅ Found ${restaurants.length} restaurants`);
        return restaurants;
    } catch (error) {
        console.error("❌ TripAdvisor search error:", error);
        return getFallbackRestaurants(destination);
    }
}

// Helper function to extract IATA code from airport name
function extractIATACode(airport: string): string {
    const match = airport.match(/\(([A-Z]{3})\)/);
    if (match) {
        return match[1];
    }
    
    const codeMap: Record<string, string> = {
        "new york": "JFK",
        "los angeles": "LAX",
        "london": "LHR",
        "paris": "CDG",
        "tokyo": "NRT",
        "sydney": "SYD",
        "dubai": "DXB",
        "singapore": "SIN",
        "hong kong": "HKG",
        "bangkok": "BKK",
        "athens": "ATH",
        "rome": "FCO",
        "barcelona": "BCN",
        "madrid": "MAD",
        "berlin": "BER",
        "amsterdam": "AMS",
        "zurich": "ZRH",
        "vienna": "VIE",
        "prague": "PRG",
        "istanbul": "IST",
    };

    const lowerAirport = airport.toLowerCase();
    for (const [key, code] of Object.entries(codeMap)) {
        if (lowerAirport.includes(key)) {
            return code;
        }
    }

    return "JFK";
}

// Helper function to generate realistic flights
async function generateRealisticFlights(
    origin: string,
    originCode: string,
    destination: string,
    destCode: string,
    departureDate: string,
    returnDate: string,
    adults: number,
    preferredFlightTime: string = "any"
): Promise<any[]> {
    console.log(`✈️ Generating realistic flights: ${originCode} -> ${destCode}`);

    const flights = [];
    const departDate = new Date(departureDate);
    const returnDateObj = new Date(returnDate);

    for (let i = 0; i < 3; i++) {
        const outboundHour = preferredFlightTime === "morning" ? 6 + i : 
                            preferredFlightTime === "afternoon" ? 12 + i : 
                            8 + i * 4;
        
        const outboundTime = new Date(departDate);
        outboundTime.setHours(outboundHour, 0, 0);
        
        const arrivalTime = new Date(outboundTime);
        arrivalTime.setHours(arrivalTime.getHours() + 8);

        const returnTime = new Date(returnDateObj);
        returnTime.setHours(14 + i * 2, 0, 0);
        
        const returnArrivalTime = new Date(returnTime);
        returnArrivalTime.setHours(returnArrivalTime.getHours() + 8);

        flights.push({
            id: i + 1,
            outbound: {
                departure: outboundTime.toISOString(),
                arrival: arrivalTime.toISOString(),
                airline: getAirlineName(["BA", "LH", "AF"][i]),
                flightNumber: ["BA", "LH", "AF"][i] + (100 + i),
                duration: "PT8H",
            },
            return: {
                departure: returnTime.toISOString(),
                arrival: returnArrivalTime.toISOString(),
                airline: getAirlineName(["BA", "LH", "AF"][i]),
                flightNumber: ["BA", "LH", "AF"][i] + (200 + i),
                duration: "PT8H",
            },
            price: (500 + i * 100) * adults,
            currency: "EUR",
        });
    }

    return flights;
}

// Helper function to convert airline carrier codes to full names
function getAirlineName(carrierCode: string): string {
    const airlineMap: Record<string, string> = {
        "BA": "British Airways",
        "LH": "Lufthansa",
        "AF": "Air France",
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
