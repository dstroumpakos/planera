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
            // Return empty result which will trigger fallback in the caller
            throw new Error("No flights found");
        }

        // Transform Amadeus result to our format
        const flightOptions = data.data.slice(0, 5).map((offer: any, index: number) => {
            const itinerary = offer.itineraries[0];
            const returnItinerary = offer.itineraries[1];
            const segment = itinerary.segments[0];
            const returnSegment = returnItinerary?.segments[0];
            
            return {
                id: index + 1,
                outbound: {
                    airline: getAirlineName(segment.carrierCode),
                    airlineCode: segment.carrierCode,
                    flightNumber: `${segment.carrierCode}${segment.number}`,
                    duration: formatDuration(itinerary.duration),
                    departure: formatTime(segment.departure.at),
                    arrival: formatTime(segment.arrival.at),
                    stops: itinerary.segments.length - 1,
                    departureTime: segment.departure.at,
                },
                return: returnSegment ? {
                    airline: getAirlineName(returnSegment.carrierCode),
                    airlineCode: returnSegment.carrierCode,
                    flightNumber: `${returnSegment.carrierCode}${returnSegment.number}`,
                    duration: formatDuration(returnItinerary.duration),
                    departure: formatTime(returnSegment.departure.at),
                    arrival: formatTime(returnSegment.arrival.at),
                    stops: returnItinerary.segments.length - 1,
                    departureTime: returnSegment.departure.at,
                } : null,
                pricePerPerson: parseFloat(offer.price.total) / adults,
                totalPrice: parseFloat(offer.price.total),
                currency: offer.price.currency,
                bookingUrl: `https://www.skyscanner.com/transport/flights/${originCode}/${destCode}/${departureDate.slice(2).replace(/-/g, '')}/${returnDate.slice(2).replace(/-/g, '')}`,
                isBestPrice: index === 0,
                // Add missing fields required by the UI
                luggage: "1 checked bag included",
                cabinBaggage: "1 cabin bag (8kg) included",
                checkedBaggageIncluded: true,
                checkedBaggagePrice: 0,
                timeCategory: "any",
                matchesPreference: true,
                label: "Best Value"
            };
        });

        return {
            options: flightOptions,
            bestPrice: flightOptions[0]?.pricePerPerson || 0,
            preferredTime: preferredFlightTime,
            dataSource: "amadeus"
        };
    } catch (error) {
        console.error("❌ Amadeus flight search failed:", error);
        throw error; // Re-throw to trigger fallback
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

// Helper to convert 12-hour time to 24-hour format
function convertTo24Hour(time12h: string): string {
    const [time, modifier] = time12h.split(' ');
    let [hours, minutes] = time.split(':');
    
    if (hours === '12') {
        hours = modifier === 'AM' ? '00' : '12';
    } else if (modifier === 'PM') {
        hours = String(parseInt(hours, 10) + 12);
    }
    
    return `${hours.padStart(2, '0')}:${minutes}`;
}

// Get realistic airlines that operate on a specific route
function getRealisticAirlinesForRoute(originCode: string, destCode: string): Array<{ code: string; name: string }> {
    // European routes
    const europeanAirlines = [
        { code: "A3", name: "Aegean Airlines" },
        { code: "AF", name: "Air France" },
        { code: "BA", name: "British Airways" },
        { code: "LH", name: "Lufthansa" },
        { code: "KL", name: "KLM" },
        { code: "IB", name: "Iberia" },
        { code: "AZ", name: "ITA Airways" },
        { code: "FR", name: "Ryanair" },
        { code: "U2", name: "easyJet" },
    ];
    
    // Middle East routes
    const middleEastAirlines = [
        { code: "EK", name: "Emirates" },
        { code: "QR", name: "Qatar Airways" },
        { code: "EY", name: "Etihad Airways" },
        { code: "TK", name: "Turkish Airlines" },
    ];
    
    // US routes
    const usAirlines = [
        { code: "AA", name: "American Airlines" },
        { code: "DL", name: "Delta Air Lines" },
        { code: "UA", name: "United Airlines" },
    ];
    
    // Asian routes
    const asianAirlines = [
        { code: "SQ", name: "Singapore Airlines" },
        { code: "NH", name: "All Nippon Airways" },
        { code: "CX", name: "Cathay Pacific" },
        { code: "BKK", name: "Thai Airways" },
    ];
    
    // Determine which airlines operate this route based on origin/destination
    const europeanCodes = ["ATH", "CDG", "LHR", "FCO", "BCN", "MAD", "AMS", "BER", "MUC", "FRA", "VIE", "ZRH", "BRU", "LIS", "DUB", "CPH", "ARN", "OSL", "HEL", "MXP", "VCE", "PRG", "BUD", "WAW"];
    const middleEastCodes = ["DXB", "DOH", "AUH", "RUH", "JED", "CAI", "TLV", "IST"];
    const usCodes = ["JFK", "LAX", "ORD", "MIA", "SFO", "BOS", "IAD"];
    const asianCodes = ["NRT", "SIN", "HKG", "PEK", "PVG", "ICN", "BKK", "KUL", "CGK", "MNL", "DEL", "BOM", "SYD", "MEL"];
    
    const isEuropeanRoute = europeanCodes.includes(originCode) && europeanCodes.includes(destCode);
    const isMiddleEastRoute = middleEastCodes.includes(originCode) || middleEastCodes.includes(destCode);
    const isUSRoute = usCodes.includes(originCode) || usCodes.includes(destCode);
    const isAsianRoute = asianCodes.includes(originCode) || asianCodes.includes(destCode);
    
    if (isEuropeanRoute) return europeanAirlines;
    if (isMiddleEastRoute) return middleEastAirlines;
    if (isUSRoute) return usAirlines;
    if (isAsianRoute) return asianAirlines;
    
    // Default to European airlines for unknown routes
    return europeanAirlines;
}

// Calculate realistic flight duration based on airport codes (simplified)
function calculateFlightDuration(originCode: string, destCode: string): number {
    // Approximate flight durations in hours (simplified)
    const durationMap: Record<string, Record<string, number>> = {
        "ATH": { "CDG": 3.5, "LHR": 3.8, "FCO": 2.0, "BCN": 3.0, "MAD": 3.5, "AMS": 3.5, "BER": 2.8, "DXB": 4.5, "JFK": 11.0 },
        "CDG": { "ATH": 3.5, "LHR": 1.2, "FCO": 2.0, "BCN": 2.0, "MAD": 2.0, "AMS": 1.0, "BER": 1.8, "DXB": 6.5, "JFK": 8.5 },
        "LHR": { "ATH": 3.8, "CDG": 1.2, "FCO": 2.5, "BCN": 2.2, "MAD": 2.5, "AMS": 1.0, "BER": 2.0, "DXB": 7.0, "JFK": 8.0 },
        // Add more as needed
    };
    
    const duration = durationMap[originCode]?.[destCode] || durationMap[destCode]?.[originCode];
    
    if (duration) return duration;
    
    // Fallback: estimate based on typical short/medium/long haul
    return 2.5; // Default to ~2.5 hours for unknown routes
}

// Calculate realistic pricing based on route
function calculateRealisticPrice(originCode: string, destCode: string): number {
    // Base prices in EUR
    const shortHaul = 80; // < 2 hours
    const mediumHaul = 150; // 2-5 hours
    const longHaul = 400; // > 5 hours
    
    const duration = calculateFlightDuration(originCode, destCode);
    
    if (duration < 2) return shortHaul + Math.random() * 40;
    if (duration < 5) return mediumHaul + Math.random() * 100;
    return longHaul + Math.random() * 200;
}

// Helper to add hours to a time string
function addHoursToTime(time: string, hours: number): string {
    const [timePart, period] = time.split(' ');
    const [hoursStr, minutesStr] = timePart.split(':');
    let totalHours = parseInt(hoursStr);
    const minutes = parseInt(minutesStr);
    
    // Convert to 24-hour format
    if (period === 'PM' && totalHours !== 12) totalHours += 12;
    if (period === 'AM' && totalHours === 12) totalHours = 0;
    
    // Add flight duration
    totalHours += Math.floor(hours);
    const totalMinutes = minutes + Math.round((hours % 1) * 60);
    
    if (totalMinutes >= 60) {
        totalHours += 1;
    }
    
    const finalMinutes = totalMinutes % 60;
    const finalHours = totalHours % 24;
    
    // Convert back to 12-hour format
    const displayHours = finalHours > 12 ? finalHours - 12 : (finalHours === 0 ? 12 : finalHours);
    const displayPeriod = finalHours >= 12 ? 'PM' : 'AM';
    
    return `${displayHours.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')} ${displayPeriod}`;
}

// Helper function to format duration from ISO 8601 (e.g., "PT2H30M" -> "2h 30m")
function formatDuration(duration: string): string {
    const match = duration.match(/PT(\d+H)?(\d+M)?/);
    if (!match) return duration;
    const hours = match[1] ? match[1].replace('H', 'h ') : '';
    const minutes = match[2] ? match[2].replace('M', 'm') : '';
    return (hours + minutes).trim();
}

// Helper function to format time (e.g., "2025-11-23T10:00:00" -> "10:00 AM")
function formatTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// Helper function to search hotels
async function searchHotels(
  token: string,
  cityCode: string,
  checkInDate: string,
  checkOutDate: string,
  adults: number
): Promise<any[]> {
  try {
    // First, get hotel IDs by city
    const searchUrl = `https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city?cityCode=${cityCode}&radius=50&radiusUnit=KM&hotelSource=ALL`;
    
    const searchResponse = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!searchResponse.ok) {
      const errorData = await searchResponse.json();
      console.log("❌ Amadeus Hotel Search API error:", errorData);
      // Return empty array instead of throwing
      return [];
    }

    const searchData = await searchResponse.json();
    const hotelIds = searchData.data?.slice(0, 10).map((h: any) => h.hotelId) || [];

    if (hotelIds.length === 0) {
      console.log("⚠️ No hotels found in this area");
      return [];
    }

    // Get hotel offers
    const offersUrl = `https://test.api.amadeus.com/v3/shopping/hotel-offers?hotelIds=${hotelIds.join(",")}&checkInDate=${checkInDate}&checkOutDate=${checkOutDate}&adults=${adults}&roomQuantity=1&currency=EUR&bestRateOnly=true`;

    const offersResponse = await fetch(offersUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!offersResponse.ok) {
      const errorData = await offersResponse.json();
      console.log("❌ Amadeus Hotel Offers API error:", errorData);
      // Return empty array instead of throwing
      return [];
    }

    const offersData = await offersResponse.json();

    if (!offersData.data || offersData.data.length === 0) {
      console.log("⚠️ No hotel offers available for these dates");
      return [];
    }

    // Return up to 3 hotels
    return offersData.data.slice(0, 3).map((hotel: any) => {
      const offer = hotel.offers?.[0];
      return {
        name: hotel.hotel?.name || "Hotel",
        rating: hotel.hotel?.rating || "4",
        price: offer?.price?.total || "150",
        currency: offer?.price?.currency || "EUR",
        amenities: hotel.hotel?.amenities?.slice(0, 5) || ["WiFi", "Breakfast", "Pool"],
        address: hotel.hotel?.address?.lines?.[0] || "City Center",
        description: hotel.hotel?.description?.text || `Comfortable accommodation in the heart of the city`,
      };
    });
  } catch (error: any) {
    console.error("❌ Error in hotel search:", error);
    // Return empty array instead of throwing
    return [];
  }
}

