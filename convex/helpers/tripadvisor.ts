"use node";

export interface Restaurant {
  name: string;
  rating: number;
  reviewCount: number;
  cuisine: string;
  priceLevel: string;
  address: string;
  phone: string;
  website: string;
  imageUrl: string;
  description: string;
  bookingUrl: string;
}

export async function fetchRestaurantsFromTripAdvisor(
  destination: string
): Promise<Restaurant[]> {
  const apiKey = process.env.TRIPADVISOR_API_KEY;

  if (!apiKey) {
    console.warn(
      "⚠️ TRIPADVISOR_API_KEY not configured, returning empty restaurants"
    );
    return [];
  }

  try {
    // TripAdvisor API endpoint for searching locations
    const searchUrl = `https://api.tripadvisor.com/api/private/2.1/location/search?key=${apiKey}&searchQuery=${encodeURIComponent(destination)}&category=restaurants&language=en`;

    console.log(`🔍 Searching TripAdvisor for restaurants in ${destination}...`);
    const searchResponse = await fetch(searchUrl);

    if (!searchResponse.ok) {
      console.warn(
        `⚠️ TripAdvisor search failed with status ${searchResponse.status}`
      );
      return [];
    }

    const searchData = await searchResponse.json();

    if (!searchData.data || searchData.data.length === 0) {
      console.warn(`⚠️ No location found for ${destination} on TripAdvisor`);
      return [];
    }

    const locationId = searchData.data[0].location_id;
    console.log(`✅ Found location ID: ${locationId}`);

    // Fetch restaurants for this location
    const restaurantsUrl = `https://api.tripadvisor.com/api/private/2.1/location/${locationId}/details?key=${apiKey}&language=en`;

    const restaurantsResponse = await fetch(restaurantsUrl);

    if (!restaurantsResponse.ok) {
      console.warn(
        `⚠️ TripAdvisor details fetch failed with status ${restaurantsResponse.status}`
      );
      return [];
    }

    const restaurantsData = await restaurantsResponse.json();

    if (!restaurantsData.nearby_restaurants) {
      console.warn(`⚠️ No restaurants found for ${destination}`);
      return [];
    }

    // Transform TripAdvisor data to our format
    const restaurants = restaurantsData.nearby_restaurants
      .slice(0, 15) // Limit to top 15 restaurants
      .map((restaurant: any) => ({
        name: restaurant.name || "Unknown Restaurant",
        rating: restaurant.rating || 0,
        reviewCount: restaurant.num_reviews || 0,
        cuisine:
          restaurant.cuisine?.map((c: any) => c.name).join(", ") || "Various",
        priceLevel: restaurant.price_level || "$$",
        address: restaurant.address || "",
        phone: restaurant.phone || "",
        website: restaurant.website || "",
        imageUrl: restaurant.photo?.images?.large?.url || "",
        description: restaurant.description || "",
        bookingUrl: `https://www.tripadvisor.com/Restaurant_Review-${restaurant.location_id}.html`,
      }));

    console.log(`✅ Fetched ${restaurants.length} restaurants from TripAdvisor`);
    return restaurants;
  } catch (error) {
    console.error("❌ Error fetching restaurants from TripAdvisor:", error);
    return [];
  }
}
