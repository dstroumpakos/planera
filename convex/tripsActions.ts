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

    const url = `https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=${originCode}&destinationLocationCode=${destCode}&departureDate=${departureDate}&returnDate=${returnDate}&adults=${adults}&max=3`;

    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    const data = await response.json();
    
    if (!response.ok) {
        console.error("❌ Amadeus API error:", data);
        throw new Error(`Amadeus API error: ${data.errors?.[0]?.detail || data.error_description || "Unknown error"}`);
    }
    
    if (!data.data || data.data.length === 0) {
        console.error("❌ No flights found for:", { originCode, destCode, departureDate, returnDate });
        throw new Error(`No flights found from ${origin} (${originCode}) to ${destination} (${destCode}). Try different dates or destinations.`);
    }

    console.log(`✅ Found ${data.data.length} flight offers`);

    // Take the first offer and format it for the frontend
    const offer = data.data[0];
    const outbound = offer.itineraries[0];
    const returnFlight = offer.itineraries[1];
    
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
        luggage: `${offer.travelerPricings[0].fareDetailsBySegment[0].includedCheckedBags?.quantity || 0} bag(s) included`,
        pricePerPerson: parseFloat(offer.price.total),
    };
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

    const url = `https://test.api.amadeus.com/v3/shopping/hotel-offers?cityCode=${cityCode}&checkInDate=${checkInDate}&checkOutDate=${checkOutDate}&adults=${adults}&radius=5&radiusUnit=KM&ratings=3,4,5&bestRateOnly=true`;

    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    const data = await response.json();
    
    if (!response.ok) {
        console.error("❌ Amadeus Hotel API error:", data);
        throw new Error(`Amadeus Hotel API error: ${data.errors?.[0]?.detail || "Unknown error"}`);
    }
    
    if (!data.data || data.data.length === 0) {
        console.warn(`⚠️ No hotels found in ${destination} (${cityCode}). Using fallback data.`);
        // Return fallback hotels instead of throwing
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

    console.log(`✅ Found ${data.data.length} hotels`);

    return data.data.slice(0, 3).map((hotel: any) => {
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
