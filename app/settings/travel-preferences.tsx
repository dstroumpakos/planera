import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput, Switch, Platform, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect } from "react";
import { INTERESTS } from "@/lib/data";

export default function TravelPreferences() {
    const router = useRouter();
    const settings = useQuery(api.users.getSettings);
    const updatePreferences = useMutation(api.users.updateTravelPreferences);

    const [homeAirport, setHomeAirport] = useState("");
    const [defaultBudget, setDefaultBudget] = useState("2000");
    const [defaultTravelers, setDefaultTravelers] = useState("1");
    const [defaultInterests, setDefaultInterests] = useState<string[]>([]);
    const [defaultSkipFlights, setDefaultSkipFlights] = useState(false);
    const [defaultSkipHotel, setDefaultSkipHotel] = useState(false);
    const [defaultPreferredFlightTime, setDefaultPreferredFlightTime] = useState("any");

    useEffect(() => {
        if (settings) {
            setHomeAirport(settings.homeAirport || "");
            setDefaultBudget(settings.defaultBudget?.toString() || "2000");
            setDefaultTravelers(settings.defaultTravelers?.toString() || "1");
            setDefaultInterests(settings.defaultInterests || []);
            setDefaultSkipFlights(settings.defaultSkipFlights || false);
            setDefaultSkipHotel(settings.defaultSkipHotel || false);
            setDefaultPreferredFlightTime(settings.defaultPreferredFlightTime || "any");
        }
    }, [settings]);

    const handleSave = async () => {
        try {
            await updatePreferences({
                homeAirport,
                defaultBudget: parseFloat(defaultBudget) || 2000,
                defaultTravelers: parseInt(defaultTravelers) || 1,
                defaultInterests,
                defaultSkipFlights,
                defaultSkipHotel,
                defaultPreferredFlightTime,
            });
            Alert.alert("Success", "Travel preferences updated successfully!");
            router.back();
        } catch (error) {
            console.error("Update failed:", error);
            Alert.alert("Error", "Failed to update travel preferences");
        }
    };

    const toggleInterest = (interest: string) => {
        if (defaultInterests.includes(interest)) {
            setDefaultInterests(defaultInterests.filter(i => i !== interest));
        } else {
            if (defaultInterests.length < 5) {
                setDefaultInterests([...defaultInterests, interest]);
            } else {
                Alert.alert("Limit Reached", "You can select up to 5 interests");
            }
        }
    };

    if (settings === undefined) {
        return (
            <SafeAreaView style={styles.container}>
                <ActivityIndicator size="large" color="#1B3F92" />
            </SafeAreaView>
        );
    }

    const flightTimeOptions = [
        { value: "any", label: "Any Time", icon: "time-outline" },
        { value: "morning", label: "Morning", icon: "sunny-outline" },
        { value: "afternoon", label: "Afternoon", icon: "partly-sunny-outline" },
        { value: "evening", label: "Evening", icon: "moon-outline" },
        { value: "night", label: "Night", icon: "moon" },
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

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.description}>
                    These preferences will be automatically applied when you create a new trip.
                </Text>

                {/* Home Airport */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Home Airport</Text>
                    <View style={styles.inputContainer}>
                        <Ionicons name="airplane-outline" size={20} color="#64748B" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. San Francisco, CA"
                            value={homeAirport}
                            onChangeText={setHomeAirport}
                            placeholderTextColor="#94A3B8"
                        />
                    </View>
                </View>

                {/* Default Budget & Travelers */}
                <View style={styles.row}>
                    <View style={[styles.section, { flex: 1, marginRight: 8 }]}>
                        <Text style={styles.sectionTitle}>Default Budget ($)</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="cash-outline" size={20} color="#64748B" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="2000"
                                value={defaultBudget}
                                onChangeText={setDefaultBudget}
                                keyboardType="numeric"
                                placeholderTextColor="#94A3B8"
                            />
                        </View>
                    </View>
                    <View style={[styles.section, { flex: 1, marginLeft: 8 }]}>
                        <Text style={styles.sectionTitle}>Travelers</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="people-outline" size={20} color="#64748B" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="1"
                                value={defaultTravelers}
                                onChangeText={setDefaultTravelers}
                                keyboardType="numeric"
                                placeholderTextColor="#94A3B8"
                            />
                        </View>
                    </View>
                </View>

                {/* Default Interests */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Default Interests (Max 5)</Text>
                    <View style={styles.interestsContainer}>
                        {INTERESTS.map((interest) => (
                            <TouchableOpacity
                                key={interest}
                                style={[
                                    styles.interestChip,
                                    defaultInterests.includes(interest) && styles.interestChipActive
                                ]}
                                onPress={() => toggleInterest(interest)}
                            >
                                <Text style={[
                                    styles.interestText,
                                    defaultInterests.includes(interest) && styles.interestTextActive
                                ]}>
                                    {interest}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Flight Preferences */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Preferred Flight Time</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsRow}>
                        {flightTimeOptions.map((option) => (
                            <TouchableOpacity
                                key={option.value}
                                style={[
                                    styles.optionCard,
                                    defaultPreferredFlightTime === option.value && styles.optionCardActive,
                                ]}
                                onPress={() => setDefaultPreferredFlightTime(option.value)}
                            >
                                <Ionicons
                                    name={option.icon as any}
                                    size={24}
                                    color={defaultPreferredFlightTime === option.value ? "#1B3F92" : "#78909C"}
                                />
                                <Text
                                    style={[
                                        styles.optionText,
                                        defaultPreferredFlightTime === option.value && styles.optionTextActive,
                                    ]}
                                >
                                    {option.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Toggles */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Default Settings</Text>
                    
                    <View style={styles.toggleRow}>
                        <View style={styles.toggleInfo}>
                            <Text style={styles.toggleLabel}>Skip Flights</Text>
                            <Text style={styles.toggleDescription}>Don't search for flights by default</Text>
                        </View>
                        <Switch
                            value={defaultSkipFlights}
                            onValueChange={setDefaultSkipFlights}
                            trackColor={{ false: "#E2E8F0", true: "#1B3F92" }}
                            thumbColor={Platform.OS === "ios" ? "#FFFFFF" : defaultSkipFlights ? "#FFFFFF" : "#F1F5F9"}
                        />
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.toggleRow}>
                        <View style={styles.toggleInfo}>
                            <Text style={styles.toggleLabel}>Skip Hotels</Text>
                            <Text style={styles.toggleDescription}>Don't search for hotels by default</Text>
                        </View>
                        <Switch
                            value={defaultSkipHotel}
                            onValueChange={setDefaultSkipHotel}
                            trackColor={{ false: "#E2E8F0", true: "#1B3F92" }}
                            thumbColor={Platform.OS === "ios" ? "#FFFFFF" : defaultSkipHotel ? "#FFFFFF" : "#F1F5F9"}
                        />
                    </View>
                </View>

                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                    <Text style={styles.saveButtonText}>Save Preferences</Text>
                </TouchableOpacity>
                
                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8FAFC",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E2E8F0",
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#0F172A",
    },
    content: {
        flex: 1,
        padding: 20,
    },
    description: {
        fontSize: 14,
        color: "#64748B",
        marginBottom: 24,
        lineHeight: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: "#0F172A",
        marginBottom: 12,
    },
    row: {
        flexDirection: "row",
        marginBottom: 24,
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 48,
    },
    inputIcon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: "#0F172A",
    },
    interestsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    interestChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    interestChipActive: {
        backgroundColor: "#1B3F92",
        borderColor: "#1B3F92",
    },
    interestText: {
        fontSize: 14,
        color: "#64748B",
        fontWeight: "500",
    },
    interestTextActive: {
        color: "#FFFFFF",
    },
    optionsRow: {
        flexDirection: "row",
        gap: 12,
    },
    optionCard: {
        padding: 16,
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        alignItems: "center",
        minWidth: 100,
        marginRight: 12,
    },
    optionCardActive: {
        borderColor: "#1B3F92",
        backgroundColor: "#F0F9FF",
    },
    optionText: {
        marginTop: 8,
        fontSize: 14,
        fontWeight: "500",
        color: "#64748B",
    },
    optionTextActive: {
        color: "#1B3F92",
    },
    toggleRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 8,
    },
    toggleInfo: {
        flex: 1,
        marginRight: 16,
    },
    toggleLabel: {
        fontSize: 16,
        fontWeight: "600",
        color: "#0F172A",
        marginBottom: 4,
    },
    toggleDescription: {
        fontSize: 13,
        color: "#64748B",
    },
    divider: {
        height: 1,
        backgroundColor: "#E2E8F0",
        marginVertical: 12,
    },
    saveButton: {
        backgroundColor: "#1B3F92",
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: "center",
        marginTop: 8,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: "700",
        color: "#FFFFFF",
    },
});