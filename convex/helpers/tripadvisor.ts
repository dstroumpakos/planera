"use node";

export async function fetchRestaurantsFromTripAdvisor(destination: string): Promise<any[]> {
  const apiKey = process.env.TRIPADVISOR_API_KEY;
  
  if (!apiKey) {
    console.warn("⚠️ TRIPADVISOR_API_KEY not configured, returning empty restaurants");
    return [];
  }

  try {
    // TripAdvisor API endpoint for searching restaurants
    const searchUrl = `https://api.tripadvisor.com/api/private/2.1/location/search?key=${apiKey}&searchQuery=${encodeURIComponent(destination)}&category=restaurants&language=en`;
    
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();
    
    if (!searchData.data || searchData.data.length === 0) {
      console.warn(`⚠️ No location found for ${destination} on TripAdvisor`);
      return [];
    }

    const locationId = searchData.data[0].location_id;
    
    // Fetch restaurants for this location
    const restaurantsUrl = `https://api.tripadvisor.com/api/private/2.1/location/${locationId}/details?key=${apiKey}&language=en`;
    
    const restaurantsResponse = await fetch(restaurantsUrl);
    const restaurantsData = await restaurantsResponse.json();
    
    if (!restaurantsData.nearby_restaurants) {
      console.warn(`⚠️ No restaurants found for ${destination}`);
      return [];
    }

    // Transform TripAdvisor data to our format
    return restaurantsData.nearby_restaurants.map((restaurant: any) => ({
      name: restaurant.name,
      rating: restaurant.rating,
      reviewCount: restaurant.num_reviews,
      cuisine: restaurant.cuisine?.map((c: any) => c.name).join(", ") || "Various",
      priceLevel: restaurant.price_level || "$$",
      address: restaurant.address || "",
      phone: restaurant.phone || "",
      website: restaurant.website || "",
      imageUrl: restaurant.photo?.images?.large?.url || "",
      description: restaurant.description || "",
      bookingUrl: `https://www.tripadvisor.com/Restaurant_Review-${restaurant.location_id}.html`,
    }));
  } catch (error) {
    console.error("❌ Error fetching restaurants from TripAdvisor:", error);
    return [];
  }
}
