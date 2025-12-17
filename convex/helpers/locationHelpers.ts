// Location and IATA code helpers

export function extractIATACode(cityName: string): string {
    const cityToCode: Record<string, string> = {
        "london": "LHR", "paris": "CDG", "rome": "FCO", "barcelona": "BCN",
        "madrid": "MAD", "amsterdam": "AMS", "berlin": "BER", "athens": "ATH",
        "lisbon": "LIS", "dublin": "DUB", "vienna": "VIE", "prague": "PRG",
        "budapest": "BUD", "warsaw": "WAW", "copenhagen": "CPH", "stockholm": "ARN",
        "oslo": "OSL", "helsinki": "HEL", "zurich": "ZRH", "geneva": "GVA",
        "brussels": "BRU", "milan": "MXP", "venice": "VCE", "florence": "FLR",
        "munich": "MUC", "frankfurt": "FRA", "dubai": "DXB", "doha": "DOH",
        "abu dhabi": "AUH", "istanbul": "IST", "cairo": "CAI", "tel aviv": "TLV",
        "new york": "JFK", "los angeles": "LAX", "chicago": "ORD", "miami": "MIA",
        "san francisco": "SFO", "boston": "BOS", "washington": "IAD",
        "tokyo": "NRT", "singapore": "SIN", "hong kong": "HKG", "beijing": "PEK",
        "shanghai": "PVG", "seoul": "ICN", "bangkok": "BKK", "kuala lumpur": "KUL",
        "sydney": "SYD", "melbourne": "MEL", "auckland": "AKL",
        "santorini": "JTR", "mykonos": "JMK", "crete": "HER", "rhodes": "RHO",
        "corfu": "CFU", "thessaloniki": "SKG", "nice": "NCE", "marseille": "MRS",
        "lyon": "LYS", "bordeaux": "BOD", "toulouse": "TLS", "naples": "NAP",
        "palermo": "PMO", "malaga": "AGP", "seville": "SVQ", "valencia": "VLC",
        "bilbao": "BIO", "porto": "OPO", "edinburgh": "EDI", "manchester": "MAN",
        "birmingham": "BHX", "glasgow": "GLA", "belfast": "BFS",
    };
    const lower = cityName.toLowerCase();
    for (const [city, code] of Object.entries(cityToCode)) {
        if (lower.includes(city)) return code;
    }
    // Check if it's already an IATA code
    if (cityName.length === 3 && cityName === cityName.toUpperCase()) {
        return cityName;
    }
    return "ATH"; // Default to Athens
}

export function getFallbackCoordinates(destination: string) {
    const coords: Record<string, { latitude: number; longitude: number }> = {
        "paris": { latitude: 48.8566, longitude: 2.3522 },
        "london": { latitude: 51.5074, longitude: -0.1278 },
        "rome": { latitude: 41.9028, longitude: 12.4964 },
        "barcelona": { latitude: 41.3851, longitude: 2.1734 },
        "amsterdam": { latitude: 52.3676, longitude: 4.9041 },
        "athens": { latitude: 37.9838, longitude: 23.7275 },
        "berlin": { latitude: 52.5200, longitude: 13.4050 },
        "madrid": { latitude: 40.4168, longitude: -3.7038 },
        "dubai": { latitude: 25.2048, longitude: 55.2708 },
        "new york": { latitude: 40.7128, longitude: -74.0060 },
        "tokyo": { latitude: 35.6762, longitude: 139.6503 },
        "singapore": { latitude: 1.3521, longitude: 103.8198 },
        "lisbon": { latitude: 38.7223, longitude: -9.1393 },
        "prague": { latitude: 50.0755, longitude: 14.4378 },
        "vienna": { latitude: 48.2082, longitude: 16.3738 },
    };
    const destLower = destination.toLowerCase();
    for (const [city, coordinates] of Object.entries(coords)) {
        if (destLower.includes(city)) return coordinates;
    }
    return { latitude: 37.9838, longitude: 23.7275 };
}
