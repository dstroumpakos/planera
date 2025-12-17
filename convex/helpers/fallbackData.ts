// Fallback data for hotels, activities, and restaurants

export function getFallbackHotels(destination: string) {
    const destLower = destination.toLowerCase();
    const hotelsByCity: Record<string, any[]> = {
        "paris": [
            { name: "Hotel Le Marais", rating: "4", price: "180", currency: "EUR", amenities: ["WiFi", "Breakfast", "Air Conditioning"], address: "Le Marais District", description: "Charming boutique hotel in the heart of Le Marais" },
            { name: "Montmartre Residence", rating: "4", price: "150", currency: "EUR", amenities: ["WiFi", "Terrace", "City View"], address: "Montmartre", description: "Cozy hotel with stunning views of Sacré-Cœur" },
            { name: "Saint-Germain Palace", rating: "5", price: "320", currency: "EUR", amenities: ["WiFi", "Spa", "Restaurant", "Bar"], address: "Saint-Germain-des-Prés", description: "Luxury hotel in the literary heart of Paris" },
        ],
        "rome": [
            { name: "Hotel Trastevere", rating: "4", price: "160", currency: "EUR", amenities: ["WiFi", "Breakfast", "Rooftop"], address: "Trastevere", description: "Beautiful hotel in Rome's most charming neighborhood" },
            { name: "Colosseum View Inn", rating: "4", price: "190", currency: "EUR", amenities: ["WiFi", "Air Conditioning", "City View"], address: "Near Colosseum", description: "Wake up to views of ancient Rome" },
            { name: "Vatican Suites", rating: "5", price: "280", currency: "EUR", amenities: ["WiFi", "Spa", "Restaurant"], address: "Near Vatican", description: "Elegant suites steps from St. Peter's" },
        ],
        "barcelona": [
            { name: "Gothic Quarter Hotel", rating: "4", price: "140", currency: "EUR", amenities: ["WiFi", "Breakfast", "Terrace"], address: "Gothic Quarter", description: "Historic hotel in medieval Barcelona" },
            { name: "Barceloneta Beach Resort", rating: "4", price: "200", currency: "EUR", amenities: ["WiFi", "Pool", "Beach Access"], address: "Barceloneta", description: "Beachfront hotel with Mediterranean views" },
            { name: "Eixample Boutique", rating: "5", price: "260", currency: "EUR", amenities: ["WiFi", "Spa", "Restaurant", "Gym"], address: "Eixample", description: "Modernist luxury in Gaudí's neighborhood" },
        ],
        "athens": [
            { name: "Plaka Heritage Hotel", rating: "4", price: "120", currency: "EUR", amenities: ["WiFi", "Breakfast", "Rooftop"], address: "Plaka", description: "Traditional hotel with Acropolis views" },
            { name: "Monastiraki Square Inn", rating: "4", price: "100", currency: "EUR", amenities: ["WiFi", "Air Conditioning"], address: "Monastiraki", description: "Central location near ancient Agora" },
            { name: "Syntagma Grand", rating: "5", price: "220", currency: "EUR", amenities: ["WiFi", "Spa", "Pool", "Restaurant"], address: "Syntagma Square", description: "Luxury hotel overlooking Parliament" },
        ],
    };
    for (const [city, hotels] of Object.entries(hotelsByCity)) {
        if (destLower.includes(city)) return hotels;
    }
    return [
        { name: "City Center Hotel", rating: "4", price: "150", currency: "EUR", amenities: ["WiFi", "Breakfast", "Air Conditioning"], address: "City Center", description: "Comfortable hotel in the heart of the city" },
        { name: "Old Town Inn", rating: "4", price: "130", currency: "EUR", amenities: ["WiFi", "Terrace"], address: "Old Town", description: "Charming accommodation in the historic district" },
        { name: "Grand Plaza Hotel", rating: "5", price: "250", currency: "EUR", amenities: ["WiFi", "Spa", "Pool", "Restaurant"], address: "Main Square", description: "Luxury hotel with premium amenities" },
    ];
}

