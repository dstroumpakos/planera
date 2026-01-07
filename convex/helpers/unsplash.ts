"use node";

/**
 * Fetch images from Unsplash API
 * Requires UNSPLASH_ACCESS_KEY environment variable
 */

interface UnsplashImage {
  id: string;
  url: string;
  description: string | null;
  photographer: string;
  photographerUrl: string;
  attribution: string;
}

export async function fetchUnsplashImage(query: string): Promise<UnsplashImage | null> {
  try {
    const apiKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!apiKey) {
      console.warn("⚠️ UNSPLASH_ACCESS_KEY not configured");
      return null;
    }

    const response = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&client_id=${apiKey}&orientation=landscape`
    );

    if (!response.ok) {
      console.error(`❌ Unsplash API error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    return {
      id: data.id,
      url: data.urls.regular,
      description: data.description || data.alt_description,
      photographer: data.user.name,
      photographerUrl: data.user.links.html,
      attribution: `Photo by ${data.user.name} on Unsplash`,
    };
  } catch (error) {
    console.error("❌ Error fetching from Unsplash:", error);
    return null;
  }
}

export async function fetchUnsplashImages(query: string, count: number = 5): Promise<UnsplashImage[]> {
  try {
    const apiKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!apiKey) {
      console.warn("⚠️ UNSPLASH_ACCESS_KEY not configured");
      return [];
    }

    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&client_id=${apiKey}&per_page=${count}&orientation=landscape`
    );

    if (!response.ok) {
      console.error(`❌ Unsplash API error: ${response.status}`);
      return [];
    }

    const data = await response.json();

    return data.results.map((photo: any) => ({
      id: photo.id,
      url: photo.urls.regular,
      description: photo.description || photo.alt_description,
      photographer: photo.user.name,
      photographerUrl: photo.user.links.html,
      attribution: `Photo by ${photo.user.name} on Unsplash`,
    }));
  } catch (error) {
    console.error("❌ Error fetching from Unsplash:", error);
    return [];
  }
}
