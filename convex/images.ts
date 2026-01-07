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
