import { useState } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform, Modal, Image, Switch, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar, DateData } from 'react-native-calendars';

import logoImage from "@/assets/bloom/images/image-1dbiuq.png";

// Airport database with country/region groupings
const AIRPORTS = [
    // Australia
    { code: "SYD", name: "Sydney Kingsford Smith", city: "Sydney", country: "Australia" },
    { code: "MEL", name: "Melbourne Tullamarine", city: "Melbourne", country: "Australia" },
    { code: "BNE", name: "Brisbane Airport", city: "Brisbane", country: "Australia" },
    { code: "PER", name: "Perth Airport", city: "Perth", country: "Australia" },
    { code: "ADL", name: "Adelaide Airport", city: "Adelaide", country: "Australia" },
    { code: "OOL", name: "Gold Coast Airport", city: "Gold Coast", country: "Australia" },
    { code: "CNS", name: "Cairns Airport", city: "Cairns", country: "Australia" },
    // Greece
    { code: "ATH", name: "Athens International", city: "Athens", country: "Greece" },
    { code: "SKG", name: "Thessaloniki Airport", city: "Thessaloniki", country: "Greece" },
    { code: "HER", name: "Heraklion Airport", city: "Heraklion", country: "Greece" },
    { code: "RHO", name: "Rhodes Airport", city: "Rhodes", country: "Greece" },
    { code: "CFU", name: "Corfu Airport", city: "Corfu", country: "Greece" },
    { code: "CHQ", name: "Chania Airport", city: "Chania", country: "Greece" },
    { code: "JMK", name: "Mykonos Airport", city: "Mykonos", country: "Greece" },
    { code: "JTR", name: "Santorini Airport", city: "Santorini", country: "Greece" },
    { code: "KGS", name: "Kos Airport", city: "Kos", country: "Greece" },
    { code: "ZTH", name: "Zakynthos Airport", city: "Zakynthos", country: "Greece" },
    // UK
    { code: "LHR", name: "London Heathrow", city: "London", country: "United Kingdom" },
    { code: "LGW", name: "London Gatwick", city: "London", country: "United Kingdom" },
    { code: "STN", name: "London Stansted", city: "London", country: "United Kingdom" },
    { code: "LTN", name: "London Luton", city: "London", country: "United Kingdom" },
    { code: "MAN", name: "Manchester Airport", city: "Manchester", country: "United Kingdom" },
    { code: "BHX", name: "Birmingham Airport", city: "Birmingham", country: "United Kingdom" },
    { code: "EDI", name: "Edinburgh Airport", city: "Edinburgh", country: "United Kingdom" },
    { code: "GLA", name: "Glasgow Airport", city: "Glasgow", country: "United Kingdom" },
    { code: "BRS", name: "Bristol Airport", city: "Bristol", country: "United Kingdom" },
    // France
    { code: "CDG", name: "Paris Charles de Gaulle", city: "Paris", country: "France" },
    { code: "ORY", name: "Paris Orly", city: "Paris", country: "France" },
    { code: "NCE", name: "Nice Côte d'Azur", city: "Nice", country: "France" },
    { code: "LYS", name: "Lyon Airport", city: "Lyon", country: "France" },
    { code: "MRS", name: "Marseille Provence", city: "Marseille", country: "France" },
    { code: "TLS", name: "Toulouse Airport", city: "Toulouse", country: "France" },
    // Germany
    { code: "FRA", name: "Frankfurt Airport", city: "Frankfurt", country: "Germany" },
    { code: "MUC", name: "Munich Airport", city: "Munich", country: "Germany" },
    { code: "BER", name: "Berlin Brandenburg", city: "Berlin", country: "Germany" },
    { code: "DUS", name: "Düsseldorf Airport", city: "Düsseldorf", country: "Germany" },
    { code: "HAM", name: "Hamburg Airport", city: "Hamburg", country: "Germany" },
    { code: "CGN", name: "Cologne Bonn", city: "Cologne", country: "Germany" },
    { code: "STR", name: "Stuttgart Airport", city: "Stuttgart", country: "Germany" },
    // Italy
    { code: "FCO", name: "Rome Fiumicino", city: "Rome", country: "Italy" },
    { code: "MXP", name: "Milan Malpensa", city: "Milan", country: "Italy" },
    { code: "VCE", name: "Venice Marco Polo", city: "Venice", country: "Italy" },
    { code: "NAP", name: "Naples Airport", city: "Naples", country: "Italy" },
    { code: "BGY", name: "Milan Bergamo", city: "Milan", country: "Italy" },
    { code: "FLR", name: "Florence Airport", city: "Florence", country: "Italy" },
    { code: "BLQ", name: "Bologna Airport", city: "Bologna", country: "Italy" },
    // Spain
    { code: "MAD", name: "Madrid Barajas", city: "Madrid", country: "Spain" },
    { code: "BCN", name: "Barcelona El Prat", city: "Barcelona", country: "Spain" },
    { code: "PMI", name: "Palma de Mallorca", city: "Palma", country: "Spain" },
    { code: "AGP", name: "Málaga Airport", city: "Málaga", country: "Spain" },
    { code: "ALC", name: "Alicante Airport", city: "Alicante", country: "Spain" },
    { code: "IBZ", name: "Ibiza Airport", city: "Ibiza", country: "Spain" },
    { code: "VLC", name: "Valencia Airport", city: "Valencia", country: "Spain" },
    { code: "SVQ", name: "Seville Airport", city: "Seville", country: "Spain" },
    // Netherlands
    { code: "AMS", name: "Amsterdam Schiphol", city: "Amsterdam", country: "Netherlands" },
    { code: "EIN", name: "Eindhoven Airport", city: "Eindhoven", country: "Netherlands" },
    // Belgium
    { code: "BRU", name: "Brussels Airport", city: "Brussels", country: "Belgium" },
    { code: "CRL", name: "Brussels South Charleroi", city: "Charleroi", country: "Belgium" },
    // Portugal
    { code: "LIS", name: "Lisbon Airport", city: "Lisbon", country: "Portugal" },
    { code: "OPO", name: "Porto Airport", city: "Porto", country: "Portugal" },
    { code: "FAO", name: "Faro Airport", city: "Faro", country: "Portugal" },
    // Turkey
    { code: "IST", name: "Istanbul Airport", city: "Istanbul", country: "Turkey" },
    { code: "SAW", name: "Istanbul Sabiha Gökçen", city: "Istanbul", country: "Turkey" },
    { code: "AYT", name: "Antalya Airport", city: "Antalya", country: "Turkey" },
    { code: "ADB", name: "Izmir Airport", city: "Izmir", country: "Turkey" },
    // UAE
    { code: "DXB", name: "Dubai International", city: "Dubai", country: "UAE" },
    { code: "AUH", name: "Abu Dhabi Airport", city: "Abu Dhabi", country: "UAE" },
    { code: "SHJ", name: "Sharjah Airport", city: "Sharjah", country: "UAE" },
    // USA
    { code: "JFK", name: "New York JFK", city: "New York", country: "USA" },
    { code: "LAX", name: "Los Angeles LAX", city: "Los Angeles", country: "USA" },
    { code: "ORD", name: "Chicago O'Hare", city: "Chicago", country: "USA" },
    { code: "MIA", name: "Miami International", city: "Miami", country: "USA" },
    { code: "SFO", name: "San Francisco", city: "San Francisco", country: "USA" },
    { code: "ATL", name: "Atlanta Hartsfield", city: "Atlanta", country: "USA" },
    { code: "DFW", name: "Dallas Fort Worth", city: "Dallas", country: "USA" },
    { code: "DEN", name: "Denver International", city: "Denver", country: "USA" },
    { code: "SEA", name: "Seattle-Tacoma", city: "Seattle", country: "USA" },
    { code: "LAS", name: "Las Vegas McCarran", city: "Las Vegas", country: "USA" },
    { code: "BOS", name: "Boston Logan", city: "Boston", country: "USA" },
    { code: "EWR", name: "Newark Liberty", city: "Newark", country: "USA" },
    // Canada
    { code: "YYZ", name: "Toronto Pearson", city: "Toronto", country: "Canada" },
    { code: "YVR", name: "Vancouver Airport", city: "Vancouver", country: "Canada" },
    { code: "YUL", name: "Montreal Trudeau", city: "Montreal", country: "Canada" },
    { code: "YYC", name: "Calgary Airport", city: "Calgary", country: "Canada" },
    // Other Europe
    { code: "DUB", name: "Dublin Airport", city: "Dublin", country: "Ireland" },
    { code: "ZRH", name: "Zurich Airport", city: "Zurich", country: "Switzerland" },
    { code: "GVA", name: "Geneva Airport", city: "Geneva", country: "Switzerland" },
    { code: "VIE", name: "Vienna Airport", city: "Vienna", country: "Austria" },
    { code: "PRG", name: "Prague Airport", city: "Prague", country: "Czech Republic" },
    { code: "BUD", name: "Budapest Airport", city: "Budapest", country: "Hungary" },
    { code: "WAW", name: "Warsaw Chopin", city: "Warsaw", country: "Poland" },
    { code: "KRK", name: "Krakow Airport", city: "Krakow", country: "Poland" },
    { code: "CPH", name: "Copenhagen Airport", city: "Copenhagen", country: "Denmark" },
    { code: "ARN", name: "Stockholm Arlanda", city: "Stockholm", country: "Sweden" },
    { code: "OSL", name: "Oslo Gardermoen", city: "Oslo", country: "Norway" },
    { code: "HEL", name: "Helsinki Airport", city: "Helsinki", country: "Finland" },
    // Asia
    { code: "SIN", name: "Singapore Changi", city: "Singapore", country: "Singapore" },
    { code: "HKG", name: "Hong Kong International", city: "Hong Kong", country: "Hong Kong" },
    { code: "NRT", name: "Tokyo Narita", city: "Tokyo", country: "Japan" },
    { code: "HND", name: "Tokyo Haneda", city: "Tokyo", country: "Japan" },
    { code: "KIX", name: "Osaka Kansai", city: "Osaka", country: "Japan" },
    { code: "ICN", name: "Seoul Incheon", city: "Seoul", country: "South Korea" },
    { code: "BKK", name: "Bangkok Suvarnabhumi", city: "Bangkok", country: "Thailand" },
    { code: "KUL", name: "Kuala Lumpur", city: "Kuala Lumpur", country: "Malaysia" },
    { code: "CGK", name: "Jakarta Soekarno-Hatta", city: "Jakarta", country: "Indonesia" },
    { code: "DPS", name: "Bali Ngurah Rai", city: "Bali", country: "Indonesia" },
    { code: "MNL", name: "Manila Ninoy Aquino", city: "Manila", country: "Philippines" },
    { code: "DEL", name: "Delhi Indira Gandhi", city: "Delhi", country: "India" },
    { code: "BOM", name: "Mumbai Airport", city: "Mumbai", country: "India" },
    { code: "PEK", name: "Beijing Capital", city: "Beijing", country: "China" },
    { code: "PVG", name: "Shanghai Pudong", city: "Shanghai", country: "China" },
    // Middle East
    { code: "DOH", name: "Doha Hamad", city: "Doha", country: "Qatar" },
    { code: "RUH", name: "Riyadh Airport", city: "Riyadh", country: "Saudi Arabia" },
    { code: "JED", name: "Jeddah Airport", city: "Jeddah", country: "Saudi Arabia" },
    { code: "TLV", name: "Tel Aviv Ben Gurion", city: "Tel Aviv", country: "Israel" },
    { code: "AMM", name: "Amman Queen Alia", city: "Amman", country: "Jordan" },
    { code: "CAI", name: "Cairo International", city: "Cairo", country: "Egypt" },
    // Africa
    { code: "JNB", name: "Johannesburg OR Tambo", city: "Johannesburg", country: "South Africa" },
    { code: "CPT", name: "Cape Town Airport", city: "Cape Town", country: "South Africa" },
    { code: "NBO", name: "Nairobi Jomo Kenyatta", city: "Nairobi", country: "Kenya" },
    { code: "CMN", name: "Casablanca Mohammed V", city: "Casablanca", country: "Morocco" },
    // South America
    { code: "GRU", name: "São Paulo Guarulhos", city: "São Paulo", country: "Brazil" },
    { code: "GIG", name: "Rio de Janeiro Galeão", city: "Rio de Janeiro", country: "Brazil" },
    { code: "EZE", name: "Buenos Aires Ezeiza", city: "Buenos Aires", country: "Argentina" },
    { code: "SCL", name: "Santiago Airport", city: "Santiago", country: "Chile" },
    { code: "BOG", name: "Bogotá El Dorado", city: "Bogotá", country: "Colombia" },
    { code: "LIM", name: "Lima Jorge Chávez", city: "Lima", country: "Peru" },
    // New Zealand
    { code: "AKL", name: "Auckland Airport", city: "Auckland", country: "New Zealand" },
    { code: "WLG", name: "Wellington Airport", city: "Wellington", country: "New Zealand" },
    { code: "CHC", name: "Christchurch Airport", city: "Christchurch", country: "New Zealand" },
    { code: "ZQN", name: "Queenstown Airport", city: "Queenstown", country: "New Zealand" },
    // Cyprus
    { code: "LCA", name: "Larnaca Airport", city: "Larnaca", country: "Cyprus" },
    { code: "PFO", name: "Paphos Airport", city: "Paphos", country: "Cyprus" },
];

