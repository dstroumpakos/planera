"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import OpenAI from "openai";

export const generate = internalAction({
    args: { tripId: v.id("trips"), prompt: v.string() },
    handler: async (ctx, args) => {
        const { tripId } = args;

        // Get trip details
        const trip = await ctx.runQuery(internal.trips.getTripDetails, { tripId });
        if (!trip) throw new Error("Trip not found");
        if (!trip.origin) throw new Error("Trip origin is required");

        console.log(`🚀 Starting trip generation for: ${trip.origin} → ${trip.destination}`);

        try {
            // 1. Get Amadeus access token
            console.log("🔑 Getting Amadeus access token...");
            const amadeusToken = await getAmadeusToken();
            console.log("✅ Amadeus token obtained");

            // 2. Fetch real flights
            console.log("✈️ Fetching flights...");
            const flights = await searchFlights(
                amadeusToken,
                trip.origin,
                trip.destination,
                new Date(trip.startDate).toISOString().split('T')[0],
                new Date(trip.endDate).toISOString().split('T')[0],
                trip.travelers
            );
            console.log("✅ Flights fetched:", JSON.stringify(flights, null, 2));

            // 3. Fetch real hotels
            console.log("🏨 Fetching hotels...");
            const hotels = await searchHotels(
                amadeusToken,
                trip.destination,
                new Date(trip.startDate).toISOString().split('T')[0],
                new Date(trip.endDate).toISOString().split('T')[0],
                trip.travelers
            );
            console.log(`✅ Hotels fetched: ${hotels.length} options`);

            // 4. Fetch real activities and restaurants
            console.log("🎯 Fetching activities and restaurants...");
            const activities = await searchActivities(trip.destination);
            const restaurants = await searchRestaurants(trip.destination);
            console.log(`✅ Activities: ${activities.length}, Restaurants: ${restaurants.length}`);

            // 5. Use OpenAI to generate day-by-day itinerary based on real data
            const openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY,
            });

            const itineraryPrompt = `Create a detailed day-by-day itinerary for a trip to ${trip.destination}.
            Duration: ${new Date(trip.startDate).toDateString()} to ${new Date(trip.endDate).toDateString()}.
            Travelers: ${trip.travelers} people.
            Budget: ${trip.budget}.
            Interests: ${trip.interests.join(", ")}.
            
            Available activities: ${activities.map((a: any) => a.title).join(", ")}.
            Available restaurants: ${restaurants.map((r: any) => r.name).join(", ")}.
            
            Return a JSON object with this structure:
            {
              "dailyPlan": [
                {
                  "day": 1,
                  "title": "Day title",
                  "activities": [
                    { "time": "9:00 AM", "title": "Activity name", "description": "What to do" }
                  ]
                }
              ]
            }`;

            const completion = await openai.chat.completions.create({
                messages: [
                    { role: "system", content: "You are a travel itinerary planner. Return only valid JSON." },
                    { role: "user", content: itineraryPrompt },
                ],
                model: "gpt-4o",
                response_format: { type: "json_object" },
            });

            const itineraryContent = completion.choices[0].message.content;
            const itineraryData = itineraryContent ? JSON.parse(itineraryContent) : { dailyPlan: [] };

            const result = {
                flights,
                hotels,
                activities,
                restaurants,
                dailyPlan: itineraryData.dailyPlan,
                estimatedDailyExpenses: 100, // Fallback
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
                response: error.response?.data
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
    adults: number
) {
    // Extract IATA codes from city names (simplified - in production, use a proper airport lookup)
    const originCode = extractIATACode(origin);
    const destCode = extractIATACode(destination);

    console.log(`🔍 Searching flights: ${origin} (${originCode}) → ${destination} (${destCode}), ${departureDate} to ${returnDate}, ${adults} adults`);

    try {
        // Search for round-trip flights (outbound + return in one request)
        const url = `https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=${originCode}&destinationLocationCode=${destCode}&departureDate=${departureDate}&adults=${adults}&nonStop=false&max=5`;

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const data = await response.json();
        
        if (!response.ok) {
            console.error("❌ Amadeus API error:", data);
            console.warn("⚠️ Falling back to AI-generated flight data");
            return generateRealisticFlights(origin, originCode, destination, destCode, departureDate, returnDate, adults);
        }
        
        if (!data.data || data.data.length === 0) {
            console.warn("⚠️ No flights found in Amadeus. Generating realistic flight data with AI...");
            return generateRealisticFlights(origin, originCode, destination, destCode, departureDate, returnDate, adults);
        }

        console.log(`✅ Found ${data.data.length} flight offers from Amadeus`);

        // Now search for return flights separately
        const returnUrl = `https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=${destCode}&destinationLocationCode=${originCode}&departureDate=${returnDate}&adults=${adults}&nonStop=false&max=5`;

        const returnResponse = await fetch(returnUrl, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const returnData = await returnResponse.json();
        
        if (!returnResponse.ok || !returnData.data || returnData.data.length === 0) {
            console.warn("⚠️ No return flights found, using outbound data for both directions");
        }

        // Take the first offer for outbound
        const outboundOffer = data.data[0];
        const outbound = outboundOffer.itineraries[0];
        
        // Take the first offer for return (or use outbound as fallback)
        const returnOffer = returnData.data?.[0] || outboundOffer;
        const returnFlight = returnOffer.itineraries[0];
        
        return {
            outbound: {
                airline: getAirlineName(outbound.segments[0].carrierCode),
                flightNumber: `${outbound.segments[0].carrierCode}${outbound.segments[0].number}`,
                duration: formatDuration(outbound.duration),
                departure: formatTime(outbound.segments[0].departure.at),
                arrival: formatTime(outbound.segments[outbound.segments.length - 1].arrival.at),
            },
            return: {
                airline: getAirlineName(returnFlight.segments[0].carrierCode),
                flightNumber: `${returnFlight.segments[0].carrierCode}${returnFlight.segments[0].number}`,
                duration: formatDuration(returnFlight.duration),
                departure: formatTime(returnFlight.segments[0].departure.at),
                arrival: formatTime(returnFlight.segments[returnFlight.segments.length - 1].arrival.at),
            },
            luggage: `${outboundOffer.travelerPricings[0].fareDetailsBySegment[0].includedCheckedBags?.quantity || 0} bag(s) included`,
            pricePerPerson: parseFloat(outboundOffer.price.total) + (returnData.data?.[0] ? parseFloat(returnOffer.price.total) : parseFloat(outboundOffer.price.total)),
            dataSource: "amadeus", // Real data from Amadeus
        };
    } catch (error: any) {
        console.error("❌ Error searching flights:", error);
        console.warn("⚠️ Falling back to AI-generated flight data");
        return generateRealisticFlights(origin, originCode, destination, destCode, departureDate, returnDate, adults);
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
    adults: number
) {
    console.log("🤖 Generating realistic flight data with AI...");
    
    // Get realistic airlines for this route
    const airlines = getRealisticAirlinesForRoute(originCode, destCode);
    const selectedAirline = airlines[0];
    
    // Calculate realistic flight duration based on distance
    const duration = calculateFlightDuration(originCode, destCode);
    
    // Generate realistic departure times
    const outboundDeparture = "08:30 AM";
    const outboundArrival = addHoursToTime(outboundDeparture, duration);
    
    const returnDeparture = "03:45 PM";
    const returnArrival = addHoursToTime(returnDeparture, duration);
    
    // Calculate realistic pricing
    const basePrice = calculateRealisticPrice(originCode, destCode);
    const pricePerPerson = basePrice * adults;
    
    return {
        outbound: {
            airline: selectedAirline.name,
            flightNumber: `${selectedAirline.code}${Math.floor(Math.random() * 9000) + 1000}`,
            duration: `${Math.floor(duration)}h ${Math.round((duration % 1) * 60)}m`,
            departure: outboundDeparture,
            arrival: outboundArrival,
        },
        return: {
            airline: selectedAirline.name,
            flightNumber: `${selectedAirline.code}${Math.floor(Math.random() * 9000) + 1000}`,
            duration: `${Math.floor(duration)}h ${Math.round((duration % 1) * 60)}m`,
            departure: returnDeparture,
            arrival: returnArrival,
        },
        luggage: "1 bag(s) included",
        pricePerPerson,
        dataSource: "ai-generated", // AI-generated realistic data
    };
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
        { code: "TG", name: "Thai Airways" },
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
    destination: string,
    checkInDate: string,
    checkOutDate: string,
    adults: number
) {
    const cityCode = extractIATACode(destination);

    console.log(`🏨 Searching hotels in ${destination} (${cityCode}), ${checkInDate} to ${checkOutDate}, ${adults} adults`);

    try {
        // Step 1: Search for hotels by city to get hotel IDs
        const searchUrl = `https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city?cityCode=${cityCode}&radius=5&radiusUnit=KM&hotelSource=ALL`;
        
        const searchResponse = await fetch(searchUrl, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const searchData = await searchResponse.json();
        
        if (!searchResponse.ok) {
            console.error("❌ Amadeus Hotel Search API error:", searchData);
            throw new Error(`Amadeus Hotel Search API error: ${searchData.errors?.[0]?.detail || "Unknown error"}`);
        }
        
        if (!searchData.data || searchData.data.length === 0) {
            console.warn(`⚠️ No hotels found in ${destination} (${cityCode}). Using fallback data.`);
            return getFallbackHotels(destination);
        }

        // Step 2: Get offers for the first 3 hotels
        const hotelIds = searchData.data.slice(0, 3).map((hotel: any) => hotel.hotelId).join(',');
        
        console.log(`🏨 Getting offers for hotels: ${hotelIds}`);
        
        const offersUrl = `https://test.api.amadeus.com/v3/shopping/hotel-offers?hotelIds=${hotelIds}&checkInDate=${checkInDate}&checkOutDate=${checkOutDate}&adults=${adults}&bestRateOnly=true`;

        const offersResponse = await fetch(offersUrl, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const offersData = await offersResponse.json();
        
        if (!offersResponse.ok) {
            console.error("❌ Amadeus Hotel Offers API error:", offersData);
            throw new Error(`Amadeus Hotel Offers API error: ${offersData.errors?.[0]?.detail || "Unknown error"}`);
        }
        
        if (!offersData.data || offersData.data.length === 0) {
            console.warn(`⚠️ No hotel offers found. Using fallback data.`);
            return getFallbackHotels(destination);
        }

        console.log(`✅ Found ${offersData.data.length} hotel offers`);

        return offersData.data.map((hotel: any) => {
            const totalPrice = parseFloat(hotel.offers[0].price.total);
            const nights = Math.ceil((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / (1000 * 60 * 60 * 24));
            const pricePerNight = totalPrice / nights;
            
            return {
                name: hotel.hotel.name,
                pricePerNight: Math.round(pricePerNight),
                stars: hotel.hotel.rating ? Math.round(hotel.hotel.rating) : 4,
                image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
                description: hotel.hotel.description?.text || "Comfortable accommodation with modern amenities",
                amenities: hotel.hotel.amenities || ["WiFi", "Breakfast"],
                address: hotel.hotel.address?.lines?.[0] || `${hotel.hotel.name}, ${destination}`,
                coordinates: {
                    latitude: hotel.hotel.latitude,
                    longitude: hotel.hotel.longitude,
                },
            };
        });
    } catch (error: any) {
        console.error("❌ Error in hotel search:", error);
        console.warn(`⚠️ Falling back to example hotels for ${destination}`);
        return getFallbackHotels(destination);
    }
}

// Helper function to search activities
async function searchActivities(destination: string) {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    
    if (!apiKey) {
        console.warn("⚠️ Google Places API key not configured. Using fallback activities.");
        return getFallbackActivities(destination);
    }

    console.log(`🎯 Searching activities in ${destination}`);

    try {
        const response = await fetch(
            `https://maps.googleapis.com/maps/api/place/textsearch/json?query=things+to+do+in+${encodeURIComponent(destination)}&key=${apiKey}`
        );

        const data = await response.json();
        
        if (data.status !== "OK" || !data.results || data.results.length === 0) {
            console.warn(`⚠️ No activities found via Google Places. Using fallback. Status: ${data.status}`);
            return getFallbackActivities(destination);
        }

        console.log(`✅ Found ${data.results.length} activities`);

        return data.results.slice(0, 5).map((place: any) => ({
            title: place.name,
            price: "€20",
            duration: "2-3h",
            description: place.formatted_address,
            coordinates: {
                latitude: place.geometry.location.lat,
                longitude: place.geometry.location.lng,
            },
        }));
    } catch (error) {
        console.error("❌ Error fetching activities:", error);
        return getFallbackActivities(destination);
    }
}

// Helper function to search restaurants
async function searchRestaurants(destination: string) {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    
    if (!apiKey) {
        console.warn("⚠️ Google Places API key not configured. Using fallback restaurants.");
        return getFallbackRestaurants(destination);
    }

    console.log(`🍽️ Searching restaurants in ${destination}`);

    try {
        const response = await fetch(
            `https://maps.googleapis.com/maps/api/place/textsearch/json?query=restaurants+in+${encodeURIComponent(destination)}&key=${apiKey}`
        );

        const data = await response.json();
        
        if (data.status !== "OK" || !data.results || data.results.length === 0) {
            console.warn(`⚠️ No restaurants found via Google Places. Using fallback. Status: ${data.status}`);
            return getFallbackRestaurants(destination);
        }

        console.log(`✅ Found ${data.results.length} restaurants`);

        return data.results.slice(0, 5).map((place: any) => ({
            name: place.name,
            priceRange: "€€",
            cuisine: place.types?.[0] || "International",
            rating: place.rating || 4.0,
            coordinates: {
                latitude: place.geometry.location.lat,
                longitude: place.geometry.location.lng,
            },
        }));
    } catch (error) {
        console.error("❌ Error fetching restaurants:", error);
        return getFallbackRestaurants(destination);
    }
}

// Fallback activities
function getFallbackActivities(destination: string) {
    return [
        { title: `City Tour of ${destination}`, price: "€25", duration: "3h", description: "Explore the main attractions" },
        { title: "Museum Visit", price: "€15", duration: "2h", description: "Discover local history and culture" },
        { title: "Walking Tour", price: "€10", duration: "2h", description: "Guided walking tour of historic sites" },
        { title: "Local Market", price: "Free", duration: "1-2h", description: "Experience local life and cuisine" },
        { title: "Sunset Viewpoint", price: "Free", duration: "1h", description: "Best views of the city" },
    ];
}

// Fallback restaurants
function getFallbackRestaurants(destination: string) {
    return [
        { name: `Traditional ${destination} Restaurant`, priceRange: "€€", cuisine: "Local", rating: 4.5 },
        { name: "Mediterranean Bistro", priceRange: "€€€", cuisine: "Mediterranean", rating: 4.3 },
        { name: "Casual Dining Spot", priceRange: "€", cuisine: "International", rating: 4.0 },
        { name: "Fine Dining Experience", priceRange: "€€€€", cuisine: "Fusion", rating: 4.7 },
        { name: "Street Food Market", priceRange: "€", cuisine: "Various", rating: 4.2 },
    ];
}

// Fallback hotels
function getFallbackHotels(destination: string) {
    return [
        {
            name: `Hotel in ${destination}`,
            pricePerNight: 120,
            stars: 4,
            image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
            description: "Comfortable accommodation with modern amenities",
            amenities: ["WiFi", "Breakfast", "Pool"],
            address: `City Center, ${destination}`,
            coordinates: { latitude: 0, longitude: 0 },
        },
        {
            name: `Budget Hotel ${destination}`,
            pricePerNight: 80,
            stars: 3,
            image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
            description: "Affordable and clean accommodation",
            amenities: ["WiFi", "Breakfast"],
            address: `Downtown, ${destination}`,
            coordinates: { latitude: 0, longitude: 0 },
        },
        {
            name: `Luxury ${destination} Hotel`,
            pricePerNight: 250,
            stars: 5,
            image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
            description: "Premium accommodation with exceptional service",
            amenities: ["WiFi", "Breakfast", "Pool", "Spa", "Gym"],
            address: `Premium District, ${destination}`,
            coordinates: { latitude: 0, longitude: 0 },
        },
    ];
}

// Helper function to extract IATA code from city name (simplified)
function extractIATACode(cityName: string): string {
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
        console.warn(`⚠️ Unknown city/airport: "${cityName}". Using ATH as fallback. Please add "${normalized}" to the city map.`);
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
        // Add more as needed
    };

    return airlineMap[carrierCode] || `${carrierCode} Airlines`;
}