export function getFallbackActivities(destination: string) {
    const destLower = destination.toLowerCase();
    const activitiesByCity: Record<string, any[]> = {
        "paris": [
            { title: "Eiffel Tower Visit", description: "Iconic iron tower with panoramic views", price: "26", duration: "2-3 hours" },
            { title: "Louvre Museum", description: "World's largest art museum", price: "17", duration: "3-4 hours" },
            { title: "Seine River Cruise", description: "Scenic boat tour", price: "15", duration: "1 hour" },
            { title: "Montmartre Walking Tour", description: "Explore the artistic neighborhood", price: "20", duration: "2 hours" },
        ],
        "rome": [
            { title: "Colosseum Tour", description: "Ancient Roman amphitheater", price: "18", duration: "2-3 hours" },
            { title: "Vatican Museums", description: "Art collection and Sistine Chapel", price: "17", duration: "3-4 hours" },
            { title: "Roman Forum Walk", description: "Ancient ruins exploration", price: "16", duration: "2 hours" },
            { title: "Trastevere Food Tour", description: "Taste authentic Roman cuisine", price: "65", duration: "3 hours" },
        ],
        "barcelona": [
            { title: "Sagrada Familia", description: "Gaudí's masterpiece basilica", price: "26", duration: "2 hours" },
            { title: "Park Güell", description: "Colorful mosaic park", price: "10", duration: "2 hours" },
            { title: "Gothic Quarter Tour", description: "Medieval streets exploration", price: "15", duration: "2 hours" },
            { title: "La Boqueria Market", description: "Famous food market visit", price: "0", duration: "1-2 hours" },
        ],
        "athens": [
            { title: "Acropolis Tour", description: "Ancient citadel with Parthenon", price: "20", duration: "3 hours" },
            { title: "Acropolis Museum", description: "Modern museum with ancient artifacts", price: "15", duration: "2-3 hours" },
            { title: "Plaka Walking Tour", description: "Historic neighborhood exploration", price: "0", duration: "2 hours" },
            { title: "Greek Cooking Class", description: "Learn traditional recipes", price: "75", duration: "4 hours" },
        ],
    };
    for (const [city, activities] of Object.entries(activitiesByCity)) {
        if (destLower.includes(city)) return activities;
    }
    return [
        { title: "City Walking Tour", description: "Explore the main attractions", price: "20", duration: "3 hours" },
        { title: "Local Museum Visit", description: "Discover local history and culture", price: "15", duration: "2 hours" },
        { title: "Food Tasting Tour", description: "Sample local cuisine", price: "50", duration: "3 hours" },
        { title: "Sunset Viewpoint", description: "Best views of the city", price: "0", duration: "1 hour" },
    ];
}

export function getFallbackRestaurants(destination: string) {
    const destLower = destination.toLowerCase();
    const restaurantsByCity: Record<string, any[]> = {
        "paris": [
            { name: "Le Petit Cler", cuisine: "French", priceRange: "€€", rating: "4.5", address: "Rue Cler, 7th" },
            { name: "Bouillon Chartier", cuisine: "Traditional French", priceRange: "€", rating: "4.3", address: "7 Rue du Faubourg Montmartre" },
            { name: "L'Ami Jean", cuisine: "Basque", priceRange: "€€€", rating: "4.7", address: "27 Rue Malar, 7th" },
        ],
        "rome": [
            { name: "Da Enzo al 29", cuisine: "Roman", priceRange: "€€", rating: "4.6", address: "Via dei Vascellari 29, Trastevere" },
            { name: "Pizzarium", cuisine: "Pizza", priceRange: "€", rating: "4.5", address: "Via della Meloria 43" },
            { name: "Roscioli", cuisine: "Italian", priceRange: "€€€", rating: "4.7", address: "Via dei Giubbonari 21" },
        ],
        "barcelona": [
            { name: "Can Culleretes", cuisine: "Catalan", priceRange: "€€", rating: "4.4", address: "Carrer d'en Quintana 5" },
            { name: "Bar del Pla", cuisine: "Tapas", priceRange: "€€", rating: "4.5", address: "Carrer de Montcada 2" },
            { name: "Tickets", cuisine: "Modern Spanish", priceRange: "€€€", rating: "4.8", address: "Avinguda del Paral·lel 164" },
        ],
        "athens": [
            { name: "Karamanlidika", cuisine: "Greek Deli", priceRange: "€€", rating: "4.6", address: "Sokratous 1, Psyrri" },
            { name: "Ta Karamanlidika tou Fani", cuisine: "Greek", priceRange: "€€", rating: "4.5", address: "Evripidou 52" },
            { name: "Funky Gourmet", cuisine: "Modern Greek", priceRange: "€€€€", rating: "4.7", address: "Paramithias 13" },
        ],
    };
    for (const [city, restaurants] of Object.entries(restaurantsByCity)) {
        if (destLower.includes(city)) return restaurants;
    }
    return [
        { name: "Local Taverna", cuisine: "Local", priceRange: "€€", rating: "4.3", address: "Old Town" },
        { name: "City Bistro", cuisine: "International", priceRange: "€€", rating: "4.4", address: "Main Square" },
        { name: "Fine Dining Restaurant", cuisine: "Gourmet", priceRange: "€€€", rating: "4.6", address: "City Center" },
    ];
}

export function generateTransportationOptions(destination: string, origin: string, travelers: number) {
    return [
        {
            type: "taxi",
            name: "Airport Taxi",
            description: "Private taxi from airport to hotel",
            price: 35 + Math.floor(Math.random() * 20),
            currency: "EUR",
            duration: "30-45 min",
            bookingUrl: "https://www.kiwitaxi.com",
        },
        {
            type: "uber",
            name: "Uber/Bolt",
            description: "Ride-sharing service",
            price: 25 + Math.floor(Math.random() * 15),
            currency: "EUR",
            duration: "30-45 min",
            bookingUrl: "https://www.uber.com",
        },
        {
            type: "car",
            name: "Car Rental",
            description: "Rent a car for your trip",
            pricePerDay: 40 + Math.floor(Math.random() * 30),
            currency: "EUR",
            bookingUrl: "https://www.rentalcars.com",
        },
        {
            type: "public",
            name: "Public Transport",
            description: "Metro/Bus from airport",
            price: 5 + Math.floor(Math.random() * 10),
            currency: "EUR",
            duration: "45-60 min",
        },
    ];
}
