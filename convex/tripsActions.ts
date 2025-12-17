"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import OpenAI from "openai";

// Import helper functions from separate files
import {
    formatDuration,
    formatTime,
    convertTo24Hour,
    addHoursToTime,
    calculateFlightDuration,
    calculateRealisticPrice,
    getRealisticAirlinesForRoute,
    getAirlineName,
} from "./helpers/flightHelpers";

import {
    extractIATACode,
    getFallbackCoordinates,
} from "./helpers/locationHelpers";

import {
    getFallbackHotels,
    getFallbackActivities,
    getFallbackRestaurants,
    generateTransportationOptions,
} from "./helpers/fallbackData";

import {
    searchViatorActivities,
    searchTripAdvisorLocation,
    searchTripAdvisorRestaurants,
} from "./helpers/apiHelpers";

export const generate = internalAction({
    args: { 
        tripId: v.id("trips"), 
        prompt: v.string(), 
        skipFlights: v.optional(v.boolean()),
        preferredFlightTime: v.optional(v.string()),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const { tripId, skipFlights, preferredFlightTime } = args;

        console.log("=".repeat(80));
        console.log("🚀 TRIP GENERATION STARTED");
        console.log("=".repeat(80));
        console.log("Trip ID:", tripId);
        console.log("Prompt:", args.prompt);
        console.log("Skip Flights:", skipFlights ? "Yes" : "No");
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
            console.log(`✅ Hotels ready: ${hotels.length} options`);

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

            // 6. Get destination coordinates
            console.log("📍 Fetching destination coordinates...");
            let destinationCoordinates = null;
            if (process.env.TRIPADVISOR_API_KEY) {
                try {
                    const cityLocation = await searchTripAdvisorLocation(trip.destination, process.env.TRIPADVISOR_API_KEY);
                    if (cityLocation) {
                        const cityDetailsUrl = `https://api.content.tripadvisor.com/api/v1/location/${cityLocation.locationId}/details?key=${process.env.TRIPADVISOR_API_KEY}&language=en&currency=EUR`;
                        const cityDetailsResponse = await fetch(cityDetailsUrl, {
                            method: "GET",
                            headers: { "Accept": "application/json" }
                        });
                        if (cityDetailsResponse.ok) {
                            const cityDetails = await cityDetailsResponse.json();
                            if (cityDetails.latitude && cityDetails.longitude) {
                                destinationCoordinates = {
                                    latitude: parseFloat(cityDetails.latitude),
                                    longitude: parseFloat(cityDetails.longitude),
                                };
                                console.log(`✅ Destination coordinates: ${JSON.stringify(destinationCoordinates)}`);
                            }
                        }
                    }
                } catch (error) {
                    console.error("❌ Error fetching destination coordinates:", error);
                }
            }
            
            // Fallback coordinates if API fails (approximate for major cities)
            if (!destinationCoordinates) {
                destinationCoordinates = getFallbackCoordinates(trip.destination);
            }

            // 7. Generate day-by-day itinerary with OpenAI
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
                } catch (error: any) {
                    console.error("❌ OpenAI itinerary generation failed:", error.message);
                    console.warn("⚠️ Using fallback itinerary");
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
                destinationCoordinates,
                dayByDayItinerary,
                estimatedDailyExpenses: calculateDailyExpenses(Number(trip.budget)),
            };

            console.log("✅ Trip generation complete!");

            await ctx.runMutation(internal.trips.updateItinerary, {
                tripId,
                itinerary: result,
                status: "completed",
            });

            return null;
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

// Merge TripAdvisor restaurant data into itinerary activities
function mergeRestaurantDataIntoItinerary(dayByDayItinerary: any[], restaurants: any[]): any[] {
    if (!restaurants || restaurants.length === 0) {
        return dayByDayItinerary;
    }
    
    console.log(`🔄 Merging TripAdvisor data for ${restaurants.length} restaurants into itinerary`);
    
    // Create a map of restaurant names (lowercase) to their TripAdvisor data
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
                
                // Try to find a matching restaurant from TripAdvisor data
                const activityNameLower = activity.title?.toLowerCase() || "";
                
                // First try exact match
                let matchedRestaurant = restaurantMap.get(activityNameLower);
                
                // If no exact match, try to find a partial match or assign by index
                if (!matchedRestaurant) {
                    // Try partial match
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
                    
                    // Assign different restaurants for lunch and dinner
                    const restaurantIndex = isLunch 
                        ? (dayIndex * 2) % restaurants.length 
                        : isDinner 
                            ? (dayIndex * 2 + 1) % restaurants.length 
                            : dayIndex % restaurants.length;
                    
                    matchedRestaurant = restaurants[restaurantIndex];
                }
                
                // Merge TripAdvisor data if we found a match
                if (matchedRestaurant && (matchedRestaurant.tripAdvisorUrl || matchedRestaurant.rating)) {
                    day.activities[i] = {
                        ...activity,
                        type: "restaurant",
                        fromTripAdvisor: true,
                        tripAdvisorUrl: matchedRestaurant.tripAdvisorUrl || null,
                        tripAdvisorRating: matchedRestaurant.rating || null,
                        tripAdvisorReviewCount: matchedRestaurant.reviewCount || null,
                        cuisine: matchedRestaurant.cuisine || activity.cuisine || null,
                        priceRange: matchedRestaurant.priceRange || activity.priceRange || null,
                        address: matchedRestaurant.address || activity.address || null,
                        // Update title to use actual restaurant name if available
                        title: matchedRestaurant.name || activity.title,
                        // Update description to include cuisine info
                        description: activity.description || `${matchedRestaurant.cuisine || "Local"} cuisine - ${matchedRestaurant.priceRange || "€€"}`,
                    };
                    mergedCount++;
                }
            }
        }
    }
    
    console.log(`✅ Merged TripAdvisor data into ${mergedCount} restaurant activities`);
    return dayByDayItinerary;
}

