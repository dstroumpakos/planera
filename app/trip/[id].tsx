import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Image, Linking, Platform, Alert, Modal, TextInput, KeyboardAvoidingView } from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import { BlurView } from "expo-blur";
import DateTimePicker from '@react-native-community/datetimepicker';

// Cart item type for local state
interface CartItem {
    name: string;
    day?: number;
    skipTheLine?: boolean;
}

// Airport code to full name mapping
const AIRPORT_NAMES: Record<string, string> = {
    // Greece
    "ATH": "Athens International Airport (ATH)",
    "SKG": "Thessaloniki Airport (SKG)",
    "HER": "Heraklion Airport (HER)",
    "RHO": "Rhodes Airport (RHO)",
    "CFU": "Corfu Airport (CFU)",
    "CHQ": "Chania Airport (CHQ)",
    "JMK": "Mykonos Airport (JMK)",
    "JTR": "Santorini Airport (JTR)",
    "KGS": "Kos Airport (KGS)",
    "ZTH": "Zakynthos Airport (ZTH)",
    // UK
    "LHR": "London Heathrow (LHR)",
    "LGW": "London Gatwick (LGW)",
    "STN": "London Stansted (STN)",
    "LTN": "London Luton (LTN)",
    "MAN": "Manchester Airport (MAN)",
    "BHX": "Birmingham Airport (BHX)",
    "EDI": "Edinburgh Airport (EDI)",
    // France
    "CDG": "Paris Charles de Gaulle (CDG)",
    "ORY": "Paris Orly (ORY)",
    "NCE": "Nice Côte d'Azur (NCE)",
    "LYS": "Lyon Airport (LYS)",
    "MRS": "Marseille Airport (MRS)",
    // Germany
    "FRA": "Frankfurt Airport (FRA)",
    "MUC": "Munich Airport (MUC)",
    "BER": "Berlin Brandenburg (BER)",
    "DUS": "Düsseldorf Airport (DUS)",
    "HAM": "Hamburg Airport (HAM)",
    // Italy
    "FCO": "Rome Fiumicino (FCO)",
    "MXP": "Milan Malpensa (MXP)",
    "VCE": "Venice Marco Polo (VCE)",
    "NAP": "Naples Airport (NAP)",
    "BGY": "Milan Bergamo (BGY)",
    // Spain
    "MAD": "Madrid Barajas (MAD)",
    "BCN": "Barcelona El Prat (BCN)",
    "PMI": "Palma de Mallorca (PMI)",
    "AGP": "Málaga Airport (AGP)",
    "ALC": "Alicante Airport (ALC)",
    "IBZ": "Ibiza Airport (IBZ)",
    // Netherlands
    "AMS": "Amsterdam Schiphol (AMS)",
    // Belgium
    "BRU": "Brussels Airport (BRU)",
    // Portugal
    "LIS": "Lisbon Airport (LIS)",
    "OPO": "Porto Airport (OPO)",
    "FAO": "Faro Airport (FAO)",
    // Turkey
    "IST": "Istanbul Airport (IST)",
    "SAW": "Istanbul Sabiha Gökçen (SAW)",
    "AYT": "Antalya Airport (AYT)",
    // UAE
    "DXB": "Dubai International (DXB)",
    "AUH": "Abu Dhabi Airport (AUH)",
    // USA
    "JFK": "New York JFK (JFK)",
    "LAX": "Los Angeles LAX (LAX)",
    "ORD": "Chicago O'Hare (ORD)",
    "MIA": "Miami International (MIA)",
    "SFO": "San Francisco (SFO)",
    "ATL": "Atlanta Hartsfield (ATL)",
    // Other popular
    "DUB": "Dublin Airport (DUB)",
    "ZRH": "Zurich Airport (ZRH)",
    "VIE": "Vienna Airport (VIE)",
    "PRG": "Prague Airport (PRG)",
    "BUD": "Budapest Airport (BUD)",
    "WAW": "Warsaw Chopin (WAW)",
    "CPH": "Copenhagen Airport (CPH)",
    "ARN": "Stockholm Arlanda (ARN)",
    "OSL": "Oslo Gardermoen (OSL)",
    "HEL": "Helsinki Airport (HEL)",
    "SIN": "Singapore Changi (SIN)",
    "HKG": "Hong Kong International (HKG)",
    "NRT": "Tokyo Narita (NRT)",
    "ICN": "Seoul Incheon (ICN)",
    "SYD": "Sydney Airport (SYD)",
    "MEL": "Melbourne Airport (MEL)",
    "YYZ": "Toronto Pearson (YYZ)",
    "YVR": "Vancouver Airport (YVR)",
};

// City name to airport code mapping (for reverse lookup)
const CITY_TO_AIRPORT: Record<string, string> = {
    // Greece
    "athens": "ATH",
    "thessaloniki": "SKG",
    "heraklion": "HER",
    "rhodes": "RHO",
    "corfu": "CFU",
    "chania": "CHQ",
    "mykonos": "JMK",
    "santorini": "JTR",
    "kos": "KGS",
    "zakynthos": "ZTH",
    // UK
    "london": "LHR",
    "manchester": "MAN",
    "birmingham": "BHX",
    "edinburgh": "EDI",
    // France
    "paris": "CDG",
    "nice": "NCE",
    "lyon": "LYS",
    "marseille": "MRS",
    // Germany
    "frankfurt": "FRA",
    "munich": "MUC",
    "berlin": "BER",
    "dusseldorf": "DUS",
    "düsseldorf": "DUS",
    "hamburg": "HAM",
    // Italy
    "rome": "FCO",
    "milan": "MXP",
    "venice": "VCE",
    "naples": "NAP",
    // Spain
    "madrid": "MAD",
    "barcelona": "BCN",
    "palma": "PMI",
    "mallorca": "PMI",
    "malaga": "AGP",
    "málaga": "AGP",
    "alicante": "ALC",
    "ibiza": "IBZ",
    // Netherlands
    "amsterdam": "AMS",
    // Belgium
    "brussels": "BRU",
    // Portugal
    "lisbon": "LIS",
    "porto": "OPO",
    "faro": "FAO",
    // Turkey
    "istanbul": "IST",
    "antalya": "AYT",
    // UAE
    "dubai": "DXB",
    "abu dhabi": "AUH",
    // USA
    "new york": "JFK",
    "los angeles": "LAX",
    "chicago": "ORD",
    "miami": "MIA",
    "san francisco": "SFO",
    "atlanta": "ATL",
    // Other
    "dublin": "DUB",
    "zurich": "ZRH",
    "vienna": "VIE",
    "prague": "PRG",
    "budapest": "BUD",
    "warsaw": "WAW",
    "copenhagen": "CPH",
    "stockholm": "ARN",
    "oslo": "OSL",
    "helsinki": "HEL",
    "singapore": "SIN",
    "hong kong": "HKG",
    "tokyo": "NRT",
    "seoul": "ICN",
    "sydney": "SYD",
    "melbourne": "MEL",
    "toronto": "YYZ",
    "vancouver": "YVR",
};

// Helper function to get full airport name
const getAirportName = (codeOrCity: string | undefined): string => {
    if (!codeOrCity) return "Unknown";
    
    // Check if it's a known airport code (exact match)
    const upperCode = codeOrCity.toUpperCase().trim();
    if (AIRPORT_NAMES[upperCode]) {
        return AIRPORT_NAMES[upperCode];
    }
    
    // Check if the string contains an airport code in parentheses
    const codeMatch = codeOrCity.match(/\(([A-Z]{3})\)/);
    if (codeMatch && AIRPORT_NAMES[codeMatch[1]]) {
        return AIRPORT_NAMES[codeMatch[1]];
    }
    
    // Try to find a city name match
    const lowerInput = codeOrCity.toLowerCase().trim();
    
    // Direct city match
    if (CITY_TO_AIRPORT[lowerInput]) {
        return AIRPORT_NAMES[CITY_TO_AIRPORT[lowerInput]];
    }
    
    // Check if input contains a known city name
    for (const [city, code] of Object.entries(CITY_TO_AIRPORT)) {
        if (lowerInput.includes(city)) {
            return AIRPORT_NAMES[code];
        }
    }
    
    // Return the original value if no mapping found
    return codeOrCity;
};

