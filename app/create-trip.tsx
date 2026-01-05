import { useState } from "react";
import React from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform, Modal, Image, Switch, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar, DateData } from 'react-native-calendars';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';

import logoImage from "@/assets/images/appicon-1024x1024-01-1vb1vx.png";

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

const INTERESTS = [
    "Adventure", 
    "Culinary", 
    "Culture", 
    "Relaxation", 
    "Nightlife", 
    "Nature", 
    "History", 
    "Shopping", 
    "Luxury", 
    "Family"
];

export default function CreateTripScreen() {
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
    const [showOriginInput, setShowOriginInput] = useState(false);

    const [formData, setFormData] = useState({
        destination: "",
        origin: "San Francisco, CA",
        startDate: new Date().getTime(),
        endDate: new Date().getTime() + 7 * 24 * 60 * 60 * 1000,
        budget: 2000,
        travelers: 1,
        interests: [] as string[],
        skipFlights: false,
        skipHotel: false,
        preferredFlightTime: "any" as "any" | "morning" | "afternoon" | "evening" | "night",
    });

    // Detect device location on mount
    React.useEffect(() => {
        const detectLocation = async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    const location = await Location.getCurrentPositionAsync({});
                    const { latitude, longitude } = location.coords;
                    
                    // Reverse geocode to get city name
                    const reverseGeocode = await Location.reverseGeocodeAsync({
                        latitude,
                        longitude,
                    });
                    
                    if (reverseGeocode.length > 0) {
                        const { city, region } = reverseGeocode[0];
                        const locationName = city && region ? `${city}, ${region}` : city || "Current Location";
                        setFormData(prev => ({ ...prev, origin: locationName }));
                    }
                }
            } catch (error) {
                console.log("Location detection skipped or failed");
            }
        };
        
        detectLocation();
    }, []);

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
        setShowOriginInput(false);
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
            Alert.alert("Error", "Please enter a destination");
            return;
        }

        if (!formData.skipFlights && !formData.origin) {
            Alert.alert("Error", "Please enter an origin city or enable 'Skip Flights'");
            return;
        }

        if (!formData.budget || isNaN(Number(formData.budget)) || Number(formData.budget) <= 0) {
            Alert.alert("Error", "Please enter a valid budget amount");
            return;
        }

        setLoading(true);
        setShowLoadingScreen(true);

        try {
            const tripId = await createTrip({
                destination: formData.destination,
                origin: formData.origin,
                startDate: Number(formData.startDate),
                endDate: Number(formData.endDate),
                budget: Number(formData.budget),
                travelers: Number(formData.travelers),
                interests: formData.interests,
                skipFlights: formData.skipFlights,
                skipHotel: formData.skipHotel,
                preferredFlightTime: formData.preferredFlightTime,
            });
            
            router.push(`/trip/${tripId}`);
            // Reset states after navigation
            setTimeout(() => {
                setLoading(false);
                setShowLoadingScreen(false);
            }, 500);
        } catch (error: any) {
            console.error("Error creating trip:", error);
            
            // Extract error message
            const errorMessage = error.message || "Failed to create trip. Please try again.";
            // Clean up Convex error prefix if present
            const cleanMessage = errorMessage.replace("Uncaught Error: ", "").replace("Error: ", "");
            
            // Check if it's a credits/subscription error
            if (cleanMessage.includes("No trip credits available") || cleanMessage.includes("Please purchase a trip pack or subscribe")) {
                Alert.alert(
                    "Upgrade Required",
                    "You need to either purchase a trip pack or subscribe to a plan to create more trips.",
                    [
                        { text: "Cancel", onPress: () => {} },
                        { 
                            text: "View Plans", 
                            onPress: () => {
                                setLoading(false);
                                setShowLoadingScreen(false);
                                router.push("/subscription");
                            }
                        }
                    ]
                );
            } else {
                Alert.alert("Error", cleanMessage);
            }
            setLoading(false);
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
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FFE500" style={{ marginBottom: 20 }} />
                <Text style={styles.loadingTitle}>Generating your dream trip...</Text>
                <Text style={styles.loadingSubtitle}>This usually takes a few seconds.</Text>
            </SafeAreaView>
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
                                <TextInput
                                    style={styles.locationText}
                                    placeholder="Where from?"
                                    placeholderTextColor="#9B9B9B"
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
                            </View>
                            
                            {showAirportSuggestions && airportSuggestions.length > 0 && (
                                <View style={styles.suggestionsContainer}>
                                    <ScrollView nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
                                        {airportSuggestions.map((airport, index) => (
                                            <TouchableOpacity
                                                key={`${airport.city}-${airport.country}-${index}`}
                                                style={styles.suggestionItem}
                                                onPress={() => selectAirport(airport)}
                                            >
                                                <Ionicons name="location" size={20} color="#FFE500" style={{ marginRight: 12 }} />
                                                <View>
                                                    <Text style={styles.suggestionCity}>{airport.city}</Text>
                                                    <Text style={styles.suggestionDetails}>{airport.country}</Text>
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
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
                    
                    <TouchableOpacity 
                        style={styles.skipFlightsContainer}
                        onPress={() => setFormData(prev => ({ ...prev, skipFlights: !prev.skipFlights }))}
                    >
                        <View style={[styles.checkbox, formData.skipFlights && styles.checkboxChecked]}>
                            {formData.skipFlights && <Ionicons name="checkmark" size={14} color="#1A1A1A" />}
                        </View>
                        <Text style={styles.skipFlightsText}>I already have flights (Skip flight search)</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.multiCityButton} disabled={true}>
                        <View style={styles.multiCityContent}>
                            <Ionicons name="git-merge-outline" size={20} color="#1A1A1A" />
                            <Text style={styles.multiCityText}>Multi-City Trip</Text>
                        </View>
                        <View style={styles.comingSoonBadge}>
                            <Text style={styles.comingSoonText}>COMING SOON</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Dates Section */}
                <View style={styles.card}>
                    <Text style={styles.sectionLabel}>DATES</Text>
                    <View style={styles.datesContainer}>
                        <TouchableOpacity 
                            style={styles.dateInputButton}
                            onPress={() => {
                                setSelectingDate('start');
                                setShowCalendar(true);
                            }}
                        >
                            <Text style={styles.dateLabel}>START DATE</Text>
                            <View style={styles.dateValueContainer}>
                                <Ionicons name="calendar-outline" size={20} color="#1A1A1A" />
                                <Text style={styles.dateValueText}>{formatDate(formData.startDate)}</Text>
                            </View>
                        </TouchableOpacity>
                        
                        <View style={styles.dateSeparator} />

                        <TouchableOpacity 
                            style={styles.dateInputButton}
                            onPress={() => {
                                setSelectingDate('end');
                                setShowCalendar(true);
                            }}
                        >
                            <Text style={styles.dateLabel}>END DATE</Text>
                            <View style={styles.dateValueContainer}>
                                <Ionicons name="calendar-outline" size={20} color="#1A1A1A" />
                                <Text style={styles.dateValueText}>{formatDate(formData.endDate)}</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Who's Going Section */}
                <View style={styles.card}>
                    <Text style={styles.sectionLabel}>WHO'S GOING?</Text>
                    <View style={styles.numberInputContainer}>
                        <Text style={styles.inputLabel}>Travelers</Text>
                        <View style={styles.counterContainer}>
                            <TouchableOpacity 
                                style={styles.counterButton}
                                onPress={() => setFormData(prev => ({ ...prev, travelers: Math.max(1, prev.travelers - 1) }))}
                            >
                                <Ionicons name="remove" size={24} color="#1A1A1A" />
                            </TouchableOpacity>
                            <Text style={styles.counterValue}>{formData.travelers}</Text>
                            <TouchableOpacity 
                                style={styles.counterButton}
                                onPress={() => setFormData(prev => ({ ...prev, travelers: prev.travelers + 1 }))}
                            >
                                <Ionicons name="add" size={24} color="#1A1A1A" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Budget Section */}
                <View style={styles.card}>
                    <Text style={styles.sectionLabel}>BUDGET (EUR)</Text>
                    <View style={styles.budgetInputContainer}>
                        <Text style={styles.currencySymbol}>€</Text>
                        <TextInput
                            style={styles.budgetInput}
                            value={formData.budget.toString()}
                            onChangeText={(text) => {
                                const value = parseInt(text.replace(/[^0-9]/g, '')) || 0;
                                setFormData({ ...formData, budget: value });
                            }}
                            keyboardType="numeric"
                            placeholder="Enter budget"
                            placeholderTextColor="#9B9B9B"
                        />
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
                                    name={
                                        interest === "Adventure" ? "trail-sign" : 
                                        interest === "Culinary" ? "restaurant" : 
                                        interest === "Culture" ? "library" :
                                        interest === "Relaxation" ? "cafe" :
                                        interest === "Nightlife" ? "wine" :
                                        interest === "Nature" ? "leaf" :
                                        interest === "History" ? "book" :
                                        interest === "Shopping" ? "cart" :
                                        interest === "Luxury" ? "diamond" :
                                        "people"
                                    } 
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

                {/* Flight Preferences Section */}
                {!formData.skipFlights && (
                    <View style={styles.card}>
                        <Text style={styles.sectionLabel}>Flight Preference</Text>
                        <View style={styles.flightPreferencesContainer}>
                            {(['any', 'morning', 'afternoon', 'evening', 'night'] as const).map((time) => (
                                <TouchableOpacity
                                    key={time}
                                    style={[
                                        styles.flightTimeButton,
                                        formData.preferredFlightTime === time && styles.flightTimeButtonActive,
                                    ]}
                                    onPress={() => setFormData({ ...formData, preferredFlightTime: time })}
                                >
                                    <Ionicons 
                                        name={
                                            time === 'morning' ? 'sunny' :
                                            time === 'afternoon' ? 'partly-sunny' :
                                            time === 'evening' ? 'sunny-outline' :
                                            time === 'night' ? 'moon' :
                                            'time'
                                        }
                                        size={20}
                                        color={formData.preferredFlightTime === time ? '#1A1A1A' : '#FFE500'}
                                    />
                                    <Text style={[
                                        styles.flightTimeText,
                                        formData.preferredFlightTime === time && styles.flightTimeTextActive,
                                    ]}>
                                        {time.charAt(0).toUpperCase() + time.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}

                {/* Hotel Preference Section */}
                <View style={styles.card}>
                    <Text style={styles.sectionLabel}>Hotel Preference</Text>
                    <TouchableOpacity 
                        style={styles.skipHotelContainer}
                        onPress={() => setFormData(prev => ({ ...prev, skipHotel: !prev.skipHotel }))}
                    >
                        <View style={[styles.checkbox, formData.skipHotel && styles.checkboxChecked]}>
                            {formData.skipHotel && <Ionicons name="checkmark" size={14} color="#1A1A1A" />}
                        </View>
                        <Text style={styles.skipFlightsText}>I already have accommodation (Skip hotel search)</Text>
                    </TouchableOpacity>
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
    skipFlightsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#1A1A1A',
        marginRight: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxChecked: {
        backgroundColor: '#FFE500',
        borderColor: '#FFE500',
    },
    skipFlightsText: {
        fontSize: 14,
        color: '#1A1A1A',
        fontWeight: '500',
    },
    multiCityButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 16,
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#F9F9F9',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E5E5',
    },
    multiCityContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    multiCityText: {
        fontSize: 15,
        color: '#1A1A1A',
        fontWeight: '600',
    },
    comingSoonBadge: {
        backgroundColor: '#FFE500',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    comingSoonText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    datesContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#FFF8E1",
        borderRadius: 14,
        padding: 4,
    },
    dateInputButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        alignItems: "center",
    },
    dateSeparator: {
        width: 1,
        height: "60%",
        backgroundColor: "#E8E6E1",
    },
    dateLabel: {
        fontSize: 11,
        fontWeight: "700",
        color: "#9B9B9B",
        marginBottom: 4,
        letterSpacing: 0.5,
    },
    dateValueContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    dateValueText: {
        fontSize: 15,
        fontWeight: "600",
        color: "#1A1A1A",
    },
    numberInputContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#FFF8E1",
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    inputLabel: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1A1A1A",
    },
    counterContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
    },
    counterButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "white",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    counterValue: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1A1A1A",
        minWidth: 24,
        textAlign: "center",
    },
    budgetInputContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFF8E1",
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    currencySymbol: {
        fontSize: 20,
        fontWeight: "600",
        color: "#1A1A1A",
        marginRight: 8,
    },
    budgetInput: {
        flex: 1,
        fontSize: 24,
        fontWeight: '600',
        color: '#1A1A1A',
        padding: 0,
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
    loadingContainer: {
        flex: 1,
        backgroundColor: "#FAF9F6",
        alignItems: "center",
        justifyContent: "center",
    },
    loadingTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#FFE500",
        marginBottom: 8,
        textAlign: "center",
    },
    loadingSubtitle: {
        fontSize: 16,
        color: "#9B9B9B",
        textAlign: "center",
    },
    flightPreferencesContainer: {
        flexDirection: "row",
        gap: 10,
        flexWrap: "wrap",
    },
    flightTimeButton: {
        flex: 1,
        minWidth: "30%",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 12,
        backgroundColor: "#FFF8E1",
        borderWidth: 2,
        borderColor: "#FFE500",
    },
    flightTimeButtonActive: {
        backgroundColor: "#FFE500",
        borderColor: "#FFE500",
    },
    flightTimeText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#1A1A1A",
    },
    flightTimeTextActive: {
        color: "#1A1A1A",
    },
    skipHotelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#FFF8E1',
        borderRadius: 12,
    },
});