// Generate a basic itinerary without OpenAI
function generateBasicItinerary(trip: any, activities: any[], restaurants: any[]) {
    const days = Math.ceil((trip.endDate - trip.startDate) / (24 * 60 * 60 * 1000));
    const dailyPlan = [];
    
    // Get destination-specific activities with prices
    const destActivities = getActivitiesWithPrices(trip.destination);
    
    for (let i = 0; i < days; i++) {
        const dayActivities = [];
        
        // Morning activity
        const morningActivity = destActivities[i % destActivities.length];
        dayActivities.push({
            time: "9:00 AM",
            title: morningActivity?.title || activities[i % activities.length]?.title || "Morning Activity",
            description: morningActivity?.description || "Explore and enjoy the local attractions",
            type: morningActivity?.type || "attraction",
            price: morningActivity?.price || 15,
            currency: "EUR",
            skipTheLine: morningActivity?.skipTheLine || false,
            skipTheLinePrice: morningActivity?.skipTheLinePrice || null,
            duration: morningActivity?.duration || "2-3 hours",
            bookingUrl: morningActivity?.bookingUrl || `https://www.getyourguide.com/s/?q=${encodeURIComponent(trip.destination)}`,
            tips: morningActivity?.tips || null,
        });
        
        // Lunch - include TripAdvisor data if available
        const lunchRestaurant = restaurants[i % restaurants.length];
        const lunchActivity: any = {
            time: "1:00 PM",
            title: lunchRestaurant?.name || "Lunch",
            description: `${lunchRestaurant?.cuisine || "Local"} cuisine - ${lunchRestaurant?.priceRange || "€€"}`,
            type: "restaurant",
            price: lunchRestaurant?.priceRange === "€" ? 15 : lunchRestaurant?.priceRange === "€€€" ? 45 : lunchRestaurant?.priceRange === "€€€€" ? 80 : 25,
            currency: "EUR",
            skipTheLine: false,
            skipTheLinePrice: null,
            duration: "1-1.5 hours",
            bookingUrl: null,
            tips: "Reservations recommended",
        };
        
        // Add TripAdvisor data if available
        if (lunchRestaurant?.tripAdvisorUrl || lunchRestaurant?.rating) {
            lunchActivity.fromTripAdvisor = true;
            lunchActivity.tripAdvisorUrl = lunchRestaurant.tripAdvisorUrl || null;
            lunchActivity.tripAdvisorRating = lunchRestaurant.rating || null;
            lunchActivity.tripAdvisorReviewCount = lunchRestaurant.reviewCount || null;
            lunchActivity.cuisine = lunchRestaurant.cuisine || null;
            lunchActivity.priceRange = lunchRestaurant.priceRange || null;
            lunchActivity.address = lunchRestaurant.address || null;
        }
        
        dayActivities.push(lunchActivity);
        
        // Afternoon activity
        const afternoonActivity = destActivities[(i + 1) % destActivities.length];
        dayActivities.push({
            time: "3:00 PM",
            title: afternoonActivity?.title || activities[(i + 1) % activities.length]?.title || "Afternoon Activity",
            description: afternoonActivity?.description || "Continue exploring",
            type: afternoonActivity?.type || "attraction",
            price: afternoonActivity?.price || 12,
            currency: "EUR",
            skipTheLine: afternoonActivity?.skipTheLine || false,
            skipTheLinePrice: afternoonActivity?.skipTheLinePrice || null,
            duration: afternoonActivity?.duration || "2 hours",
            bookingUrl: afternoonActivity?.bookingUrl || `https://www.viator.com/searchResults/all?text=${encodeURIComponent(trip.destination)}`,
            tips: afternoonActivity?.tips || null,
        });
        
        // Dinner - include TripAdvisor data if available
        const dinnerRestaurant = restaurants[(i + 1) % restaurants.length];
        const dinnerActivity: any = {
            time: "7:00 PM",
            title: dinnerRestaurant?.name || "Dinner",
            description: `${dinnerRestaurant?.cuisine || "Local"} cuisine - ${dinnerRestaurant?.priceRange || "€€"}`,
            type: "restaurant",
            price: dinnerRestaurant?.priceRange === "€" ? 20 : dinnerRestaurant?.priceRange === "€€€" ? 55 : dinnerRestaurant?.priceRange === "€€€€" ? 100 : 35,
            currency: "EUR",
            skipTheLine: false,
            skipTheLinePrice: null,
            duration: "2 hours",
            bookingUrl: null,
            tips: "Try local specialties",
        };
        
        // Add TripAdvisor data if available
        if (dinnerRestaurant?.tripAdvisorUrl || dinnerRestaurant?.rating) {
            dinnerActivity.fromTripAdvisor = true;
            dinnerActivity.tripAdvisorUrl = dinnerRestaurant.tripAdvisorUrl || null;
            dinnerActivity.tripAdvisorRating = dinnerRestaurant.rating || null;
            dinnerActivity.tripAdvisorReviewCount = dinnerRestaurant.reviewCount || null;
            dinnerActivity.cuisine = dinnerRestaurant.cuisine || null;
            dinnerActivity.priceRange = dinnerRestaurant.priceRange || null;
            dinnerActivity.address = dinnerRestaurant.address || null;
        }
        
        dayActivities.push(dinnerActivity);
        
        dailyPlan.push({
            day: i + 1,
            title: `Day ${i + 1} in ${trip.destination}`,
            activities: dayActivities,
        });
    }
    
    return dailyPlan;
}