export default function TripDetails() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const trip = useQuery(api.trips.get, { tripId: id as Id<"trips"> });
    const updateTrip = useMutation(api.trips.update);
    const regenerateTrip = useMutation(api.trips.regenerate);
    const trackClick = useMutation(api.bookings.trackClick);
    
    // Cart mutations and query
    const addToCart = useMutation(api.cart.addToCart);
    const removeFromCart = useMutation(api.cart.removeFromCart);
    const cart = useQuery(api.cart.getCart, id ? { tripId: id as Id<"trips"> } : "skip");
    
    const [selectedHotelIndex, setSelectedHotelIndex] = useState<number | null>(null);
    const [accommodationType, setAccommodationType] = useState<'all' | 'hotel' | 'airbnb'>('all');
    const [isEditing, setIsEditing] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [datePickerMode, setDatePickerMode] = useState<'start' | 'end'>('start');
    const [addingToCart, setAddingToCart] = useState<string | null>(null); // Track which item is being added
    const [selectedFlightIndex, setSelectedFlightIndex] = useState<number>(0);
    const [checkedBaggageSelected, setCheckedBaggageSelected] = useState<boolean>(false);

    const [editForm, setEditForm] = useState({
        destination: "",
        origin: "",
        startDate: new Date().getTime(),
        endDate: new Date().getTime(),
        budget: 0, // Changed to number
        travelers: 1, // Changed to number
        interests: "",
    });

    useEffect(() => {
        if (trip) {
            // Convert old string budget to number
            let budgetValue = 0;
            if (typeof trip.budget === "number") {
                budgetValue = trip.budget;
            } else if (typeof trip.budget === "string") {
                // Convert old string format to numbers
                const budgetMap: Record<string, number> = {
                    "Low": 1000,
                    "Medium": 2000,
                    "High": 4000,
                    "Luxury": 8000,
                };
                budgetValue = budgetMap[trip.budget] || 2000;
            }
            
            setEditForm({
                destination: trip.destination,
                origin: trip.origin || "",
                startDate: trip.startDate,
                endDate: trip.endDate,
                budget: budgetValue,
                travelers: trip.travelers || 1,
                interests: (trip.interests || []).join(", "),
            });
        }
    }, [trip]);

    const handleSaveAndRegenerate = async () => {
        if (!trip) return;
        
        await updateTrip({
            tripId: trip._id,
            destination: editForm.destination,
            origin: editForm.origin,
            startDate: editForm.startDate,
            endDate: editForm.endDate,
            budget: editForm.budget, // Already a number
            travelers: editForm.travelers, // Already a number
            interests: editForm.interests.split(",").map(s => s.trim()).filter(s => s.length > 0),
        });
        await regenerateTrip({ tripId: trip._id });
        setIsEditing(false);
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            if (datePickerMode === 'start') {
                const newStart = selectedDate.getTime();
                // Maintain duration if possible
                const duration = editForm.endDate - editForm.startDate;
                setEditForm(prev => ({
                    ...prev,
                    startDate: newStart,
                    endDate: newStart + duration
                }));
            } else {
                setEditForm(prev => ({
                    ...prev,
                    endDate: selectedDate.getTime()
                }));
            }
        }
    };

    // Cart helper functions
    const isInCart = (activityName: string, day?: number, skipTheLine?: boolean): boolean => {
        if (!cart || !cart.items) return false;
        return cart.items.some(
            (item) => item.name === activityName && item.day === day && item.skipTheLine === skipTheLine
        );
    };

    const getCartItemCount = (): number => {
        if (!cart || !cart.items) return 0;
        return cart.items.reduce((sum, item) => sum + item.quantity, 0);
    };

    const handleAddToCart = async (activity: any, day: number, skipTheLine: boolean = false) => {
        if (!id) return;
        
        const itemKey = `${activity.title}-${day}-${skipTheLine}`;
        setAddingToCart(itemKey);
        
        try {
            const price = skipTheLine && activity.skipTheLinePrice 
                ? activity.skipTheLinePrice 
                : activity.price || 0;
            
            await addToCart({
                tripId: id as Id<"trips">,
                item: {
                    type: "activity",
                    name: activity.title,
                    price: price,
                    currency: "EUR",
                    quantity: 1,
                    day: day,
                    bookingUrl: activity.bookingUrl,
                    productCode: activity.productCode,
                    skipTheLine: skipTheLine,
                    details: {
                        time: activity.time,
                        duration: activity.duration,
                        description: activity.description,
                    },
                },
            });
            
            if (Platform.OS !== 'web') {
                Alert.alert("Added to Cart", `${activity.title}${skipTheLine ? " (Skip the Line)" : ""} has been added to your cart.`);
            }
        } catch (error) {
            console.error("Error adding to cart:", error);
            if (Platform.OS !== 'web') {
                Alert.alert("Error", "Failed to add item to cart. Please try again.");
            }
        } finally {
            setAddingToCart(null);
        }
    };

    const handleRemoveFromCart = async (activityName: string, day?: number, skipTheLine?: boolean) => {
        if (!id) return;
        
        try {
            await removeFromCart({
                tripId: id as Id<"trips">,
                itemName: activityName,
                day: day,
                skipTheLine: skipTheLine,
            });
        } catch (error) {
            console.error("Error removing from cart:", error);
        }
    };

    if (trip === undefined) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#14B8A6" />
            </View>
        );
    }

    if (!trip) {
        return (
            <View style={styles.center}>
                <Text>Trip not found</Text>
            </View>
        );
    }

    if (trip.status === "generating") {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#14B8A6" />
                <Text style={styles.generatingText}>Generating your dream trip...</Text>
                <Text style={styles.generatingSubtext}>This usually takes a few seconds.</Text>
            </View>
        );
    }

    if (trip.status === "failed") {
        return (
            <View style={styles.center}>
                <Ionicons name="alert-circle" size={64} color="#FF3B30" />
                <Text style={styles.errorText}>Failed to generate trip.</Text>
            </View>
        );
    }

    const { itinerary } = trip;

    // Calculate duration in days
    const duration = Math.ceil((trip.endDate - trip.startDate) / (1000 * 60 * 60 * 24));
    const travelers = trip.travelers || 1;

    const allAccommodations = trip.itinerary?.hotels || [];
    
    // Filter accommodations based on selected type
    const filteredAccommodations = accommodationType === 'all' 
        ? allAccommodations 
        : allAccommodations.filter((acc: any) => acc.type === accommodationType);
    
    // Get hotels and airbnbs counts
    const hotelsCount = allAccommodations.filter((acc: any) => acc.type === 'hotel' || !acc.type).length;
    const airbnbsCount = allAccommodations.filter((acc: any) => acc.type === 'airbnb').length;
    
    const selectedAccommodation = selectedHotelIndex !== null 
        ? allAccommodations[selectedHotelIndex] 
        : allAccommodations[0];
    
    // Get selected flight from options if available
    const flightOptions = itinerary?.flights?.options;
    const selectedFlight = flightOptions && Array.isArray(flightOptions) 
        ? flightOptions[selectedFlightIndex] || flightOptions[0]
        : null;
    
    // Calculate flight price based on selected flight
    const flightPricePerPerson = selectedFlight 
        ? selectedFlight.pricePerPerson 
        : (itinerary?.flights?.pricePerPerson || (itinerary?.flights?.price ? itinerary.flights.price / travelers : 0));
    
    // Get baggage price from selected flight (default €30 per person for checked bag)
    // Only charge if baggage is not already included AND user selected it
    const checkedBaggagePrice = selectedFlight?.checkedBaggagePrice || 30;
    const baggageIncluded = selectedFlight?.checkedBaggageIncluded || false;
    const totalBaggageCost = (!baggageIncluded && checkedBaggageSelected) ? checkedBaggagePrice * travelers : 0;
    
    const accommodationPricePerNight = selectedAccommodation?.pricePerNight || 0;
    const dailyExpensesPerPerson = itinerary?.estimatedDailyExpenses || 50; // Fallback

    const totalFlightCost = flightPricePerPerson * travelers;
    const totalAccommodationCost = accommodationPricePerNight * duration;
    const totalDailyExpenses = dailyExpensesPerPerson * travelers * duration;
    
    const grandTotal = totalFlightCost + totalBaggageCost + totalAccommodationCost + totalDailyExpenses;
    const pricePerPerson = grandTotal / travelers;

    const openMap = (query: string) => {
        const url = Platform.select({
            ios: `maps:0,0?q=${encodeURIComponent(query)}`,
            android: `geo:0,0?q=${encodeURIComponent(query)}`,
            web: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
        });
        if (url) Linking.openURL(url);
    };

    const openAffiliateLink = async (type: 'flight' | 'hotel', query: string) => {
        // In a real app, you would use your actual affiliate IDs and endpoints
        // Examples: Skyscanner, Booking.com, Expedia, etc.
        let url = "";
        if (type === 'flight') {
            url = `https://www.skyscanner.com/transport/flights?q=${encodeURIComponent(query)}`;
        } else {
            url = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(query)}`;
        }

        // Track the click
        try {
            await trackClick({
                tripId: id as Id<"trips">,
                type: type,
                item: query,
                url: url
            });
        } catch (e) {
            console.error("Failed to track click", e);
        }

        // Show alert to confirm tracking (User Flow Requirement)
        Alert.alert(
            "Redirecting to Supplier",
            "We are taking you to the booking page. Your booking will be tracked for rewards!",
            [
                { 
                    text: "Continue", 
                    onPress: () => Linking.openURL(url)
                },
                {
                    text: "Cancel",
                    style: "cancel"
                }
            ]
        );
    };

    const handleBookTrip = () => {
        // For now, we'll link to a general travel booking site or a specific package deal
        // In a real app, this would likely add items to a cart or redirect to a checkout flow
        const query = `${trip.origin} to ${trip.destination} package`;
        const url = `https://www.expedia.com/Hotel-Search?destination=${encodeURIComponent(trip.destination)}`;
        Linking.openURL(url);
    };

    const handleRegenerate = () => {
        // In a real app, this would trigger a re-generation of the itinerary
        // For now, we'll just show an alert or navigate back to create-trip with pre-filled data
        Alert.alert(
            "Regenerate Trip",
            "Do you want to regenerate this itinerary? This will create a new version of your trip.",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Regenerate", 
                    onPress: () => {
                        // Navigate to create-trip with params to pre-fill
                        router.push({
                            pathname: "/create-trip",
                            params: {
                                destination: trip.destination,
                                startDate: trip.startDate,
                                endDate: trip.endDate,
                                budget: trip.budget,
                                travelers: trip.travelers,
                                origin: trip.origin,
                                regenerate: "true" // Flag to indicate regeneration
                            }
                        });
                    } 
                }
            ]
        );
    };

    const renderFlights = () => {
        // Check if flights were skipped
        if (itinerary.flights?.skipped) {
            return (
                <View style={styles.card}>
                    <View style={styles.skippedFlightsContainer}>
                        <Ionicons name="airplane" size={32} color="#5EEAD4" />
                        <Text style={styles.skippedFlightsTitle}>Flights Not Included</Text>
                        <Text style={styles.skippedFlightsText}>
                            {itinerary.flights.message || "You indicated you already have flights booked."}
                        </Text>
                    </View>
                </View>
            );
        }

        // Handle new multiple options format
        if (itinerary.flights?.options && Array.isArray(itinerary.flights.options)) {
            const flightOptions = itinerary.flights.options;
            const selectedFlight = flightOptions[selectedFlightIndex] || flightOptions[0];
            const bestPrice = itinerary.flights.bestPrice;
            
            return (
                <View style={styles.card}>
                    <View style={styles.bestPriceBanner}>
                        <Ionicons name="pricetag" size={16} color="#10B981" />
                        <Text style={styles.bestPriceText}>Best price from €{Math.round(bestPrice)}/person</Text>
                    </View>
                    
                    <Text style={styles.flightOptionsLabel}>Select your flight:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.flightOptionsScroll}>
                        {flightOptions.map((option: any, index: number) => (
                            <TouchableOpacity
                                key={option.id || index}
                                style={[
                                    styles.flightOptionCard,
                                    selectedFlightIndex === index && styles.flightOptionCardSelected,
                                ]}
                                onPress={() => setSelectedFlightIndex(index)}
                            >
                                {option.isBestPrice && (
                                    <View style={styles.bestPriceBadge}>
                                        <Text style={styles.bestPriceBadgeText}>Best Price</Text>
                                    </View>
                                )}
                                <Text style={styles.flightOptionAirline}>{option.outbound.airline}</Text>
                                <Text style={styles.flightOptionTime}>{option.outbound.departure}</Text>
                                <Text style={styles.flightOptionPrice}>€{Math.round(option.pricePerPerson)}</Text>
                                <Text style={styles.flightOptionStops}>
                                    {option.outbound.stops === 0 ? 'Direct' : `${option.outbound.stops} stop`}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                    
                    <View style={styles.selectedFlightDetails}>
                        {/* Route Display */}
                        <View style={styles.routeDisplay}>
                            <View style={styles.routePoint}>
                                <Ionicons name="location" size={18} color="#14B8A6" />
                                <Text style={styles.routeAirport}>{getAirportName(trip.origin)}</Text>
                            </View>
                            <View style={styles.routeLine}>
                                <View style={styles.routeDash} />
                                <Ionicons name="airplane" size={16} color="#5EEAD4" />
                                <View style={styles.routeDash} />
                            </View>
                            <View style={styles.routePoint}>
                                <Ionicons name="location" size={18} color="#F59E0B" />
                                <Text style={styles.routeAirport}>{getAirportName(selectedFlight.arrivalAirport || trip.destination)}</Text>
                            </View>
                        </View>

                        <View style={styles.flightHeader}>
                            <Text style={styles.flightPrice}>€{Math.round(selectedFlight.pricePerPerson)}/person</Text>
                            <View style={styles.luggageBadge}>
                                <Ionicons name="briefcase-outline" size={14} color="#14B8A6" />
                                <Text style={styles.luggageText}>{selectedFlight.luggage}</Text>
                            </View>
                        </View>
                        
                        {itinerary.flights.dataSource === "ai-generated" && (
                            <View style={styles.dataSourceBadge}>
                                <Ionicons name="sparkles" size={14} color="#FF9500" />
                                <Text style={styles.dataSourceText}>AI-Generated Flight Data</Text>
                            </View>
                        )}
                        
                        <View style={styles.flightSegment}>
                            <View style={styles.segmentHeader}>
                                <Ionicons name="airplane" size={20} color="#14B8A6" />
                                <Text style={styles.segmentTitle}>Outbound</Text>
                            </View>
                            <View style={styles.row}>
                                <View style={styles.flightInfo}>
                                    <Text style={styles.cardTitle}>{selectedFlight.outbound.airline}</Text>
                                    <Text style={styles.cardSubtitle}>{selectedFlight.outbound.flightNumber}</Text>
                                </View>
                                <Text style={styles.duration}>{selectedFlight.outbound.duration}</Text>
                            </View>
                            <View style={styles.flightTimes}>
                                <Text style={styles.time}>{selectedFlight.outbound.departure}</Text>
                                <Ionicons name="arrow-forward" size={16} color="#8E8E93" />
                                <Text style={styles.time}>{selectedFlight.outbound.arrival}</Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.flightSegment}>
                            <View style={styles.segmentHeader}>
                                <Ionicons name="airplane" size={20} color="#14B8A6" style={{ transform: [{ rotate: '180deg' }] }} />
                                <Text style={styles.segmentTitle}>Return</Text>
                            </View>
                            <View style={styles.row}>
                                <View style={styles.flightInfo}>
                                    <Text style={styles.cardTitle}>{selectedFlight.return.airline}</Text>
                                    <Text style={styles.cardSubtitle}>{selectedFlight.return.flightNumber}</Text>
                                </View>
                                <Text style={styles.duration}>{selectedFlight.return.duration}</Text>
                            </View>
                            <View style={styles.flightTimes}>
                                <Text style={styles.time}>{selectedFlight.return.departure}</Text>
                                <Ionicons name="arrow-forward" size={16} color="#8E8E93" />
                                <Text style={styles.time}>{selectedFlight.return.arrival}</Text>
                            </View>
                        </View>

                        {/* Baggage Options */}
                        <View style={styles.baggageSection}>
                            <Text style={styles.baggageSectionTitle}>Baggage Options</Text>
                            
                            {/* Included Cabin Bag */}
                            <View style={styles.baggageOption}>
                                <View style={styles.baggageOptionLeft}>
                                    <Ionicons name="briefcase-outline" size={20} color="#14B8A6" />
                                    <View style={styles.baggageOptionInfo}>
                                        <Text style={styles.baggageOptionTitle}>Cabin Bag (8kg)</Text>
                                        <Text style={styles.baggageOptionDesc}>Included in fare</Text>
                                    </View>
                                </View>
                                <View style={styles.includedBadge}>
                                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                                    <Text style={styles.includedText}>Included</Text>
                                </View>
                            </View>

                            {/* Checked Baggage - Show as included or as option */}
                            {selectedFlight.checkedBaggageIncluded ? (
                                <View style={styles.baggageOption}>
                                    <View style={styles.baggageOptionLeft}>
                                        <Ionicons name="bag-handle-outline" size={20} color="#14B8A6" />
                                        <View style={styles.baggageOptionInfo}>
                                            <Text style={styles.baggageOptionTitle}>Checked Bag (23kg)</Text>
                                            <Text style={styles.baggageOptionDesc}>Included in fare</Text>
                                        </View>
                                    </View>
                                    <View style={styles.includedBadge}>
                                        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                                        <Text style={styles.includedText}>Included</Text>
                                    </View>
                                </View>
                            ) : (
                                <TouchableOpacity 
                                    style={[
                                        styles.baggageOption,
                                        styles.baggageOptionSelectable,
                                        checkedBaggageSelected && styles.baggageOptionSelected
                                    ]}
                                    onPress={() => setCheckedBaggageSelected(!checkedBaggageSelected)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.baggageOptionLeft}>
                                        <Ionicons name="bag-handle-outline" size={20} color={checkedBaggageSelected ? "#14B8A6" : "#546E7A"} />
                                        <View style={styles.baggageOptionInfo}>
                                            <Text style={[styles.baggageOptionTitle, checkedBaggageSelected && styles.baggageOptionTitleSelected]}>
                                                Checked Bag (23kg)
                                            </Text>
                                            <Text style={styles.baggageOptionDesc}>Per person, round trip</Text>
                                        </View>
                                    </View>
                                    <View style={styles.baggageOptionRight}>
                                        <Text style={[styles.baggagePrice, checkedBaggageSelected && styles.baggagePriceSelected]}>
                                            +€{selectedFlight.checkedBaggagePrice || 30}
                                        </Text>
                                        <View style={[styles.checkbox, checkedBaggageSelected && styles.checkboxSelected]}>
                                            {checkedBaggageSelected && (
                                                <Ionicons name="checkmark" size={16} color="white" />
                                            )}
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            )}

                            {checkedBaggageSelected && !selectedFlight.checkedBaggageIncluded && (
                                <View style={styles.baggageSummary}>
                                    <Text style={styles.baggageSummaryText}>
                                        Checked baggage for {travelers} traveler{travelers > 1 ? 's' : ''}: €{(selectedFlight.checkedBaggagePrice || 30) * travelers}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>

                    <TouchableOpacity 
                        style={styles.affiliateButton}
                        onPress={() => openAffiliateLink('flight', `${trip.origin} to ${trip.destination}`)}
                    >
                        <Text style={styles.affiliateButtonText}>Book This Flight</Text>
                        <Ionicons name="open-outline" size={16} color="#14B8A6" />
                    </TouchableOpacity>
                </View>
            );
        }

        // Legacy array format
        if (Array.isArray(itinerary.flights)) {
            return (
                <View style={styles.card}>
                    {itinerary.flights.map((flight: any, index: number) => (
                        <View key={index} style={styles.row}>
                            <View style={styles.flightInfo}>
                                <Text style={styles.cardTitle}>{flight.airline}</Text>
                                <Text style={styles.cardSubtitle}>{flight.flightNumber}</Text>
                            </View>
                            <Text style={styles.price}>${flight.price}</Text>
                        </View>
                    ))}
                </View>
            );
        }

        // No flights available
        if (!itinerary.flights || !itinerary.flights.outbound) {
            return (
                <View style={styles.card}>
                    <Text style={styles.cardSubtitle}>Flight details unavailable</Text>
                </View>
            );
        }

        // Old single flight format
        return (
            <View style={styles.card}>
                <View style={styles.flightHeader}>
                    <Text style={styles.flightPrice}>€{flightPricePerPerson}/person</Text>
                    <View style={styles.luggageBadge}>
                        <Ionicons name="briefcase-outline" size={14} color="#14B8A6" />
                        <Text style={styles.luggageText}>{itinerary.flights.luggage}</Text>
                    </View>
                </View>
                
                {itinerary.flights.dataSource === "ai-generated" && (
                    <View style={styles.dataSourceBadge}>
                        <Ionicons name="sparkles" size={14} color="#FF9500" />
                        <Text style={styles.dataSourceText}>AI-Generated Flight Data</Text>
                    </View>
                )}
                
                <View style={styles.flightSegment}>
                    <View style={styles.segmentHeader}>
                        <Ionicons name="airplane" size={20} color="#14B8A6" />
                        <Text style={styles.segmentTitle}>Outbound</Text>
                    </View>
                    <View style={styles.row}>
                        <View style={styles.flightInfo}>
                            <Text style={styles.cardTitle}>{itinerary.flights.outbound.airline}</Text>
                            <Text style={styles.cardSubtitle}>{itinerary.flights.outbound.flightNumber}</Text>
                        </View>
                        <Text style={styles.duration}>{itinerary.flights.outbound.duration}</Text>
                    </View>
                    <View style={styles.flightTimes}>
                        <Text style={styles.time}>{itinerary.flights.outbound.departure}</Text>
                        <Ionicons name="arrow-forward" size={16} color="#8E8E93" />
                        <Text style={styles.time}>{itinerary.flights.outbound.arrival}</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.flightSegment}>
                    <View style={styles.segmentHeader}>
                        <Ionicons name="airplane" size={20} color="#14B8A6" style={{ transform: [{ rotate: '180deg' }] }} />
                        <Text style={styles.segmentTitle}>Return</Text>
                    </View>
                    <View style={styles.row}>
                        <View style={styles.flightInfo}>
                            <Text style={styles.cardTitle}>{itinerary.flights.return.airline}</Text>
                            <Text style={styles.cardSubtitle}>{itinerary.flights.return.flightNumber}</Text>
                        </View>
                        <Text style={styles.duration}>{itinerary.flights.return.duration}</Text>
                    </View>
                    <View style={styles.flightTimes}>
                        <Text style={styles.time}>{itinerary.flights.return.departure}</Text>
                        <Ionicons name="arrow-forward" size={16} color="#8E8E93" />
                        <Text style={styles.time}>{itinerary.flights.return.arrival}</Text>
                    </View>
                </View>

                <TouchableOpacity 
                    style={styles.affiliateButton}
                    onPress={() => openAffiliateLink('flight', `${trip.origin} to ${trip.destination}`)}
                >
                    <Text style={styles.affiliateButtonText}>Check Flight Availability</Text>
                    <Ionicons name="open-outline" size={16} color="#14B8A6" />
                </TouchableOpacity>
            </View>
        );
    };

    // User has full access if they have premium subscription OR have used trip credits
    const isPremium = trip.hasFullAccess ?? trip.userPlan === "premium";

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                
                <View style={styles.headerRightButtons}>
                    {/* Cart Button with Badge */}
                    <TouchableOpacity 
                        onPress={() => {
                            if (Platform.OS !== 'web') {
                                const itemCount = getCartItemCount();
                                const total = cart?.totalAmount || 0;
                                if (itemCount > 0) {
                                    Alert.alert(
                                        "Your Cart",
                                        `${itemCount} item${itemCount > 1 ? 's' : ''} in cart\nTotal: €${total.toFixed(2)}`,
                                        [
                                            { text: "Continue Shopping", style: "cancel" },
                                            { text: "Clear Cart", style: "destructive", onPress: () => {
                                                // Clear cart functionality
                                            }},
                                        ]
                                    );
                                } else {
                                    Alert.alert("Cart Empty", "Add activities to your cart to book them together.");
                                }
                            }
                        }} 
                        style={styles.iconButton}
                    >
                        <Ionicons name="cart-outline" size={20} color="white" />
                        {getCartItemCount() > 0 && (
                            <View style={styles.cartBadge}>
                                <Text style={styles.cartBadgeText}>{getCartItemCount()}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.iconButton}>
                        <Ionicons name="pencil" size={20} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => regenerateTrip({ tripId: trip._id })} 
                        style={styles.iconButton}
                    >
                        <Ionicons name="refresh" size={20} color="white" />
                    </TouchableOpacity>
                </View>

                <Image 
                    source={{ uri: `https://images.pexels.com/photos/1285625/pexels-photo-1285625.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop&q=80&query=${encodeURIComponent(trip.destination)}` }} 
                    style={styles.headerImage} 
                />
                <View style={styles.headerOverlay} />
                <View style={styles.headerContent}>
                    <Text style={styles.destination}>{trip.destination}</Text>
                    <Text style={styles.dates}>
                        {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
                    </Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Multi-City Route Overview */}
                {trip.isMultiCity && trip.optimizedRoute?.segments && trip.optimizedRoute.segments.length > 0 && (
                    <Section title="Your Route">
                        <View style={styles.multiCityRouteContainer}>
                            {/* Route visualization */}
                            <View style={styles.routeVisualization}>
                                {trip.optimizedRoute.segments.map((segment: any, index: number) => (
                                    <View key={index} style={styles.routeSegmentContainer}>
                                        {/* City marker */}
                                        <View style={styles.cityMarker}>
                                            <View style={styles.cityMarkerDot}>
                                                <Text style={styles.cityMarkerNumber}>{index + 1}</Text>
                                            </View>
                                            <View style={styles.cityMarkerInfo}>
                                                <Text style={styles.cityMarkerName}>{segment.from}</Text>
                                                <Text style={styles.cityMarkerDays}>{segment.duration}</Text>
                                            </View>
                                        </View>
                                        
                                        {/* Transport connector */}
                                        <View style={styles.transportConnector}>
                                            <View style={styles.transportLine} />
                                            <View style={styles.transportBadge}>
                                                <Ionicons 
                                                    name={
                                                        segment.transportMethod === 'flight' ? 'airplane' :
                                                        segment.transportMethod === 'train' ? 'train' :
                                                        segment.transportMethod === 'ferry' ? 'boat' : 'car'
                                                    } 
                                                    size={14} 
                                                    color="#14B8A6" 
                                                />
                                                <Text style={styles.transportBadgeText}>
                                                    {segment.transportMethod} • {segment.duration}
                                                </Text>
                                            </View>
                                            <View style={styles.transportLine} />
                                        </View>
                                    </View>
                                ))}
                                
                                {/* Final destination marker */}
                                {trip.optimizedRoute.segments.length > 0 && (
                                    <View style={styles.cityMarker}>
                                        <View style={[styles.cityMarkerDot, styles.finalCityMarkerDot]}>
                                            <Ionicons name="flag" size={14} color="#fff" />
                                        </View>
                                        <View style={styles.cityMarkerInfo}>
                                            <Text style={styles.cityMarkerName}>
                                                {trip.optimizedRoute.segments[trip.optimizedRoute.segments.length - 1].to}
                                            </Text>
                                            <Text style={styles.cityMarkerDays}>Final stop</Text>
                                        </View>
                                    </View>
                                )}
                            </View>
                            
                            {/* Route summary */}
                            <View style={styles.routeSummary}>
                                <View style={styles.routeSummaryItem}>
                                    <Ionicons name="location" size={18} color="#14B8A6" />
                                    <Text style={styles.routeSummaryText}>
                                        {trip.destinations?.length || trip.optimizedRoute.segments.length + 1} cities
                                    </Text>
                                </View>
                                <View style={styles.routeSummaryItem}>
                                    <Ionicons name="time" size={18} color="#14B8A6" />
                                    <Text style={styles.routeSummaryText}>
                                        {Math.round((trip.endDate - trip.startDate) / (24 * 60 * 60 * 1000))} days total
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </Section>
                )}

                {!trip.skipFlights ? (
                    <Section title="Flights">
                        {renderFlights()}
                    </Section>
                ) : (
                    <View style={styles.skippedSection}>
                        <Ionicons name="airplane-outline" size={24} color="#90A4AE" />
                        <Text style={styles.skippedText}>Flights skipped - you already have flights</Text>
                    </View>
                )}

                {!trip.skipHotel ? (
                    <Section title="Accommodation Options">
                        {/* Accommodation Type Filter */}
                        <View style={styles.accommodationFilter}>
                            <TouchableOpacity 
                                style={[styles.filterTab, accommodationType === 'all' && styles.filterTabActive]}
                                onPress={() => setAccommodationType('all')}
                            >
                                <Text style={[styles.filterTabText, accommodationType === 'all' && styles.filterTabTextActive]}>
                                    All ({allAccommodations.length})
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.filterTab, accommodationType === 'hotel' && styles.filterTabActive]}
                                onPress={() => setAccommodationType('hotel')}
                            >
                                <Ionicons name="business" size={16} color={accommodationType === 'hotel' ? '#fff' : '#546E7A'} />
                                <Text style={[styles.filterTabText, accommodationType === 'hotel' && styles.filterTabTextActive]}>
                                    Hotels ({hotelsCount})
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.filterTab, accommodationType === 'airbnb' && styles.filterTabActive, accommodationType === 'airbnb' && styles.airbnbTabActive]}
                                onPress={() => setAccommodationType('airbnb')}
                            >
                                <Ionicons name="home" size={16} color={accommodationType === 'airbnb' ? '#fff' : '#FF5A5F'} />
                                <Text style={[styles.filterTabText, accommodationType === 'airbnb' && styles.filterTabTextActive]}>
                                    Airbnb ({airbnbsCount})
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hotelList}>
                            {filteredAccommodations.map((accommodation: any, index: number) => {
                                const isAirbnb = accommodation.type === 'airbnb';
                                const actualIndex = allAccommodations.indexOf(accommodation);
                                
                                return (
                                    <TouchableOpacity 
                                        key={index} 
                                        onPress={() => setSelectedHotelIndex(actualIndex)}
                                        activeOpacity={0.9}
                                        style={[
                                            styles.hotelCard,
                                            selectedHotelIndex === actualIndex && styles.selectedHotelCard,
                                            isAirbnb && styles.airbnbCard
                                        ]}
                                    >
                                        {/* Type Badge */}
                                        <View style={[styles.accommodationTypeBadge, isAirbnb && styles.airbnbBadge]}>
                                            <Ionicons 
                                                name={isAirbnb ? "home" : "business"} 
                                                size={12} 
                                                color={isAirbnb ? "#FF5A5F" : "#14B8A6"} 
                                            />
                                            <Text style={[styles.accommodationTypeText, isAirbnb && styles.airbnbTypeText]}>
                                                {isAirbnb ? "Airbnb" : "Hotel"}
                                            </Text>
                                        </View>

                                        {/* Superhost Badge for Airbnb */}
                                        {isAirbnb && accommodation.superhost && (
                                            <View style={styles.superhostBadge}>
                                                <Ionicons name="shield-checkmark" size={12} color="#FF5A5F" />
                                                <Text style={styles.superhostText}>Superhost</Text>
                                            </View>
                                        )}

                                        <View style={styles.hotelHeader}>
                                            <Text style={styles.cardTitle} numberOfLines={1}>{accommodation.name}</Text>
                                            {!isAirbnb && (
                                                <View style={styles.stars}>
                                                    {[...Array(accommodation.stars || 0)].map((_, i) => (
                                                        <Ionicons key={i} name="star" size={12} color="#FFB300" />
                                                    ))}
                                                </View>
                                            )}
                                            {isAirbnb && (
                                                <View style={styles.ratingBadge}>
                                                    <Ionicons name="star" size={12} color="#FFB300" />
                                                    <Text style={styles.ratingText}>{accommodation.rating}</Text>
                                                </View>
                                            )}
                                        </View>

                                        {/* Airbnb Property Details */}
                                        {isAirbnb && (
                                            <View style={styles.propertyDetails}>
                                                <Text style={styles.propertyType}>{accommodation.propertyType}</Text>
                                                <View style={styles.propertyStats}>
                                                    {accommodation.bedrooms > 0 && (
                                                        <View style={styles.statItem}>
                                                            <Ionicons name="bed-outline" size={14} color="#546E7A" />
                                                            <Text style={styles.statText}>{accommodation.bedrooms} bed{accommodation.bedrooms > 1 ? 's' : ''}</Text>
                                                        </View>
                                                    )}
                                                    <View style={styles.statItem}>
                                                        <Ionicons name="people-outline" size={14} color="#546E7A" />
                                                        <Text style={styles.statText}>{accommodation.maxGuests} guests</Text>
                                                    </View>
                                                    <View style={styles.statItem}>
                                                        <Ionicons name="water-outline" size={14} color="#546E7A" />
                                                        <Text style={styles.statText}>{accommodation.bathrooms} bath</Text>
                                                    </View>
                                                </View>
                                            </View>
                                        )}

                                        <Text style={styles.hotelDesc} numberOfLines={2}>{accommodation.description}</Text>
                                        
                                        {/* Amenities */}
                                        <View style={styles.amenitiesRow}>
                                            {(accommodation.amenities || []).slice(0, 4).map((amenity: string, i: number) => (
                                                <View key={i} style={[styles.amenityBadge, isAirbnb && styles.airbnbAmenityBadge]}>
                                                    <Text style={[styles.amenityText, isAirbnb && styles.airbnbAmenityText]}>{amenity}</Text>
                                                </View>
                                            ))}
                                        </View>

                                        {/* Price */}
                                        <View style={styles.accommodationPriceRow}>
                                            <Text style={[styles.price, isAirbnb && styles.airbnbPrice]}>
                                                €{accommodation.pricePerNight}
                                            </Text>
                                            <Text style={styles.priceNight}>/night</Text>
                                        </View>
                                        
                                        {/* Total for stay */}
                                        <Text style={styles.totalStayPrice}>
                                            €{accommodation.pricePerNight * duration} total for {duration} nights
                                        </Text>

                                        <TouchableOpacity onPress={() => openMap(accommodation.address)}>
                                            <Text style={styles.address} numberOfLines={1}>
                                                {accommodation.address} <Ionicons name="map" size={12} color="#14B8A6" />
                                            </Text>
                                        </TouchableOpacity>
                                        
                                        <TouchableOpacity 
                                            style={[styles.miniBookButton, isAirbnb && styles.airbnbBookButton]}
                                            onPress={() => {
                                                const url = accommodation.bookingUrl || (isAirbnb 
                                                    ? `https://www.airbnb.com/s/${encodeURIComponent(trip.destination)}/homes`
                                                    : `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(accommodation.name + " " + trip.destination)}`
                                                );
                                                openAffiliateLink('hotel', accommodation.name + " " + trip.destination);
                                            }}
                                        >
                                            <Text style={styles.miniBookButtonText}>
                                                {isAirbnb ? "View on Airbnb" : "Book Hotel"}
                                            </Text>
                                        </TouchableOpacity>

                                        {selectedHotelIndex === actualIndex && (
                                            <View style={styles.selectedBadge}>
                                                <Ionicons name="checkmark-circle" size={20} color={isAirbnb ? "#FF5A5F" : "#14B8A6"} />
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                        
                        {/* Price Summary based on selection */}
                        {selectedAccommodation && (
                            <View style={styles.accommodationSummary}>
                                <View style={styles.summaryHeader}>
                                    <Ionicons 
                                        name={selectedAccommodation.type === 'airbnb' ? "home" : "business"} 
                                        size={20} 
                                        color={selectedAccommodation.type === 'airbnb' ? "#FF5A5F" : "#14B8A6"} 
                                    />
                                    <Text style={styles.summaryTitle}>Selected: {selectedAccommodation.name}</Text>
                                </View>
                                <View style={styles.summaryDetails}>
                                    <View style={styles.summaryRow}>
                                        <Text style={styles.summaryLabel}>Per night</Text>
                                        <Text style={styles.summaryValue}>€{accommodationPricePerNight}</Text>
                                    </View>
                                    <View style={styles.summaryRow}>
                                        <Text style={styles.summaryLabel}>{duration} nights</Text>
                                        <Text style={styles.summaryValue}>€{totalAccommodationCost}</Text>
                                    </View>
                                </View>
                            </View>
                        )}
                    </Section>
                ) : (
                    <View style={styles.skippedSection}>
                        <Ionicons name="home-outline" size={24} color="#90A4AE" />
                        <Text style={styles.skippedText}>Accommodation skipped - you already have accommodation</Text>
                    </View>
                )}

                {/* Transportation Section - Always show */}
                <Section title="Transportation Options">
                    {trip.itinerary?.transportation && trip.itinerary.transportation.length > 0 ? (
                        <>
                            {/* Car Rentals */}
                            {trip.itinerary.transportation.filter((t: any) => t.type === "car_rental").length > 0 && (
                                <>
                                    <Text style={styles.transportSubtitle}>🚗 Car Rental</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.transportList}>
                                        {trip.itinerary.transportation
                                            .filter((t: any) => t.type === "car_rental")
                                            .map((car: any, index: number) => (
                                                <View key={index} style={styles.transportCard}>
                                                    <View style={styles.transportHeader}>
                                                        <Text style={styles.transportProvider}>{car.provider}</Text>
                                                        <View style={styles.transportCategoryBadge}>
                                                            <Text style={styles.transportCategoryText}>{car.category}</Text>
                                                        </View>
                                                    </View>
                                                    <Text style={styles.transportVehicle}>{car.vehicle}</Text>
                                                    <View style={styles.transportFeatures}>
                                                        {car.features?.slice(0, 3).map((feature: string, i: number) => (
                                                            <View key={i} style={styles.featureBadge}>
                                                                <Text style={styles.featureText}>{feature}</Text>
                                                            </View>
                                                        ))}
                                                    </View>
                                                    <View style={styles.transportPriceRow}>
                                                        <Text style={styles.transportPrice}>€{car.pricePerDay}</Text>
                                                        <Text style={styles.transportPriceUnit}>/day</Text>
                                                    </View>
                                                    <Text style={styles.transportNote}>
                                                        {car.insuranceIncluded ? "✓ Insurance included" : "Insurance extra"}
                                                    </Text>
                                                    <TouchableOpacity 
                                                        style={styles.transportBookButton}
                                                        onPress={() => {
                                                            if (car.bookingUrl) {
                                                                Linking.openURL(car.bookingUrl);
                                                            }
                                                        }}
                                                    >
                                                        <Text style={styles.transportBookButtonText}>Book Now</Text>
                                                        <Ionicons name="open-outline" size={14} color="white" />
                                                    </TouchableOpacity>
                                                </View>
                                            ))}
                                    </ScrollView>
                                </>
                            )}

                            {/* Taxi & Transfers */}
                            {trip.itinerary.transportation.filter((t: any) => t.type === "taxi").length > 0 && (
                                <>
                                    <Text style={styles.transportSubtitle}>🚕 Taxi & Transfers</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.transportList}>
                                        {trip.itinerary.transportation
                                            .filter((t: any) => t.type === "taxi")
                                            .map((taxi: any, index: number) => (
                                                <View key={index} style={styles.transportCard}>
                                                    <View style={styles.transportHeader}>
                                                        <Text style={styles.transportProvider}>{taxi.provider}</Text>
                                                    </View>
                                                    <Text style={styles.transportService}>{taxi.service}</Text>
                                                    <Text style={styles.transportDesc}>{taxi.description}</Text>
                                                    <View style={styles.transportFeatures}>
                                                        {taxi.features?.slice(0, 2).map((feature: string, i: number) => (
                                                            <View key={i} style={styles.featureBadge}>
                                                                <Text style={styles.featureText}>{feature}</Text>
                                                            </View>
                                                        ))}
                                                    </View>
                                                    <View style={styles.transportPriceRow}>
                                                        <Text style={styles.transportPrice}>~€{taxi.estimatedPrice}</Text>
                                                    </View>
                                                    <Text style={styles.transportNote}>
                                                        Max {taxi.maxPassengers} passengers • {taxi.waitingTime}
                                                    </Text>
                                                    {taxi.bookingUrl && (
                                                        <TouchableOpacity 
                                                            style={styles.transportBookButton}
                                                            onPress={() => Linking.openURL(taxi.bookingUrl)}
                                                        >
                                                            <Text style={styles.transportBookButtonText}>Book Transfer</Text>
                                                            <Ionicons name="open-outline" size={14} color="white" />
                                                        </TouchableOpacity>
                                                    )}
                                                </View>
                                            ))}
                                    </ScrollView>
                                </>
                            )}

                            {/* Ride-sharing */}
                            {trip.itinerary.transportation.filter((t: any) => t.type === "rideshare").length > 0 && (
                                <>
                                    <Text style={styles.transportSubtitle}>📱 Ride-sharing</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.transportList}>
                                        {trip.itinerary.transportation
                                            .filter((t: any) => t.type === "rideshare")
                                            .map((ride: any, index: number) => (
                                                <View key={index} style={styles.transportCard}>
                                                    <View style={styles.transportHeader}>
                                                        <Text style={styles.transportProvider}>{ride.provider}</Text>
                                                        <View style={[styles.transportCategoryBadge, { backgroundColor: ride.provider === "Uber" ? "#000" : "#34D186" }]}>
                                                            <Text style={[styles.transportCategoryText, { color: "white" }]}>{ride.service}</Text>
                                                        </View>
                                                    </View>
                                                    <Text style={styles.transportDesc}>{ride.description}</Text>
                                                    <View style={styles.transportFeatures}>
                                                        {ride.features?.slice(0, 2).map((feature: string, i: number) => (
                                                            <View key={i} style={styles.featureBadge}>
                                                                <Text style={styles.featureText}>{feature}</Text>
                                                            </View>
                                                        ))}
                                                    </View>
                                                    <View style={styles.transportPriceRow}>
                                                        <Text style={styles.transportPrice}>€{ride.estimatedPrice}</Text>
                                                    </View>
                                                    <Text style={styles.transportNote}>
                                                        Wait time: {ride.waitingTime} • Max {ride.maxPassengers} passengers
                                                    </Text>
                                                    <TouchableOpacity 
                                                        style={[styles.transportBookButton, { backgroundColor: ride.provider === "Uber" ? "#000" : "#34D186" }]}
                                                        onPress={() => {
                                                            if (ride.bookingUrl) {
                                                                Linking.openURL(ride.bookingUrl);
                                                            }
                                                        }}
                                                    >
                                                        <Text style={styles.transportBookButtonText}>Open {ride.provider}</Text>
                                                        <Ionicons name="open-outline" size={14} color="white" />
                                                    </TouchableOpacity>
                                                </View>
                                            ))}
                                    </ScrollView>
                                </>
                            )}

                            {/* Public Transport */}
                            {trip.itinerary.transportation
                                .filter((t: any) => t.type === "public_transport")
                                .map((pt: any, index: number) => (
                                    <View key={index}>
                                        <Text style={styles.transportSubtitle}>🚇 Public Transport</Text>
                                        <View style={styles.publicTransportCard}>
                                            {pt.options?.map((option: any, i: number) => (
                                                <View key={i} style={styles.publicTransportOption}>
                                                    <View style={styles.publicTransportHeader}>
                                                        <Ionicons 
                                                            name={option.mode === "Metro/Subway" ? "subway" : option.mode === "Bus" ? "bus" : "train"} 
                                                            size={20} 
                                                            color="#14B8A6" 
                                                        />
                                                        <Text style={styles.publicTransportMode}>{option.mode}</Text>
                                                    </View>
                                                    <Text style={styles.publicTransportDesc}>{option.description}</Text>
                                                    <View style={styles.publicTransportPrices}>
                                                        {option.singleTicketPrice && (
                                                            <Text style={styles.publicTransportPrice}>
                                                                Single: €{option.singleTicketPrice}
                                                            </Text>
                                                        )}
                                                        {option.dayPassPrice && (
                                                            <Text style={styles.publicTransportPrice}>
                                                                Day Pass: €{option.dayPassPrice}
                                                            </Text>
                                                        )}
                                                        {option.price && (
                                                            <Text style={styles.publicTransportPrice}>
                                                                €{option.price} ({option.duration})
                                                            </Text>
                                                        )}
                                                    </View>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                ))}
                        </>
                    ) : (
                        <View style={styles.emptyTransportCard}>
                            <Ionicons name="car-outline" size={48} color="#CFD8DC" />
                            <Text style={styles.emptyTransportText}>Transportation options will appear here</Text>
                            <Text style={styles.emptyTransportSubtext}>Generate a new trip to see car rentals, taxis, and more</Text>
                        </View>
                    )}
                </Section>

                <Section title="Daily Itinerary">
                    {trip.itinerary?.dayByDayItinerary?.map((day: any, index: number) => (
                        <View key={index} style={styles.dayCard}>
                            <View style={styles.dayHeader}>
                                <View style={styles.dayBadge}>
                                    <Text style={styles.dayBadgeText}>Day {day.day}</Text>
                                </View>
                                {day.title && <Text style={styles.dayTitle}>{day.title}</Text>}
                            </View>
                            {day.activities.map((activity: any, actIndex: number) => (
                                <View key={actIndex} style={styles.activityItem}>
                                    <Text style={styles.activityTime}>{activity.time}</Text>
                                    <View style={styles.activityContent}>
                                        <View style={styles.activityHeader}>
                                            <Text style={styles.activityTitle}>{activity.title}</Text>
                                            {activity.type && activity.type !== "free" && (
                                                <View style={[
                                                    styles.activityTypeBadge,
                                                    activity.type === "museum" && styles.museumBadge,
                                                    activity.type === "attraction" && styles.attractionBadge,
                                                    activity.type === "tour" && styles.tourBadge,
                                                    activity.type === "restaurant" && styles.restaurantBadge,
                                                ]}>
                                                    <Text style={styles.activityTypeText}>
                                                        {activity.type === "museum" ? "🏛️" : 
                                                         activity.type === "attraction" ? "🎯" : 
                                                         activity.type === "tour" ? "🚶" : 
                                                         activity.type === "restaurant" ? "🍽️" : "📍"}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                        
                                        {/* TripAdvisor Badge for Restaurants */}
                                        {activity.type === "restaurant" && activity.fromTripAdvisor && (
                                            <View style={styles.tripAdvisorActivityBadge}>
                                                <Image 
                                                    source={{ uri: "https://static.tacdn.com/img2/brand_refresh/Tripadvisor_lockup_horizontal_secondary_registered.svg" }}
                                                    style={styles.tripAdvisorActivityLogo}
                                                    resizeMode="contain"
                                                />
                                                {activity.tripAdvisorRating && (
                                                    <View style={styles.tripAdvisorRatingBadge}>
                                                        <Ionicons name="star" size={14} color="#00AA6C" />
                                                        <Text style={styles.tripAdvisorRatingText}>{activity.tripAdvisorRating}</Text>
                                                        {activity.tripAdvisorReviewCount && (
                                                            <Text style={styles.tripAdvisorReviewText}>({activity.tripAdvisorReviewCount})</Text>
                                                        )}
                                                    </View>
                                                )}
                                            </View>
                                        )}
                                        
                                        {/* Restaurant Meta Info */}
                                        {activity.type === "restaurant" && activity.fromTripAdvisor && (activity.cuisine || activity.priceRange) && (
                                            <View style={styles.restaurantMetaRow}>
                                                {activity.cuisine && (
                                                    <View style={styles.cuisineActivityBadge}>
                                                        <Text style={styles.cuisineActivityText}>{activity.cuisine}</Text>
                                                    </View>
                                                )}
                                                {activity.priceRange && (
                                                    <Text style={styles.priceRangeActivityText}>{activity.priceRange}</Text>
                                                )}
                                            </View>
                                        )}
                                        
                                        {/* Restaurant Address */}
                                        {activity.type === "restaurant" && activity.fromTripAdvisor && activity.address && (
                                            <View style={styles.restaurantAddressActivityRow}>
                                                <Ionicons name="location-outline" size={12} color="#78909C" />
                                                <Text style={styles.restaurantAddressActivityText} numberOfLines={1}>{activity.address}</Text>
                                            </View>
                                        )}
                                        
                                        <Text style={styles.activityDesc}>{activity.description}</Text>
                                        
                                        {/* Duration */}
                                        {activity.duration && (
                                            <View style={styles.activityMeta}>
                                                <Ionicons name="time-outline" size={14} color="#78909C" />
                                                <Text style={styles.activityMetaText}>{activity.duration}</Text>
                                            </View>
                                        )}
                                        
                                        {/* Pricing Section */}
                                        {(activity.price !== undefined && activity.price !== null) && (
                                            <View style={styles.pricingSection}>
                                                {activity.price === 0 ? (
                                                    <View style={styles.freeBadge}>
                                                        <Text style={styles.freeText}>FREE</Text>
                                                    </View>
                                                ) : (
                                                    <>
                                                        <View style={styles.activityPriceRow}>
                                                            <Text style={styles.activityPriceLabel}>Entry:</Text>
                                                            <Text style={styles.activityPrice}>€{activity.price}</Text>
                                                        </View>
                                                        
                                                        {/* Skip the Line Option */}
                                                        {activity.skipTheLine && activity.skipTheLinePrice && (
                                                            <View style={styles.skipLineContainer}>
                                                                <View style={styles.skipLineBadge}>
                                                                    <Ionicons name="flash" size={12} color="#FF9500" />
                                                                    <Text style={styles.skipLineLabel}>Skip the Line:</Text>
                                                                    <Text style={styles.skipLinePrice}>€{activity.skipTheLinePrice}</Text>
                                                                </View>
                                                                <Text style={styles.skipLineSave}>
                                                                    Save {Math.round(((activity.skipTheLinePrice - activity.price) / activity.skipTheLinePrice) * -100)}% time
                                                                </Text>
                                                            </View>
                                                        )}
                                                    </>
                                                )}
                                            </View>
                                        )}
                                        
                                        {/* Tips */}
                                        {activity.tips && (
                                            <View style={styles.tipContainer}>
                                                <Ionicons name="bulb-outline" size={14} color="#FF9500" />
                                                <Text style={styles.tipText}>{activity.tips}</Text>
                                            </View>
                                        )}
                                        
                                        {/* Action Buttons - Add to Cart and Book Now */}
                                        {activity.price > 0 && (
                                            <View style={styles.bookingButtons}>
                                                {/* Regular Entry - Add to Cart */}
                                                {isInCart(activity.title, day.day, false) ? (
                                                    <TouchableOpacity 
                                                        style={styles.inCartButton}
                                                        onPress={() => handleRemoveFromCart(activity.title, day.day, false)}
                                                    >
                                                        <Ionicons name="checkmark-circle" size={16} color="#14B8A6" />
                                                        <Text style={styles.inCartButtonText}>In Cart</Text>
                                                    </TouchableOpacity>
                                                ) : (
                                                    <TouchableOpacity 
                                                        style={styles.addToCartButton}
                                                        onPress={() => handleAddToCart(activity, day.day, false)}
                                                        disabled={addingToCart === `${activity.title}-${day.day}-false`}
                                                    >
                                                        {addingToCart === `${activity.title}-${day.day}-false` ? (
                                                            <ActivityIndicator size="small" color="#14B8A6" />
                                                        ) : (
                                                            <>
                                                                <Ionicons name="cart-outline" size={16} color="#14B8A6" />
                                                                <Text style={styles.addToCartButtonText}>Add €{activity.price}</Text>
                                                            </>
                                                        )}
                                                    </TouchableOpacity>
                                                )}
                                                
                                                {/* Skip the Line - Add to Cart */}
                                                {activity.skipTheLine && activity.skipTheLinePrice && (
                                                    isInCart(activity.title, day.day, true) ? (
                                                        <TouchableOpacity 
                                                            style={styles.inCartSkipLineButton}
                                                            onPress={() => handleRemoveFromCart(activity.title, day.day, true)}
                                                        >
                                                            <Ionicons name="checkmark-circle" size={16} color="#F59E0B" />
                                                            <Text style={styles.inCartSkipLineButtonText}>Skip Line ✓</Text>
                                                        </TouchableOpacity>
                                                    ) : (
                                                        <TouchableOpacity 
                                                            style={styles.addToCartSkipLineButton}
                                                            onPress={() => handleAddToCart(activity, day.day, true)}
                                                            disabled={addingToCart === `${activity.title}-${day.day}-true`}
                                                        >
                                                            {addingToCart === `${activity.title}-${day.day}-true` ? (
                                                                <ActivityIndicator size="small" color="#F59E0B" />
                                                            ) : (
                                                                <>
                                                                    <Ionicons name="flash" size={16} color="#F59E0B" />
                                                                    <Text style={styles.addToCartSkipLineButtonText}>Skip €{activity.skipTheLinePrice}</Text>
                                                                </>
                                                            )}
                                                        </TouchableOpacity>
                                                    )
                                                )}
                                                
                                                {/* Book Now Button (external link) */}
                                                {activity.bookingUrl && (
                                                    <TouchableOpacity 
                                                        style={styles.bookActivityButton}
                                                        onPress={() => {
                                                            trackClick({
                                                                tripId: id as Id<"trips">,
                                                                type: "activity",
                                                                item: activity.title,
                                                                url: activity.bookingUrl
                                                            }).catch(console.error);
                                                            Linking.openURL(activity.bookingUrl);
                                                        }}
                                                    >
                                                        <Ionicons name="open-outline" size={16} color="white" />
                                                        <Text style={styles.bookActivityButtonText}>Book</Text>
                                                    </TouchableOpacity>
                                                )}
                                                
                                                {/* TripAdvisor Link Button */}
                                                {activity.type === "restaurant" && activity.tripAdvisorUrl && (
                                                    <TouchableOpacity 
                                                        style={styles.tripAdvisorLinkButton}
                                                        onPress={() => {
                                                            trackClick({
                                                                tripId: id as Id<"trips">,
                                                                type: "restaurant",
                                                                item: activity.title,
                                                                url: activity.tripAdvisorUrl
                                                            }).catch(console.error);
                                                            Linking.openURL(activity.tripAdvisorUrl);
                                                        }}
                                                    >
                                                        <Ionicons name="restaurant-outline" size={14} color="#00AA6C" />
                                                        <Text style={styles.tripAdvisorLinkButtonText}>TripAdvisor</Text>
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        )}
                                    </View>
                                </View>
                            ))}
                        </View>
                    ))}
                    
                    {!isPremium && (
                        <View style={styles.blurContainer}>
                            <BlurView intensity={20} style={StyleSheet.absoluteFill} />
                            <View style={styles.lockContent}>
                                <Ionicons name="lock-closed" size={48} color="#1B3F92" />
                                <Text style={styles.lockTitle}>Unlock Full Itinerary</Text>
                                <Text style={styles.lockText}>
                                    Upgrade to Premium to see the detailed daily plan, maps, and more.
                                </Text>
                                <TouchableOpacity 
                                    style={styles.unlockButton}
                                    onPress={() => router.push("/subscription")}
                                >
                                    <Text style={styles.unlockButtonText}>Upgrade Now</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={styles.notNowButton}
                                    onPress={() => {
                                        // Just dismiss the overlay or scroll up? 
                                        // Actually, the overlay covers the content, so "Not Now" 
                                        // implies they accept seeing the limited version (which is just the blurred view).
                                        // But usually "Not Now" means "Close this upsell".
                                        // Since the content IS locked, they can't really "close" it to see the content.
                                        // So "Not Now" might just be a way to go back or stay on the limited view.
                                        // Or better, let's make it clear they are staying on the limited plan.
                                    }}
                                >
                                    <Text style={styles.notNowButtonText}>Not Now</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </Section>
            </ScrollView>

            <View style={styles.footer}>
                <View style={styles.priceBreakdown}>
                    <TouchableOpacity 
                        style={styles.priceBreakdownToggle}
                        onPress={() => {
                            if (Platform.OS !== 'web') {
                                const baggageLine = checkedBaggageSelected 
                                    ? `\n🧳 Checked baggage: €${Math.round(totalBaggageCost)}` 
                                    : '';
                                Alert.alert(
                                    "Price Breakdown",
                                    `✈️ Flights: €${Math.round(totalFlightCost)}${baggageLine}\n🏨 ${selectedAccommodation?.type === 'airbnb' ? 'Airbnb' : 'Hotel'} (${duration} nights): €${Math.round(totalAccommodationCost)}\n🍽️ Daily expenses: €${Math.round(totalDailyExpenses)}\n\n💰 Total: €${Math.round(grandTotal)}`,
                                    [{ text: "OK" }]
                                );
                            }
                        }}
                    >
                        <View style={styles.priceRow}>
                            <Text style={styles.priceLabel}>Total for {travelers} traveler{travelers > 1 ? 's' : ''}</Text>
                            <Ionicons name="information-circle-outline" size={16} color="#78909C" />
                        </View>
                        <Text style={styles.totalPrice}>€{Math.round(grandTotal).toLocaleString()}</Text>
                    </TouchableOpacity>
                    <Text style={styles.perPersonPrice}>€{Math.round(pricePerPerson).toLocaleString()} per person</Text>
                </View>
                <TouchableOpacity style={styles.bookButton} onPress={handleBookTrip}>
                    <Text style={styles.bookButtonText}>Book This Trip</Text>
                </TouchableOpacity>
            </View>

            <Modal 
                visible={isEditing} 
                animationType="slide" 
                presentationStyle="pageSheet"
                onRequestClose={() => setIsEditing(false)}
            >
                <KeyboardAvoidingView 
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.modalContainer}
                >
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Edit Trip Details</Text>
                        <TouchableOpacity onPress={() => setIsEditing(false)}>
                            <Ionicons name="close" size={24} color="#1C1C1E" />
                        </TouchableOpacity>
                    </View>
                    
                    <ScrollView contentContainerStyle={styles.modalContent}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Destination</Text>
                            <TextInput
                                style={styles.input}
                                value={editForm.destination}
                                onChangeText={(text) => setEditForm(prev => ({ ...prev, destination: text }))}
                                placeholder="e.g. Paris, Tokyo"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Flying from</Text>
                            <TextInput
                                style={styles.input}
                                value={editForm.origin}
                                onChangeText={(text) => setEditForm(prev => ({ ...prev, origin: text }))}
                                placeholder="e.g. New York"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Dates</Text>
                            <View style={styles.dateRow}>
                                <TouchableOpacity 
                                    style={styles.dateInput}
                                    onPress={() => {
                                        setDatePickerMode('start');
                                        setShowDatePicker(true);
                                    }}
                                >
                                    <Text style={styles.dateLabel}>Start</Text>
                                    <Text style={styles.dateValue}>{new Date(editForm.startDate).toLocaleDateString()}</Text>
                                </TouchableOpacity>
                                <Ionicons name="arrow-forward" size={20} color="#8E8E93" />
                                <TouchableOpacity 
                                    style={styles.dateInput}
                                    onPress={() => {
                                        setDatePickerMode('end');
                                        setShowDatePicker(true);
                                    }}
                                >
                                    <Text style={styles.dateLabel}>End</Text>
                                    <Text style={styles.dateValue}>{new Date(editForm.endDate).toLocaleDateString()}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {showDatePicker && (
                            <DateTimePicker
                                value={new Date(datePickerMode === 'start' ? editForm.startDate : editForm.endDate)}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                minimumDate={new Date()}
                                onChange={onDateChange}
                            />
                        )}

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Budget (€)</Text>
                            <TextInput
                                style={styles.input}
                                value={editForm.budget.toString()}
                                onChangeText={(text) => {
                                    const numValue = parseInt(text) || 0;
                                    setEditForm(prev => ({ ...prev, budget: numValue }));
                                }}
                                keyboardType="numeric"
                                placeholder="e.g. 2000"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Travelers</Text>
                            <TextInput
                                style={styles.input}
                                value={editForm.travelers.toString()}
                                onChangeText={(text) => {
                                    const numValue = parseInt(text) || 1;
                                    setEditForm(prev => ({ ...prev, travelers: numValue }));
                                }}
                                keyboardType="number-pad"
                                placeholder="Number of travelers"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Interests (comma separated)</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={editForm.interests}
                                onChangeText={(text) => setEditForm(prev => ({ ...prev, interests: text }))}
                                multiline
                                placeholder="e.g. Food, History, Nature"
                            />
                        </View>

                        <TouchableOpacity 
                            style={styles.saveButton}
                            onPress={handleSaveAndRegenerate}
                        >
                            <Text style={styles.saveButtonText}>Save & Regenerate</Text>
                        </TouchableOpacity>
                        <View style={{ height: 40 }} />
                    </ScrollView>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

function Section({ title, children }: { title: string, children: React.ReactNode }) {
    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F0FFFE",
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F0FFFE",
    },
    generatingText: {
        marginTop: 16,
        fontSize: 18,
        fontWeight: "600",
        color: "#0D9488",
    },
    generatingSubtext: {
        marginTop: 8,
        fontSize: 14,
        color: "#5EEAD4",
    },
    errorText: {
        marginTop: 16,
        fontSize: 18,
        color: "#EF4444",
    },
    skippedSection: {
        backgroundColor: "#F5F5F5",
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 12,
    },
    skippedText: {
        fontSize: 14,
        color: "#90A4AE",
        flex: 1,
    },
    header: {
        height: 200,
        position: "relative",
    },
    headerImage: {
        width: "100%",
        height: "100%",
    },
    headerOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(13, 148, 136, 0.4)",
    },
    headerContent: {
        position: "absolute",
        bottom: 20,
        left: 20,
    },
    backButton: {
        position: "absolute",
        top: 16,
        left: 16,
        zIndex: 10,
        padding: 8,
        borderRadius: 20,
        backgroundColor: "rgba(0,0,0,0.3)",
    },
    headerRightButtons: {
        position: "absolute",
        top: 16,
        right: 16,
        zIndex: 10,
        flexDirection: "row",
        gap: 8,
    },
    iconButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: "rgba(0,0,0,0.3)",
    },
    destination: {
        fontSize: 36,
        fontWeight: "700",
        color: "white",
        letterSpacing: 1,
    },
    dates: {
        fontSize: 16,
        color: "rgba(255,255,255,0.9)",
        marginTop: 4,
        fontWeight: "500",
    },
    content: {
        padding: 20,
        paddingBottom: 100,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#0D9488",
        marginBottom: 16,
        letterSpacing: 0.5,
    },
    card: {
        backgroundColor: "white",
        borderRadius: 16,
        padding: 20,
        marginBottom: 12,
        shadowColor: "#0D9488",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 3,
        borderWidth: 1,
        borderColor: "#CCFBF1",
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    flightInfo: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#134E4A",
    },
    cardSubtitle: {
        fontSize: 14,
        color: "#5EEAD4",
    },
    price: {
        fontSize: 18,
        fontWeight: "700",
        color: "#14B8A6",
    },
    flightTimes: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: "#CCFBF1",
    },
    time: {
        fontSize: 16,
        fontWeight: "500",
        color: "#134E4A",
    },
    stars: {
        flexDirection: "row",
        gap: 2,
        marginTop: 4,
    },
    address: {
        fontSize: 13,
        color: "#5EEAD4",
        marginTop: 8,
    },
    dayCard: {
        backgroundColor: "white",
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#CCFBF1",
        shadowColor: "#0D9488",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
    },
    dayHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    dayBadge: {
        backgroundColor: "#CCFBF1",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
    },
    dayBadgeText: {
        color: "#0D9488",
        fontWeight: "700",
        fontSize: 12,
        textTransform: "uppercase",
        letterSpacing: 1,
    },
    dayTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#0D9488",
    },
    activityItem: {
        flexDirection: "row",
        marginBottom: 24,
    },
    activityTime: {
        width: 70,
        fontSize: 14,
        fontWeight: "600",
        color: "#5EEAD4",
    },
    activityContent: {
        flex: 1,
        paddingLeft: 16,
        borderLeftWidth: 2,
        borderLeftColor: "#CCFBF1",
        paddingBottom: 4,
    },
    activityTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#134E4A",
        marginBottom: 4,
    },
    activityDesc: {
        fontSize: 14,
        color: "#5EEAD4",
        lineHeight: 20,
    },
    mapLink: {
        marginTop: 4,
    },
    mapLinkText: {
        fontSize: 12,
        color: "#14B8A6",
        fontWeight: "500",
    },
    flightHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    routeDisplay: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#F0FFFE",
        padding: 16,
        borderRadius: 14,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#CCFBF1",
    },
    routePoint: {
        alignItems: "center",
        gap: 4,
        flex: 1,
    },
    routeLine: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        justifyContent: "center",
    },
    routeDash: {
        height: 2,
        backgroundColor: "#99F6E4",
        flex: 1,
        marginHorizontal: 4,
    },
    routeAirport: {
        fontSize: 12,
        fontWeight: "600",
        color: "#134E4A",
        textAlign: "center",
    },
    flightPrice: {
        fontSize: 24,
        fontWeight: "700",
        color: "#14B8A6",
    },
    luggageBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#CCFBF1",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    luggageText: {
        fontSize: 12,
        color: "#0D9488",
        fontWeight: "600",
    },
    flightSegment: {
        marginBottom: 12,
    },
    segmentHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 8,
    },
    segmentTitle: {
        fontSize: 12,
        fontWeight: "700",
        color: "#5EEAD4",
        textTransform: "uppercase",
        letterSpacing: 1,
    },
    duration: {
        fontSize: 14,
        color: "#5EEAD4",
    },
    divider: {
        height: 1,
        backgroundColor: "#CCFBF1",
        marginVertical: 20,
    },
    hotelList: {
        paddingRight: 16,
        gap: 16,
    },
    hotelCard: {
        width: 280,
        backgroundColor: "white",
        borderRadius: 16,
        padding: 16,
        shadowColor: "#0D9488",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 3,
        borderWidth: 2,
        borderColor: "transparent",
    },
    selectedHotelCard: {
        borderColor: "#14B8A6",
        backgroundColor: "#F0FFFE",
    },
    selectedBadge: {
        position: "absolute",
        top: 8,
        right: 8,
    },
    hotelHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    hotelDesc: {
        fontSize: 13,
        color: "#5EEAD4",
        marginBottom: 12,
        lineHeight: 20,
    },
    footer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "white",
        padding: 20,
        paddingBottom: Platform.OS === "ios" ? 32 : 20,
        borderTopWidth: 0,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        shadowColor: "#14B8A6",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
    },
    priceBreakdown: {
        flex: 1,
    },
    priceRow: {
        flexDirection: "row",
        alignItems: "baseline",
        gap: 8,
    },
    priceLabel: {
        fontSize: 12,
        color: "#5EEAD4",
        textTransform: "uppercase",
    },
    totalPrice: {
        fontSize: 24,
        fontWeight: "700",
        color: "#14B8A6",
    },
    perPersonPrice: {
        fontSize: 14,
        color: "#5EEAD4",
        fontWeight: "500",
    },
    bookButton: {
        backgroundColor: "#14B8A6",
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 14,
        marginLeft: 16,
        shadowColor: "#14B8A6",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 6,
    },
    bookButtonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 1,
    },
    blurContainer: {
        position: "absolute",
        top: 50,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(240, 255, 254, 0.95)",
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 16,
        zIndex: 10,
    },
    lockContent: {
        alignItems: "center",
        padding: 24,
    },
    lockTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#0D9488",
        marginTop: 16,
        marginBottom: 8,
    },
    lockText: {
        fontSize: 14,
        color: "#5EEAD4",
        textAlign: "center",
        lineHeight: 22,
    },
    unlockButton: {
        backgroundColor: "#14B8A6",
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 14,
        marginBottom: 12,
        shadowColor: "#14B8A6",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 6,
    },
    unlockButtonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "700",
        textTransform: "uppercase",
    },
    notNowButton: {
        paddingVertical: 8,
    },
    notNowButtonText: {
        color: "#5EEAD4",
        fontSize: 14,
        fontWeight: "500",
    },
    affiliateButton: {
        marginTop: 20,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 14,
        backgroundColor: "#CCFBF1",
        borderRadius: 12,
        gap: 8,
    },
    affiliateButtonText: {
        color: "#0D9488",
        fontWeight: "700",
        fontSize: 14,
        textTransform: "uppercase",
    },
    miniBookButton: {
        marginTop: 16,
        backgroundColor: "#14B8A6",
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: "center",
    },
    miniBookButtonText: {
        color: "white",
        fontSize: 12,
        fontWeight: "700",
        textTransform: "uppercase",
    },
    modalContainer: {
        flex: 1,
        backgroundColor: "#F0FFFE",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 20,
        backgroundColor: "white",
        borderBottomWidth: 0,
        shadowColor: "#14B8A6",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#0D9488",
    },
    modalContent: {
        padding: 20,
    },
    inputGroup: {
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: "700",
        marginBottom: 8,
        color: "#5EEAD4",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    input: {
        backgroundColor: "white",
        padding: 14,
        borderRadius: 14,
        fontSize: 16,
        borderWidth: 2,
        borderColor: "#99F6E4",
        color: "#134E4A",
    },
    textArea: {
        height: 100,
        textAlignVertical: "top",
    },
    budgetOptions: {
        flexDirection: "row",
        gap: 8,
    },
    budgetOption: {
        flex: 1,
        padding: 12,
        borderRadius: 12,
        backgroundColor: "white",
        alignItems: "center",
        borderWidth: 2,
        borderColor: "#99F6E4",
    },
    budgetOptionSelected: {
        backgroundColor: "#14B8A6",
        borderColor: "#14B8A6",
    },
    budgetOptionText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#5EEAD4",
    },
    budgetOptionTextSelected: {
        color: "white",
    },
    dateRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    dateInput: {
        flex: 1,
        backgroundColor: "white",
        padding: 14,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: "#99F6E4",
    },
    dateLabel: {
        fontSize: 12,
        color: "#5EEAD4",
        marginBottom: 4,
        textTransform: "uppercase",
    },
    dateValue: {
        fontSize: 16,
        color: "#134E4A",
        fontWeight: "500",
    },
    saveButton: {
        backgroundColor: "#14B8A6",
        padding: 16,
        borderRadius: 14,
        alignItems: "center",
        marginTop: 24,
        shadowColor: "#14B8A6",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 6,
    },
    saveButtonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 1,
    },
    upgradeButton: {
        backgroundColor: "#14B8A6",
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 14,
        alignItems: "center",
    },
    upgradeButtonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "700",
    },
    dataSourceBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FEF3C7",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        marginTop: 8,
        marginBottom: 12,
        gap: 6,
    },
    dataSourceText: {
        fontSize: 12,
        color: "#D97706",
        fontWeight: "600",
    },
    transportSubtitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#0D9488",
        marginBottom: 12,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    transportList: {
        paddingRight: 16,
        gap: 16,
    },
    transportCard: {
        width: 280,
        backgroundColor: "white",
        borderRadius: 16,
        padding: 16,
        shadowColor: "#0D9488",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 3,
        borderWidth: 2,
        borderColor: "transparent",
    },
    transportHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    transportProvider: {
        fontSize: 14,
        fontWeight: "600",
        color: "#5EEAD4",
    },
    transportCategoryBadge: {
        backgroundColor: "#CCFBF1",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    transportCategoryText: {
        fontSize: 12,
        color: "#0D9488",
        fontWeight: "600",
    },
    transportVehicle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#134E4A",
        marginBottom: 8,
    },
    transportService: {
        fontSize: 14,
        color: "#5EEAD4",
        marginBottom: 8,
    },
    transportDesc: {
        fontSize: 13,
        color: "#5EEAD4",
        marginBottom: 12,
        lineHeight: 20,
    },
    transportFeatures: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 12,
    },
    featureBadge: {
        backgroundColor: "#CCFBF1",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    featureText: {
        fontSize: 12,
        color: "#0D9488",
        fontWeight: "600",
    },
    transportPriceRow: {
        flexDirection: "row",
        alignItems: "baseline",
        gap: 8,
    },
    transportPrice: {
        fontSize: 18,
        fontWeight: "700",
        color: "#14B8A6",
    },
    transportPriceUnit: {
        fontSize: 14,
        color: "#5EEAD4",
        fontWeight: "500",
    },
    transportNote: {
        fontSize: 12,
        color: "#5EEAD4",
        marginBottom: 12,
    },
    transportBookButton: {
        backgroundColor: "#14B8A6",
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "center",
        gap: 6,
    },
    transportBookButtonText: {
        color: "white",
        fontSize: 12,
        fontWeight: "700",
        textTransform: "uppercase",
    },
    publicTransportCard: {
        backgroundColor: "white",
        borderRadius: 16,
        padding: 16,
        shadowColor: "#0D9488",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 3,
        borderWidth: 1,
        borderColor: "#CCFBF1",
    },
    publicTransportOption: {
        marginBottom: 12,
    },
    publicTransportHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 8,
    },
    publicTransportMode: {
        fontSize: 12,
        fontWeight: "600",
        color: "#5EEAD4",
        textTransform: "uppercase",
        letterSpacing: 1,
    },
    publicTransportDesc: {
        fontSize: 13,
        color: "#5EEAD4",
        marginBottom: 12,
        lineHeight: 20,
    },
    publicTransportPrices: {
        flexDirection: "row",
        gap: 8,
    },
    publicTransportPrice: {
        fontSize: 14,
        color: "#5EEAD4",
        fontWeight: "500",
    },
    emptyTransportCard: {
        backgroundColor: "white",
        borderRadius: 16,
        padding: 20,
        alignItems: "center",
        gap: 8,
        borderWidth: 1,
        borderColor: "#CCFBF1",
    },
    emptyTransportText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#0D9488",
    },
    emptyTransportSubtext: {
        fontSize: 14,
        color: "#5EEAD4",
        marginTop: 8,
        textAlign: "center",
    },
    
    activityHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 4,
    },
    activityTypeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: "#CCFBF1",
    },
    museumBadge: {
        backgroundColor: "#D1FAE5",
    },
    attractionBadge: {
        backgroundColor: "#FEF3C7",
    },
    tourBadge: {
        backgroundColor: "#CCFBF1",
    },
    restaurantBadge: {
        backgroundColor: "#FCE7F3",
    },
    activityTypeText: {
        fontSize: 12,
    },
    activityMeta: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: 8,
    },
    activityMetaText: {
        fontSize: 12,
        color: "#5EEAD4",
    },
    pricingSection: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: "#CCFBF1",
    },
    activityPriceRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    activityPriceLabel: {
        fontSize: 14,
        color: "#5EEAD4",
    },
    activityPrice: {
        fontSize: 18,
        fontWeight: "700",
        color: "#14B8A6",
    },
    freeBadge: {
        backgroundColor: "#D1FAE5",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        alignSelf: "flex-start",
    },
    freeText: {
        fontSize: 14,
        fontWeight: "700",
        color: "#059669",
    },
    skipLineContainer: {
        marginTop: 8,
    },
    skipLineBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FEF3C7",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 6,
        alignSelf: "flex-start",
    },
    skipLineLabel: {
        fontSize: 13,
        color: "#D97706",
        fontWeight: "500",
    },
    skipLinePrice: {
        fontSize: 15,
        fontWeight: "700",
        color: "#B45309",
    },
    skipLineSave: {
        fontSize: 11,
        color: "#5EEAD4",
        marginTop: 4,
        marginLeft: 2,
    },
    tipContainer: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 6,
        marginTop: 10,
        backgroundColor: "#FEF3C7",
        padding: 10,
        borderRadius: 10,
    },
    tipText: {
        fontSize: 12,
        color: "#D97706",
        flex: 1,
        lineHeight: 18,
    },
    bookingButtons: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 12,
    },
    bookActivityButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#14B8A6",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 4,
        borderWidth: 1,
        borderColor: "#14B8A6",
    },
    bookActivityButtonText: {
        color: "white",
        fontSize: 12,
        fontWeight: "600",
    },
    skipLineButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FEF3C7",
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
        gap: 4,
        borderWidth: 1,
        borderColor: "#F59E0B",
    },
    skipLineButtonText: {
        color: "#B45309",
        fontSize: 13,
        fontWeight: "600",
    },
    
    // Accommodation Filter Styles
    accommodationFilter: {
        flexDirection: "row",
        marginBottom: 16,
        gap: 8,
    },
    filterTab: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: "#FFFFFF",
        borderWidth: 2,
        borderColor: "#CCFBF1",
        gap: 6,
    },
    filterTabActive: {
        backgroundColor: "#14B8A6",
        borderColor: "#14B8A6",
    },
    airbnbTabActive: {
        backgroundColor: "#FF5A5F",
        borderColor: "#FF5A5F",
    },
    filterTabText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#5EEAD4",
    },
    filterTabTextActive: {
        color: "white",
    },
    
    // Airbnb Card Styles
    airbnbCard: {
        borderColor: "#FFE4E6",
    },
    accommodationTypeBadge: {
        position: "absolute",
        top: 8,
        left: 8,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#CCFBF1",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
        zIndex: 5,
    },
    airbnbBadge: {
        backgroundColor: "#FFE4E6",
    },
    accommodationTypeText: {
        fontSize: 10,
        fontWeight: "700",
        color: "#0D9488",
        textTransform: "uppercase",
    },
    airbnbTypeText: {
        color: "#FF5A5F",
    },
    superhostBadge: {
        position: "absolute",
        top: 8,
        right: 8,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFF",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
        borderWidth: 1,
        borderColor: "#FF5A5F",
        zIndex: 5,
    },
    superhostText: {
        fontSize: 10,
        fontWeight: "700",
        color: "#FF5A5F",
    },
    ratingBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    ratingText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#134E4A",
    },
    propertyDetails: {
        marginBottom: 8,
    },
    propertyType: {
        fontSize: 12,
        fontWeight: "600",
        color: "#FF5A5F",
        marginBottom: 4,
        textTransform: "uppercase",
    },
    propertyStats: {
        flexDirection: "row",
        gap: 12,
    },
    statItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    statText: {
        fontSize: 12,
        color: "#5EEAD4",
    },
    amenitiesRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
        marginBottom: 12,
    },
    amenityBadge: {
        backgroundColor: "#CCFBF1",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    airbnbAmenityBadge: {
        backgroundColor: "#FFE4E6",
    },
    amenityText: {
        fontSize: 10,
        fontWeight: "600",
        color: "#0D9488",
    },
    airbnbAmenityText: {
        color: "#FF5A5F",
    },
    accommodationPriceRow: {
        flexDirection: "row",
        alignItems: "baseline",
        marginBottom: 4,
    },
    airbnbPrice: {
        color: "#FF5A5F",
    },
    priceNight: {
        fontSize: 14,
        color: "#5EEAD4",
    },
    totalStayPrice: {
        fontSize: 12,
        color: "#5EEAD4",
    },
    airbnbBookButton: {
        backgroundColor: "#FF5A5F",
    },
    
    // Accommodation Summary Styles
    accommodationSummary: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        marginTop: 16,
        borderWidth: 1,
        borderColor: "#CCFBF1",
    },
    summaryHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#CCFBF1",
    },
    summaryTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: "#134E4A",
        flex: 1,
    },
    summaryDetails: {
        gap: 8,
    },
    summaryRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    summaryLabel: {
        fontSize: 14,
        color: "#5EEAD4",
    },
    summaryValue: {
        fontSize: 16,
        fontWeight: "700",
        color: "#14B8A6",
    },
    priceBreakdownToggle: {
        flex: 1,
    },
    // Cart Button Styles
    addToCartButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#CCFBF1",
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 4,
        borderWidth: 1,
        borderColor: "#14B8A6",
    },
    addToCartButtonText: {
        color: "#0D9488",
        fontSize: 11,
        fontWeight: "600",
    },
    inCartButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#14B8A6",
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 4,
    },
    inCartButtonText: {
        color: "white",
        fontSize: 11,
        fontWeight: "600",
    },
    addToCartSkipLineButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FEF3C7",
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 4,
        borderWidth: 1,
        borderColor: "#F59E0B",
    },
    addToCartSkipLineButtonText: {
        color: "#B45309",
        fontSize: 11,
        fontWeight: "600",
    },
    inCartSkipLineButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F59E0B",
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 4,
    },
    inCartSkipLineButtonText: {
        color: "white",
        fontSize: 11,
        fontWeight: "600",
    },
    cartBadge: {
        position: "absolute",
        top: -4,
        right: -4,
        backgroundColor: "#FF5A5F",
        minWidth: 18,
        height: 18,
        paddingHorizontal: 4,
        borderRadius: 9,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10,
    },
    cartBadgeText: {
        color: "white",
        fontSize: 10,
        fontWeight: "700",
    },
    // Skipped Flights Styles
    skippedFlightsContainer: {
        alignItems: "center",
        padding: 24,
        gap: 12,
    },
    skippedFlightsTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#0D9488",
    },
    skippedFlightsText: {
        fontSize: 14,
        color: "#5EEAD4",
        textAlign: "center",
        lineHeight: 20,
    },
    // Multiple Flight Options Styles
    bestPriceBanner: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#D1FAE5",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        marginBottom: 16,
        gap: 8,
    },
    bestPriceText: {
        fontSize: 14,
        fontWeight: "700",
        color: "#10B981",
    },
    flightOptionsLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#0D9488",
        marginBottom: 12,
    },
    flightOptionsScroll: {
        marginBottom: 20,
    },
    flightOptionCard: {
        width: 140,
        backgroundColor: "#F0FFFE",
        borderRadius: 14,
        padding: 14,
        marginRight: 12,
        borderWidth: 2,
        borderColor: "#CCFBF1",
        alignItems: "center",
    },
    flightOptionCardSelected: {
        borderColor: "#14B8A6",
        backgroundColor: "#CCFBF1",
    },
    bestPriceBadge: {
        backgroundColor: "#10B981",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginBottom: 8,
    },
    bestPriceBadgeText: {
        fontSize: 10,
        fontWeight: "700",
        color: "white",
        textTransform: "uppercase",
    },
    flightOptionAirline: {
        fontSize: 12,
        fontWeight: "600",
        color: "#0D9488",
        textAlign: "center",
        marginBottom: 4,
    },
    flightOptionTime: {
        fontSize: 14,
        fontWeight: "700",
        color: "#134E4A",
        marginBottom: 4,
    },
    flightOptionPrice: {
        fontSize: 18,
        fontWeight: "800",
        color: "#14B8A6",
        marginBottom: 4,
    },
    flightOptionStops: {
        fontSize: 11,
        color: "#5EEAD4",
        fontWeight: "500",
        marginTop: 4,
    },
    selectedFlightDetails: {
        backgroundColor: "#F0FFFE",
        borderRadius: 14,
        padding: 16,
        marginBottom: 16,
    },
    stopsText: {
        fontSize: 12,
        color: "#F59E0B",
        fontWeight: "500",
        marginTop: 4,
    },
    baggageSection: {
        marginTop: 16,
    },
    baggageSectionTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: "#0D9488",
        marginBottom: 12,
    },
    baggageOption: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#F0FFFE",
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
    },
    baggageOptionLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    baggageOptionInfo: {
        flexDirection: "column",
        gap: 4,
    },
    baggageOptionTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: "#134E4A",
    },
    baggageOptionDesc: {
        fontSize: 12,
        color: "#5EEAD4",
    },
    baggageOptionRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    baggagePrice: {
        fontSize: 14,
        fontWeight: "700",
        color: "#14B8A6",
    },
    baggageOptionSelectable: {
        backgroundColor: "white",
        borderWidth: 1,
        borderColor: "#CCFBF1",
    },
    baggageOptionSelected: {
        backgroundColor: "#CCFBF1",
    },
    baggagePriceSelected: {
        color: "#14B8A6",
    },
    baggageOptionTitleSelected: {
        color: "#14B8A6",
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#546E7A",
        alignItems: "center",
        justifyContent: "center",
    },
    checkboxSelected: {
        backgroundColor: "#14B8A6",
        borderColor: "#14B8A6",
    },
    baggageSummary: {
        alignItems: "center",
        marginTop: 12,
    },
    baggageSummaryText: {
        fontSize: 12,
        color: "#5EEAD4",
        textAlign: "center",
    },
    includedBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    includedText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#10B981",
    },
    // TripAdvisor Activity Badge Styles
    tripAdvisorActivityBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginTop: 8,
    },
    tripAdvisorActivityLogo: {
        width: 100,
        height: 20,
    },
    tripAdvisorRatingBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    tripAdvisorRatingText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#00AA6C",
    },
    tripAdvisorReviewText: {
        fontSize: 12,
        color: "#5EEAD4",
    },
    // Restaurant Meta Info Styles
    restaurantMetaRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: 8,
    },
    cuisineActivityBadge: {
        backgroundColor: "#CCFBF1",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    cuisineActivityText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#134E4A",
    },
    priceRangeActivityText: {
        fontSize: 12,
        color: "#5EEAD4",
    },
    // Restaurant Address Styles
    restaurantAddressActivityRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: 8,
    },
    restaurantAddressActivityText: {
        fontSize: 12,
        color: "#78909C",
    },
    tripAdvisorLinkButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#E8F5E9",
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 4,
        borderWidth: 1,
        borderColor: "#00AA6C",
    },
    tripAdvisorLinkButtonText: {
        fontSize: 11,
        fontWeight: "600",
        color: "#00AA6C",
    },
    // Multi-City Route Styles
    multiCityRouteContainer: {
        backgroundColor: "#F0FFFE",
        borderRadius: 16,
        padding: 16,
    },
    routeVisualization: {
        marginBottom: 16,
    },
    routeSegmentContainer: {
        marginBottom: 0,
    },
    cityMarker: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 8,
    },
    cityMarkerDot: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#14B8A6",
        alignItems: "center",
        justifyContent: "center",
    },
    finalCityMarkerDot: {
        backgroundColor: "#0D9488",
    },
    cityMarkerNumber: {
        fontSize: 14,
        fontWeight: "700",
        color: "white",
    },
    cityMarkerInfo: {
        flex: 1,
    },
    cityMarkerName: {
        fontSize: 16,
        fontWeight: "700",
        color: "#134E4A",
    },
    cityMarkerDays: {
        fontSize: 13,
        color: "#5EEAD4",
        marginTop: 2,
    },
    transportConnector: {
        flexDirection: "row",
        alignItems: "center",
        marginLeft: 16,
        paddingVertical: 8,
    },
    transportLine: {
        flex: 1,
        height: 2,
        backgroundColor: "#CCFBF1",
    },
    transportBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "white",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
        marginHorizontal: 8,
        borderWidth: 1,
        borderColor: "#CCFBF1",
    },
    transportBadgeText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#0D9488",
        textTransform: "capitalize",
    },
    routeSummary: {
        flexDirection: "row",
        justifyContent: "space-around",
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: "#CCFBF1",
    },
    routeSummaryItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    routeSummaryText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#0D9488",
    },
});