// Popular destinations list
const DESTINATIONS = [
    // Europe
    { city: "Paris", country: "France", emoji: "🇫🇷" },
    { city: "London", country: "United Kingdom", emoji: "🇬🇧" },
    { city: "Rome", country: "Italy", emoji: "🇮🇹" },
    { city: "Barcelona", country: "Spain", emoji: "🇪🇸" },
    { city: "Amsterdam", country: "Netherlands", emoji: "🇳🇱" },
    { city: "Berlin", country: "Germany", emoji: "🇩🇪" },
    { city: "Prague", country: "Czech Republic", emoji: "🇨🇿" },
    { city: "Vienna", country: "Austria", emoji: "🇦🇹" },
    { city: "Lisbon", country: "Portugal", emoji: "🇵🇹" },
    { city: "Athens", country: "Greece", emoji: "🇬🇷" },
    { city: "Santorini", country: "Greece", emoji: "🇬🇷" },
    { city: "Mykonos", country: "Greece", emoji: "🇬🇷" },
    { city: "Dublin", country: "Ireland", emoji: "🇮🇪" },
    { city: "Edinburgh", country: "Scotland", emoji: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
    { city: "Zurich", country: "Switzerland", emoji: "🇨🇭" },
    { city: "Copenhagen", country: "Denmark", emoji: "🇩🇰" },
    { city: "Stockholm", country: "Sweden", emoji: "🇸🇪" },
    { city: "Oslo", country: "Norway", emoji: "🇳🇴" },
    { city: "Helsinki", country: "Finland", emoji: "🇫🇮" },
    { city: "Budapest", country: "Hungary", emoji: "🇭🇺" },
    { city: "Warsaw", country: "Poland", emoji: "🇵🇱" },
    { city: "Krakow", country: "Poland", emoji: "🇵🇱" },
    { city: "Brussels", country: "Belgium", emoji: "🇧🇪" },
    { city: "Milan", country: "Italy", emoji: "🇮🇹" },
    { city: "Venice", country: "Italy", emoji: "🇮🇹" },
    { city: "Florence", country: "Italy", emoji: "🇮🇹" },
    { city: "Madrid", country: "Spain", emoji: "🇪🇸" },
    { city: "Seville", country: "Spain", emoji: "🇪🇸" },
    { city: "Nice", country: "France", emoji: "🇫🇷" },
    { city: "Monaco", country: "Monaco", emoji: "🇲🇨" },
    // Asia
    { city: "Tokyo", country: "Japan", emoji: "🇯🇵" },
    { city: "Kyoto", country: "Japan", emoji: "🇯🇵" },
    { city: "Osaka", country: "Japan", emoji: "🇯🇵" },
    { city: "Seoul", country: "South Korea", emoji: "🇰🇷" },
    { city: "Bangkok", country: "Thailand", emoji: "🇹🇭" },
    { city: "Phuket", country: "Thailand", emoji: "🇹🇭" },
    { city: "Singapore", country: "Singapore", emoji: "🇸🇬" },
    { city: "Hong Kong", country: "China", emoji: "🇭🇰" },
    { city: "Bali", country: "Indonesia", emoji: "🇮🇩" },
    { city: "Hanoi", country: "Vietnam", emoji: "🇻🇳" },
    { city: "Ho Chi Minh City", country: "Vietnam", emoji: "🇻🇳" },
    { city: "Kuala Lumpur", country: "Malaysia", emoji: "🇲🇾" },
    { city: "Mumbai", country: "India", emoji: "🇮🇳" },
    { city: "Delhi", country: "India", emoji: "🇮🇳" },
    { city: "Dubai", country: "UAE", emoji: "🇦🇪" },
    { city: "Abu Dhabi", country: "UAE", emoji: "🇦🇪" },
    { city: "Maldives", country: "Maldives", emoji: "🇲🇻" },
    // Americas
    { city: "New York", country: "USA", emoji: "🇺🇸" },
    { city: "Los Angeles", country: "USA", emoji: "🇺🇸" },
    { city: "Miami", country: "USA", emoji: "🇺🇸" },
    { city: "San Francisco", country: "USA", emoji: "🇺🇸" },
    { city: "Las Vegas", country: "USA", emoji: "🇺🇸" },
    { city: "Chicago", country: "USA", emoji: "🇺🇸" },
    { city: "Hawaii", country: "USA", emoji: "🇺🇸" },
    { city: "Cancun", country: "Mexico", emoji: "🇲🇽" },
    { city: "Mexico City", country: "Mexico", emoji: "🇲🇽" },
    { city: "Rio de Janeiro", country: "Brazil", emoji: "🇧🇷" },
    { city: "Buenos Aires", country: "Argentina", emoji: "🇦🇷" },
    { city: "Toronto", country: "Canada", emoji: "🇨🇦" },
    { city: "Vancouver", country: "Canada", emoji: "🇨🇦" },
    // Africa & Middle East
    { city: "Cape Town", country: "South Africa", emoji: "🇿🇦" },
    { city: "Marrakech", country: "Morocco", emoji: "🇲🇦" },
    { city: "Cairo", country: "Egypt", emoji: "🇪🇬" },
    { city: "Tel Aviv", country: "Israel", emoji: "🇮🇱" },
    // Oceania
    { city: "Sydney", country: "Australia", emoji: "🇦🇺" },
    { city: "Melbourne", country: "Australia", emoji: "🇦🇺" },
    { city: "Auckland", country: "New Zealand", emoji: "🇳🇿" },
    { city: "Queenstown", country: "New Zealand", emoji: "🇳🇿" },
    { city: "Fiji", country: "Fiji", emoji: "🇫🇯" },
];

export default function CreateTrip() {
    const router = useRouter();
    const createTrip = useMutation(api.trips.create);
    const userPlan = useQuery(api.users.getPlan);
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [showCalendar, setShowCalendar] = useState(false);
    const [selectingDate, setSelectingDate] = useState<'start' | 'end'>('start');
    const [showLoadingScreen, setShowLoadingScreen] = useState(false);
    const [showAirportSuggestions, setShowAirportSuggestions] = useState(false);
    const [airportSuggestions, setAirportSuggestions] = useState<typeof AIRPORTS>([]);
    const [showDestinationSuggestions, setShowDestinationSuggestions] = useState(false);
    const [destinationSuggestions, setDestinationSuggestions] = useState<typeof DESTINATIONS>([]);

    const [formData, setFormData] = useState({
        destination: "",
        origin: "",
        startDate: new Date().getTime(),
        endDate: new Date().getTime() + 7 * 24 * 60 * 60 * 1000, // Default 1 week
        budget: 2000,
        travelers: 1,
        interests: [] as string[],
        skipFlights: false,
        skipHotel: false,
        preferredFlightTime: "any" as "any" | "morning" | "afternoon" | "evening" | "night",
    });

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
        });
    };

    // Search airports by query (city, country, code, or name)
    const searchAirports = (query: string) => {
        if (!query || query.length < 2) {
            setAirportSuggestions([]);
            setShowAirportSuggestions(false);
            return;
        }
        
        const lowerQuery = query.toLowerCase();
        const results = AIRPORTS.filter(airport => 
            airport.city.toLowerCase().includes(lowerQuery) ||
            airport.country.toLowerCase().includes(lowerQuery) ||
            airport.code.toLowerCase().includes(lowerQuery) ||
            airport.name.toLowerCase().includes(lowerQuery)
        ).slice(0, 10); // Limit to 10 results
        
        setAirportSuggestions(results);
        setShowAirportSuggestions(results.length > 0);
    };

    const selectAirport = (airport: typeof AIRPORTS[0]) => {
        setFormData({ ...formData, origin: `${airport.city} (${airport.code})` });
        setShowAirportSuggestions(false);
        setAirportSuggestions([]);
    };

    // Search destinations by query
    const searchDestinations = (query: string) => {
        if (query.length < 2) {
            setShowDestinationSuggestions(false);
            setDestinationSuggestions([]);
            return;
        }

        const lowerQuery = query.toLowerCase();
        const filtered = DESTINATIONS.filter(dest => 
            dest.city.toLowerCase().includes(lowerQuery) ||
            dest.country.toLowerCase().includes(lowerQuery)
        ).slice(0, 8);

        setDestinationSuggestions(filtered);
        setShowDestinationSuggestions(filtered.length > 0);
    };

    // Select a destination from suggestions
    const selectDestination = (destination: typeof DESTINATIONS[0]) => {
        setFormData({ ...formData, destination: `${destination.city}, ${destination.country}` });
        setShowDestinationSuggestions(false);
        setDestinationSuggestions([]);
    };

    const formatDateForCalendar = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toISOString().split('T')[0];
    };

    const getMarkedDates = () => {
        const startStr = formatDateForCalendar(formData.startDate);
        const endStr = formatDateForCalendar(formData.endDate);
        
        const marked: any = {};
        
        // Mark start date
        marked[startStr] = {
            startingDay: true,
            color: '#14B8A6',
            textColor: 'white',
        };
        
        // Mark end date
        marked[endStr] = {
            endingDay: true,
            color: '#14B8A6',
            textColor: 'white',
        };
        
        // Mark dates in between
        const start = new Date(formData.startDate);
        const end = new Date(formData.endDate);
        const current = new Date(start);
        current.setDate(current.getDate() + 1);
        
        while (current < end) {
            const dateStr = current.toISOString().split('T')[0];
            marked[dateStr] = {
                color: '#CCFBF1',
                textColor: '#0D9488',
            };
            current.setDate(current.getDate() + 1);
        }
        
        return marked;
    };

    const handleDayPress = (day: DateData) => {
        const selectedTimestamp = new Date(day.dateString).getTime();
        
        if (selectingDate === 'start') {
            // If selected start is after current end, adjust end
            if (selectedTimestamp >= formData.endDate) {
                setFormData({
                    ...formData,
                    startDate: selectedTimestamp,
                    endDate: selectedTimestamp + 7 * 24 * 60 * 60 * 1000,
                });
            } else {
                setFormData({ ...formData, startDate: selectedTimestamp });
            }
        } else {
            // If selected end is before current start, don't allow
            if (selectedTimestamp <= formData.startDate) {
                Alert.alert("Invalid Date", "End date must be after start date");
                return;
            }
            setFormData({ ...formData, endDate: selectedTimestamp });
        }
        setShowCalendar(false);
    };

    const handleNext = () => {
        if (step === 1) {
            // Validate destination
            if (!formData.destination) {
                if (Platform.OS !== 'web') {
                    Alert.alert("Error", "Please enter a destination");
                }
                return;
            }
         
            if (!formData.skipFlights && !formData.origin) {
                Alert.alert("Required", "Please enter where you are flying from");
                return;
            }
        }
        if (step < 4) {
            setStep(step + 1);
        } else {
            handleSubmit();
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1);
        } else {
            router.back();
        }
    };

    const handleSubmit = async () => {
        // Check if user has credits or subscription
        const isSubscriptionActive = userPlan?.isSubscriptionActive;
        const tripCredits = userPlan?.tripCredits ?? 0;
        const tripsGenerated = userPlan?.tripsGenerated ?? 0;
        const hasFreeTrial = tripsGenerated < 1;

        if (!isSubscriptionActive && tripCredits <= 0 && !hasFreeTrial) {
            // Redirect to subscription page with message
            if (Platform.OS !== "web") {
                Alert.alert(
                    "No Trip Credits",
                    "You need Trip Credits or a Premium subscription to generate trips. Would you like to purchase?",
                    [
                        { text: "Cancel", style: "cancel" },
                        { text: "View Plans", onPress: () => router.push("/subscription") }
                    ]
                );
            } else {
                router.push("/subscription");
            }
            return;
        }

        setShowLoadingScreen(true);
        try {
            const tripId = await createTrip({
                destination: formData.destination,
                origin: formData.skipFlights ? "N/A" : formData.origin,
                startDate: formData.startDate,
                endDate: formData.endDate,
                budget: formData.budget,
                travelers: formData.travelers,
                interests: formData.interests,
                skipFlights: formData.skipFlights,
                skipHotel: formData.skipHotel,
                preferredFlightTime: formData.skipFlights ? undefined : formData.preferredFlightTime,
            });
            // Wait a bit to show the animation
            setTimeout(() => {
                router.replace(`/trip/${tripId}`);
            }, 2000);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to create trip");
            setShowLoadingScreen(false);
        }
    };

    const toggleInterest = (interest: string) => {
        if (formData.interests.includes(interest)) {
            setFormData({ ...formData, interests: formData.interests.filter((i) => i !== interest) });
        } else {
            setFormData({ ...formData, interests: [...formData.interests, interest] });
        }
    };

    const tripDuration = Math.round((formData.endDate - formData.startDate) / (24 * 60 * 60 * 1000));

    if (showLoadingScreen) {
        return (
            <View style={styles.loadingContainer}>
                <Image source={logoImage} style={styles.loadingLogo} resizeMode="contain" />
                <ActivityIndicator size="large" color="#00BFA6" style={{ marginTop: 24 }} />
                <Text style={styles.loadingText}>Generating your dream trip...</Text>
                <Text style={styles.loadingSubtext}>
                    {formData.skipFlights 
                        ? "Finding the best hotels, activities, and restaurants for you."
                        : "Finding the best flights, hotels, and activities for you."
                    }
                </Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1A237E" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Step {step} of 4</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${(step / 4) * 100}%` }]} />
            </View>

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                {step === 1 && (
                    <View>
                        <Text style={styles.question}>Where is your adventure?</Text>
                        
                        {/* Single City Destination Input */}
                        <View style={{ zIndex: 200 }}>
                            <Text style={styles.label}>Destination</Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="location-outline" size={20} color="#00BFA6" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Search city or country..."
                                    placeholderTextColor="#90A4AE"
                                    value={formData.destination}
                                    onChangeText={(text) => {
                                        setFormData({ ...formData, destination: text });
                                        searchDestinations(text);
                                    }}
                                    onFocus={() => {
                                        if (formData.destination.length >= 2) {
                                            searchDestinations(formData.destination);
                                        }
                                    }}
                                    autoFocus
                                />
                                {formData.destination.length > 0 && (
                                    <TouchableOpacity 
                                        onPress={() => {
                                            setFormData({ ...formData, destination: "" });
                                            setShowDestinationSuggestions(false);
                                        }}
                                        style={styles.clearButton}
                                    >
                                        <Ionicons name="close-circle" size={20} color="#90A4AE" />
                                    </TouchableOpacity>
                                )}
                            </View>
                            
                            {/* Destination Suggestions Dropdown */}
                            {showDestinationSuggestions && destinationSuggestions.length > 0 && (
                                <View style={styles.suggestionsContainer}>
                                    <ScrollView 
                                        nestedScrollEnabled={true}
                                        keyboardShouldPersistTaps="handled"
                                        showsVerticalScrollIndicator={true}
                                    >
                                        {destinationSuggestions.map((dest, index) => (
                                            <TouchableOpacity
                                                key={`${dest.city}-${dest.country}-${index}`}
                                                style={[
                                                    styles.suggestionItem,
                                                    index === destinationSuggestions.length - 1 && styles.suggestionItemLast
                                                ]}
                                                onPress={() => selectDestination(dest)}
                                            >
                                                <View style={styles.suggestionIcon}>
                                                    <Text style={{ fontSize: 18 }}>{dest.emoji}</Text>
                                                </View>
                                                <View style={styles.suggestionTextContainer}>
                                                    <Text style={styles.suggestionCity}>
                                                        {dest.city}
                                                    </Text>
                                                    <Text style={styles.suggestionDetails}>
                                                        {dest.country}
                                                    </Text>
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                            
                            <Text style={styles.helperText}>Type to search popular destinations.</Text>
                        </View>
                        
                        {/* Skip Flights Toggle */}
                        <View style={styles.skipFlightsContainer}>
                            <View style={styles.skipFlightsTextContainer}>
                                <Ionicons name="airplane" size={20} color="#14B8A6" />
                                <Text style={styles.skipFlightsText}>I already have flights booked</Text>
                            </View>
                            <Switch
                                value={formData.skipFlights}
                                onValueChange={(value) => setFormData({ ...formData, skipFlights: value })}
                                trackColor={{ false: "#E0F2F1", true: "#5EEAD4" }}
                                thumbColor={formData.skipFlights ? "#14B8A6" : "#B2DFDB"}
                                ios_backgroundColor="#E0F2F1"
                            />
                        </View>
                        
                        {!formData.skipFlights && (
                            <>
                                <View style={{ zIndex: 100 }}>
                                    <Text style={[styles.label, { marginTop: 24 }]}>Flying from</Text>
                                    <View style={styles.inputContainer}>
                                        <Ionicons name="airplane-outline" size={20} color="#00BFA6" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Search city, country or airport..."
                                            placeholderTextColor="#90A4AE"
                                            value={formData.origin}
                                            onChangeText={(text) => {
                                                setFormData({ ...formData, origin: text });
                                                searchAirports(text);
                                            }}
                                            onFocus={() => {
                                                if (formData.origin.length >= 2) {
                                                    searchAirports(formData.origin);
                                                }
                                            }}
                                        />
                                        {formData.origin.length > 0 && (
                                            <TouchableOpacity 
                                                onPress={() => {
                                                    setFormData({ ...formData, origin: "" });
                                                    setShowAirportSuggestions(false);
                                                }}
                                                style={styles.clearButton}
                                            >
                                                <Ionicons name="close-circle" size={20} color="#90A4AE" />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                    
                                    {/* Airport Suggestions Dropdown */}
                                    {showAirportSuggestions && airportSuggestions.length > 0 && (
                                        <View style={styles.suggestionsContainer}>
                                            <ScrollView 
                                                nestedScrollEnabled={true}
                                                keyboardShouldPersistTaps="handled"
                                                showsVerticalScrollIndicator={true}
                                            >
                                                {airportSuggestions.map((airport, index) => (
                                                    <TouchableOpacity
                                                        key={`${airport.code}-${index}`}
                                                        style={[
                                                            styles.suggestionItem,
                                                            index === airportSuggestions.length - 1 && styles.suggestionItemLast
                                                        ]}
                                                        onPress={() => selectAirport(airport)}
                                                    >
                                                        <View style={styles.suggestionIcon}>
                                                            <Ionicons name="airplane" size={16} color="#14B8A6" />
                                                        </View>
                                                        <View style={styles.suggestionTextContainer}>
                                                            <Text style={styles.suggestionCity}>
                                                                {airport.city} ({airport.code})
                                                            </Text>
                                                            <Text style={styles.suggestionDetails}>
                                                                {airport.name} • {airport.country}
                                                            </Text>
                                                        </View>
                                                    </TouchableOpacity>
                                                ))}
                                            </ScrollView>
                                        </View>
                                    )}
                                    
                                    <Text style={styles.helperText}>Type to search airports by city, country, or code.</Text>
                                </View>
                                
                                {/* Flight Time Preference */}
                                <Text style={[styles.label, { marginTop: 24 }]}>Preferred flight time</Text>
                                <View style={styles.flightTimeContainer}>
                                    {[
                                        { value: "any", label: "Any Time", icon: "time-outline" },
                                        { value: "morning", label: "Morning", icon: "sunny-outline" },
                                        { value: "afternoon", label: "Afternoon", icon: "partly-sunny-outline" },
                                        { value: "evening", label: "Evening", icon: "moon-outline" },
                                        { value: "night", label: "Night", icon: "cloudy-night-outline" },
                                    ].map((option) => (
                                        <TouchableOpacity
                                            key={option.value}
                                            style={[
                                                styles.flightTimeOption,
                                                formData.preferredFlightTime === option.value && styles.flightTimeOptionSelected,
                                            ]}
                                            onPress={() => setFormData({ ...formData, preferredFlightTime: option.value as any })}
                                        >
                                            <Ionicons 
                                                name={option.icon as any} 
                                                size={20} 
                                                color={formData.preferredFlightTime === option.value ? "#FFFFFF" : "#14B8A6"} 
                                            />
                                            <Text style={[
                                                styles.flightTimeText,
                                                formData.preferredFlightTime === option.value && styles.flightTimeTextSelected,
                                            ]}>
                                                {option.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <Text style={styles.helperText}>We'll show you multiple flight options with the best prices.</Text>
                            </>
                        )}
                        
                        {formData.skipFlights && (
                            <View style={styles.skipFlightsInfo}>
                                <Ionicons name="information-circle-outline" size={18} color="#5EEAD4" />
                                <Text style={styles.skipFlightsInfoText}>
                                    We'll skip flight recommendations and focus on hotels, activities, and restaurants for your trip.
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                {step === 2 && (
                    <View>
                        <Text style={styles.question}>When are you traveling?</Text>
                        
                        {/* Date Selection Cards */}
                        <View style={styles.dateCardsContainer}>
                            <TouchableOpacity 
                                style={[styles.dateCard, selectingDate === 'start' && styles.dateCardActive]}
                                onPress={() => {
                                    setSelectingDate('start');
                                    setShowCalendar(true);
                                }}
                            >
                                <View style={styles.dateCardIcon}>
                                    <Ionicons name="airplane" size={20} color="#00BFA6" />
                                </View>
                                <Text style={styles.dateCardLabel}>DEPARTURE</Text>
                                <Text style={styles.dateCardValue}>{formatDate(formData.startDate)}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[styles.dateCard, selectingDate === 'end' && styles.dateCardActive]}
                                onPress={() => {
                                    setSelectingDate('end');
                                    setShowCalendar(true);
                                }}
                            >
                                <View style={styles.dateCardIcon}>
                                    <Ionicons name="airplane" size={20} color="#00BFA6" style={{ transform: [{ rotate: '180deg' }] }} />
                                </View>
                                <Text style={styles.dateCardLabel}>RETURN</Text>
                                <Text style={styles.dateCardValue}>{formatDate(formData.endDate)}</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Trip Duration Summary */}
                        <View style={styles.durationSummary}>
                            <Ionicons name="time-outline" size={20} color="#00BFA6" />
                            <Text style={styles.durationText}>
                                {tripDuration} {tripDuration === 1 ? 'day' : 'days'} trip
                            </Text>
                        </View>

                        {/* Calendar Modal */}
                        <Modal
                            visible={showCalendar}
                            animationType="slide"
                            transparent={true}
                            onRequestClose={() => setShowCalendar(false)}
                        >
                            <View style={styles.modalOverlay}>
                                <View style={styles.calendarModal}>
                                    <View style={styles.calendarHeader}>
                                        <Text style={styles.calendarTitle}>
                                            Select {selectingDate === 'start' ? 'Departure' : 'Return'} Date
                                        </Text>
                                        <TouchableOpacity onPress={() => setShowCalendar(false)}>
                                            <Ionicons name="close" size={24} color="#1A237E" />
                                        </TouchableOpacity>
                                    </View>
                                    
                                    <Calendar
                                        current={formatDateForCalendar(selectingDate === 'start' ? formData.startDate : formData.endDate)}
                                        minDate={selectingDate === 'start' ? formatDateForCalendar(Date.now()) : formatDateForCalendar(formData.startDate + 24 * 60 * 60 * 1000)}
                                        onDayPress={handleDayPress}
                                        markingType={'period'}
                                        markedDates={getMarkedDates()}
                                        theme={{
                                            backgroundColor: '#ffffff',
                                            calendarBackground: '#ffffff',
                                            textSectionTitleColor: '#5EEAD4',
                                            selectedDayBackgroundColor: '#14B8A6',
                                            selectedDayTextColor: '#ffffff',
                                            todayTextColor: '#14B8A6',
                                            dayTextColor: '#134E4A',
                                            textDisabledColor: '#99F6E4',
                                            dotColor: '#14B8A6',
                                            selectedDotColor: '#ffffff',
                                            arrowColor: '#14B8A6',
                                            monthTextColor: '#0D9488',
                                            textDayFontWeight: '500',
                                            textMonthFontWeight: '700',
                                            textDayHeaderFontWeight: '600',
                                            textDayFontSize: 16,
                                            textMonthFontSize: 18,
                                            textDayHeaderFontSize: 14,
                                        }}
                                        style={styles.calendar}
                                    />
                                    
                                    <View style={styles.calendarLegend}>
                                        <View style={styles.legendItem}>
                                            <View style={[styles.legendDot, { backgroundColor: '#14B8A6' }]} />
                                            <Text style={styles.legendText}>Selected dates</Text>
                                        </View>
                                        <View style={styles.legendItem}>
                                            <View style={[styles.legendDot, { backgroundColor: '#CCFBF1' }]} />
                                            <Text style={styles.legendText}>Trip duration</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </Modal>
                    </View>
                )}

                {step === 3 && (
                    <View>
                        <Text style={styles.question}>Travel Style</Text>
                        
                        <Text style={styles.label}>Budget (€)</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="wallet-outline" size={20} color="#00BFA6" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. 2000"
                                placeholderTextColor="#90A4AE"
                                value={formData.budget.toString()}
                                onChangeText={(text) => {
                                    const numValue = parseInt(text) || 0;
                                    setFormData({ ...formData, budget: numValue });
                                }}
                                keyboardType="numeric"
                            />
                        </View>
                        <Text style={styles.helperText}>Enter your total budget in euros.</Text>

                        <Text style={[styles.label, { marginTop: 24 }]}>Travelers</Text>
                        <View style={styles.row}>
                            <TouchableOpacity 
                                style={styles.counterBtn}
                                onPress={() => setFormData({ ...formData, travelers: Math.max(1, formData.travelers - 1) })}
                            >
                                <Ionicons name="remove" size={24} color="#00BFA6" />
                            </TouchableOpacity>
                            <Text style={styles.counterText}>{formData.travelers}</Text>
                            <TouchableOpacity 
                                style={styles.counterBtn}
                                onPress={() => setFormData({ ...formData, travelers: formData.travelers + 1 })}
                            >
                                <Ionicons name="add" size={24} color="#00BFA6" />
                            </TouchableOpacity>
                        </View>

                        {/* Skip Hotel Toggle */}
                        <View style={[styles.skipFlightsContainer, { marginTop: 24 }]}>
                            <View style={styles.skipFlightsTextContainer}>
                                <Ionicons name="bed" size={20} color="#14B8A6" />
                                <Text style={styles.skipFlightsText}>I already have accommodation</Text>
                            </View>
                            <Switch
                                value={formData.skipHotel}
                                onValueChange={(value) => setFormData({ ...formData, skipHotel: value })}
                                trackColor={{ false: "#E0F2F1", true: "#5EEAD4" }}
                                thumbColor={formData.skipHotel ? "#14B8A6" : "#B2DFDB"}
                                ios_backgroundColor="#E0F2F1"
                            />
                        </View>
                        
                        {formData.skipHotel && (
                            <View style={styles.skipFlightsInfo}>
                                <Ionicons name="information-circle-outline" size={18} color="#5EEAD4" />
                                <Text style={styles.skipFlightsInfoText}>
                                    We'll skip hotel recommendations and focus on activities and restaurants for your trip.
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                {step === 4 && (
                    <View>
                        <Text style={styles.question}>What are you interested in?</Text>
                        <View style={styles.tagsContainer}>
                            {["Food", "History", "Art", "Nature", "Adventure", "Relaxation", "Nightlife", "Shopping", "Culture", "Sports"].map((interest) => (
                                <TouchableOpacity
                                    key={interest}
                                    style={[styles.tag, formData.interests.includes(interest) && styles.tagSelected]}
                                    onPress={() => toggleInterest(interest)}
                                >
                                    <Text style={[styles.tagText, formData.interests.includes(interest) && styles.tagTextSelected]}>
                                        {interest}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity 
                    style={[styles.nextButton, loading && styles.disabledButton]} 
                    onPress={handleNext}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <>
                            <Text style={styles.nextButtonText}>{step === 4 ? "Generate Trip" : "Next"}</Text>
                            <Ionicons name={step === 4 ? "sparkles" : "arrow-forward"} size={20} color="white" />
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F0FFFE",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: "white",
        borderBottomWidth: 0,
        shadowColor: "#14B8A6",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: "#CCFBF1",
        justifyContent: "center",
        alignItems: "center",
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#0D9488",
        letterSpacing: 0.5,
    },
    progressBar: {
        height: 5,
        backgroundColor: "#CCFBF1",
        width: "100%",
    },
    progressFill: {
        height: "100%",
        backgroundColor: "#14B8A6",
    },
    content: {
        padding: 24,
    },
    question: {
        fontSize: 28,
        fontWeight: "800",
        color: "#0D9488",
        marginBottom: 32,
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "white",
        borderWidth: 2,
        borderColor: "#99F6E4",
        borderRadius: 16,
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        paddingVertical: 18,
        color: "#134E4A",
    },
    helperText: {
        fontSize: 14,
        color: "#5EEAD4",
        marginTop: 4,
        fontWeight: "500",
    },
    label: {
        fontSize: 12,
        fontWeight: "700",
        marginBottom: 10,
        color: "#5EEAD4",
        textTransform: "uppercase",
        letterSpacing: 1,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 24,
        marginBottom: 16,
    },
    counterBtn: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: "white",
        borderWidth: 2,
        borderColor: "#99F6E4",
        justifyContent: "center",
        alignItems: "center",
    },
    counterText: {
        fontSize: 36,
        fontWeight: "800",
        color: "#0D9488",
    },
    tagsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
    },
    tag: {
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: "white",
        borderWidth: 2,
        borderColor: "#99F6E4",
    },
    tagSelected: {
        backgroundColor: "#14B8A6",
        borderColor: "#14B8A6",
    },
    tagText: {
        fontSize: 16,
        color: "#5EEAD4",
        fontWeight: "600",
    },
    tagTextSelected: {
        color: "white",
        fontWeight: "700",
    },
    footer: {
        padding: 24,
        backgroundColor: "white",
        borderTopWidth: 0,
        shadowColor: "#14B8A6",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
    },
    nextButton: {
        backgroundColor: "#14B8A6",
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 10,
        shadowColor: "#14B8A6",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 6,
    },
    disabledButton: {
        opacity: 0.7,
    },
    nextButtonText: {
        color: "white",
        fontSize: 17,
        fontWeight: "700",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F0FFFE",
        padding: 24,
    },
    loadingLogo: {
        width: 140,
        height: 140,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 26,
        fontWeight: "800",
        color: "#0D9488",
        textAlign: "center",
    },
    loadingSubtext: {
        marginTop: 8,
        fontSize: 16,
        color: "#5EEAD4",
        textAlign: "center",
        lineHeight: 24,
        fontWeight: "500",
    },
    // Date Picker Styles
    dateCardsContainer: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 24,
    },
    dateCard: {
        flex: 1,
        backgroundColor: "white",
        borderRadius: 18,
        padding: 18,
        borderWidth: 2,
        borderColor: "#99F6E4",
        shadowColor: "#0D9488",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 3,
    },
    dateCardActive: {
        borderColor: "#14B8A6",
        borderWidth: 3,
    },
    dateCardIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: "#CCFBF1",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 12,
    },
    dateCardLabel: {
        fontSize: 11,
        fontWeight: "700",
        color: "#5EEAD4",
        letterSpacing: 1,
        marginBottom: 4,
    },
    dateCardValue: {
        fontSize: 14,
        fontWeight: "700",
        color: "#0D9488",
    },
    durationSummary: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#CCFBF1",
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 14,
        gap: 10,
    },
    durationText: {
        fontSize: 17,
        fontWeight: "700",
        color: "#0D9488",
    },
    // Calendar Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(13, 148, 136, 0.3)",
        justifyContent: "flex-end",
    },
    calendarModal: {
        backgroundColor: "white",
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingBottom: 40,
    },
    calendarHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#CCFBF1",
    },
    calendarTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#0D9488",
    },
    calendar: {
        marginHorizontal: 10,
    },
    calendarLegend: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 24,
        paddingTop: 16,
        paddingHorizontal: 20,
    },
    legendItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    legendDot: {
        width: 14,
        height: 14,
        borderRadius: 7,
    },
    legendText: {
        fontSize: 13,
        color: "#5EEAD4",
        fontWeight: "500",
    },
    // Skip Flights Toggle Styles
    skipFlightsContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "white",
        borderWidth: 2,
        borderColor: "#99F6E4",
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginTop: 20,
    },
    skipFlightsTextContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    skipFlightsText: {
        fontSize: 15,
        fontWeight: "600",
        color: "#0D9488",
    },
    skipFlightsInfo: {
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: "#CCFBF1",
        borderRadius: 12,
        padding: 14,
        marginTop: 16,
        gap: 10,
    },
    skipFlightsInfoText: {
        flex: 1,
        fontSize: 13,
        color: "#0D9488",
        lineHeight: 18,
    },
    // Flight Time Preference Styles
    flightTimeContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    },
    flightTimeOption: {
        flexDirection: "row",
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: "white",
        borderWidth: 2,
        borderColor: "#99F6E4",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
    },
    flightTimeOptionSelected: {
        backgroundColor: "#14B8A6",
        borderColor: "#14B8A6",
    },
    flightTimeText: {
        fontSize: 13,
        color: "#0D9488",
        fontWeight: "600",
    },
    flightTimeTextSelected: {
        color: "white",
        fontWeight: "700",
    },
    // Airport Suggestions Styles
    clearButton: {
        padding: 4,
    },
    suggestionsContainer: {
        backgroundColor: "white",
        borderRadius: 16,
        borderWidth: 2,
        borderColor: "#99F6E4",
        marginTop: 8,
        maxHeight: 280,
        overflow: "hidden",
        shadowColor: "#0D9488",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 5,
        zIndex: 1000,
        position: "relative",
    },
    suggestionItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#E0F2F1",
    },
    suggestionItemLast: {
        borderBottomWidth: 0,
    },
    suggestionIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: "#CCFBF1",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    suggestionTextContainer: {
        flex: 1,
    },
    suggestionCity: {
        fontSize: 15,
        fontWeight: "700",
        color: "#0D9488",
        marginBottom: 2,
    },
    suggestionDetails: {
        fontSize: 13,
        color: "#5EEAD4",
        fontWeight: "500",
    },
    // Multi-City Styles
    multiCityToggleContainer: {
        flexDirection: "row",
        backgroundColor: "#E0F2F1",
        borderRadius: 16,
        padding: 4,
        marginBottom: 20,
    },
    tripTypeButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        borderRadius: 12,
        gap: 6,
    },
    tripTypeButtonActive: {
        backgroundColor: "#14B8A6",
    },
    tripTypeText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#14B8A6",
    },
    tripTypeTextActive: {
        color: "#fff",
    },
    multiCityList: {
        marginTop: 16,
        marginBottom: 16,
    },
    multiCityItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "white",
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        borderWidth: 2,
        borderColor: "#99F6E4",
    },
    multiCityItemLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    multiCityNumber: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "#14B8A6",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    multiCityNumberText: {
        color: "white",
        fontWeight: "700",
        fontSize: 14,
    },
    multiCityInfo: {
        flex: 1,
    },
    multiCityName: {
        fontSize: 16,
        fontWeight: "700",
        color: "#0D9488",
    },
    multiCityCountry: {
        fontSize: 13,
        color: "#5EEAD4",
        fontWeight: "500",
    },
    multiCityItemRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    daysControl: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#E0F2F1",
        borderRadius: 10,
        paddingHorizontal: 4,
        paddingVertical: 4,
    },
    daysButton: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: "white",
        justifyContent: "center",
        alignItems: "center",
    },
    daysText: {
        fontSize: 14,
        fontWeight: "700",
        color: "#0D9488",
        marginHorizontal: 8,
    },
    orderControls: {
        flexDirection: "column",
        gap: 2,
    },
    orderButton: {
        width: 24,
        height: 20,
        justifyContent: "center",
        alignItems: "center",
    },
    orderButtonDisabled: {
        opacity: 0.4,
    },
    removeButton: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: "#FEE2E2",
        justifyContent: "center",
        alignItems: "center",
    },
    routePreview: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#CCFBF1",
        borderRadius: 12,
        padding: 12,
        marginTop: 8,
        gap: 8,
    },
    routePreviewText: {
        flex: 1,
        fontSize: 13,
        fontWeight: "600",
        color: "#0D9488",
    },
    daysSummary: {
        marginTop: 12,
        padding: 12,
        backgroundColor: "#F0FFFE",
        borderRadius: 10,
    },
    daysSummaryText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#0D9488",
        textAlign: "center",
    },
    daysWarning: {
        fontSize: 13,
        color: "#EF4444",
        textAlign: "center",
        marginTop: 6,
        fontWeight: "500",
    },
    addCityContainer: {
        marginTop: 8,
    },
});