// Get activities with prices for specific destinations
function getActivitiesWithPrices(destination: string) {
    const destLower = destination.toLowerCase();
    
    const destinationActivities: Record<string, Array<{
        title: string;
        description: string;
        type: string;
        price: number;
        skipTheLine: boolean;
        skipTheLinePrice: number | null;
        duration: string;
        bookingUrl: string | null;
        tips: string | null;
    }>> = {
        "paris": [
            { title: "Eiffel Tower Summit", description: "Visit all 3 levels including the summit", type: "attraction", price: 26, skipTheLine: true, skipTheLinePrice: 42, duration: "2-3 hours", bookingUrl: "https://www.getyourguide.com/paris-l16/eiffel-tower-summit-access-t395601/", tips: "Book at least 2 weeks in advance" },
            { title: "Louvre Museum", description: "World's largest art museum with Mona Lisa", type: "museum", price: 17, skipTheLine: true, skipTheLinePrice: 32, duration: "3-4 hours", bookingUrl: "https://www.getyourguide.com/paris-l16/louvre-museum-timed-entrance-ticket-t395439/", tips: "Enter via Carrousel entrance to avoid crowds" },
            { title: "Musée d'Orsay", description: "Impressionist masterpieces in a former train station", type: "museum", price: 16, skipTheLine: true, skipTheLinePrice: 29, duration: "2-3 hours", bookingUrl: "https://www.getyourguide.com/paris-l16/musee-d-orsay-skip-the-line-t39592/", tips: "Visit on Thursday evening for late opening" },
            { title: "Versailles Palace", description: "Royal château with stunning gardens", type: "attraction", price: 20, skipTheLine: true, skipTheLinePrice: 45, duration: "4-5 hours", bookingUrl: "https://www.getyourguide.com/versailles-l217/versailles-palace-skip-the-line-ticket-t395440/", tips: "Arrive early to see the gardens" },
            { title: "Seine River Cruise", description: "Scenic boat tour along the Seine", type: "tour", price: 15, skipTheLine: false, skipTheLinePrice: null, duration: "1 hour", bookingUrl: "https://www.getyourguide.com/paris-l16/seine-river-cruise-t395602/", tips: "Sunset cruises are most romantic" },
        ],
        "rome": [
            { title: "Colosseum & Roman Forum", description: "Ancient amphitheater and ruins", type: "attraction", price: 18, skipTheLine: true, skipTheLinePrice: 35, duration: "3 hours", bookingUrl: "https://www.getyourguide.com/rome-l33/colosseum-roman-forum-skip-the-line-t395441/", tips: "Book arena floor access for best experience" },
            { title: "Vatican Museums & Sistine Chapel", description: "World-famous art collection and Michelangelo's ceiling", type: "museum", price: 17, skipTheLine: true, skipTheLinePrice: 40, duration: "3-4 hours", bookingUrl: "https://www.getyourguide.com/rome-l33/vatican-museums-sistine-chapel-skip-the-line-t395442/", tips: "Visit on Wednesday morning when Pope is at St. Peter's" },
            { title: "St. Peter's Basilica Dome", description: "Climb to the top for panoramic views", type: "attraction", price: 10, skipTheLine: true, skipTheLinePrice: 25, duration: "1.5 hours", bookingUrl: "https://www.getyourguide.com/rome-l33/st-peters-basilica-dome-climb-t395443/", tips: "Take the elevator option to save energy" },
            { title: "Borghese Gallery", description: "Stunning art collection in beautiful villa", type: "museum", price: 15, skipTheLine: true, skipTheLinePrice: 28, duration: "2 hours", bookingUrl: "https://www.getyourguide.com/rome-l33/borghese-gallery-skip-the-line-t395444/", tips: "Reservations mandatory - book weeks ahead" },
            { title: "Trevi Fountain & Pantheon Walk", description: "Iconic landmarks in historic center", type: "free", price: 0, skipTheLine: false, skipTheLinePrice: null, duration: "2 hours", bookingUrl: null, tips: "Visit Trevi at night for fewer crowds" },
        ],
        "barcelona": [
            { title: "Sagrada Familia", description: "Gaudí's unfinished masterpiece basilica", type: "attraction", price: 26, skipTheLine: true, skipTheLinePrice: 40, duration: "2 hours", bookingUrl: "https://www.getyourguide.com/barcelona-l45/sagrada-familia-skip-the-line-t395445/", tips: "Book tower access for amazing views" },
            { title: "Park Güell", description: "Colorful mosaic park by Gaudí", type: "attraction", price: 10, skipTheLine: true, skipTheLinePrice: 22, duration: "2 hours", bookingUrl: "https://www.getyourguide.com/barcelona-l45/park-guell-skip-the-line-t395446/", tips: "Morning light is best for photos" },
            { title: "Casa Batlló", description: "Gaudí's stunning modernist building", type: "museum", price: 35, skipTheLine: true, skipTheLinePrice: 45, duration: "1.5 hours", bookingUrl: "https://www.getyourguide.com/barcelona-l45/casa-batllo-skip-the-line-t395447/", tips: "Night experience includes light show" },
            { title: "La Pedrera (Casa Milà)", description: "Another Gaudí masterpiece with rooftop warriors", type: "museum", price: 25, skipTheLine: true, skipTheLinePrice: 35, duration: "1.5 hours", bookingUrl: "https://www.getyourguide.com/barcelona-l45/la-pedrera-skip-the-line-t395448/", tips: "Evening visits include light show" },
            { title: "Gothic Quarter Walking Tour", description: "Medieval streets and hidden squares", type: "tour", price: 15, skipTheLine: false, skipTheLinePrice: null, duration: "2 hours", bookingUrl: "https://www.getyourguide.com/barcelona-l45/gothic-quarter-tour-t395449/", tips: "Free tours available with tips" },
        ],
        "athens": [
            { title: "Acropolis & Parthenon", description: "Ancient citadel and iconic temple", type: "attraction", price: 20, skipTheLine: true, skipTheLinePrice: 38, duration: "3 hours", bookingUrl: "https://www.getyourguide.com/athens-l128/acropolis-skip-the-line-t395450/", tips: "Visit at sunrise or sunset to avoid heat" },
            { title: "Acropolis Museum", description: "Modern museum with ancient treasures", type: "museum", price: 15, skipTheLine: true, skipTheLinePrice: 25, duration: "2-3 hours", bookingUrl: "https://www.getyourguide.com/athens-l128/acropolis-museum-skip-the-line-t395451/", tips: "Friday evenings have extended hours" },
            { title: "Ancient Agora", description: "Ancient marketplace and Temple of Hephaestus", type: "attraction", price: 10, skipTheLine: false, skipTheLinePrice: null, duration: "2 hours", bookingUrl: "https://www.getyourguide.com/athens-l128/ancient-agora-t395452/", tips: "Included in combined ticket" },
            { title: "National Archaeological Museum", description: "Greece's largest archaeological museum", type: "museum", price: 12, skipTheLine: true, skipTheLinePrice: 20, duration: "2-3 hours", bookingUrl: "https://www.getyourguide.com/athens-l128/national-archaeological-museum-t395453/", tips: "Don't miss the Antikythera mechanism" },
            { title: "Plaka & Monastiraki Walk", description: "Historic neighborhoods with shops and tavernas", type: "free", price: 0, skipTheLine: false, skipTheLinePrice: null, duration: "2-3 hours", bookingUrl: null, tips: "Best for evening strolls and dinner" },
        ],
        "london": [
            { title: "Tower of London", description: "Historic castle with Crown Jewels", type: "attraction", price: 33, skipTheLine: true, skipTheLinePrice: 45, duration: "3 hours", bookingUrl: "https://www.getyourguide.com/london-l57/tower-of-london-skip-the-line-t395454/", tips: "Join a Yeoman Warder tour" },
            { title: "Westminster Abbey", description: "Gothic abbey with royal history", type: "attraction", price: 27, skipTheLine: true, skipTheLinePrice: 38, duration: "2 hours", bookingUrl: "https://www.getyourguide.com/london-l57/westminster-abbey-skip-the-line-t395455/", tips: "Audio guide included" },
            { title: "British Museum", description: "World history and culture - free entry", type: "museum", price: 0, skipTheLine: false, skipTheLinePrice: null, duration: "3-4 hours", bookingUrl: "https://www.britishmuseum.org", tips: "Donation suggested, special exhibits extra" },
            { title: "London Eye", description: "Giant observation wheel with city views", type: "attraction", price: 32, skipTheLine: true, skipTheLinePrice: 45, duration: "1 hour", bookingUrl: "https://www.getyourguide.com/london-l57/london-eye-skip-the-line-t395456/", tips: "Book sunset slot for best photos" },
            { title: "Buckingham Palace", description: "Royal residence (summer opening)", type: "attraction", price: 30, skipTheLine: true, skipTheLinePrice: 42, duration: "2-3 hours", bookingUrl: "https://www.getyourguide.com/london-l57/buckingham-palace-t395457/", tips: "Only open July-September" },
        ],
        "amsterdam": [
            { title: "Anne Frank House", description: "Historic house museum", type: "museum", price: 16, skipTheLine: true, skipTheLinePrice: 28, duration: "1.5 hours", bookingUrl: "https://www.annefrank.org", tips: "Book exactly 2 months in advance at 10am" },
            { title: "Van Gogh Museum", description: "World's largest Van Gogh collection", type: "museum", price: 22, skipTheLine: true, skipTheLinePrice: 32, duration: "2-3 hours", bookingUrl: "https://www.getyourguide.com/amsterdam-l36/van-gogh-museum-skip-the-line-t395458/", tips: "Book timed entry in advance" },
            { title: "Rijksmuseum", description: "Dutch Golden Age masterpieces", type: "museum", price: 22, skipTheLine: true, skipTheLinePrice: 35, duration: "3-4 hours", bookingUrl: "https://www.getyourguide.com/amsterdam-l36/rijksmuseum-skip-the-line-t395459/", tips: "Don't miss The Night Watch" },
            { title: "Canal Cruise", description: "Explore Amsterdam's UNESCO waterways", type: "tour", price: 18, skipTheLine: false, skipTheLinePrice: null, duration: "1 hour", bookingUrl: "https://www.getyourguide.com/amsterdam-l36/canal-cruise-t395460/", tips: "Evening cruises are magical" },
            { title: "Heineken Experience", description: "Interactive brewery tour", type: "attraction", price: 23, skipTheLine: true, skipTheLinePrice: 30, duration: "1.5 hours", bookingUrl: "https://www.getyourguide.com/amsterdam-l36/heineken-experience-t395461/", tips: "Includes 2 beers" },
        ],
    };
    
    // Check if we have specific activities for this destination
    for (const [city, activities] of Object.entries(destinationActivities)) {
        if (destLower.includes(city)) {
            return activities;
        }
    }
    
    // Generic fallback with prices
    return [
        { title: `City Highlights Tour`, description: "Guided tour of main attractions", type: "tour", price: 25, skipTheLine: false, skipTheLinePrice: null, duration: "3 hours", bookingUrl: `https://www.getyourguide.com/s/?q=${encodeURIComponent(destination)}`, tips: null },
        { title: "Main Museum", description: "Discover local history and culture", type: "museum", price: 15, skipTheLine: true, skipTheLinePrice: 25, duration: "2 hours", bookingUrl: `https://www.viator.com/searchResults/all?text=${encodeURIComponent(destination)}`, tips: null },
        { title: "Walking Tour", description: "Explore the old town", type: "tour", price: 12, skipTheLine: false, skipTheLinePrice: null, duration: "2 hours", bookingUrl: `https://www.getyourguide.com/s/?q=${encodeURIComponent(destination)}`, tips: null },
        { title: "Local Market Visit", description: "Experience local life and cuisine", type: "free", price: 0, skipTheLine: false, skipTheLinePrice: null, duration: "2-3 hours", bookingUrl: null, tips: "Best in the morning" },
        { title: "Sunset Viewpoint", description: "Best views of the city", type: "free", price: 0, skipTheLine: false, skipTheLinePrice: null, duration: "1 hour", bookingUrl: null, tips: "Arrive 30 min before sunset" },
    ];
}

