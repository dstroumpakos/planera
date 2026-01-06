import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Image, Linking, Platform, Alert, Modal, TextInput, KeyboardAvoidingView } from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import { BlurView } from "expo-blur";
import { LinearGradient } from 'expo-linear-gradient';

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
    const [activeFilter, setActiveFilter] = useState<'all' | 'flights' | 'food' | 'sights' | 'stays' | 'transportation'>('all');

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
                <ActivityIndicator size="large" color="#FFE500" />
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
                <ActivityIndicator size="large" color="#FFE500" />
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
                            <Text style={styles.price}>€{flight.price}</Text>
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
        <View style={styles.container}>
            {/* Header */}
            <SafeAreaView edges={['top']} style={styles.headerContainer}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                        <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>{trip.destination} Escape</Text>
                        <View style={styles.aiBadge}>
                            <Ionicons name="sparkles" size={12} color="#F9F506" />
                            <Text style={styles.aiBadgeText}>AI Generated</Text>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.iconButton}>
                        <Ionicons name="ellipsis-horizontal" size={24} color="#1A1A1A" />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Map Preview */}
                <View style={styles.mapPreviewContainer}>
                    <Image 
                        source={{ uri: `https://images.pexels.com/photos/1285625/pexels-photo-1285625.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop&q=80&query=${encodeURIComponent(trip.destination)}` }} 
                        style={styles.mapImage} 
                    />
                    <LinearGradient
                        colors={['transparent', 'rgba(248, 248, 245, 1)']}
                        style={styles.mapGradient}
                    />
                    <TouchableOpacity style={styles.viewMapButton} onPress={() => openMap(trip.destination)}>
                        <Ionicons name="map" size={20} color="#F9F506" />
                        <Text style={styles.viewMapText}>View Map</Text>
                    </TouchableOpacity>
                </View>

                {/* Filter Chips */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer}>
                    <TouchableOpacity 
                        style={[styles.filterChip, activeFilter === 'all' && styles.filterChipActive]}
                        onPress={() => setActiveFilter('all')}
                    >
                        <Text style={[styles.filterText, activeFilter === 'all' && styles.filterTextActive]}>All</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.filterChip, activeFilter === 'flights' && styles.filterChipActive]}
                        onPress={() => setActiveFilter('flights')}
                    >
                        <Text style={[styles.filterText, activeFilter === 'flights' && styles.filterTextActive]}>Flights</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.filterChip, activeFilter === 'food' && styles.filterChipActive]}
                        onPress={() => setActiveFilter('food')}
                    >
                        <Ionicons name="restaurant" size={18} color={activeFilter === 'food' ? "#1A1A1A" : "#64748B"} />
                        <Text style={[styles.filterText, activeFilter === 'food' && styles.filterTextActive]}>Food</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.filterChip, activeFilter === 'sights' && styles.filterChipActive]}
                        onPress={() => setActiveFilter('sights')}
                    >
                        <Ionicons name="ticket" size={18} color={activeFilter === 'sights' ? "#1A1A1A" : "#64748B"} />
                        <Text style={[styles.filterText, activeFilter === 'sights' && styles.filterTextActive]}>Sights</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.filterChip, activeFilter === 'stays' && styles.filterChipActive]}
                        onPress={() => setActiveFilter('stays')}
                    >
                        <Ionicons name="bed" size={18} color={activeFilter === 'stays' ? "#1A1A1A" : "#64748B"} />
                        <Text style={[styles.filterText, activeFilter === 'stays' && styles.filterTextActive]}>Stays</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.filterChip, activeFilter === 'transportation' && styles.filterChipActive]}
                        onPress={() => setActiveFilter('transportation')}
                    >
                        <Ionicons name="car" size={18} color={activeFilter === 'transportation' ? "#1A1A1A" : "#64748B"} />
                        <Text style={[styles.filterText, activeFilter === 'transportation' && styles.filterTextActive]}>Transport</Text>
                    </TouchableOpacity>
                </ScrollView>

                {/* Content based on active filter */}
                <View style={styles.itineraryContainer}>
                    {activeFilter === 'all' && trip.itinerary?.dayByDayItinerary?.map((day: any, index: number) => (
                        <View key={index} style={styles.daySection}>
                            <View style={styles.dayHeader}>
                                <View>
                                    <Text style={styles.dayTitle}>Day {day.day}</Text>
                                    <Text style={styles.daySubtitle}>{day.title || `Explore ${trip.destination}`}</Text>
                                </View>
                                <View style={styles.energyBadge}>
                                    <Text style={styles.energyText}>HIGH ENERGY</Text>
                                </View>
                            </View>

                            {day.activities.map((activity: any, actIndex: number) => (
                                <View key={actIndex} style={styles.timelineItem}>
                                    <View style={styles.timelineLeft}>
                                        <View style={styles.timelineIconContainer}>
                                            <Ionicons 
                                                name={
                                                    activity.type === 'restaurant' ? 'restaurant' :
                                                    activity.type === 'museum' ? 'easel' :
                                                    activity.type === 'attraction' ? 'ticket' :
                                                    'location'
                                                } 
                                                size={20} 
                                                color="#1A1A1A" 
                                            />
                                        </View>
                                        <Text style={styles.timelineTime}>{activity.time}</Text>
                                        {actIndex < day.activities.length - 1 && <View style={styles.timelineLine} />}
                                    </View>
                                    <TouchableOpacity style={styles.timelineCard}>
                                        <View style={styles.timelineCardContent}>
                                            <View style={{flex: 1}}>
                                                <Text style={styles.activityTitle}>{activity.title}</Text>
                                                <Text style={styles.activityDesc} numberOfLines={2}>{activity.description}</Text>
                                                <View style={styles.activityMeta}>
                                                    <View style={styles.metaBadge}>
                                                        <Text style={styles.metaText}>{activity.type || 'Activity'}</Text>
                                                    </View>
                                                    <View style={styles.metaDuration}>
                                                        <Ionicons name="time-outline" size={12} color="#94A3B8" />
                                                        <Text style={styles.metaDurationText}>{activity.duration || '1h'}</Text>
                                                    </View>
                                                </View>
                                            </View>
                                            {/* Placeholder image if no image available */}
                                            <View style={styles.activityImagePlaceholder} />
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    ))}

                    {activeFilter === 'food' && (
                        <View>
                            <Text style={styles.sectionTitle}>Top Restaurants</Text>
                            {trip.itinerary?.restaurants?.map((restaurant: any, index: number) => (
                                <View key={index} style={styles.card}>
                                    <View style={styles.row}>
                                        <View style={styles.flightInfo}>
                                            <View style={styles.restaurantHeader}>
                                                <Text style={styles.cardTitle}>{restaurant.name}</Text>
                                                {restaurant.tripAdvisorUrl && (
                                                    <Image 
                                                        source={{ uri: "https://static.tacdn.com/img2/brand_refresh/Tripadvisor_lockup_horizontal_secondary_registered.svg" }} 
                                                        style={styles.tripAdvisorLogo}
                                                        resizeMode="contain"
                                                    />
                                                )}
                                            </View>
                                            <Text style={styles.cardSubtitle}>{restaurant.cuisine} • {restaurant.priceRange}</Text>
                                            <View style={styles.ratingContainer}>
                                                <Ionicons name="star" size={14} color="#F59E0B" />
                                                <Text style={styles.ratingText}>{restaurant.rating} ({restaurant.reviewCount} reviews)</Text>
                                            </View>
                                            <Text style={styles.addressText}>{restaurant.address}</Text>
                                        </View>
                                        {restaurant.tripAdvisorUrl && (
                                            <TouchableOpacity onPress={() => Linking.openURL(restaurant.tripAdvisorUrl)}>
                                                <Ionicons name="open-outline" size={24} color="#1A1A1A" />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            ))}
                            {(!trip.itinerary?.restaurants || trip.itinerary.restaurants.length === 0) && (
                                <Text style={styles.emptyText}>No restaurants found.</Text>
                            )}
                        </View>
                    )}

                    {activeFilter === 'flights' && (
                        <View>
                            <Text style={styles.sectionTitle}>Available Flights</Text>
                            {trip.skipFlights ? (
                                <View style={styles.card}>
                                    <View style={styles.skippedSection}>
                                        <Ionicons name="airplane" size={32} color="#94A3B8" />
                                        <Text style={styles.skippedTitle}>Flights Skipped</Text>
                                        <Text style={styles.skippedText}>You indicated you already have flights booked for this trip.</Text>
                                    </View>
                                </View>
                            ) : (
                                <>
                                    {trip.itinerary?.flights?.options?.map((flight: any, index: number) => (
                                        <View key={index} style={[styles.card, flight.isBestPrice && styles.bestPriceCard]}>
                                            {flight.isBestPrice && (
                                                <View style={styles.bestPriceBadge}>
                                                    <Text style={styles.bestPriceBadgeText}>Best Price</Text>
                                                </View>
                                            )}
                                            <View style={styles.flightHeader}>
                                                <View>
                                                    <Text style={styles.airlineName}>{flight.outbound.airline}</Text>
                                                    <Text style={styles.flightTime}>{flight.outbound.departure} - {flight.outbound.arrival}</Text>
                                                </View>
                                                <Text style={styles.flightPrice}>€{flight.pricePerPerson}</Text>
                                            </View>
                                            <View style={styles.flightRoute}>
                                                <Text style={styles.airportCode}>{trip.origin ? trip.origin.substring(0, 3).toUpperCase() : 'ORG'}</Text>
                                                <View style={styles.flightLineContainer}>
                                                    <View style={styles.flightLine} />
                                                    <Ionicons name="airplane" size={16} color="#64748B" style={styles.flightIcon} />
                                                </View>
                                                <Text style={styles.airportCode}>{trip.destination ? trip.destination.substring(0, 3).toUpperCase() : 'DST'}</Text>
                                            </View>
                                            <Text style={styles.flightDuration}>{flight.outbound.duration} • {flight.outbound.stops === 0 ? 'Direct' : `${flight.outbound.stops} Stop(s)`}</Text>
                                            
                                            <View style={styles.divider} />
                                            
                                            <View style={styles.flightHeader}>
                                                <View>
                                                    <Text style={styles.airlineName}>{flight.return.airline}</Text>
                                                    <Text style={styles.flightTime}>{flight.return.departure} - {flight.return.arrival}</Text>
                                                </View>
                                            </View>
                                            <View style={styles.flightRoute}>
                                                <Text style={styles.airportCode}>{trip.destination ? trip.destination.substring(0, 3).toUpperCase() : 'DST'}</Text>
                                                <View style={styles.flightLineContainer}>
                                                    <View style={styles.flightLine} />
                                                    <Ionicons name="airplane" size={16} color="#64748B" style={[styles.flightIcon, { transform: [{ rotate: '180deg' }] }]} />
                                                </View>
                                                <Text style={styles.airportCode}>{trip.origin ? trip.origin.substring(0, 3).toUpperCase() : 'ORG'}</Text>
                                            </View>
                                            <Text style={styles.flightDuration}>{flight.return.duration} • {flight.return.stops === 0 ? 'Direct' : `${flight.return.stops} Stop(s)`}</Text>
                                            
                                            {flight.bookingUrl && (
                                                <TouchableOpacity 
                                                    style={styles.bookFlightButton}
                                                    onPress={() => Linking.openURL(flight.bookingUrl)}
                                                >
                                                    <Text style={styles.bookFlightButtonText}>Book Flight</Text>
                                                    <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    ))}
                                    {(!trip.itinerary?.flights || trip.itinerary.flights.length === 0) && (
                                        <Text style={styles.emptyText}>No flights found.</Text>
                                    )}
                                </>
                            )}
                        </View>
                    )}

                    {activeFilter === 'sights' && (
                        <View>
                            <Text style={styles.sectionTitle}>Top Sights & Activities</Text>
                            {trip.itinerary?.activities?.map((activity: any, index: number) => (
                                <View key={index} style={styles.card}>
                                    <View style={styles.row}>
                                        <View style={styles.flightInfo}>
                                            <Text style={styles.cardTitle}>{activity.title}</Text>
                                            <Text style={styles.cardSubtitle}>{activity.duration}</Text>
                                            <Text style={styles.activityDesc} numberOfLines={3}>{activity.description}</Text>
                                            <View style={styles.priceRow}>
                                                <Text style={styles.price}>€{activity.price}</Text>
                                                {activity.skipTheLine && (
                                                    <View style={styles.skipLineBadge}>
                                                        <Text style={styles.skipLineText}>Skip the Line</Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                        {activity.image ? (
                                            <Image source={{ uri: activity.image }} style={styles.activityThumbnail} />
                                        ) : (
                                            <View style={styles.activityThumbnailPlaceholder}>
                                                <Ionicons name="image-outline" size={24} color="#94A3B8" />
                                            </View>
                                        )}
                                    </View>
                                    {activity.bookingUrl && (
                                        <TouchableOpacity 
                                            style={styles.bookButton}
                                            onPress={() => Linking.openURL(activity.bookingUrl)}
                                        >
                                            <Text style={styles.bookButtonText}>Book Now</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}
                            {(!trip.itinerary?.activities || trip.itinerary.activities.length === 0) && (
                                <Text style={styles.emptyText}>No activities found.</Text>
                            )}
                        </View>
                    )}

                    {activeFilter === 'stays' && (
                        <View>
                            <Text style={styles.sectionTitle}>Accommodations</Text>
                            {trip.skipHotel ? (
                                <View style={styles.card}>
                                    <View style={styles.skippedSection}>
                                        <Ionicons name="bed" size={32} color="#94A3B8" />
                                        <Text style={styles.skippedTitle}>Hotels Skipped</Text>
                                        <Text style={styles.skippedText}>You indicated you already have accommodation booked for this trip.</Text>
                                    </View>
                                </View>
                            ) : (
                                <>
                                    {trip.itinerary?.hotels?.map((hotel: any, index: number) => (
                                        <View key={index} style={styles.card}>
                                            <View style={styles.row}>
                                                <View style={styles.flightInfo}>
                                                    <Text style={styles.cardTitle}>{hotel.name}</Text>
                                                    <Text style={styles.cardSubtitle}>{hotel.address}</Text>
                                                    <View style={styles.ratingContainer}>
                                                        <Ionicons name="star" size={14} color="#F59E0B" />
                                                        <Text style={styles.ratingText}>{hotel.rating} Stars</Text>
                                                    </View>
                                                    <Text style={styles.activityDesc} numberOfLines={3}>{hotel.description}</Text>
                                                    <Text style={styles.price}>€{hotel.price} / night</Text>
                                                </View>
                                            </View>
                                            <View style={styles.amenitiesContainer}>
                                                {hotel.amenities?.map((amenity: string, i: number) => (
                                                    <View key={i} style={styles.amenityBadge}>
                                                        <Text style={styles.amenityText}>{amenity}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        </View>
                                    ))}
                                    {(!trip.itinerary?.hotels || trip.itinerary.hotels.length === 0) && (
                                        <Text style={styles.emptyText}>No accommodations found.</Text>
                                    )}
                                </>
                            )}
                        </View>
                    )}

                    {activeFilter === 'transportation' && (
                        <View>
                            <Text style={styles.sectionTitle}>Transportation Options</Text>
                            {trip.itinerary?.transportation?.map((option: any, index: number) => (
                                <View key={index} style={styles.card}>
                                    <View style={styles.row}>
                                        <View style={styles.flightInfo}>
                                            <View style={styles.transportHeader}>
                                                <Ionicons 
                                                    name={
                                                        option.type === 'car_rental' ? 'car' :
                                                        option.type === 'taxi' ? 'car-sport' :
                                                        option.type === 'rideshare' ? 'phone-portrait' :
                                                        'bus'
                                                    } 
                                                    size={24} 
                                                    color="#1A1A1A" 
                                                />
                                                <Text style={styles.cardTitle}>
                                                    {option.provider} {option.service ? `- ${option.service}` : ''}
                                                </Text>
                                            </View>
                                            
                                            {option.type === 'public_transport' ? (
                                                <View>
                                                    {option.options?.map((opt: any, i: number) => (
                                                        <View key={i} style={styles.transportOption}>
                                                            <Text style={styles.transportMode}>{opt.mode}</Text>
                                                            <Text style={styles.transportDesc}>{opt.description}</Text>
                                                            <Text style={styles.transportPrice}>
                                                                Single: €{opt.singleTicketPrice} | Day Pass: €{opt.dayPassPrice}
                                                            </Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            ) : (
                                                <View>
                                                    <Text style={styles.cardSubtitle}>{option.description}</Text>
                                                    <Text style={styles.price}>
                                                        {option.estimatedPrice ? `€${option.estimatedPrice}` : `€${option.pricePerDay}/day`}
                                                    </Text>
                                                    {option.features && (
                                                        <View style={styles.amenitiesContainer}>
                                                            {option.features.map((feature: string, i: number) => (
                                                                <View key={i} style={styles.amenityBadge}>
                                                                    <Text style={styles.amenityText}>{feature}</Text>
                                                                </View>
                                                            ))}
                                                        </View>
                                                    )}
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                    {option.bookingUrl && (
                                        <TouchableOpacity 
                                            style={styles.bookButton}
                                            onPress={() => Linking.openURL(option.bookingUrl)}
                                        >
                                            <Text style={styles.bookButtonText}>Book Now</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}
                            {(!trip.itinerary?.transportation || trip.itinerary.transportation.length === 0) && (
                                <Text style={styles.emptyText}>No transportation options found.</Text>
                            )}
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Floating Action Bar */}
            <View style={styles.fabContainer}>
                <View style={styles.fab}>
                    <TouchableOpacity style={styles.fabIconButton} onPress={() => setIsEditing(true)}>
                        <Ionicons name="pencil" size={20} color="#475569" />
                    </TouchableOpacity>
                </View>
            </View>

            <Modal 
                visible={isEditing} 
                animationType="slide" 
                transparent={false}
                onRequestClose={() => setIsEditing(false)}
            >
                <KeyboardAvoidingView 
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.modalContainer}
                    keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
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
        </View>
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
        backgroundColor: "#F8F8F5",
    },
    headerContainer: {
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        zIndex: 10,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "transparent",
        justifyContent: "center",
        alignItems: "center",
    },
    headerTitleContainer: {
        alignItems: "center",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1A1A1A",
    },
    aiBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    aiBadgeText: {
        fontSize: 12,
        fontWeight: "500",
        color: "#64748B",
    },
    scrollContent: {
        paddingBottom: 100,
    },
    mapPreviewContainer: {
        height: 224,
        width: "100%",
        position: "relative",
    },
    mapImage: {
        width: "100%",
        height: "100%",
        resizeMode: "cover",
    },
    mapGradient: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: 100,
    },
    viewMapButton: {
        position: "absolute",
        bottom: 16,
        right: 16,
        backgroundColor: "white",
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 4,
    },
    viewMapText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1A1A1A",
    },
    filterContainer: {
        paddingHorizontal: 16,
        paddingVertical: 24,
        gap: 12,
    },
    filterChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: "white",
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    filterChipActive: {
        backgroundColor: "#1A1A1A",
        borderColor: "#1A1A1A",
    },
    filterText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#64748B",
    },
    filterTextActive: {
        color: "white",
    },
    itineraryContainer: {
        paddingHorizontal: 16,
    },
    daySection: {
        marginBottom: 32,
    },
    dayHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    dayTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: "#1A1A1A",
    },
    daySubtitle: {
        fontSize: 14,
        fontWeight: "500",
        color: "#64748B",
    },
    energyBadge: {
        backgroundColor: "rgba(249, 245, 6, 0.2)",
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    energyText: {
        fontSize: 10,
        fontWeight: "700",
        color: "#1A1A1A",
        letterSpacing: 0.5,
    },
    timelineItem: {
        flexDirection: "row",
        gap: 16,
        marginBottom: 24,
    },
    timelineLeft: {
        alignItems: "center",
        width: 48,
    },
    timelineIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "white",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: "#F1F5F9",
        zIndex: 1,
    },
    timelineTime: {
        marginTop: 8,
        fontSize: 12,
        fontWeight: "600",
        color: "#8E8E93",
    },
    timelineLine: {
        position: "absolute",
        top: 40,
        bottom: -24,
        width: 2,
        backgroundColor: "#E2E8F0",
        zIndex: 0,
    },
    timelineCard: {
        flex: 1,
        backgroundColor: "white",
        borderRadius: 16,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
    },
    timelineCardContent: {
        flexDirection: "row",
        gap: 12,
    },
    activityTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1A1A1A",
        marginBottom: 4,
    },
    activityDesc: {
        fontSize: 14,
        color: "#64748B",
        lineHeight: 20,
        marginBottom: 12,
    },
    activityMeta: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    metaBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        backgroundColor: "#F1F5F9",
    },
    metaText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#475569",
    },
    metaDuration: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    metaDurationText: {
        fontSize: 12,
        color: "#94A3B8",
    },
    activityImagePlaceholder: {
        width: 64,
        height: 64,
        borderRadius: 8,
        backgroundColor: "#E2E8F0",
    },
    fabContainer: {
        position: "absolute",
        bottom: 24,
        left: 0,
        right: 0,
        alignItems: "center",
        paddingHorizontal: 24,
    },
    fab: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        borderRadius: 32,
        padding: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 24,
        elevation: 8,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.2)",
    },
    saveTripButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F9F506",
        height: 48,
        borderRadius: 24,
        gap: 8,
        paddingHorizontal: 24,
    },
    saveTripText: {
        fontSize: 14,
        fontWeight: "700",
        color: "#1A1A1A",
    },
    fabDivider: {
        width: 1,
        height: 24,
        backgroundColor: "#E2E8F0",
        marginHorizontal: 8,
    },
    fabIconButton: {
        width: 48,
        height: 48,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 24,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: "#F8FAFC",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 20,
        backgroundColor: "white",
        borderBottomWidth: 0,
        shadowColor: "#4F6DF5",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1A2433",
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
        color: "#A1AEC6",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    input: {
        backgroundColor: "white",
        padding: 14,
        borderRadius: 14,
        fontSize: 16,
        borderWidth: 2,
        borderColor: "#E2E8F0",
        color: "#1A2433",
    },
    textArea: {
        height: 100,
        textAlignVertical: "top",
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
        borderColor: "#E2E8F0",
    },
    dateLabel: {
        fontSize: 12,
        color: "#A1AEC6",
        marginBottom: 4,
        textTransform: "uppercase",
    },
    dateValue: {
        fontSize: 16,
        color: "#1A2433",
        fontWeight: "500",
    },
    saveButton: {
        backgroundColor: "#4F6DF5",
        padding: 16,
        borderRadius: 14,
        alignItems: "center",
        marginTop: 24,
        shadowColor: "#4F6DF5",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
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
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1A1A1A",
        marginBottom: 16,
        letterSpacing: 0.5,
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F8F8F5",
    },
    generatingText: {
        marginTop: 16,
        fontSize: 18,
        fontWeight: "600",
        color: "#1A1A1A",
    },
    generatingSubtext: {
        marginTop: 8,
        fontSize: 14,
        color: "#64748B",
    },
    errorText: {
        marginTop: 16,
        fontSize: 18,
        color: "#EF4444",
    },
    card: {
        backgroundColor: "white",
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
    },
    skippedFlightsContainer: {
        alignItems: "center",
        padding: 24,
        gap: 12,
    },
    skippedFlightsTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1A1A1A",
    },
    skippedFlightsText: {
        fontSize: 14,
        color: "#64748B",
        textAlign: "center",
        lineHeight: 20,
    },
    bestPriceBanner: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F0FDF4",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        marginBottom: 16,
        gap: 8,
    },
    bestPriceText: {
        fontSize: 14,
        fontWeight: "700",
        color: "#15803D",
    },
    flightOptionsLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1A1A1A",
        marginBottom: 12,
    },
    flightOptionsScroll: {
        marginBottom: 20,
    },
    flightOptionCard: {
        width: 140,
        backgroundColor: "white",
        borderRadius: 14,
        padding: 14,
        marginRight: 12,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        alignItems: "center",
    },
    flightOptionCardSelected: {
        borderColor: "#F9F506",
        backgroundColor: "#FEFCE8",
    },
    bestPriceBadge: {
        backgroundColor: "#15803D",
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
        color: "#1A1A1A",
        textAlign: "center",
        marginBottom: 4,
    },
    flightOptionTime: {
        fontSize: 14,
        fontWeight: "500",
        color: "#1A1A1A",
        marginBottom: 4,
    },
    flightOptionPrice: {
        fontSize: 18,
        fontWeight: "800",
        color: "#1A1A1A",
        marginBottom: 4,
    },
    flightOptionStops: {
        fontSize: 11,
        color: "#64748B",
        fontWeight: "500",
        marginTop: 4,
    },
    selectedFlightDetails: {
        backgroundColor: "#F8FAFC",
        borderRadius: 14,
        padding: 16,
        marginBottom: 16,
    },
    routeDisplay: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "white",
        padding: 16,
        borderRadius: 14,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    routePoint: {
        alignItems: "center",
        gap: 4,
        flex: 1,
    },
    routeAirport: {
        fontSize: 12,
        fontWeight: "600",
        color: "#1A1A1A",
        textAlign: "center",
    },
    routeLine: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        justifyContent: "center",
    },
    routeDash: {
        height: 2,
        backgroundColor: "#CBD5E1",
        flex: 1,
        marginHorizontal: 4,
    },
    flightHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    flightPrice: {
        fontSize: 24,
        fontWeight: "700",
        color: "#1A1A1A",
    },
    luggageBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F1F5F9",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    luggageText: {
        fontSize: 12,
        color: "#475569",
        fontWeight: "600",
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
        color: "#64748B",
        textTransform: "uppercase",
        letterSpacing: 1,
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
        color: "#1A1A1A",
    },
    cardSubtitle: {
        fontSize: 14,
        color: "#64748B",
    },
    duration: {
        fontSize: 14,
        color: "#64748B",
    },
    flightTimes: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: "#E2E8F0",
    },
    time: {
        fontSize: 16,
        fontWeight: "500",
        color: "#1A1A1A",
    },
    divider: {
        height: 1,
        backgroundColor: "#E2E8F0",
        marginVertical: 20,
    },
    baggageSection: {
        marginTop: 16,
    },
    baggageSectionTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: "#1A1A1A",
        marginBottom: 12,
    },
    baggageOption: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "white",
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#E2E8F0",
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
        color: "#1A1A1A",
    },
    baggageOptionDesc: {
        fontSize: 12,
        color: "#64748B",
    },
    baggageOptionRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    baggagePrice: {
        fontSize: 14,
        fontWeight: "700",
        color: "#1A1A1A",
    },
    baggageOptionSelectable: {
        backgroundColor: "white",
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    baggageOptionSelected: {
        backgroundColor: "#FEFCE8",
        borderColor: "#F9F506",
    },
    baggagePriceSelected: {
        color: "#1A1A1A",
    },
    baggageOptionTitleSelected: {
        color: "#1A1A1A",
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#94A3B8",
        alignItems: "center",
        justifyContent: "center",
    },
    checkboxSelected: {
        backgroundColor: "#F9F506",
        borderColor: "#F9F506",
    },
    baggageSummary: {
        alignItems: "center",
        marginTop: 12,
    },
    baggageSummaryText: {
        fontSize: 12,
        color: "#64748B",
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
        color: "#15803D",
    },
    affiliateButton: {
        marginTop: 20,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 14,
        backgroundColor: "#1A1A1A",
        borderRadius: 12,
        gap: 8,
    },
    affiliateButtonText: {
        color: "white",
        fontWeight: "700",
        fontSize: 14,
    },
    price: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1A1A1A",
    },
    ratingContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: 4,
    },
    ratingText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#1A1A1A",
    },
    addressText: {
        fontSize: 12,
        color: "#64748B",
        marginTop: 4,
    },
    priceRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginTop: 8,
    },
    skipLineBadge: {
        backgroundColor: "#FEF3C7",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    skipLineText: {
        fontSize: 10,
        fontWeight: "700",
        color: "#D97706",
        textTransform: "uppercase",
    },
    activityThumbnail: {
        width: 80,
        height: 80,
        borderRadius: 8,
        backgroundColor: "#E2E8F0",
    },
    bookButton: {
        marginTop: 16,
        backgroundColor: "#1A1A1A",
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: "center",
    },
    bookButtonText: {
        color: "white",
        fontWeight: "700",
        fontSize: 14,
    },
    amenitiesContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 12,
    },
    amenityBadge: {
        backgroundColor: "#F1F5F9",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    amenityText: {
        fontSize: 12,
        color: "#475569",
    },
    transportHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 8,
    },
    transportOption: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: "#E2E8F0",
    },
    transportMode: {
        fontSize: 14,
        fontWeight: "700",
        color: "#1A1A1A",
    },
    transportDesc: {
        fontSize: 12,
        color: "#64748B",
        marginTop: 2,
    },
    transportPrice: {
        fontSize: 12,
        fontWeight: "600",
        color: "#1A1A1A",
        marginTop: 4,
    },
    emptyText: {
        textAlign: "center",
        color: "#64748B",
        fontSize: 16,
        marginTop: 32,
    },
    restaurantHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    tripAdvisorLogo: {
        width: 100,
        height: 20,
        marginLeft: 8,
    },
    bestPriceCard: {
        borderColor: '#15803D',
        borderWidth: 1,
        backgroundColor: '#F0FDF4',
    },
    airlineName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1A1A1A',
    },
    flightTime: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1A1A1A',
        marginTop: 2,
    },
    flightRoute: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 12,
        marginBottom: 4,
    },
    airportCode: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748B',
    },
    flightLineContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 12,
    },
    flightLine: {
        height: 1,
        backgroundColor: '#CBD5E1',
        flex: 1,
    },
    flightIcon: {
        marginHorizontal: 8,
    },
    flightDuration: {
        fontSize: 12,
        color: '#64748B',
        textAlign: 'center',
    },
    bookFlightButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1A2433',
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 16,
        gap: 8,
    },
    bookFlightButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    activityThumbnailPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 8,
        backgroundColor: "#E2E8F0",
        alignItems: "center",
        justifyContent: "center",
    },
    skippedSection: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 32,
        paddingHorizontal: 16,
    },
    skippedTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1A1A',
        marginTop: 12,
    },
    skippedText: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        marginTop: 8,
    },
});