// Helper function to search activities
async function searchActivities(destination: string) {
    const viatorKey = process.env.VIATOR_API_KEY;
    
    if (!viatorKey) {
        console.warn("⚠️ Viator API key not configured. Using destination-specific fallback activities.");
        return getFallbackActivities(destination);
    }

    console.log(`🎯 Searching activities in ${destination} via Viator`);
    try {
        const activities = await searchViatorActivities(destination, viatorKey);
        if (activities.length > 0) {
            console.log(`✅ Found ${activities.length} activities via Viator`);
            return activities;
        }
        console.warn("⚠️ No activities found via Viator. Using fallback.");
        return getFallbackActivities(destination);
    } catch (error) {
        console.error("❌ Viator activities failed:", error);
        return getFallbackActivities(destination);
    }
}

// TripAdvisor Content API - Search for city/destination location ID
async function searchTripAdvisorLocation(destination: string, apiKey: string): Promise<{ locationId: string; name: string } | null> {
    try {
        // Use "geos" category to find cities/destinations, not restaurants
        const searchUrl = `https://api.content.tripadvisor.com/api/v1/location/search?key=${apiKey}&searchQuery=${encodeURIComponent(destination)}&category=geos&language=en`;
        
        console.log(`🔍 TripAdvisor searching for city: ${destination}`);
        
        const response = await fetch(searchUrl, {
            method: "GET",
            headers: {
                "Accept": "application/json",
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("TripAdvisor location search error:", response.status, errorText);
            return null;
        }

        const data = await response.json();
        
        if (data.data && data.data.length > 0) {
            // Find the best match - prefer cities over regions
            const cityMatch = data.data.find((loc: any) => 
                loc.name.toLowerCase().includes(destination.toLowerCase()) ||
                destination.toLowerCase().includes(loc.name.toLowerCase())
            ) || data.data[0];
            
            console.log(`✅ Found TripAdvisor city: ${cityMatch.name} (ID: ${cityMatch.location_id})`);
            return { locationId: cityMatch.location_id, name: cityMatch.name };
        }
        
        return null;
    } catch (error) {
        console.error("❌ TripAdvisor location search error:", error);
        return null;
    }
}

// TripAdvisor Content API - Search for restaurants using location/search with restaurants category
async function searchTripAdvisorRestaurants(destination: string, apiKey: string) {
    try {
        // Step 1: Get the city location to find its coordinates
        const cityLocation = await searchTripAdvisorLocation(destination, apiKey);
        
        if (!cityLocation) {
            console.warn("⚠️ Could not find TripAdvisor city for:", destination);
            return [];
        }

        // Step 2: Get city details to get lat/long
        const cityDetailsUrl = `https://api.content.tripadvisor.com/api/v1/location/${cityLocation.locationId}/details?key=${apiKey}&language=en&currency=EUR`;
        
        const cityDetailsResponse = await fetch(cityDetailsUrl, {
            method: "GET",
            headers: { "Accept": "application/json" }
        });

        let latLong = "";
        if (cityDetailsResponse.ok) {
            const cityDetails = await cityDetailsResponse.json();
            if (cityDetails.latitude && cityDetails.longitude) {
                latLong = `${cityDetails.latitude},${cityDetails.longitude}`;
                console.log(`📍 City coordinates: ${latLong}`);
            }
        }

        // Step 3: Search for top-rated restaurants - always use search endpoint with "top rated" query
        // This returns better quality results than nearby_search
        const restaurantsUrl = `https://api.content.tripadvisor.com/api/v1/location/search?key=${apiKey}&searchQuery=top rated restaurants ${encodeURIComponent(cityLocation.name)}&category=restaurants&language=en`;
        
        console.log(`🍽️ Searching top-rated restaurants in: ${cityLocation.name}`);
        
        const response = await fetch(restaurantsUrl, {
            method: "GET",
            headers: { "Accept": "application/json" }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("TripAdvisor restaurants search error:", response.status, errorText);
            return [];
        }

        const data = await response.json();
        
        if (!data.data || data.data.length === 0) {
            console.warn("⚠️ No restaurants found via TripAdvisor search");
            return [];
        }

        console.log(`✅ Found ${data.data.length} restaurants via TripAdvisor`);

        // Step 4: Get details for more restaurants (up to 30) to find the best rated ones
        const restaurantList = data.data.slice(0, 30); // Fetch up to 30 to get better selection
        
        console.log(`🔍 Fetching details for ${restaurantList.length} restaurants...`);
        
        const restaurants: Array<{
            name: string;
            priceRange: string;
            cuisine: string;
            rating: number;
            address: string;
            reviewCount: number;
            tripAdvisorUrl: string | null;
            phone: string | null;
            description: string | null;
        }> = [];
        
        for (const restaurant of restaurantList) {
            try {
                const detailsUrl = `https://api.content.tripadvisor.com/api/v1/location/${restaurant.location_id}/details?key=${apiKey}&language=en&currency=EUR`;
                
                const detailsResponse = await fetch(detailsUrl, {
                    method: "GET",
                    headers: { "Accept": "application/json" }
                });

                if (detailsResponse.ok) {
                    const details = await detailsResponse.json();
                    
                    // Map price level to price range
                    const priceLevel = details.price_level || "$";
                    const priceRange = priceLevel === "$" ? "€" : 
                                      priceLevel === "$$" || priceLevel === "$$ - $$$" ? "€€" :
                                      priceLevel === "$$$" || priceLevel === "$$$ - $$$$" ? "€€€" : "€€€€";
                    
                    const rating = parseFloat(details.rating) || 0;
                    const reviewCount = parseInt(details.num_reviews) || 0;
                    
                    console.log(`   📊 ${details.name}: Rating ${rating}, Reviews ${reviewCount}`);
                    
                    // Only include restaurants with rating >= 4.0 and at least some reviews
                    if (rating >= 4.0 && reviewCount >= 10) {
                        restaurants.push({
                            name: details.name || restaurant.name,
                            priceRange: priceRange,
                            cuisine: details.cuisine?.[0]?.localized_name || details.subcategory?.[0]?.localized_name || "Local Cuisine",
                            rating: rating,
                            address: details.address_obj?.street1 || details.address_obj?.address_string || cityLocation.name,
                            reviewCount: reviewCount,
                            tripAdvisorUrl: details.web_url || null,
                            phone: details.phone || null,
                            description: details.description || null,
                        });
                    }
                }
                
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (detailError) {
                console.error("Error fetching restaurant details:", detailError);
            }
        }

        // Sort by rating (highest first), then by review count as tiebreaker
        restaurants.sort((a: any, b: any) => {
            if (b.rating !== a.rating) {
                return b.rating - a.rating; // Higher rating first
            }
            return b.reviewCount - a.reviewCount; // More reviews as tiebreaker
        });
        
        // Return top 20 highest-rated restaurants
        const topRestaurants = restaurants.slice(0, 20);

        console.log(`✅ Returning top ${topRestaurants.length} highest-rated restaurants (4.0+ rating)`);
        topRestaurants.forEach((r: any, i: number) => {
            console.log(`   ${i + 1}. ${r.name} - Rating: ${r.rating} ⭐ (${r.reviewCount} reviews)`);
        });
        
        // If we didn't find enough high-rated restaurants, lower the threshold
        if (topRestaurants.length < 5) {
            console.log("⚠️ Not enough high-rated restaurants, including lower rated ones...");
            // Re-fetch without the rating filter
            return await searchTripAdvisorRestaurantsNoFilter(destination, apiKey, cityLocation);
        }
        
        return topRestaurants;
    } catch (error) {
        console.error("❌ TripAdvisor restaurants search error:", error);
        return [];
    }
}

// Fallback search without rating filter
async function searchTripAdvisorRestaurantsNoFilter(destination: string, apiKey: string, cityLocation: { locationId: string; name: string }) {
    try {
        const restaurantsUrl = `https://api.content.tripadvisor.com/api/v1/location/search?key=${apiKey}&searchQuery=popular restaurants ${encodeURIComponent(cityLocation.name)}&category=restaurants&language=en`;
        
        const response = await fetch(restaurantsUrl, {
            method: "GET",
            headers: { "Accept": "application/json" }
        });

        if (!response.ok) return [];

        const data = await response.json();
        if (!data.data || data.data.length === 0) return [];

        const restaurants: Array<{
            name: string;
            priceRange: string;
            cuisine: string;
            rating: number;
            address: string;
            reviewCount: number;
            tripAdvisorUrl: string | null;
            phone: string | null;
            description: string | null;
        }> = [];
        
        for (const restaurant of data.data.slice(0, 25)) {
            try {
                const detailsUrl = `https://api.content.tripadvisor.com/api/v1/location/${restaurant.location_id}/details?key=${apiKey}&language=en&currency=EUR`;
                const detailsResponse = await fetch(detailsUrl, {
                    method: "GET",
                    headers: { "Accept": "application/json" }
                });

                if (detailsResponse.ok) {
                    const details = await detailsResponse.json();
                    const priceLevel = details.price_level || "$";
                    const priceRange = priceLevel === "$" ? "€" : 
                                      priceLevel === "$$" || priceLevel === "$$ - $$$" ? "€€" :
                                      priceLevel === "$$$" || priceLevel === "$$$ - $$$$" ? "€€€" : "€€€€";
                    
                    restaurants.push({
                        name: details.name || restaurant.name,
                        priceRange: priceRange,
                        cuisine: details.cuisine?.[0]?.localized_name || "Local Cuisine",
                        rating: parseFloat(details.rating) || 4.0,
                        address: details.address_obj?.street1 || cityLocation.name,
                        reviewCount: parseInt(details.num_reviews) || 0,
                        tripAdvisorUrl: details.web_url || null,
                        phone: details.phone || null,
                        description: details.description || null,
                    });
                }
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (e) {
                console.error("Error in fallback restaurant fetch:", e);
            }
        }

        // Still sort by rating
        restaurants.sort((a, b) => b.rating - a.rating);
        return restaurants.slice(0, 20);
    } catch (error) {
        console.error("❌ Fallback restaurant search error:", error);
        return [];
    }
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

// Viator API - Search for activities/experiences
async function searchViatorActivities(destination: string, apiKey: string) {
    try {
        // Use /search/freetext endpoint which is available for Basic-access Affiliate
        console.log(`🔍 Searching Viator activities for: ${destination}`);
        
        const searchResponse = await fetch(
            "https://api.viator.com/v2/experiences/search/freetext?text=${encodeURIComponent(destination)}&limit=50",
            {
                method: "POST",
                headers: {
                    "Accept": "application/json;version=2.0",
                    "Accept-Language": "en-US",
                    "Content-Type": "application/json",
                    "exp-api-key": apiKey,
                },
                body: JSON.stringify({
                    searchTerm: `${destination} tours activities`,
                    searchTypes: [
                        { searchType: "PRODUCTS", pagination: { start: 1, count: 25 } }
                    ],
                    currency: "EUR"
                })
            }
        );

        if (!searchResponse.ok) {
            const errorText = await searchResponse.text();
            console.error("Viator freetext search API error:", searchResponse.status, errorText);
            throw new Error(`Viator freetext search failed: ${searchResponse.status}`);
        }

        const searchData = await searchResponse.json();
        
        // Extract products from freetext search results
        const products = searchData.products?.results || [];
        
        if (products.length === 0) {
            console.warn("⚠️ No products found via Viator freetext search");
            return [];
        }

        console.log(`✅ Found ${products.length} activities via Viator freetext search`);

        // Get detailed product info using /products/search endpoint
        const productCodes = products.slice(0, 20).map((p: any) => p.productCode).filter(Boolean);
        
        if (productCodes.length === 0) {
            // Return basic info from freetext search
            return products.slice(0, 20).map((product: any) => ({
                title: product.title || "Activity",
                price: product.pricing?.summary?.fromPrice || 25,
                currency: product.pricing?.currency || "EUR",
                duration: "2-3h",
                description: product.shortDescription || product.description?.substring(0, 200) || "Popular activity",
                rating: product.reviews?.combinedAverageRating || 4.5,
                reviewCount: product.reviews?.totalReviews || 0,
                productCode: product.productCode,
                bookingUrl: product.productCode ? `https://www.viator.com/tours/${product.productCode}` : null,
                image: product.primaryImage?.url || product.images?.[0]?.url || null,
                skipTheLine: product.title?.toLowerCase().includes("skip") ||
                            product.title?.toLowerCase().includes("priority"),
                skipTheLinePrice: null,
            }));
        }

        // Use /products/search to get more details
        const productsResponse = await fetch(
            "https://api.viator.com/v2/products?ids=${productCodes.join(',')}&currency=USD",
            {
                method: "POST",
                headers: {
                    "Accept": "application/json;version=2.0",
                    "Accept-Language": "en-US",
                    "Content-Type": "application/json",
                    "exp-api-key": apiKey,
                },
                body: JSON.stringify({
                    filtering: {
                        productCodes: productCodes,
                    },
                    currency: "EUR"
                })
            }
        );

        if (!productsResponse.ok) {
            // Fall back to basic freetext results
            console.warn("⚠️ Products search failed, using freetext results");
            return products.slice(0, 20).map((product: any) => ({
                title: product.title || "Activity",
                price: product.pricing?.summary?.fromPrice || 25,
                currency: product.pricing?.currency || "EUR",
                duration: "2-3h",
                description: product.shortDescription || product.description?.substring(0, 200) || "Popular activity",
                rating: product.rating || 4.5,
                reviewCount: product.reviewCount || 0,
                productCode: product.productCode,
                bookingUrl: product.productCode ? `https://www.viator.com/tours/${product.productCode}` : null,
                image: product.images?.[0]?.variants?.find((v: any) => v.width >= 400)?.url || 
                   product.images?.[0]?.variants?.[0]?.url || null,
                skipTheLine: product.flags?.includes("SKIP_THE_LINE") || 
                        product.title?.toLowerCase().includes("skip") ||
                        product.title?.toLowerCase().includes("priority"),
                skipTheLinePrice: product.flags?.includes("SKIP_THE_LINE") 
                ? (product.pricing?.summary?.fromPrice || 25) 
                : null,
            }));
        }

        const productsData = await productsResponse.json();
        
        if (!productsData.products || productsData.products.length === 0) {
            // Fall back to basic freetext results
            return products.slice(0, 20).map((product: any) => ({
                title: product.title || "Activity",
                price: product.pricing?.summary?.fromPrice || 25,
                currency: product.pricing?.currency || "EUR",
                duration: "2-3h",
                description: product.shortDescription || product.description?.substring(0, 200) || "Popular activity",
                rating: product.rating || 4.5,
                reviewCount: product.reviewCount || 0,
                productCode: product.productCode,
                bookingUrl: product.productCode ? `https://www.viator.com/tours/${product.productCode}` : null,
                image: product.images?.[0]?.variants?.find((v: any) => v.width >= 400)?.url || 
                   product.images?.[0]?.variants?.[0]?.url || null,
                skipTheLine: product.flags?.includes("SKIP_THE_LINE") || 
                        product.title?.toLowerCase().includes("skip") ||
                        product.title?.toLowerCase().includes("priority"),
                skipTheLinePrice: product.flags?.includes("SKIP_THE_LINE") 
                ? (product.pricing?.summary?.fromPrice || 25) 
                : null,
            }));
        }

        return productsData.products.slice(0, 20).map((product: any) => ({
            title: product.title,
            price: product.pricing?.summary?.fromPrice || 25,
            currency: product.pricing?.currency || "EUR",
            duration: product.duration?.fixedDurationInMinutes 
                ? `${Math.round(product.duration.fixedDurationInMinutes / 60)}h`
                : product.duration?.variableDurationFromMinutes
                    ? `${Math.round(product.duration.variableDurationFromMinutes / 60)}-${Math.round((product.duration.variableDurationToMinutes || product.duration.variableDurationFromMinutes * 2) / 60)}h`
                    : "2-3h",
            description: product.description?.substring(0, 200) || "Popular activity",
            rating: product.reviews?.combinedAverageRating || 4.5,
            reviewCount: product.reviews?.totalReviews || 0,
            productCode: product.productCode,
            bookingUrl: `https://www.viator.com/tours/${product.productCode}`,
            image: product.images?.[0]?.variants?.find((v: any) => v.width >= 400)?.url || 
                   product.images?.[0]?.variants?.[0]?.url || null,
            skipTheLine: product.flags?.includes("SKIP_THE_LINE") || 
                        product.title?.toLowerCase().includes("skip") ||
                        product.title?.toLowerCase().includes("priority"),
            skipTheLinePrice: product.flags?.includes("SKIP_THE_LINE") 
                ? (product.pricing?.summary?.fromPrice || 25) 
                : null,
        }));
    } catch (error) {
        console.error("❌ Viator activities error:", error);
        throw error;
    }
}

// Viator API - Search products by free text (backup method)
async function searchViatorProductsByText(searchText: string, apiKey: string) {
    try {
        const response = await fetch(
            "https://api.viator.com/v2/products/search",
            {
                method: "POST",
                headers: {
                    "Accept": "application/json;version=2.0",
                    "Accept-Language": "en-US",
                    "Content-Type": "application/json",
                    "exp-api-key": apiKey,
                },
                body: JSON.stringify({
                    filtering: {
                        searchTerm: searchText,
                    },
                    sorting: {
                        sort: "TRAVELER_RATING",
                        order: "DESC"
                    },
                    pagination: {
                        start: 1,
                        count: 10
                    },
                    currency: "EUR"
                })
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Viator text search API error:", response.status, errorText);
            throw new Error(`Viator text search failed: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.products || data.products.length === 0) {
            return [];
        }

        return data.products.slice(0, 8).map((product: any) => ({
            title: product.title,
            price: product.pricing?.summary?.fromPrice || 25,
            currency: product.pricing?.currency || "EUR",
            duration: product.duration?.fixedDurationInMinutes 
                ? `${Math.round(product.duration.fixedDurationInMinutes / 60)}h`
                : product.duration?.variableDurationFromMinutes
                    ? `${Math.round(product.duration.variableDurationFromMinutes / 60)}-${Math.round((product.duration.variableDurationToMinutes || product.duration.variableDurationFromMinutes * 2) / 60)}h`
                    : "2-3h",
            description: product.description?.substring(0, 200) || "Popular activity",
            rating: product.reviews?.combinedAverageRating || 4.5,
            reviewCount: product.reviews?.totalReviews || 0,
            productCode: product.productCode,
            bookingUrl: `https://www.viator.com/tours/${product.productCode}`,
            image: product.images?.[0]?.variants?.find((v: any) => v.width >= 400)?.url || 
                   product.images?.[0]?.variants?.[0]?.url || null,
            skipTheLine: product.flags?.includes("SKIP_THE_LINE") || 
                        product.title?.toLowerCase().includes("skip") ||
                        product.title?.toLowerCase().includes("priority"),
            skipTheLinePrice: product.flags?.includes("SKIP_THE_LINE") 
                ? (product.pricing?.summary?.fromPrice || 25) 
                : null,
        }));
    } catch (error) {
        console.error("❌ Viator text search error:", error);
        throw error;
    }
}

// Fallback activities - destination-specific
function getFallbackActivities(destination: string) {
    const destLower = destination.toLowerCase();
    
    const destinationActivities: Record<string, Array<{title: string, price: string, duration: string, description: string}>> = {
        "paris": [
            { title: "Eiffel Tower Visit", price: "€26", duration: "2-3h", description: "Iconic landmark with stunning city views" },
            { title: "Louvre Museum", price: "€17", duration: "3-4h", description: "World's largest art museum" },
            { title: "Seine River Cruise", price: "€e15", duration: "1h", description: "Scenic boat tour along the Seine" },
            { title: "Montmartre Walking Tour", price: "€20", duration: "2h", description: "Explore the artistic heart of Paris" },
            { title: "Versailles Palace", price: "€20", duration: "4-5h", description: "Magnificent royal château" },
        ],
        "rome": [
            { title: "Colosseum Tour", price: "€16", duration: "2h", description: "Ancient Roman amphitheater" },
            { title: "Vatican Museums", price: "€e7", duration: "3h", description: "Sistine Chapel and art collections" },
            { title: "St. Peter's Basilica", price: "€11", duration: "2h", description: "Ancient Roman temple" },
            { title: "Trevi Fountain", price: "Free", duration: "30min", description: "Baroque fountain masterpiece" },
            { title: "Pantheon", price: "Free", duration: "1h", description: "Ancient Roman temple" },
        ],
        "london": [
            { title: "British Museum", price: "Free", duration: "3h", description: "World history and culture" },
            { title: "Tower of London", price: "€33", duration: "3h", description: "Historic castle and Crown Jewels" },
            { title: "London Eye", price: "€32", duration: "1h", description: "Giant observation wheel" },
            { title: "Westminster Abbey", price: "€27", duration: "2h", description: "Gothic abbey church" },
            { title: "Thames River Cruise", price: "€115", duration: "1h", description: "Sightseeing boat tour" },
        ],
        "barcelona": [
            { title: "Sagrada Familia", price: "€26", duration: "2h", description: "Gaudí's masterpiece basilica" },
            { title: "Park Güell", price: "€10", duration: "2h", description: "Colorful mosaic park by Gaudí" },
            { title: "Casa Batlló", price: "€35", duration: "1.5h", description: "Gaudí's stunning modernist building" },
            { title: "La Pedrera", price: "€29", duration: "1.5h", description: "Modernist building by Gaudí" },
            { title: "Gothic Quarter Walk", price: "Free", duration: "2h", description: "Medieval streets and architecture" },
        ],
        "athens": [
            { title: "Acropolis & Parthenon", price: "€20", duration: "3h", description: "Ancient citadel and temple" },
            { title: "Acropolis Museum", price: "€15", duration: "2h", description: "Archaeological museum" },
            { title: "Ancient Agora", price: "€10", duration: "2h", description: "Ancient marketplace" },
            { title: "National Archaeological Museum", price: "€12", duration: "2h", description: "Greek art collection" },
            { title: "Plaka & Monastiraki Walk", price: "Free", duration: "2-3h", description: "Historic neighborhoods" },
        ],
        "amsterdam": [
            { title: "Anne Frank House", price: "€14", duration: "1.5h", description: "Historic house museum" },
            { title: "Van Gogh Museum", price: "€20", duration: "2h", description: "Dutch painter's works" },
            { title: "Rijksmuseum", price: "€22", duration: "3h", description: "Dutch art and history" },
            { title: "Canal Cruise", price: "€16", duration: "1 hour", description: "Explore Amsterdam's waterways" },
            { title: "Heineken Experience", price: "€23", duration: "1.5h", description: "Interactive brewery tour" },
        ],
    };
    
    for (const [city, activities] of Object.entries(destinationActivities)) {
        if (destLower.includes(city)) {
            return activities;
        }
    }
    
    return [
        { title: `City Tour of ${destination}`, price: "€25", duration: "3h", description: "Explore the main attractions" },
        { title: "Museum Visit", price: "€15", duration: "2h", description: "Discover local history and culture" },
        { title: "Walking Tour", price: "€10", duration: "2h", description: "Guided walking tour of historic sites" },
        { title: "Local Market", price: "Free", duration: "1-2h", description: "Experience local life and cuisine" },
        { title: "Sunset Viewpoint", price: "Free", duration: "1 hour", description: "Best views of the city" },
    ];
}

// Fallback restaurants - destination-specific
function getFallbackRestaurants(destination: string) {
    const destLower = destination.toLowerCase();
    
    const destinationRestaurants: Record<string, Array<{name: string, priceRange: string, cuisine: string, rating: number}>> = {
        "paris": [
            { name: "Le Comptoir du Relais", priceRange: "€€€", cuisine: "French Bistro", rating: 4.5 },
            { name: "L'As du Fallafel", priceRange: "€", cuisine: "Middle Eastern", rating: 4.6 },
            { name: "Breizh Café", priceRange: "€€", cuisine: "Crêperie", rating: 4.4 },
            { name: "Le Jules Verne", priceRange: "€€€€", cuisine: "Fine Dining", rating: 4.7 },
            { name: "Marché des Enfants Rouges", priceRange: "€", cuisine: "Market Food", rating: 4.3 },
        ],
        "rome": [
            { name: "Trattoria Da Enzo", priceRange: "€€", cuisine: "Traditional Roman", rating: 4.6 },
            { name: "Pizzarium", priceRange: "€", cuisine: "Pizza al Taglio", rating: 4.5 },
            { name: "La Pergola", priceRange: "€€€€", cuisine: "Fine Dining", rating: 4.8 },
            { name: "Roscioli", priceRange: "€€€", cuisine: "Italian Deli", rating: 4.7 },
            { name: "Supplizio", priceRange: "€", cuisine: "Street Food", rating: 4.4 },
        ],
        "london": [
            { name: "Dishoom", priceRange: "€€", cuisine: "Indian", rating: 4.5 },
            { name: "Borough Market", priceRange: "€", cuisine: "Market Food", rating: 4.6 },
            { name: "The Ledbury", priceRange: "€€€€", cuisine: "Fine Dining", rating: 4.8 },
            { name: "Flat Iron", priceRange: "€€", cuisine: "Steakhouse", rating: 4.4 },
            { name: "Padella", priceRange: "€€", cuisine: "Italian Pasta", rating: 4.7 },
        ],
        "barcelona": [
            { name: "Cervecería Catalana", priceRange: "€€", cuisine: "Tapas", rating: 4.5 },
            { name: "La Boqueria Market", priceRange: "€", cuisine: "Market Food", rating: 4.6 },
            { name: "Tickets Bar", priceRange: "€€€", cuisine: "Modern Tapas", rating: 4.7 },
            { name: "Can Culleretes", priceRange: "€€", cuisine: "Traditional Catalan", rating: 4.4 },
            { name: "El Xampanyet", priceRange: "€", cuisine: "Tapas Bar", rating: 4.5 },
        ],
        "athens": [
            { name: "Taverna Tou Psyrri", priceRange: "€€", cuisine: "Traditional Greek", rating: 4.5 },
            { name: "Kostas Souvlaki", priceRange: "€", cuisine: "Souvlaki", rating: 4.6 },
            { name: "Spondi", priceRange: "€€€€", cuisine: "Fine Dining", rating: 4.8 },
            { name: "Karamanlidika", priceRange: "€€", cuisine: "Greek Meze", rating: 4.7 },
            { name: "Varvakios Agora", priceRange: "€", cuisine: "Market Food", rating: 4.4 },
        ],
        "amsterdam": [
            { name: "De Kas", priceRange: "€€€", cuisine: "Farm-to-Table", rating: 4.6 },
            { name: "Foodhallen", priceRange: "€€", cuisine: "Food Hall", rating: 4.4 },
            { name: "The Pantry", priceRange: "€€", cuisine: "Dutch Traditional", rating: 4.5 },
            { name: "Café de Klos", priceRange: "€€", cuisine: "Grill House", rating: 4.6 },
            { name: "Albert Cuyp Market", priceRange: "€", cuisine: "Street Food", rating: 4.3 },
        ],
    };
    
    for (const [city, restaurants] of Object.entries(destinationRestaurants)) {
        if (destLower.includes(city)) {
            return restaurants;
        }
    }
    
    return [
        { name: `Traditional ${destination} Restaurant`, priceRange: "€€", cuisine: "Local", rating: 4.5 },
        { name: "Mediterranean Bistro", priceRange: "€€€", cuisine: "Mediterranean", rating: 4.3 },
        { name: "Casual Dining Spot", priceRange: "€", cuisine: "International", rating: 4.0 },
        { name: "Fine Dining Experience", priceRange: "€€€€", cuisine: "Fusion", rating: 4.7 },
        { name: "Street Food Market", priceRange: "€", cuisine: "Various", rating: 4.2 },
    ];
}

// Fallback hotels - destination-specific
function getFallbackHotels(destination: string) {
    return [
        {
            name: `Grand Hotel ${destination}`,
            rating: "5",
            price: "250",
            currency: "EUR",
            amenities: ["WiFi", "Pool", "Spa", "Restaurant", "Gym"],
            address: `City Center, ${destination}`,
            description: "Luxury 5-star hotel in the heart of the city with premium amenities.",
        },
        {
            name: `${destination} Boutique Hotel`,
            rating: "4",
            price: "150",
            currency: "EUR",
            amenities: ["WiFi", "Breakfast", "Bar", "Room Service"],
            address: `Historic District, ${destination}`,
            description: "Charming boutique hotel with personalized service and unique character.",
        },
        {
            name: `${destination} City Inn`,
            rating: "3",
            price: "80",
            currency: "EUR",
            amenities: ["WiFi", "Breakfast", "24h Reception"],
            address: `Central ${destination}`,
            description: "Comfortable and affordable accommodation in a convenient location.",
        },
    ];
}

// Generate transportation options (car rental, taxi, Uber) - DESTINATION SPECIFIC PRICING
function generateTransportationOptions(destination: string, origin: string, travelers: number) {
    const destLower = destination.toLowerCase();
    
    // Destination-specific pricing data (based on real-world costs)
    const destinationPricing: Record<string, {
        taxiFromAirport: number;
        uberX: { min: number; max: number };
        uberComfort: { min: number; max: number };
        bolt: { min: number; max: number };
        carRentalEconomy: number;
        carRentalCompact: number;
        carRentalSUV: number;
        metroTicket: number;
        dayPass: number;
        airportExpress: number;
        premiumTransfer: number;
    }> = {
        "paris": {
            taxiFromAirport: 55, // CDG to city center
            uberX: { min: 45, max: 65 },
            uberComfort: { min: 60, max: 85 },
            bolt: { min: 40, max: 60 },
            carRentalEconomy: 45,
            carRentalCompact: 60,
            carRentalSUV: 95,
            metroTicket: 2.15,
            dayPass: 16.60,
            airportExpress: 11.50, // RER B
            premiumTransfer: 120,
        },
        "london": {
            taxiFromAirport: 70, // Heathrow to city center (GBP converted to EUR)
            uberX: { min: 55, max: 80 },
            uberComfort: { min: 75, max: 110 },
            bolt: { min: 50, max: 75 },
            carRentalEconomy: 55,
            carRentalCompact: 70,
            carRentalSUV: 120,
            metroTicket: 6.50, // Tube zone 1-6
            dayPass: 15.50,
            airportExpress: 25, // Heathrow Express
            premiumTransfer: 150,
        },
        "rome": {
            taxiFromAirport: 50, // FCO to city center (fixed fare)
            uberX: { min: 40, max: 55 },
            uberComfort: { min: 55, max: 75 },
            bolt: { min: 35, max: 45 },
            carRentalEconomy: 35,
            carRentalCompact: 50,
            carRentalSUV: 85,
            metroTicket: 1.50,
            dayPass: 8.40,
            airportExpress: 14, // Leonardo Express
            premiumTransfer: 100,
        },
        "barcelona": {
            taxiFromAirport: 42, // BCN to city center
            uberX: { min: 30, max: 45 },
            uberComfort: { min: 45, max: 65 },
            bolt: { min: 25, max: 35 },
            carRentalEconomy: 30,
            carRentalCompact: 45,
            carRentalSUV: 75,
            metroTicket: 2.40,
            dayPass: 11.20,
            airportExpress: 7.75, // Aerobus
            premiumTransfer: 90,
        },
        "amsterdam": {
            taxiFromAirport: 50, // Schiphol to city center
            uberX: { min: 40, max: 55 },
            uberComfort: { min: 55, max: 75 },
            bolt: { min: 35, max: 45 },
            carRentalEconomy: 45,
            carRentalCompact: 60,
            carRentalSUV: 95,
            metroTicket: 3.40,
            dayPass: 9,
            airportExpress: 5.70, // AirTrain + Subway
            premiumTransfer: 110,
        },
        "athens": {
            taxiFromAirport: 40, // ATH to city center (fixed fare)
            uberX: { min: 30, max: 40 },
            uberComfort: { min: 40, max: 50 },
            bolt: { min: 25, max: 35 },
            carRentalEconomy: 25,
            carRentalCompact: 40,
            carRentalSUV: 65,
            metroTicket: 1.20,
            dayPass: 6,
            airportExpress: 2, // MetroLine 3
            premiumTransfer: 75,
        },
        "berlin": {
            taxiFromAirport: 45, // BER to city center
            uberX: { min: 35, max: 50 },
            uberComfort: { min: 50, max: 70 },
            bolt: { min: 30, max: 45 },
            carRentalEconomy: 35,
            carRentalCompact: 50,
            carRentalSUV: 80,
            metroTicket: 3.20,
            dayPass: 8.50,
            airportExpress: 4, // S-Bahn
            premiumTransfer: 95,
        },
        "madrid": {
            taxiFromAirport: 33, // MAD to city center (fixed fare)
            uberX: { min: 25, max: 40 },
            uberComfort: { min: 40, max: 55 },
            bolt: { min: 22, max: 35 },
            carRentalEconomy: 28,
            carRentalCompact: 42,
            carRentalSUV: 70,
            metroTicket: 1.50,
            dayPass: 8.40,
            airportExpress: 5, // Metro
            premiumTransfer: 80,
        },
        "dubai": {
            taxiFromAirport: 25, // DXB to city center (cheap taxis)
            uberX: { min: 20, max: 35 },
            uberComfort: { min: 35, max: 50 },
            bolt: { min: 18, max: 28 },
            carRentalEconomy: 60,
            carRentalCompact: 80,
            carRentalSUV: 120,
            metroTicket: 2,
            dayPass: 12,
            airportExpress: 2.50, // MRT
            premiumTransfer: 65,
        },
        "new york": {
            taxiFromAirport: 75, // JFK to Manhattan (flat fare + tolls)
            uberX: { min: 60, max: 90 },
            uberComfort: { min: 85, max: 120 },
            bolt: { min: 55, max: 85 },
            carRentalEconomy: 65,
            carRentalCompact: 85,
            carRentalSUV: 130,
            metroTicket: 2.90,
            dayPass: 34, // 7-day unlimited
            airportExpress: 11, // AirTrain + Subway
            premiumTransfer: 180,
        },
        "tokyo": {
            taxiFromAirport: 200, // NRT to city center (expensive!)
            uberX: { min: 150, max: 220 },
            uberComfort: { min: 200, max: 280 },
            bolt: { min: 140, max: 200 },
            carRentalEconomy: 50,
            carRentalCompact: 70,
            carRentalSUV: 110,
            metroTicket: 2,
            dayPass: 8,
            airportExpress: 36, // Narita Express
            premiumTransfer: 250,
        },
        "singapore": {
            taxiFromAirport: 25, // Changi to city center
            uberX: { min: 20, max: 30 },
            uberComfort: { min: 30, max: 45 },
            bolt: { min: 18, max: 28 },
            carRentalEconomy: 60,
            carRentalCompact: 80,
            carRentalSUV: 120,
            metroTicket: 2,
            dayPass: 12,
            airportExpress: 2.50, // MRT
            premiumTransfer: 65,
        },
        "lisbon": {
            taxiFromAirport: 20, // LIS to city center
            uberX: { min: 15, max: 25 },
            uberComfort: { min: 25, max: 40 },
            bolt: { min: 12, max: 22 },
            carRentalEconomy: 22,
            carRentalCompact: 35,
            carRentalSUV: 60,
            metroTicket: 1.65,
            dayPass: 6.80,
            airportExpress: 2, // Metro
            premiumTransfer: 55,
        },
        "prague": {
            taxiFromAirport: 25, // PRG to city center
            uberX: { min: 20, max: 35 },
            uberComfort: { min: 35, max: 50 },
            bolt: { min: 18, max: 28 },
            carRentalEconomy: 25,
            carRentalCompact: 38,
            carRentalSUV: 65,
            metroTicket: 1.30,
            dayPass: 5,
            airportExpress: 2.50, // Bus 119 + Metro
            premiumTransfer: 65,
        },
        "vienna": {
            taxiFromAirport: 40, // VIE to city center
            uberX: { min: 30, max: 45 },
            uberComfort: { min: 45, max: 65 },
            bolt: { min: 28, max: 42 },
            carRentalEconomy: 35,
            carRentalCompact: 50,
            carRentalSUV: 85,
            metroTicket: 2.40,
            dayPass: 8.60,
            airportExpress: 13, // CAT train
            premiumTransfer: 90,
        },
    };
    
    // Find matching destination pricing or use default
    let pricing = null;
    for (const [city, cityPricing] of Object.entries(destinationPricing)) {
        if (destLower.includes(city)) {
            pricing = cityPricing;
            break;
        }
    }
    
    // Default pricing for unknown destinations
    if (!pricing) {
        pricing = {
            taxiFromAirport: 40,
            uberX: { min: 30, max: 50 },
            uberComfort: { min: 45, max: 70 },
            bolt: { min: 25, max: 45 },
            carRentalEconomy: 35,
            carRentalCompact: 50,
            carRentalSUV: 85,
            metroTicket: 2,
            dayPass: 8,
            airportExpress: 10,
            premiumTransfer: 90,
        };
    }
    
    // Car rental options with destination-specific pricing
    const carRentals = [
        {
            type: "car_rental",
            provider: "Europcar",
            category: "Economy",
            vehicle: "Fiat 500 or similar",
            pricePerDay: pricing.carRentalEconomy,
            currency: "EUR",
            features: ["Air Conditioning", "Manual", "4 Seats", "2 Bags"],
            bookingUrl: "https://www.europcar.com",
        },
        {
            type: "car_rental",
            provider: "Hertz",
            category: "Compact",
            vehicle: "Volkswagen Golf or similar",
            pricePerDay: pricing.carRentalCompact,
            currency: "EUR",
            features: ["Air Conditioning", "Automatic", "5 Seats", "3 Bags"],
            bookingUrl: "https://www.hertz.com",
        },
        {
            type: "car_rental",
            provider: "Sixt",
            category: "SUV",
            vehicle: "BMW X1 or similar",
            pricePerDay: pricing.carRentalSUV,
            currency: "EUR",
            features: ["Air Conditioning", "Automatic", "5 Seats", "5 Bags", "GPS"],
            bookingUrl: "https://www.sixt.com",
        },
    ];
    
    // Taxi/Transfer options with destination-specific pricing
    const taxiOptions = [
        {
            type: "taxi",
            provider: "Airport Taxi",
            service: "Standard Taxi",
            description: `Metered taxi from ${destination} airport to city center`,
            estimatedPrice: pricing.taxiFromAirport,
            currency: "EUR",
            maxPassengers: 4,
            waitingTime: "5-15 min at taxi stand",
            features: ["Metered fare", "Available 24/7", "No booking required"],
            bookingUrl: null,
        },
        {
            type: "taxi",
            provider: "Welcome Pickups",
            service: "Pre-booked Transfer",
            description: "Private transfer with driver waiting at arrivals",
            estimatedPrice: Math.round(pricing.taxiFromAirport * 1.3),
            currency: "EUR",
            maxPassengers: travelers <= 3 ? 3 : 6,
            waitingTime: "Driver waiting at arrivals",
            features: ["Fixed price", "Meet & Greet", "Flight tracking", "Free cancellation"],
            bookingUrl: "https://www.welcomepickups.com",
        },
        {
            type: "taxi",
            provider: "Blacklane",
            service: "Premium Chauffeur",
            description: "Luxury sedan with professional chauffeur",
            estimatedPrice: pricing.premiumTransfer,
            currency: "EUR",
            maxPassengers: 3,
            waitingTime: "Driver waiting at arrivals",
            features: ["Luxury vehicle", "Professional chauffeur", "Complimentary water", "WiFi"],
            bookingUrl: "https://www.blacklane.com",
        },
    ];
    
    // Ride-sharing options with destination-specific pricing
    const rideSharingOptions = [
        {
            type: "rideshare",
            provider: "Uber",
            service: "UberX",
            description: "Affordable everyday rides",
            estimatedPrice: `${pricing.uberX.min}-${pricing.uberX.max}`,
            currency: "EUR",
            maxPassengers: 4,
            waitingTime: "3-8 min",
            features: ["App-based booking", "Cashless payment", "Driver rating", "Trip tracking"],
            bookingUrl: "https://www.uber.com",
        },
        {
            type: "rideshare",
            provider: "Uber",
            service: "Uber Comfort",
            description: "Newer cars with extra legroom",
            estimatedPrice: `${pricing.uberComfort.min}-${pricing.uberComfort.max}`,
            currency: "EUR",
            maxPassengers: 4,
            waitingTime: "5-10 min",
            features: ["Newer vehicles", "Extra legroom", "Experienced drivers", "Quiet mode available"],
            bookingUrl: "https://www.uber.com",
        },
        {
            type: "rideshare",
            provider: "Bolt",
            service: "Bolt Standard",
            description: "Budget-friendly rides",
            estimatedPrice: `${pricing.bolt.min}-${pricing.bolt.max}`,
            currency: "EUR",
            maxPassengers: 4,
            waitingTime: "3-7 min",
            features: ["App-based booking", "Often cheaper than Uber", "Cashless payment"],
            bookingUrl: "https://www.bolt.eu",
        },
    ];
    
    // Public transport info with destination-specific pricing
    const publicTransport = {
        type: "public_transport",
        provider: "Local Transit",
        options: [
            {
                mode: "Metro/Subway",
                description: "Fast and affordable way to get around the city",
                singleTicketPrice: pricing.metroTicket,
                dayPassPrice: pricing.dayPass,
                currency: "EUR",
                features: ["Frequent service", "City-wide coverage", "Air conditioned"],
            },
            {
                mode: "Bus",
                description: "Extensive network covering all areas",
                singleTicketPrice: pricing.metroTicket,
                dayPassPrice: pricing.dayPass,
                currency: "EUR",
                features: ["Wide coverage", "Night buses available", "Scenic routes"],
            },
            {
                mode: "Airport Express",
                description: `Direct connection from ${destination} airport to city center`,
                price: pricing.airportExpress,
                currency: "EUR",
                duration: "30-45 min",
                features: ["Direct service", "Luggage space", "WiFi"],
            },
        ],
    };
    
    return [
        ...carRentals,
        ...taxiOptions,
        ...rideSharingOptions,
        publicTransport,
    ];
}

// Generate Airbnb options based on destination
function getAirbnbOptions(destination: string) {
    const destLower = destination.toLowerCase();
    
    // Destination-specific Airbnb pricing (average per night)
    const airbnbPricing: Record<string, {
        studio: number;
        apartment: number;
        villa: number;
    }> = {
        "paris": { studio: 85, apartment: 150, villa: 350 },
        "london": { studio: 95, apartment: 180, villa: 450 },
        "rome": { studio: 70, apartment: 120, villa: 280 },
        "barcelona": { studio: 65, apartment: 110, villa: 250 },
        "amsterdam": { studio: 90, apartment: 160, villa: 380 },
        "athens": { studio: 50, apartment: 85, villa: 200 },
        "berlin": { studio: 60, apartment: 100, villa: 220 },
        "madrid": { studio: 55, apartment: 95, villa: 210 },
        "lisbon": { studio: 55, apartment: 90, villa: 200 },
        "prague": { studio: 45, apartment: 75, villa: 180 },
        "vienna": { studio: 70, apartment: 120, villa: 280 },
        "dubai": { studio: 80, apartment: 150, villa: 400 },
        "new york": { studio: 120, apartment: 220, villa: 550 },
        "tokyo": { studio: 70, apartment: 130, villa: 300 },
        "singapore": { studio: 90, apartment: 170, villa: 400 },
        "bali": { studio: 35, apartment: 60, villa: 150 },
        "santorini": { studio: 100, apartment: 180, villa: 400 },
    };
    
    // Find matching destination pricing or use default
    let pricing = { studio: 65, apartment: 110, villa: 250 }; // Default
    for (const [city, cityPricing] of Object.entries(airbnbPricing)) {
        if (destLower.includes(city)) {
            pricing = cityPricing;
            break;
        }
    }
    
    return [
        {
            type: "airbnb",
            name: `Cozy Studio in ${destination}`,
            rating: "4.7",
            stars: 0, // Airbnb doesn't use stars
            price: pricing.studio.toString(),
            pricePerNight: pricing.studio,
            currency: "EUR",
            amenities: ["WiFi", "Kitchen", "Washer", "Air Conditioning"],
            address: `Central ${destination}`,
            description: "Charming studio apartment perfect for solo travelers or couples. Fully equipped kitchen and great location.",
            propertyType: "Studio",
            bedrooms: 0,
            beds: 1,
            bathrooms: 1,
            maxGuests: 2,
            superhost: true,
            bookingUrl: `https://www.airbnb.com/s/${encodeURIComponent(destination)}/homes`,
            image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400",
        },
        {
            type: "airbnb",
            name: `Modern Apartment with View`,
            rating: "4.9",
            stars: 0,
            price: pricing.apartment.toString(),
            pricePerNight: pricing.apartment,
            currency: "EUR",
            amenities: ["WiFi", "Kitchen", "Washer", "Balcony", "City View", "Parking"],
            address: `${destination} City Center`,
            description: "Spacious 2-bedroom apartment with stunning city views. Perfect for families or groups of friends.",
            propertyType: "Apartment",
            bedrooms: 2,
            beds: 3,
            bathrooms: 1,
            maxGuests: 4,
            superhost: true,
            bookingUrl: `https://www.airbnb.com/s/${encodeURIComponent(destination)}/homes`,
            image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400",
        },
        {
            type: "airbnb",
            name: `Luxury Villa with Pool`,
            rating: "4.95",
            stars: 0,
            price: pricing.villa.toString(),
            pricePerNight: pricing.villa,
            currency: "EUR",
            amenities: ["WiFi", "Kitchen", "Pool", "Garden", "BBQ", "Parking", "Hot Tub"],
            address: `Exclusive Area, ${destination}`,
            description: "Stunning private villa with pool and garden. Ideal for luxury getaways and special occasions.",
            propertyType: "Villa",
            bedrooms: 4,
            beds: 5,
            bathrooms: 3,
            maxGuests: 8,
            superhost: true,
            bookingUrl: `https://www.airbnb.com/s/${encodeURIComponent(destination)}/homes`,
            image: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=400",
        },
    ];
}

// Helper function to extract IATA code from city name (simplified)
function extractIATACode(cityName: string): string {
    if (!cityName) {
        console.warn("⚠️ extractIATACode called with empty city name");
        return "ATH"; // Default fallback
    }

    const cityMap: Record<string, string> = {
        // Europe
        "athens": "ATH",
        "athens international airport": "ATH",
        "paris": "CDG",
        "charles de gaulle": "CDG",
        "london": "LHR",
        "heathrow": "LHR",
        "rome": "FCO",
        "fiumicino": "FCO",
        "barcelona": "BCN",
        "madrid": "MAD",
        "amsterdam": "AMS",
        "schiphol": "AMS",
        "berlin": "BER",
        "munich": "MUC",
        "frankfurt": "FRA",
        "vienna": "VIE",
        "zurich": "ZRH",
        "brussels": "BRU",
        "lisbon": "LIS",
        "dublin": "DUB",
        "copenhagen": "CPH",
        "stockholm": "ARN",
        "oslo": "OSL",
        "helsinki": "HEL",
        "milan": "MXP",
        "malpensa": "MXP",
        "venice": "VCE",
        "istanbul": "IST",
        "prague": "PRG",
        "budapest": "BUD",
        "warsaw": "WAW",
        
        // Americas
        "new york": "JFK",
        "jfk": "JFK",
        "los angeles": "LAX",
        "chicago": "ORD",
        "miami": "MIA",
        "san francisco": "SFO",
        "boston": "BOS",
        "washington": "IAD",
        "toronto": "YYZ",
        "vancouver": "YVR",
        "mexico city": "MEX",
        "sao paulo": "GRU",
        "buenos aires": "EZE",
        
        // Middle East & Africa
        "dubai": "DXB",
        "abu dhabi": "AUH",
        "doha": "DOH",
        "riyadh": "RUH",
        "jeddah": "JED",
        "cairo": "CAI",
        "tel aviv": "TLV",
        "johannesburg": "JNB",
        "cape town": "CPT",
        
        // Asia & Pacific
        "tokyo": "NRT",
        "narita": "NRT",
        "singapore": "SIN",
        "hong kong": "HKG",
        "beijing": "PEK",
        "shanghai": "PVG",
        "seoul": "ICN",
        "incheon": "ICN",
        "bangkok": "BKK",
        "kuala lumpur": "KUL",
        "jakarta": "CGK",
        "manila": "MNL",
        "delhi": "DEL",
        "mumbai": "BOM",
        "sydney": "SYD",
        "melbourne": "MEL",
        "auckland": "AKL",
    };

    // Normalize: lowercase, remove extra spaces, remove "airport" suffix
    const normalized = cityName
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/ airport$/i, '')
        .replace(/ international$/i, '')
        .split(',')[0]
        .trim();

    const code = cityMap[normalized];
    
    if (!code) {
        console.warn(`⚠️ Unknown city/airport: "${cityName}" (normalized: "${normalized}"). Using ATH as fallback.`);
        return "ATH"; // Default fallback
    }
    
    return code;
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
