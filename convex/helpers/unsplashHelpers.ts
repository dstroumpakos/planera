// Unsplash API Helper Functions
// Following Unsplash API Guidelines: https://unsplash.com/documentation

export interface UnsplashPhoto {
    id: string;
    urls: {
        raw: string;
        full: string;
        regular: string;
        small: string;
        thumb: string;
    };
    links: {
        download_location: string;
    };
    user: {
        name: string;
        username: string;
        links: {
            html: string;
        };
    };
    alt_description: string | null;
}

export interface UnsplashAttribution {
    photographerName: string;
    photographerUsername: string;
    photographerUrl: string;
    unsplashUrl: string;
}

const UTM_PARAMS = "utm_source=planera&utm_medium=referral";

/**
 * Search for photos on Unsplash
 * @param query - Search query (e.g., destination name)
 * @param perPage - Number of results (default: 1)
 */
export async function searchUnsplashPhotos(
    query: string,
    perPage: number = 1
): Promise<UnsplashPhoto[]> {
    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    
    if (!accessKey) {
        console.log("UNSPLASH_ACCESS_KEY not configured, using fallback");
        return [];
    }

    try {
        const response = await fetch(
            `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`,
            {
                headers: {
                    Authorization: `Client-ID ${accessKey}`,
                },
            }
        );

        if (!response.ok) {
            console.error("Unsplash API error:", response.status, await response.text());
            return [];
        }

        const data = await response.json();
        return data.results || [];
    } catch (error) {
        console.error("Error fetching Unsplash photos:", error);
        return [];
    }
}

/**
 * Get a random photo for a destination
 * @param destination - Destination name
 */
export async function getDestinationPhoto(
    destination: string
): Promise<{ photo: UnsplashPhoto | null; attribution: UnsplashAttribution | null }> {
    // Search for destination + travel related terms
    const searchTerms = [`${destination} travel`, `${destination} city`, `${destination} landmark`];
    
    for (const term of searchTerms) {
        const photos = await searchUnsplashPhotos(term, 3);
        if (photos.length > 0) {
            // Pick a random photo from results
            const photo = photos[Math.floor(Math.random() * photos.length)];
            return {
                photo,
                attribution: getPhotoAttribution(photo),
            };
        }
    }

    return { photo: null, attribution: null };
}

/**
 * Get multiple photos for a destination (for gallery/slideshow)
 * @param destination - Destination name
 * @param count - Number of photos to fetch
 */
export async function getDestinationPhotos(
    destination: string,
    count: number = 5
): Promise<{ photos: UnsplashPhoto[]; attributions: UnsplashAttribution[] }> {
    const photos = await searchUnsplashPhotos(`${destination} travel`, count);
    const attributions = photos.map(getPhotoAttribution);
    
    return { photos, attributions };
}

/**
 * Get photo attribution data (required by Unsplash guidelines)
 */
export function getPhotoAttribution(photo: UnsplashPhoto): UnsplashAttribution {
    return {
        photographerName: photo.user.name,
        photographerUsername: photo.user.username,
        photographerUrl: `${photo.user.links.html}?${UTM_PARAMS}`,
        unsplashUrl: `https://unsplash.com/?${UTM_PARAMS}`,
    };
}

/**
 * Get the hotlinked image URL (required by Unsplash guidelines)
 * Use these URLs directly - do not download and re-host
 */
export function getPhotoUrl(photo: UnsplashPhoto, size: 'raw' | 'full' | 'regular' | 'small' | 'thumb' = 'regular'): string {
    return photo.urls[size];
}

/**
 * Trigger download tracking (required when user "downloads" or uses the image)
 * Call this when user selects an image for their trip
 */
export async function trackPhotoDownload(photo: UnsplashPhoto): Promise<void> {
    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    
    if (!accessKey || !photo.links.download_location) {
        return;
    }

    try {
        await fetch(photo.links.download_location, {
            headers: {
                Authorization: `Client-ID ${accessKey}`,
            },
        });
    } catch (error) {
        console.error("Error tracking Unsplash download:", error);
    }
}

/**
 * Format photo data for storage in database
 */
export function formatPhotoForStorage(photo: UnsplashPhoto): {
    imageUrl: string;
    imageUrlSmall: string;
    imageUrlThumb: string;
    unsplashPhotoId: string;
    unsplashDownloadLocation: string;
    photographerName: string;
    photographerUsername: string;
    photographerUrl: string;
} {
    return {
        imageUrl: photo.urls.regular,
        imageUrlSmall: photo.urls.small,
        imageUrlThumb: photo.urls.thumb,
        unsplashPhotoId: photo.id,
        unsplashDownloadLocation: photo.links.download_location,
        photographerName: photo.user.name,
        photographerUsername: photo.user.username,
        photographerUrl: `${photo.user.links.html}?${UTM_PARAMS}`,
    };
}

/**
 * Get fallback image URL when Unsplash is not available
 */
export function getFallbackDestinationImage(destination: string): string {
    // Return a placeholder or default travel image
    return `https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80`;
}
