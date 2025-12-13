import { useState } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform, Modal, Image, Switch, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar, DateData } from 'react-native-calendars';

import logoImage from "@/assets/images/image.png";

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

const TRAVEL_TYPES = [
    { id: "solo", label: "Solo", icon: "person" },
    { id: "couple", label: "Couple", icon: "heart" },
    { id: "friends", label: "Friends", icon: "people" },
    { id: "family", label: "Family", icon: "people" },
];

const BUDGET_RANGES = [
    { id: "budget", label: "Budget", range: "$1k - $3k" },
    { id: "moderate", label: "Moderate", range: "$3k - $7k" },
    { id: "luxury", label: "Luxury", range: "$7k+" },
];

const INTERESTS = ["Adventure", "Culinary", "Culture"];

export default function CreateTrip() {
    const router = useRouter();
    const createTrip = useMutation(api.trips.create);
    const userPlan = useQuery(api.users.getPlan);
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
        origin: "San Francisco, CA",
        startDate: new Date().getTime(),
        endDate: new Date().getTime() + 7 * 24 * 60 * 60 * 1000,
        budget: 2000,
        travelers: 1,
        travelType: "solo" as string,
        budgetRange: "moderate" as string,
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
        ).slice(0, 10);
        
        setAirportSuggestions(results);
        setShowAirportSuggestions(results.length > 0);
    };

    const selectAirport = (airport: typeof AIRPORTS[0]) => {
        setFormData({ ...formData, origin: `${airport.city}, ${airport.code}` });
        setShowAirportSuggestions(false);
        setAirportSuggestions([]);
    };

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
        
        marked[startStr] = {
            startingDay: true,
            color: '#FFE500',
            textColor: 'white',
        };
        
        marked[endStr] = {
            endingDay: true,
            color: '#FFE500',
            textColor: 'white',
        };
        
        const start = new Date(formData.startDate);
        const end = new Date(formData.endDate);
        const current = new Date(start);
        current.setDate(current.getDate() + 1);
        
        while (current < end) {
            const dateStr = current.toISOString().split('T')[0];
            marked[dateStr] = {
                color: '#FFF8E1',
                textColor: '#9B9B9B',
            };
            current.setDate(current.getDate() + 1);
        }
        
        return marked;
    };

    const handleDayPress = (day: DateData) => {
        const selectedTimestamp = new Date(day.dateString).getTime();
        
        if (selectingDate === 'start') {
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
            if (selectedTimestamp <= formData.startDate) {
                Alert.alert("Invalid Date", "End date must be after start date");
                return;
            }
            setFormData({ ...formData, endDate: selectedTimestamp });
        }
        setShowCalendar(false);
    };

    const handleSubmit = async () => {
        if (!formData.destination) {
            Alert.alert("Required", "Please enter a destination");
            return;
        }
        if (!formData.skipFlights && !formData.origin) {
            Alert.alert("Required", "Please enter where you are flying from");
            return;
        }

        const isSubscriptionActive = userPlan?.isSubscriptionActive;
        const tripCredits = userPlan?.tripCredits ?? 0;
        const tripsGenerated = userPlan?.tripsGenerated ?? 0;
        const hasFreeTrial = tripsGenerated < 1;

        if (!isSubscriptionActive && tripCredits <= 0 && !hasFreeTrial) {
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

    if (showLoadingScreen) {
        return (
            <View style={styles.loadingContainer}>
                <Image source={logoImage} style={styles.loadingLogo} resizeMode="contain" />
                <ActivityIndicator size="large" color="#FFE500" style={{ marginTop: 24 }} />
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
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                {/* Header */}
                <View style={styles.headerSection}>
                    <View style={styles.headerTop}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                        </TouchableOpacity>
                        <View style={styles.logoContainer}>
                            <Image source={logoImage} style={styles.headerLogo} resizeMode="contain" />
                            <Text style={styles.headerLogoText}>PLANERA</Text>
                        </View>
                        <TouchableOpacity style={styles.settingsButton}>
                            <Ionicons name="settings-outline" size={24} color="#9B9B9B" />
                        </TouchableOpacity>
                    </View>
                    
                    <View style={styles.titleSection}>
                        <Text style={styles.titleMain}>Design your</Text>
                        <Text style={styles.titleHighlight}>perfect escape</Text>
                        <Text style={styles.subtitle}>Let AI craft your itinerary.</Text>
                    </View>
                </View>

                {/* From/To Section */}
                <View style={styles.card}>
                    <View style={styles.locationSection}>
                        <View style={styles.locationItem}>
                            <Text style={styles.locationLabel}>FROM</Text>
                            <View style={styles.locationContent}>
                                <Ionicons name="location" size={24} color="#1A1A1A" />
                                <Text style={styles.locationText}>{formData.origin}</Text>
                            </View>
                        </View>

                        <TouchableOpacity style={styles.swapButton}>
                            <Ionicons name="swap-vertical" size={20} color="#9B9B9B" />
                        </TouchableOpacity>

                        <View style={styles.locationItem}>
                            <Text style={styles.locationLabel}>TO</Text>
                            <View style={styles.locationContent}>
                                <Ionicons name="location" size={24} color="#FF4444" />
                                <TextInput
                                    style={styles.destinationInput}
                                    placeholder="Where to?"
                                    placeholderTextColor="#9B9B9B"
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
                                />
                            </View>
                            
                            {showDestinationSuggestions && destinationSuggestions.length > 0 && (
                                <View style={styles.suggestionsContainer}>
                                    <ScrollView nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
                                        {destinationSuggestions.map((dest, index) => (
                                            <TouchableOpacity
                                                key={`${dest.city}-${dest.country}-${index}`}
                                                style={styles.suggestionItem}
                                                onPress={() => selectDestination(dest)}
                                            >
                                                <Text style={{ fontSize: 18, marginRight: 12 }}>{dest.emoji}</Text>
                                                <View>
                                                    <Text style={styles.suggestionCity}>{dest.city}</Text>
                                                    <Text style={styles.suggestionDetails}>{dest.country}</Text>
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                        </View>
                    </View>
                </View>

                {/* Dates Section */}
                <View style={styles.card}>
                    <Text style={styles.sectionLabel}>DATES</Text>
                    <TouchableOpacity 
                        style={styles.dateButton}
                        onPress={() => {
                            setSelectingDate('start');
                            setShowCalendar(true);
                        }}
                    >
                        <Ionicons name="calendar-outline" size={24} color="#1A1A1A" />
                        <Text style={styles.dateButtonText}>Select Dates</Text>
                    </TouchableOpacity>
                    <Text style={styles.dateRange}>
                        {formatDate(formData.startDate)} - {formatDate(formData.endDate)}
                    </Text>
                </View>

                {/* Who's Going Section */}
                <View style={styles.card}>
                    <Text style={styles.sectionLabel}>WHO'S GOING?</Text>
                    <View style={styles.travelTypeContainer}>
                        {TRAVEL_TYPES.map((type) => (
                            <TouchableOpacity
                                key={type.id}
                                style={[
                                    styles.travelTypeButton,
                                    formData.travelType === type.id && styles.travelTypeButtonActive,
                                ]}
                                onPress={() => setFormData({ ...formData, travelType: type.id })}
                            >
                                <Ionicons 
                                    name={type.icon as any} 
                                    size={24} 
                                    color={formData.travelType === type.id ? "white" : "#1A1A1A"}
                                />
                                <Text style={[
                                    styles.travelTypeText,
                                    formData.travelType === type.id && styles.travelTypeTextActive,
                                ]}>
                                    {type.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Budget Range Section */}
                <View style={styles.card}>
                    <View style={styles.budgetHeader}>
                        <Text style={styles.sectionLabel}>Budget Range</Text>
                        <View style={styles.budgetBadge}>
                            <Text style={styles.budgetBadgeText}>$1k - $3k</Text>
                        </View>
                    </View>
                    <View style={styles.budgetButtonsContainer}>
                        {BUDGET_RANGES.map((range) => (
                            <TouchableOpacity
                                key={range.id}
                                style={[
                                    styles.budgetButton,
                                    formData.budgetRange === range.id && styles.budgetButtonActive,
                                ]}
                                onPress={() => setFormData({ ...formData, budgetRange: range.id })}
                            >
                                <Text style={[
                                    styles.budgetButtonText,
                                    formData.budgetRange === range.id && styles.budgetButtonTextActive,
                                ]}>
                                    {range.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Travel Style Section */}
                <View style={styles.card}>
                    <Text style={styles.sectionLabel}>Travel Style</Text>
                    <View style={styles.interestsContainer}>
                        {INTERESTS.map((interest) => (
                            <TouchableOpacity
                                key={interest}
                                style={[
                                    styles.interestTag,
                                    formData.interests.includes(interest) && styles.interestTagActive,
                                ]}
                                onPress={() => toggleInterest(interest)}
                            >
                                <Ionicons 
                                    name={interest === "Adventure" ? "trail-sign" : interest === "Culinary" ? "restaurant" : "library"} 
                                    size={20} 
                                    color={formData.interests.includes(interest) ? "white" : "#FFE500"}
                                />
                                <Text style={[
                                    styles.interestTagText,
                                    formData.interests.includes(interest) && styles.interestTagTextActive,
                                ]}>
                                    {interest}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Generate Button */}
                <TouchableOpacity 
                    style={[styles.generateButton, loading && styles.disabledButton]}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <>
                            <Text style={styles.generateButtonText}>Generate with Planera AI</Text>
                            <View style={styles.sparkleIcon}>
                                <Ionicons name="sparkles" size={20} color="#1A1A1A" />
                            </View>
                        </>
                    )}
                </TouchableOpacity>

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
                                    <Ionicons name="close" size={24} color="#1A1A1A" />
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
                                    textSectionTitleColor: '#FFE500',
                                    selectedDayBackgroundColor: '#FFE500',
                                    selectedDayTextColor: '#1A1A1A',
                                    todayTextColor: '#FFE500',
                                    dayTextColor: '#1A1A1A',
                                    textDisabledColor: '#E8E6E1',
                                    dotColor: '#FFE500',
                                    selectedDotColor: '#1A1A1A',
                                    arrowColor: '#FFE500',
                                    monthTextColor: '#1A1A1A',
                                    textDayFontWeight: '500',
                                    textMonthFontWeight: '700',
                                    textDayHeaderFontWeight: '600',
                                    textDayFontSize: 16,
                                    textMonthFontSize: 18,
                                    textDayHeaderFontSize: 14,
                                }}
                                style={styles.calendar}
                            />
                        </View>
                    </View>
                </Modal>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FAF9F6",
    },
    content: {
        paddingBottom: 40,
    },
    headerSection: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 24,
    },
    headerTop: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 24,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: "#FFF8E1",
        justifyContent: "center",
        alignItems: "center",
    },
    logoContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    headerLogo: {
        width: 28,
        height: 28,
    },
    headerLogoText: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1A1A1A",
        letterSpacing: 1,
    },
    settingsButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: "#FFF8E1",
        justifyContent: "center",
        alignItems: "center",
    },
    titleSection: {
        marginBottom: 8,
    },
    titleMain: {
        fontSize: 32,
        fontWeight: "400",
        color: "#1A1A1A",
        lineHeight: 40,
    },
    titleHighlight: {
        fontSize: 40,
        fontWeight: "800",
        color: "#1A1A1A",
        lineHeight: 48,
        marginBottom: 8,
        borderBottomWidth: 4,
        borderBottomColor: "#FFE500",
        paddingBottom: 4,
        alignSelf: "flex-start",
    },
    subtitle: {
        fontSize: 16,
        color: "#9B9B9B",
        fontWeight: "500",
    },
    card: {
        backgroundColor: "white",
        borderRadius: 20,
        padding: 20,
        marginHorizontal: 20,
        marginBottom: 16,
        shadowColor: "#1A1A1A",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: "700",
        color: "#9B9B9B",
        letterSpacing: 1,
        marginBottom: 12,
        textTransform: "uppercase",
    },
    locationSection: {
        gap: 12,
    },
    locationItem: {
        gap: 8,
    },
    locationLabel: {
        fontSize: 11,
        fontWeight: "700",
        color: "#9B9B9B",
        letterSpacing: 1,
        textTransform: "uppercase",
    },
    locationContent: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    locationText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1A1A1A",
    },
    destinationInput: {
        flex: 1,
        fontSize: 16,
        fontWeight: "600",
        color: "#1A1A1A",
        padding: 0,
    },
    swapButton: {
        alignSelf: "center",
        padding: 8,
    },
    suggestionsContainer: {
        backgroundColor: "#FFF8E1",
        borderRadius: 12,
        marginTop: 8,
        maxHeight: 200,
        overflow: "hidden",
    },
    suggestionItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F5F5F3",
    },
    suggestionCity: {
        fontSize: 15,
        fontWeight: "600",
        color: "#1A1A1A",
    },
    suggestionDetails: {
        fontSize: 13,
        color: "#9B9B9B",
        marginTop: 2,
    },
    dateButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 16,
        paddingHorizontal: 16,
        backgroundColor: "#FFF8E1",
        borderRadius: 14,
        marginBottom: 12,
    },
    dateButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1A1A1A",
    },
    dateRange: {
        fontSize: 14,
        color: "#9B9B9B",
        fontWeight: "500",
    },
    travelTypeContainer: {
        flexDirection: "row",
        gap: 12,
    },
    travelTypeButton: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 16,
        borderRadius: 16,
        backgroundColor: "#FFF8E1",
        borderWidth: 2,
        borderColor: "#E8E6E1",
    },
    travelTypeButtonActive: {
        backgroundColor: "#1A1A1A",
        borderColor: "#1A1A1A",
    },
    travelTypeText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1A1A1A",
        marginTop: 8,
    },
    travelTypeTextActive: {
        color: "white",
    },
    budgetHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    budgetBadge: {
        backgroundColor: "#FFF8E1",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    budgetBadgeText: {
        fontSize: 13,
        fontWeight: "700",
        color: "#1A1A1A",
    },
    budgetButtonsContainer: {
        flexDirection: "row",
        gap: 12,
    },
    budgetButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 14,
        backgroundColor: "white",
        borderWidth: 2,
        borderColor: "#E8E6E1",
        alignItems: "center",
    },
    budgetButtonActive: {
        backgroundColor: "#1A1A1A",
        borderColor: "#1A1A1A",
    },
    budgetButtonText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1A1A1A",
    },
    budgetButtonTextActive: {
        color: "white",
    },
    interestsContainer: {
        flexDirection: "row",
        gap: 12,
        flexWrap: "wrap",
    },
    interestTag: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 14,
        backgroundColor: "#FFF8E1",
        borderWidth: 2,
        borderColor: "#FFE500",
    },
    interestTagActive: {
        backgroundColor: "#FFE500",
        borderColor: "#FFE500",
    },
    interestTagText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1A1A1A",
    },
    interestTagTextActive: {
        color: "#1A1A1A",
    },
    generateButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        marginHorizontal: 20,
        marginTop: 24,
        paddingVertical: 18,
        backgroundColor: "#1A1A1A",
        borderRadius: 18,
        shadowColor: "#FFE500",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
    },
    disabledButton: {
        opacity: 0.7,
    },
    generateButtonText: {
        fontSize: 17,
        fontWeight: "700",
        color: "white",
    },
    sparkleIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: "#FFE500",
        justifyContent: "center",
        alignItems: "center",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#FAF9F6",
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
        color: "#1A1A1A",
        textAlign: "center",
    },
    loadingSubtext: {
        marginTop: 8,
        fontSize: 16,
        color: "#9B9B9B",
        textAlign: "center",
        lineHeight: 24,
        fontWeight: "500",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(26, 26, 26, 0.2)",
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
        borderBottomColor: "#E8E6E1",
    },
    calendarTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1A1A1A",
    },
    calendar: {
        marginHorizontal: 10,
    },
});
