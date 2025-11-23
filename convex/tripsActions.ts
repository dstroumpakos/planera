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

        try {
            // 1. Get Amadeus access token
            const amadeusToken = await getAmadeusToken();

            // 2. Fetch real flights
            const flights = await searchFlights(
                amadeusToken,
                trip.origin,
                trip.destination,
                new Date(trip.startDate).toISOString().split('T')[0],
                new Date(trip.endDate).toISOString().split('T')[0],
                trip.travelers
            );

            // 3. Fetch real hotels
            const hotels = await searchHotels(
                amadeusToken,
                trip.destination,
                new Date(trip.startDate).toISOString().split('T')[0],
                new Date(trip.endDate).toISOString().split('T')[0],
                trip.travelers
            );

            // 4. Fetch real activities and restaurants
            const activities = await searchActivities(trip.destination);
            const restaurants = await searchRestaurants(trip.destination);

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
                itinerary: itineraryData,
            };

            await ctx.runMutation(internal.trips.updateItinerary, {
                tripId,
                itinerary: result,
                status: "completed",
            });
        } catch (error: any) {
            console.error("Error generating itinerary:", error);
            
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

    const response = await fetch(
        `https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=${originCode}&destinationLocationCode=${destCode}&departureDate=${departureDate}&returnDate=${returnDate}&adults=${adults}&max=3`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
        throw new Error("No flights found");
    }

    return data.data.slice(0, 3).map((offer: any) => {
        const outbound = offer.itineraries[0];
        const returnFlight = offer.itineraries[1];
        
        return {
            airline: getAirlineName(outbound.segments[0].carrierCode),
            price: `€${offer.price.total}`,
            duration: outbound.duration,
            departureTime: outbound.segments[0].departure.at,
            arrivalTime: outbound.segments[outbound.segments.length - 1].arrival.at,
            isReturn: false,
            returnFlight: returnFlight ? {
                airline: getAirlineName(returnFlight.segments[0].carrierCode),
                price: `€${offer.price.total}`,
                duration: returnFlight.duration,
                departureTime: returnFlight.segments[0].departure.at,
                arrivalTime: returnFlight.segments[returnFlight.segments.length - 1].arrival.at,
                isReturn: true,
            } : null,
            luggage: {
                included: offer.travelerPricings[0].fareDetailsBySegment[0].includedCheckedBags?.quantity || 0,
                additionalPrice: "€50",
            },
        };
    });
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

    const response = await fetch(
        `https://test.api.amadeus.com/v3/shopping/hotel-offers?cityCode=${cityCode}&checkInDate=${checkInDate}&checkOutDate=${checkOutDate}&adults=${adults}&radius=5&radiusUnit=KM&ratings=3,4,5&bestRateOnly=true`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
        throw new Error("No hotels found");
    }

    return data.data.slice(0, 3).map((hotel: any) => ({
        name: hotel.hotel.name,
        price: `€${hotel.offers[0].price.total}`,
        rating: hotel.hotel.rating || 4.0,
        image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
        description: hotel.hotel.description?.text || "Comfortable accommodation",
        amenities: hotel.hotel.amenities || ["WiFi", "Breakfast"],
        coordinates: {
            latitude: hotel.hotel.latitude,
            longitude: hotel.hotel.longitude,
        },
    }));
}

// Helper function to search activities
async function searchActivities(destination: string) {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    
    if (!apiKey) {
        throw new Error("Google Places API key not configured");
    }

    // Simplified - in production, geocode the destination first
    const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=things+to+do+in+${encodeURIComponent(destination)}&key=${apiKey}`
    );

    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
        throw new Error("No activities found");
    }

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
}

// Helper function to search restaurants
async function searchRestaurants(destination: string) {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    
    if (!apiKey) {
        throw new Error("Google Places API key not configured");
    }

    const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=restaurants+in+${encodeURIComponent(destination)}&key=${apiKey}`
    );

    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
        throw new Error("No restaurants found");
    }

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
}

// Helper function to extract IATA code from city name (simplified)
function extractIATACode(cityName: string): string {
    const cityMap: Record<string, string> = {
        "Athens": "ATH",
        "Paris": "PAR",
        "London": "LON",
        "New York": "NYC",
        "Tokyo": "TYO",
        "Rome": "ROM",
        "Barcelona": "BCN",
        "Dubai": "DXB",
        "Singapore": "SIN",
        "Istanbul": "IST",
        // Add more as needed
    };

    const normalized = cityName.split(',')[0].trim();
    return cityMap[normalized] || "ATH"; // Default to Athens if not found
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
