/**
 * Travel Styles Configuration and Helpers
 * Maps travel styles to specific keywords, API search terms, and activity types
 */

export const TRAVEL_STYLES = {
    shopping: {
        label: "Shopping",
        keywords: ["shopping", "retail", "markets", "malls", "boutiques", "outlets"],
        searchTerms: ["shopping streets", "malls", "local markets", "outlets", "fashion districts", "shopping centers"],
        activityTypes: ["shopping", "market", "mall", "boutique"],
        description: "Shopping streets, malls, local markets, outlets, fashion districts",
    },
    nightlife: {
        label: "Nightlife",
        keywords: ["nightlife", "clubs", "bars", "lounges", "music", "entertainment"],
        searchTerms: ["clubs", "cocktail bars", "rooftop bars", "live music venues", "nightclubs", "bars"],
        activityTypes: ["nightlife", "bar", "club", "lounge"],
        description: "Clubs, cocktail bars, rooftop bars, live music venues",
    },
    culture: {
        label: "Culture",
        keywords: ["culture", "museums", "history", "landmarks", "art", "heritage"],
        searchTerms: ["museums", "historical sites", "landmarks", "cultural experiences", "galleries", "heritage sites"],
        activityTypes: ["museum", "historical", "cultural", "art", "landmark"],
        description: "Museums, historical sites, landmarks, cultural experiences",
    },
    nature: {
        label: "Nature",
        keywords: ["nature", "parks", "hiking", "beaches", "outdoor", "scenic"],
        searchTerms: ["parks", "viewpoints", "hiking routes", "beaches", "nature reserves", "scenic spots"],
        activityTypes: ["nature", "hiking", "beach", "park", "outdoor"],
        description: "Parks, viewpoints, hiking routes, beaches, nature reserves",
    },
    food: {
        label: "Food",
        keywords: ["food", "dining", "restaurants", "cuisine", "culinary", "gastronomy"],
        searchTerms: ["restaurants", "food tours", "cooking classes", "street food", "local cuisine", "food markets"],
        activityTypes: ["restaurant", "food tour", "cooking class", "dining"],
        description: "Restaurants, food tours, cooking classes, street food, local cuisine",
    },
    adventure: {
        label: "Adventure",
        keywords: ["adventure", "extreme", "sports", "activities", "thrilling", "adrenaline"],
        searchTerms: ["adventure sports", "water sports", "rock climbing", "zip-lining", "paragliding", "extreme sports"],
        activityTypes: ["adventure", "sports", "extreme", "water sports"],
        description: "Adventure sports, water sports, rock climbing, zip-lining, paragliding",
    },
    relaxation: {
        label: "Relaxation",
        keywords: ["relaxation", "spa", "wellness", "retreat", "peaceful", "calm"],
        searchTerms: ["spas", "wellness centers", "yoga retreats", "hot springs", "meditation", "peaceful spots"],
        activityTypes: ["spa", "wellness", "yoga", "retreat"],
        description: "Spas, wellness centers, yoga retreats, hot springs, meditation",
    },
} as const;

export type TravelStyle = keyof typeof TRAVEL_STYLES;

/**
 * Get search terms for a specific travel style
 */
export function getSearchTermsForStyle(style: TravelStyle): string[] {
    const terms = TRAVEL_STYLES[style]?.searchTerms;
    return terms ? Array.from(terms) : [];
}

/**
 * Get all search terms for multiple styles
 */
export function getAllSearchTerms(styles: TravelStyle[]): string[] {
    const terms = new Set<string>();
    styles.forEach((style) => {
        getSearchTermsForStyle(style).forEach((term) => terms.add(term));
    });
    return Array.from(terms);
}

/**
 * Generate a travel style context string for the AI prompt
 */
export function generateStyleContext(styles: TravelStyle[]): string {
    if (styles.length === 0) {
        return "No specific travel styles selected. Provide a balanced mix of activities.";
    }

    const styleDescriptions = styles
        .map((style) => {
            const config = TRAVEL_STYLES[style];
            if (!config) {
                console.warn(`Unknown travel style: ${style}`);
                return null;
            }
            return `- ${config.label}: ${config.description}`;
        })
        .filter((desc) => desc !== null) as string[];

    if (styleDescriptions.length === 0) {
        return "No specific travel styles selected. Provide a balanced mix of activities.";
    }

    return `User's selected travel styles:\n${styleDescriptions.join("\n")}\n\nPrioritize activities and recommendations that match these styles. When multiple styles are selected, create a balanced itinerary that combines them intelligently without duplicates.`;
}

/**
 * Filter and rank activities based on travel styles
 */
export function filterActivitiesByStyle(
    activities: any[],
    styles: TravelStyle[]
): any[] {
    if (styles.length === 0) return activities;

    const styleKeywords = new Set<string>();
    styles.forEach((style) => {
        TRAVEL_STYLES[style].keywords.forEach((keyword) => {
            styleKeywords.add(keyword.toLowerCase());
        });
    });

    // Score activities based on keyword matches
    const scoredActivities = activities.map((activity) => {
        const title = (activity.title || "").toLowerCase();
        const description = (activity.description || "").toLowerCase();
        const type = (activity.type || "").toLowerCase();
        const combined = `${title} ${description} ${type}`;

        let score = 0;
        styleKeywords.forEach((keyword) => {
            if (combined.includes(keyword)) {
                score += 1;
            }
        });

        return { ...activity, styleScore: score };
    });

    // Sort by style score (descending), then by original order
    return scoredActivities
        .sort((a, b) => b.styleScore - a.styleScore)
        .map(({ styleScore, ...activity }) => activity);
}

/**
 * Generate a "Based on your travel style" section
 */
export function generateStyleBasedSection(
    styles: TravelStyle[],
    activities: any[]
): any[] {
    if (styles.length === 0) return [];

    const filteredActivities = filterActivitiesByStyle(activities, styles);
    
    // Take top activities that match the styles
    return filteredActivities.slice(0, Math.min(5, filteredActivities.length));
}

/**
 * Create a prompt instruction for style-based recommendations
 */
export function createStyleBasedPromptInstruction(styles: TravelStyle[]): string {
    if (styles.length === 0) {
        return "";
    }

    const styleLabels: string[] = [];
    styles.forEach((s) => {
        const config = TRAVEL_STYLES[s];
        if (config) {
            styleLabels.push(config.label);
        }
    });

    if (styleLabels.length === 0) {
        return "";
    }

    const styleList = styleLabels.join(", ");

    return `\n\nIMPORTANT - Travel Style Personalization:\nThe user has selected these travel styles: ${styleList}\n\nFor each day's itinerary:\n1. Prioritize activities that match these styles\n2. Include at least 1-2 activities per day that directly align with the selected styles\n3. When combining multiple styles, ensure variety and balance\n4. Avoid generic sightseeing if style-specific alternatives exist\n5. Include specific, destination-relevant recommendations for each style\n\nExample: If "Food" is selected, include food tours, cooking classes, or local restaurants. If "Nature" is selected, include parks, hiking, or scenic viewpoints.`;
}