// Calculate daily expenses based on budget
function calculateDailyExpenses(budget: string | number): number {
    // Handle old string format
    if (typeof budget === "string") {
        const budgetMap: Record<string, number> = {
            "Low": 1000,
            "Medium": 2000,
            "High": 4000,
            "Luxury": 8000,
        };
        budget = budgetMap[budget] || 2000;
    }
    
    // Estimate daily expenses as roughly 30% of total budget divided by typical 7-day trip
    const estimatedDailyExpense = (budget * 0.3) / 7;
    return Math.max(50, Math.round(estimatedDailyExpense)); // Minimum €50/day
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
    // Extract IATA codes from city names
    const originCode = extractIATACode(origin);
    const destCode = extractIATACode(destination);

    console.log(`🔍 Searching flights: ${origin} (${originCode}) → ${destination} (${destCode}), ${departureDate} to ${returnDate}, ${adults} adults`);
    console.log(`   Preferred time: ${preferredFlightTime}`);

    try {
        // Search for outbound flights - get more results for multiple options
        const url = `https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=${originCode}&destinationLocationCode=${destCode}&departureDate=${departureDate}&adults=${adults}&nonStop=false&max=10`;

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const data = await response.json();
        
        if (!response.ok) {
            console.error("❌ Amadeus API error:", data);
            console.warn("⚠️ Falling back to AI-generated flight data");
            return generateRealisticFlights(
                origin,
                originCode,
                destination,
                destCode,
                departureDate,
                returnDate,
                adults,
                preferredFlightTime
            );
        }
        
        if (!data.data || data.data.length === 0) {
            console.warn("⚠️ No flights found in Amadeus. Generating realistic flight data with AI...");
            return generateRealisticFlights(
                origin,
                originCode,
                destination,
                destCode,
                departureDate,
                returnDate,
                adults,
                preferredFlightTime
            );
        }

        console.log(`✅ Found ${data.data.length} flight offers from Amadeus`);

        // Now search for return flights separately
        const returnUrl = `https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=${destCode}&destinationLocationCode=${originCode}&departureDate=${returnDate}&adults=${adults}&nonStop=false&max=10`;

        const returnResponse = await fetch(returnUrl, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const returnData = await returnResponse.json();
        
        if (!returnResponse.ok || !returnData.data || returnData.data.length === 0) {
            console.warn("⚠️ No return flights found, using outbound data for both directions");
        }

        // Process multiple flight options
        const flightOptions = [];
        const numOptions = Math.min(data.data.length, 4); // Up to 4 options
        
        // Find the best (lowest) price
        let bestPrice = Infinity;
        for (let i = 0; i < numOptions; i++) {
            const outboundOffer = data.data[i];
            const returnOffer = returnData.data?.[i] || returnData.data?.[0] || outboundOffer;
            const totalPrice = parseFloat(outboundOffer.price.total) + (returnData.data?.[i] ? parseFloat(returnOffer.price.total) : parseFloat(outboundOffer.price.total));
            if (totalPrice < bestPrice) {
                bestPrice = totalPrice;
            }
        }

        for (let i = 0; i < numOptions; i++) {
            const outboundOffer = data.data[i];
            const outbound = outboundOffer.itineraries[0];
            
            const returnOffer = returnData.data?.[i] || returnData.data?.[0] || outboundOffer;
            const returnFlight = returnOffer.itineraries[0];
            
            const totalPrice = parseFloat(outboundOffer.price.total) + (returnData.data?.[i] ? parseFloat(returnOffer.price.total) : parseFloat(outboundOffer.price.total));
            
            // Determine flight time category
            const departureHour = new Date(outbound.segments[0].departure.at).getHours();
            let timeCategory = "morning";
            if (departureHour >= 12 && departureHour < 17) timeCategory = "afternoon";
            else if (departureHour >= 17 && departureHour < 21) timeCategory = "evening";
            else if (departureHour >= 21 || departureHour < 6) timeCategory = "night";
            
            // Generate a booking URL (Skyscanner deep link)
            const depDateStr = departureDate.slice(2).replace(/-/g, '');
            const retDateStr = returnDate.slice(2).replace(/-/g, '');
            const bookingUrl = `https://www.skyscanner.com/transport/flights/${originCode}/${destCode}/${depDateStr}/${retDateStr}`;

            flightOptions.push({
                id: i + 1,
                outbound: {
                    airline: getAirlineName(outbound.segments[0].carrierCode),
                    airlineCode: outbound.segments[0].carrierCode,
                    flightNumber: `${outbound.segments[0].carrierCode}${outbound.segments[0].number}`,
                    duration: formatDuration(outbound.duration),
                    departure: formatTime(outbound.segments[0].departure.at),
                    arrival: formatTime(outbound.segments[outbound.segments.length - 1].arrival.at),
                    stops: outbound.segments.length - 1,
                    departureTime: outbound.segments[0].departure.at,
                },
                return: {
                    airline: getAirlineName(returnFlight.segments[0].carrierCode),
                    airlineCode: returnFlight.segments[0].carrierCode,
                    flightNumber: `${returnFlight.segments[0].carrierCode}${returnFlight.segments[0].number}`,
                    duration: formatDuration(returnFlight.duration),
                    departure: formatTime(returnFlight.segments[0].departure.at),
                    arrival: formatTime(returnFlight.segments[returnFlight.segments.length - 1].arrival.at),
                    stops: returnFlight.segments.length - 1,
                    departureTime: returnFlight.segments[0].departure.at,
                },
                luggage: `${outboundOffer.travelerPricings[0].fareDetailsBySegment[0].includedCheckedBags?.quantity || 0} checked bag(s) included`,
                cabinBaggage: "1 cabin bag included",
                pricePerPerson: totalPrice,
                totalPrice: totalPrice * adults,
                currency: outboundOffer.price.currency || "EUR",
                isBestPrice: totalPrice === bestPrice,
                timeCategory,
                matchesPreference: preferredFlightTime === "any" || timeCategory === preferredFlightTime,
                bookingUrl,
            });
        }

        // Sort by preference match first, then by price
        flightOptions.sort((a, b) => {
            if (a.matchesPreference && !b.matchesPreference) return -1;
            if (!a.matchesPreference && b.matchesPreference) return 1;
            return a.pricePerPerson - b.pricePerPerson;
        });

        return {
            options: flightOptions,
            bestPrice,
            preferredTime: preferredFlightTime,
            dataSource: "amadeus",
        };
    } catch (error: any) {
        console.error("❌ Error searching flights:", error);
        console.warn("⚠️ Falling back to AI-generated flight data");
        return generateRealisticFlights(
            origin,
            originCode,
            destination,
            destCode,
            departureDate,
            returnDate,
            adults,
            preferredFlightTime
        );
    }
}

// Generate realistic flight data using AI and real airline routes
async function generateRealisticFlights(
    origin: string,
    originCode: string,
    destination: string,
    destCode: string,
    departureDate: string,
    returnDate: string,
    adults: number,
    preferredFlightTime: string = "any"
) {
    console.log("🤖 Generating realistic flight data with AI...");
    console.log(`   Preferred time: ${preferredFlightTime}`);
    
    // Get realistic airlines for this route
    const airlines = getRealisticAirlinesForRoute(originCode, destCode);
    
    // Calculate realistic flight duration based on distance
    const duration = calculateFlightDuration(originCode, destCode);
    
    // Define time slots based on preference
    const timeSlots = [
        { name: "morning", departure: "06:30 AM", label: "Early Morning" },
        { name: "morning", departure: "09:15 AM", label: "Morning" },
        { name: "afternoon", departure: "13:45 PM", label: "Afternoon" },
        { name: "evening", departure: "18:30 PM", label: "Evening" },
        { name: "night", departure: "22:15 PM", label: "Night" },
    ];
    
    // Calculate base price
    const basePrice = calculateRealisticPrice(originCode, destCode);
    
    // Generate a booking URL (Skyscanner deep link)
    const depDateStr = departureDate.slice(2).replace(/-/g, '');
    const retDateStr = returnDate.slice(2).replace(/-/g, '');
    const bookingUrl = `https://www.skyscanner.com/transport/flights/${originCode}/${destCode}/${depDateStr}/${retDateStr}`;

    // Generate multiple flight options
    const flightOptions = [];
    
    // Generate 4 different flight options with varying times and prices
    const selectedSlots = preferredFlightTime === "any" 
        ? [timeSlots[1], timeSlots[2], timeSlots[3], timeSlots[0]] // Morning, Afternoon, Evening, Early
        : [
            timeSlots.find(s => s.name === preferredFlightTime) || timeSlots[1],
            ...timeSlots.filter(s => s.name !== preferredFlightTime).slice(0, 3)
        ];
    
    let bestPrice = Infinity;
    
    // First pass to find best price
    for (let i = 0; i < 4; i++) {
        // Price varies: early morning and night are cheaper, afternoon is most expensive
        const priceMultiplier = i === 0 ? 1.0 : i === 1 ? 1.15 : i === 2 ? 1.25 : 0.9;
        const price = Math.round(basePrice * priceMultiplier);
        if (price < bestPrice) bestPrice = price;
    }
    
    for (let i = 0; i < 4; i++) {
        const slot = selectedSlots[i] || timeSlots[i];
        const airline = airlines[i % airlines.length];
        
        // Price varies: early morning and night are cheaper, afternoon is most expensive
        const priceMultiplier = i === 0 ? 1.0 : i === 1 ? 1.15 : i === 2 ? 1.25 : 0.9;
        const price = Math.round(basePrice * priceMultiplier);
        
        const outboundDeparture = slot.departure;
        const outboundArrival = addHoursToTime(outboundDeparture, duration);
        
        // Return flight times (different from outbound)
        const returnSlot = timeSlots[(i + 2) % timeSlots.length];
        const returnDeparture = returnSlot.departure;
        const returnArrival = addHoursToTime(returnDeparture, duration);
        
        flightOptions.push({
            id: i + 1,
            outbound: {
                airline: airline.name,
                airlineCode: airline.code,
                flightNumber: `${airline.code}${Math.floor(Math.random() * 9000) + 1000}`,
                duration: `${Math.floor(duration)}h ${Math.round((duration % 1) * 60)}m`,
                departure: outboundDeparture,
                arrival: outboundArrival,
                stops: i === 3 ? 1 : 0, // Last option has 1 stop (cheaper)
                departureTime: `${departureDate}T${convertTo24Hour(outboundDeparture)}:00`,
            },
            return: {
                airline: airline.name,
                airlineCode: airline.code,
                flightNumber: `${airline.code}${Math.floor(Math.random() * 9000) + 1000}`,
                duration: `${Math.floor(duration)}h ${Math.round((duration % 1) * 60)}m`,
                departure: returnDeparture,
                arrival: returnArrival,
                stops: i === 3 ? 1 : 0,
                departureTime: `${returnDate}T${convertTo24Hour(returnDeparture)}:00`,
            },
            luggage: i < 2 ? "1 checked bag included" : "Cabin bag only",
            cabinBaggage: "1 cabin bag (8kg) included",
            checkedBaggageIncluded: i < 2, // First 2 options include checked bag
            checkedBaggagePrice: i < 2 ? 0 : (25 + Math.floor(Math.random() * 20)), // €25-45 if not included
            pricePerPerson: price,
            totalPrice: price * adults,
            currency: "EUR",
            isBestPrice: price === bestPrice,
            timeCategory: slot.name,
            matchesPreference: preferredFlightTime === "any" || slot.name === preferredFlightTime,
            label: slot.label,
            bookingUrl,
        });
    }
    
    // Sort by preference match first, then by price
    flightOptions.sort((a, b) => {
        if (a.matchesPreference && !b.matchesPreference) return -1;
        if (!a.matchesPreference && b.matchesPreference) return 1;
        return a.pricePerPerson - b.pricePerPerson;
    });
    
    return {
        options: flightOptions,
        bestPrice,
        preferredTime: preferredFlightTime,
        dataSource: "ai-generated",
    };
}

// Helper function to search hotels
async function searchHotels(
    token: string,
    cityCode: string,
    checkInDate: string,
    checkOutDate: string,
    adults: number
) {
    console.log(`🔍 Searching hotels in ${cityCode}, ${checkInDate} to ${checkOutDate}`);
    
    try {
        const url = `https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city?cityCode=${cityCode}&radius=30&radiusUnit=KM&hotelSource=ALL`;
        
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        
        const data = await response.json();
        
        if (!response.ok || !data.data || data.data.length === 0) {
            console.warn("⚠️ No hotels found from Amadeus");
            return [];
        }
        
        // Return top 5 hotels with basic info
        return data.data.slice(0, 5).map((hotel: any, index: number) => ({
            id: hotel.hotelId,
            name: hotel.name,
            rating: 4 + (index < 2 ? 1 : 0), // Simulate ratings
            pricePerNight: 80 + (index * 30), // Simulate prices
            currency: "EUR",
            amenities: ["WiFi", "Breakfast", "Air Conditioning"],
        }));
    } catch (error) {
        console.error("❌ Error searching hotels:", error);
        return [];
    }
}

// Helper function to search activities
async function searchActivities(destination: string) {
    console.log(`🔍 Searching activities in ${destination}`);
    
    // Try Viator first
    const viatorKey = process.env.VIATOR_API_KEY;
    if (viatorKey) {
        try {
            const viatorActivities = await searchViatorActivities(destination, viatorKey);
            if (viatorActivities.length > 0) {
                console.log(`✅ Found ${viatorActivities.length} activities from Viator`);
                return viatorActivities;
            }
        } catch (error) {
            console.error("❌ Viator search failed:", error);
        }
    }
    
    // Fallback to generated activities
    console.log("⚠️ Using fallback activities");
    return getFallbackActivities(destination);
}

// Helper function to search restaurants
async function searchRestaurants(destination: string) {
    console.log(`🔍 Searching restaurants in ${destination}`);
    
    // Try TripAdvisor
    const tripAdvisorKey = process.env.TRIPADVISOR_API_KEY;
    if (tripAdvisorKey) {
        try {
            const restaurants = await searchTripAdvisorRestaurants(destination, tripAdvisorKey);
            if (restaurants.length > 0) {
                console.log(`✅ Found ${restaurants.length} restaurants from TripAdvisor`);
                return restaurants;
            }
        } catch (error) {
            console.error("❌ TripAdvisor search failed:", error);
        }
    }
    
    // Fallback to generated restaurants
    console.log("⚠️ Using fallback restaurants");
    return getFallbackRestaurants(destination);
}
