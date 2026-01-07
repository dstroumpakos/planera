import { v } from "convex/values";
import { action } from "./_generated/server";
import { fetchUnsplashImage, fetchUnsplashImages } from "./helpers/unsplash";

export const getDestinationImage = action({
  args: { destination: v.string() },
  returns: v.object({
    url: v.string(),
    photographer: v.string(),
    attribution: v.string(),
  }),
  handler: async (ctx, args) => {
    const image = await fetchUnsplashImage(args.destination);
    
    if (!image) {
      // Return a fallback image URL
      return {
        url: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80",
        photographer: "Unsplash",
        attribution: "Photo from Unsplash",
      };
    }

    return {
      url: image.url,
      photographer: image.photographer,
      attribution: image.attribution,
    };
  },
});

export const getDestinationImages = action({
  args: { destination: v.string(), count: v.optional(v.number()) },
  returns: v.array(
    v.object({
      url: v.string(),
      photographer: v.string(),
      attribution: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const images = await fetchUnsplashImages(args.destination, args.count || 5);
    
    if (images.length === 0) {
      // Return fallback images
      return [
        {
          url: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80",
          photographer: "Unsplash",
          attribution: "Photo from Unsplash",
        },
      ];
    }

    return images.map((img) => ({
      url: img.url,
      photographer: img.photographer,
      attribution: img.attribution,
    }));
  },
});

export const getActivityImage = action({
  args: { activity: v.string(), destination: v.string() },
  returns: v.object({
    url: v.string(),
    photographer: v.string(),
    attribution: v.string(),
  }),
  handler: async (ctx, args) => {
    const query = `${args.activity} ${args.destination}`;
    const image = await fetchUnsplashImage(query);
    
    if (!image) {
      return {
        url: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80",
        photographer: "Unsplash",
        attribution: "Photo from Unsplash",
      };
    }

    return {
      url: image.url,
      photographer: image.photographer,
      attribution: image.attribution,
    };
  },
});

export const getRestaurantImage = action({
  args: { cuisine: v.string(), destination: v.string() },
  returns: v.object({
    url: v.string(),
    photographer: v.string(),
    attribution: v.string(),
  }),
  handler: async (ctx, args) => {
    const query = `${args.cuisine} restaurant ${args.destination}`;
    const image = await fetchUnsplashImage(query);
    
    if (!image) {
      return {
        url: "https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=800&q=80",
        photographer: "Unsplash",
        attribution: "Photo from Unsplash",
      };
    }

    return {
      url: image.url,
      photographer: image.photographer,
      attribution: image.attribution,
    };
  },
});

export const searchDestinationImages = action({
  args: {
    query: v.string(),
    page: v.optional(v.number()),
    perPage: v.optional(v.number()),
    orientation: v.optional(v.string()),
  },
  returns: v.object({
    results: v.array(
      v.object({
        id: v.string(),
        url: v.string(),
        altDescription: v.optional(v.string()),
        photographer: v.string(),
        photographerUrl: v.string(),
        attribution: v.string(),
        unsplashLink: v.string(),
      })
    ),
    total: v.number(),
    totalPages: v.number(),
  }),
  handler: async (ctx, args) => {
    try {
      const accessKey = process.env.UNSPLASH_ACCESS_KEY;
      if (!accessKey) {
        throw new Error("UNSPLASH_ACCESS_KEY environment variable is not set");
      }

      const page = args.page || 1;
      const perPage = Math.min(args.perPage || 10, 20); // Cap at 20 per Unsplash limits
      const orientation = args.orientation || "landscape";

      const params = new URLSearchParams({
        query: args.query,
        page: page.toString(),
        per_page: perPage.toString(),
        orientation: orientation,
        client_id: accessKey,
      });

      const response = await fetch(
        `https://api.unsplash.com/search/photos?${params.toString()}`
      );

      if (!response.ok) {
        console.error(`Unsplash API error: ${response.status}`);
        return {
          results: [],
          total: 0,
          totalPages: 0,
        };
      }

      const data = await response.json();

      const results = data.results.map((photo: any) => ({
        id: photo.id,
        url: photo.urls.regular,
        altDescription: photo.alt_description,
        photographer: photo.user.name,
        photographerUrl: photo.user.links.html,
        attribution: `Photo by ${photo.user.name} on Unsplash`,
        unsplashLink: photo.links.html,
      }));

      return {
        results,
        total: data.total,
        totalPages: data.total_pages,
      };
    } catch (error) {
      console.error("Error searching Unsplash:", error);
      return {
        results: [],
        total: 0,
        totalPages: 0,
      };
    }
  },
});
