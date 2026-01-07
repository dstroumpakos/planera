// Travel style to activity type mapping
export const TRAVEL_STYLE_MAPPING: Record<string, {
  activityTypes: string[];
  keywords: string[];
  description: string;
}> = {
  "Nightlife": {
    activityTypes: ["bar", "club", "lounge", "nightclub", "pub", "disco", "live-music"],
    keywords: ["bar", "club", "nightclub", "pub", "lounge", "disco", "live music", "cocktail", "drinks", "party"],
    description: "Bars, clubs, lounges, and nightlife venues"
  },
  "Shopping": {
    activityTypes: ["shopping", "mall", "market", "boutique", "street-shopping"],
    keywords: ["shopping", "mall", "market", "boutique", "street", "shop", "store", "shopping district", "bazaar", "souk"],
    description: "Shopping districts, malls, markets, and boutiques"
  },
  "Culinary": {
    activityTypes: ["restaurant", "food-tour", "cooking-class", "market-food", "cafe"],
    keywords: ["restaurant", "food", "cuisine", "cooking", "market", "cafe", "bistro", "dining", "meal", "tasting"],
    description: "Restaurants, food tours, cooking classes, and culinary experiences"
  },
  "Culture": {
    activityTypes: ["museum", "gallery", "cultural-site", "theater", "performance"],
    keywords: ["museum", "gallery", "cultural", "art", "theater", "performance", "exhibition", "heritage", "tradition"],
    description: "Museums, galleries, cultural sites, and performances"
  },
  "History": {
    activityTypes: ["historical-site", "monument", "ruins", "museum", "tour"],
    keywords: ["history", "historical", "monument", "ruins", "ancient", "heritage", "site", "tour", "castle", "palace"],
    description: "Historical sites, monuments, ruins, and heritage tours"
  },
  "Nature": {
    activityTypes: ["hiking", "nature-walk", "park", "garden", "outdoor", "adventure"],
    keywords: ["nature", "hiking", "walk", "park", "garden", "outdoor", "adventure", "trail", "forest", "mountain", "beach"],
    description: "Hiking, nature walks, parks, and outdoor adventures"
  },
  "Relaxation": {
    activityTypes: ["spa", "wellness", "beach", "resort", "meditation"],
    keywords: ["spa", "wellness", "relax", "beach", "resort", "meditation", "yoga", "massage", "thermal", "hot-spring"],
    description: "Spas, wellness centers, beaches, and relaxation activities"
  },
  "Luxury": {
    activityTypes: ["luxury-dining", "fine-dining", "luxury-tour", "premium-experience"],
    keywords: ["luxury", "fine dining", "premium", "exclusive", "high-end", "michelin", "upscale", "vip"],
    description: "Luxury dining, premium experiences, and exclusive activities"
  },
  "Family": {
    activityTypes: ["family-attraction", "theme-park", "zoo", "aquarium", "kids-activity"],
    keywords: ["family", "kids", "children", "theme park", "zoo", "aquarium", "playground", "interactive", "fun"],
    description: "Family-friendly attractions, theme parks, and kid-friendly activities"
  }
};

export function generateStyleSpecificPrompt(interests: string[]): string {
  if (!interests || interests.length === 0) {
    return "";
  }

  const styleDescriptions = interests
    .map(interest => TRAVEL_STYLE_MAPPING[interest])
    .filter(Boolean)
    .map(style => `- ${style.description}`)
    .join("\n");

  const keywords = interests
    .flatMap(interest => TRAVEL_STYLE_MAPPING[interest]?.keywords || [])
    .filter((v, i, a) => a.indexOf(v) === i); // Remove duplicates

  return `
The traveler has selected the following travel styles: ${interests.join(", ")}.

Please prioritize and include activities that match these styles:
${styleDescriptions}

Key activity types to focus on: ${keywords.join(", ")}

Make sure the itinerary flows naturally by:
1. Grouping similar activity types together when possible
2. Alternating between different activity types for variety
3. Ensuring activities match the selected travel styles
4. Including specific recommendations for each style
5. Providing realistic prices and booking information for each activity type`;
}

export function filterActivitiesByStyle(activities: any[], interests: string[]): any[] {
  if (!interests || interests.length === 0) {
    return activities;
  }

  const allKeywords = interests
    .flatMap(interest => TRAVEL_STYLE_MAPPING[interest]?.keywords || [])
    .map(k => k.toLowerCase());

  return activities.filter(activity => {
    const activityText = `${activity.title} ${activity.description} ${activity.type}`.toLowerCase();
    return allKeywords.some(keyword => activityText.includes(keyword));
  });
}

export function prioritizeActivitiesByStyle(activities: any[], interests: string[]): any[] {
  if (!interests || interests.length === 0) {
    return activities;
  }

  const styleMap = new Map<string, number>();
  interests.forEach((interest, index) => {
    styleMap.set(interest, index);
  });

  return activities.sort((a, b) => {
    const aStyle = interests.find(interest => {
      const keywords = TRAVEL_STYLE_MAPPING[interest]?.keywords || [];
      const activityText = `${a.title} ${a.description} ${a.type}`.toLowerCase();
      return keywords.some(k => activityText.includes(k.toLowerCase()));
    });

    const bStyle = interests.find(interest => {
      const keywords = TRAVEL_STYLE_MAPPING[interest]?.keywords || [];
      const activityText = `${b.title} ${b.description} ${b.type}`.toLowerCase();
      return keywords.some(k => activityText.includes(k.toLowerCase()));
    });

    const aIndex = aStyle ? styleMap.get(aStyle) : Infinity;
    const bIndex = bStyle ? styleMap.get(bStyle) : Infinity;

    return (aIndex ?? Infinity) - (bIndex ?? Infinity);
  });
}
