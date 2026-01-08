import { useState } from "react";
import React from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform, Modal, Image, Switch, FlatList } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar, DateData } from 'react-native-calendars';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { AIRPORTS } from "@/lib/airports";
import { INTERESTS } from "@/lib/data";

import logoImage from "@/assets/images/appicon-1024x1024-01-1vb1vx.png";

// Popular destinations list
const DESTINATIONS = [
    { city: "Paris", country: "France", image: "🇫🇷" },
    { city: "Tokyo", country: "Japan", image: "🇯🇵" },
    { city: "New York", country: "USA", image: "🇺🇸" },
    { city: "London", country: "UK", image: "🇬🇧" },
    { city: "Rome", country: "Italy", image: "🇮🇹" },
    { city: "Barcelona", country: "Spain", image: "🇪🇸" },
    { city: "Dubai", country: "UAE", image: "🇦🇪" },
    { city: "Sydney", country: "Australia", image: "🇦🇺" },
    { city: "Amsterdam", country: "Netherlands", image: "🇳🇱" },
    { city: "Bangkok", country: "Thailand", image: "🇹🇭" },
    { city: "Berlin", country: "Germany", image: "🇩🇪" },
    { city: "Budapest", country: "Hungary", image: "🇭🇺" },
    { city: "Dubai", country: "UAE", image: "🇦🇪" },
    { city: "Florence", country: "Italy", image: "🇮🇹" },
    { city: "Hong Kong", country: "Hong Kong", image: "🇭🇰" },
    { city: "Istanbul", country: "Turkey", image: "🇹🇷" },
    { city: "Las Vegas", country: "USA", image: "🇺🇸" },
    { city: "Los Angeles", country: "USA", image: "🇺🇸" },
    { city: "Madrid", country: "Spain", image: "🇪🇸" },
    { city: "Mexico City", country: "Mexico", image: "🇲🇽" },
    { city: "Miami", country: "USA", image: "🇺🇸" },
    { city: "Milan", country: "Italy", image: "🇮🇹" },
    { city: "Moscow", country: "Russia", image: "🇷🇺" },
    { city: "Munich", country: "Germany", image: "🇩🇪" },
    { city: "New Delhi", country: "India", image: "🇮🇳" },
    { city: "Prague", country: "Czech Republic", image: "🇨🇿" },
    { city: "Rio de Janeiro", country: "Brazil", image: "🇧🇷" },
    { city: "San Francisco", country: "USA", image: "🇺🇸" },
    { city: "Seoul", country: "South Korea", image: "🇰🇷" },
    { city: "Shanghai", country: "China", image: "🇨🇳" },
    { city: "Singapore", country: "Singapore", image: "🇸🇬" },
    { city: "Toronto", country: "Canada", image: "🇨🇦" },
    { city: "Venice", country: "Italy", image: "🇮🇹" },
    { city: "Vienna", country: "Austria", image: "🇦🇹" },
    { city: "Zurich", country: "Switzerland", image: "🇨🇭" },
    { city: "Athens", country: "Greece", image: "🇬🇷" },
    { city: "Bali", country: "Indonesia", image: "🇮🇩" },
    { city: "Cairo", country: "Egypt", image: "🇪🇬" },
    { city: "Cape Town", country: "South Africa", image: "🇿🇦" },
    { city: "Cancun", country: "Mexico", image: "🇲🇽" },
    { city: "Copenhagen", country: "Denmark", image: "🇩🇰" },
    { city: "Dublin", country: "Ireland", image: "🇮🇪" },
    { city: "Lisbon", country: "Portugal", image: "🇵🇹" },
    { city: "Marrakech", country: "Morocco", image: "🇲🇦" },
    { city: "Phuket", country: "Thailand", image: "🇹🇭" },
    { city: "Reykjavik", country: "Iceland", image: "🇮🇸" },
    { city: "Stockholm", country: "Sweden", image: "🇸🇪" },
    { city: "Vancouver", country: "Canada", image: "🇨🇦" },
];

