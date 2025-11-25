import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect } from "react";

export default function TravelPreferences() {
    const router = useRouter();
    const settings = useQuery(api.users.getSettings);
    const updatePreferences = useMutation(api.users.updateTravelPreferences);

    const [seatPreference, setSeatPreference] = useState("window");
    const [mealPreference, setMealPreference] = useState("none");
    const [hotelStarRating, setHotelStarRating] = useState(4);
    const [budgetRange, setBudgetRange] = useState("mid-range");
    const [travelStyle, setTravelStyle] = useState("relaxation");

    useEffect(() => {
        if (settings) {
            setSeatPreference(settings.seatPreference || "window");
            setMealPreference(settings.mealPreference || "none");
            setHotelStarRating(settings.hotelStarRating || 4);
            setBudgetRange(settings.budgetRange || "mid-range");
            setTravelStyle(settings.travelStyle || "relaxation");
        }
    }, [settings]);

    const handleSave = async () => {
        try {
            await updatePreferences({
                seatPreference,
                mealPreference,
                hotelStarRating,
                budgetRange,
                travelStyle,
            });
            Alert.alert("Success", "Travel preferences updated successfully!");
            router.back();
        } catch (error) {
            console.error("Update failed:", error);
            Alert.alert("Error", "Failed to update travel preferences");
        }
    };

    if (settings === undefined) {
        return (
            <SafeAreaView style={styles.container}>
                <Text>Loading...</Text>
            </SafeAreaView>
        );
    }

    const seatOptions = [
        { value: "window", label: "Window", icon: "airplane-outline" },
        { value: "aisle", label: "Aisle", icon: "walk-outline" },
        { value: "middle", label: "Middle", icon: "people-outline" },
    ];

    const mealOptions = [
        { value: "none", label: "No Preference" },
        { value: "vegetarian", label: "Vegetarian" },
        { value: "vegan", label: "Vegan" },
        { value: "halal", label: "Halal" },
        { value: "kosher", label: "Kosher" },
    ];

    const budgetOptions = [
        { value: "budget", label: "Budget", icon: "cash-outline" },
        { value: "mid-range", label: "Mid-Range", icon: "card-outline" },
        { value: "luxury", label: "Luxury", icon: "diamond-outline" },
    ];

    const styleOptions = [
        { value: "adventure", label: "Adventure", icon: "bicycle-outline" },
        { value: "relaxation", label: "Relaxation", icon: "sunny-outline" },
        { value: "culture", label: "Culture", icon: "library-outline" },
        { value: "family", label: "Family", icon: "people-outline" },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1B3F92" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Travel Preferences</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.content}>
                {/* Seat Preference */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Seat Preference</Text>
                    <View style={styles.optionsRow}>
                        {seatOptions.map((option) => (
                            <TouchableOpacity
                                key={option.value}
                                style={[
                                    styles.optionCard,
                                    seatPreference === option.value && styles.optionCardActive,
                                ]}
                                onPress={() => setSeatPreference(option.value)}
                            >
                                <Ionicons
                                    name={option.icon as any}
                                    size={24}
                                    color={seatPreference === option.value ? "#1B3F92" : "#78909C"}
                                />
                                <Text
                                    style={[
                                        styles.optionText,
                                        seatPreference === option.value && styles.optionTextActive,
                                    ]}
                                >
                                    {option.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Meal Preference */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Meal Preference</Text>
                    {mealOptions.map((option) => (
                        <TouchableOpacity
                            key={option.value}
                            style={styles.listItem}
                            onPress={() => setMealPreference(option.value)}
                        >
                            <Text style={styles.listItemText}>{option.label}</Text>
                            {mealPreference === option.value && (
                                <Ionicons name="checkmark-circle" size={24} color="#1B3F92" />
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Hotel Star Rating */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Hotel Star Rating</Text>
                    <View style={styles.optionsRow}>
                        {[3, 4, 5].map((stars) => (
                            <TouchableOpacity
                                key={stars}
                                style={[
                                    styles.optionCard,
                                    hotelStarRating === stars && styles.optionCardActive,
                                ]}
                                onPress={() => setHotelStarRating(stars)}
                            >
                                <View style={styles.starsContainer}>
                                    {Array.from({ length: stars }).map((_, i) => (
                                        <Ionicons
                                            key={i}
                                            name="star"
                                            size={16}
                                            color={hotelStarRating === stars ? "#1B3F92" : "#78909C"}
                                        />
                                    ))}
                                </View>
                                <Text
                                    style={[
                                        styles.optionText,
                                        hotelStarRating === stars && styles.optionTextActive,
                                    ]}
                                >
                                    {stars} Stars
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Budget Range */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Budget Range</Text>
                    <View style={styles.optionsRow}>
                        {budgetOptions.map((option) => (
                            <TouchableOpacity
                                key={option.value}
                                style={[
                                    styles.optionCard,
                                    budgetRange === option.value && styles.optionCardActive,
                                ]}
                                onPress={() => setBudgetRange(option.value)}
                            >
                                <Ionicons
                                    name={option.icon as any}
                                    size={24}
                                    color={budgetRange === option.value ? "#1B3F92" : "#78909C"}
                                />
                                <Text
                                    style={[
                                        styles.optionText,
                                        budgetRange === option.value && styles.optionTextActive,
                                    ]}
                                >
                                    {option.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Travel Style */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Travel Style</Text>
                    <View style={styles.optionsGrid}>
                        {styleOptions.map((option) => (
                            <TouchableOpacity
                                key={option.value}
                                style={[
                                    styles.optionCard,
                                    travelStyle === option.value && styles.optionCardActive,
                                ]}
                                onPress={() => setTravelStyle(option.value)}
                            >
                                <Ionicons
                                    name={option.icon as any}
                                    size={24}
                                    color={travelStyle === option.value ? "#1B3F92" : "#78909C"}
                                />
                                <Text
                                    style={[
                                        styles.optionText,
                                        travelStyle === option.value && styles.optionTextActive,
                                    ]}
                                >
                                    {option.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                    <Text style={styles.saveButtonText}>Save Preferences</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F4F6F8',
    },
    header: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 20,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1B3F92',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#37474F',
        marginBottom: 12,
    },
    optionsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    optionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    optionCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#E0E0E0',
    },
    optionCardActive: {
        borderColor: '#1B3F92',
        backgroundColor: '#E3F2FD',
    },
    optionText: {
        fontSize: 12,
        color: '#78909C',
        marginTop: 8,
        textAlign: 'center',
    },
    optionTextActive: {
        color: '#1B3F92',
        fontWeight: '600',
    },
    starsContainer: {
        flexDirection: 'row',
        gap: 2,
    },
    listItem: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    listItemText: {
        fontSize: 16,
        color: '#37474F',
    },
    saveButton: {
        backgroundColor: '#1B3F92',
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 40,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});
