"use node";

// API helper functions for Viator and TripAdvisor

export async function searchViatorActivities(destination: string, apiKey: string): Promise<any[]> {
    try {
        const searchUrl = `https://api.viator.com/partner/search/freetext?text=${encodeURIComponent(destination)}&destId=&topX=10&currencyCode=EUR`;
        const response = await fetch(searchUrl, {
            method: "GET",
            headers: {
                "Accept": "application/json",
                "Accept-Language": "en-US",
                "exp-api-key": apiKey,
            },
        });
        if (!response.ok) {
            console.error("Viator API error:", response.status);
            return [];
        }
        const data = await response.json();
        if (!data.data || !data.data.products) return [];
        return data.data.products.slice(0, 10).map((product: any) => ({
            title: product.title || "Activity",
            description: product.shortDescription || product.description || "",
            price: product.price?.fromPrice || "25",
            currency: product.price?.currencyCode || "EUR",
            duration: product.duration || "2-3 hours",
            rating: product.rating || 4.5,
            reviewCount: product.reviewCount || 0,
            thumbnailUrl: product.thumbnailURL || null,
            bookingUrl: product.webURL || `https://www.viator.com/tours/${destination}`,
            productCode: product.productCode || null,
        }));
    } catch (error) {
        console.error("Viator search error:", error);
        return [];
    }
}

export async function searchTripAdvisorLocation(destination: string, apiKey: string): Promise<any | null> {
    try {
        const searchUrl = `https://api.content.tripadvisor.com/api/v1/location/search?key=${apiKey}&searchQuery=${encodeURIComponent(destination)}&category=geos&language=en`;
        const response = await fetch(searchUrl, {
            method: "GET",
            headers: { "Accept": "application/json" },
        });
        if (!response.ok) return null;
        const data = await response.json();
        if (!data.data || data.data.length === 0) return null;
        const location = data.data[0];
        return {
            locationId: location.location_id,
            name: location.name,
            address: location.address_obj?.address_string || "",
        };
    } catch (error) {
        console.error("TripAdvisor location search error:", error);
        return null;
    }
}

export async function searchTripAdvisorRestaurants(destination: string, apiKey: string): Promise<any[]> {
    try {
        // First find the location
        const location = await searchTripAdvisorLocation(destination, apiKey);
        if (!location) return [];
        
        // Then search for restaurants
        const restaurantsUrl = `https://api.content.tripadvisor.com/api/v1/location/${location.locationId}/nearby_search?key=${apiKey}&category=restaurants&language=en&currency=EUR`;
        const response = await fetch(restaurantsUrl, {
            method: "GET",
            headers: { "Accept": "application/json" },
        });
        if (!response.ok) return [];
        const data = await response.json();
        if (!data.data) return [];
        
        // Get details for top restaurants
        const restaurants = [];
        for (const restaurant of data.data.slice(0, 20)) {
            try {
                const detailsUrl = `https://api.content.tripadvisor.com/api/v1/location/${restaurant.location_id}/details?key=${apiKey}&language=en&currency=EUR`;
                const detailsResponse = await fetch(detailsUrl, {
                    method: "GET",
                    headers: { "Accept": "application/json" },
                });
                if (detailsResponse.ok) {
                    const details = await detailsResponse.json();
                    restaurants.push({
                        name: details.name || restaurant.name,
                        cuisine: details.cuisine?.[0]?.localized_name || "Local",
                        priceRange: details.price_level || "€€",
                        rating: details.rating || "4.0",
                        reviewCount: details.num_reviews || 0,
                        address: details.address_obj?.address_string || "",
                        tripAdvisorUrl: details.web_url || null,
                        phone: details.phone || null,
                    });
                }
            } catch (e) {
                // Skip this restaurant if details fail
            }
        }
        return restaurants;
    } catch (error) {
        console.error("TripAdvisor restaurants search error:", error);
        return [];
    }
}