export default function CreateTripScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const prefilledDestination = params.prefilledDestination as string | undefined;
    
    const createTrip = useMutation(api.trips.create);
    const userPlan = useQuery(api.users.getPlan);
    const userSettings = useQuery(api.users.getSettings) as any;
    const [loading, setLoading] = useState(false);
    const [showCalendar, setShowCalendar] = useState(false);
    const [selectingDate, setSelectingDate] = useState<'start' | 'end'>('start');
    const [showLoadingScreen, setShowLoadingScreen] = useState(false);
    const [showErrorScreen, setShowErrorScreen] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [showAirportSuggestions, setShowAirportSuggestions] = useState(false);
    const [airportSuggestions, setAirportSuggestions] = useState<typeof AIRPORTS>([]);
    const [showDestinationSuggestions, setShowDestinationSuggestions] = useState(false);
    const [destinationSuggestions, setDestinationSuggestions] = useState<typeof DESTINATIONS>([]);
    const [showOriginInput, setShowOriginInput] = useState(false);

    const [formData, setFormData] = useState({
        destination: prefilledDestination || "",
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

    // Apply user preferences when loaded
    React.useEffect(() => {
        if (userSettings) {
            setFormData(prev => ({
                ...prev,
                origin: userSettings.homeAirport || prev.origin,
                budget: userSettings.defaultBudget || prev.budget,
                travelers: userSettings.defaultTravelers || prev.travelers,
                interests: userSettings.defaultInterests && userSettings.defaultInterests.length > 0 ? userSettings.defaultInterests : prev.interests,
                skipFlights: userSettings.defaultSkipFlights ?? prev.skipFlights,
                skipHotel: userSettings.defaultSkipHotel ?? prev.skipHotel,
                preferredFlightTime: (userSettings.defaultPreferredFlightTime as any) || prev.preferredFlightTime,
            }));
        }
    }, [userSettings]);

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
            const errorMsg = error.message || "Failed to create trip. Please try again.";
            // Clean up Convex error prefix if present
            const cleanMessage = errorMsg.replace("Uncaught Error: ", "").replace("Error: ", "");
            
            setErrorMessage(cleanMessage);
            setLoading(false);
            setShowLoadingScreen(false);
            setShowErrorScreen(true);
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
                <ActivityIndicator size="large" color="#FFE500" style={{ marginBottom: 24 }} />
                <Text style={styles.loadingTitle}>Generating your trip...</Text>
                <Text style={styles.loadingDestination}>{formData.destination}</Text>
                <Text style={styles.loadingSubtitle}>This usually takes a few seconds.</Text>
            </SafeAreaView>
        );
    }

    if (showErrorScreen) {
        return (
            <SafeAreaView style={styles.errorContainer}>
                <View style={styles.errorContent}>
                    <Ionicons name="alert-circle" size={64} color="#FF4444" style={{ marginBottom: 24 }} />
                    <Text style={styles.errorTitle}>Trip Generation Failed</Text>
                    <Text style={styles.errorMessage}>{errorMessage}</Text>
                    <TouchableOpacity 
                        style={styles.errorButton}
                        onPress={() => {
                            setShowErrorScreen(false);
                            setErrorMessage("");
                        }}
                    >
                        <Text style={styles.errorButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
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
                                                <Text style={{ fontSize: 18, marginRight: 12 }}>{dest.image}</Text>
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
                                            time === 'afternoon' ? 'cloud' :
                                            time === 'evening' ? 'cloud' :
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
        borderTopColor: '#E8E6E1',
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
        color: "#1A1A1A",
        marginBottom: 8,
        textAlign: "center",
    },
    loadingDestination: {
        fontSize: 24,
        fontWeight: "800",
        color: "#FFE500",
        marginBottom: 16,
        textAlign: "center",
    },
    loadingSubtitle: {
        fontSize: 16,
        color: "#9B9B9B",
        textAlign: "center",
    },
    errorContainer: {
        flex: 1,
        backgroundColor: "#FAF9F6",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 20,
    },
    errorContent: {
        alignItems: "center",
        maxWidth: 320,
    },
    errorTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: "#1A1A1A",
        marginBottom: 12,
        textAlign: "center",
    },
    errorMessage: {
        fontSize: 16,
        color: "#9B9B9B",
        textAlign: "center",
        marginBottom: 32,
        lineHeight: 24,
    },
    errorButton: {
        paddingVertical: 14,
        paddingHorizontal: 32,
        backgroundColor: "#1A1A1A",
        borderRadius: 12,
        minWidth: 200,
        alignItems: "center",
    },
    errorButtonText: {
        fontSize: 16,
        fontWeight: "700",
        color: "white",
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
