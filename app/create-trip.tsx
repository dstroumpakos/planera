import { useState } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from '@react-native-community/datetimepicker';

export default function CreateTrip() {
    const router = useRouter();
    const createTrip = useMutation(api.trips.create);
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showLoadingScreen, setShowLoadingScreen] = useState(false);

    const [formData, setFormData] = useState({
        destination: "",
        origin: "",
        startDate: new Date().getTime(),
        endDate: new Date().getTime() + 7 * 24 * 60 * 60 * 1000, // Default 1 week
        budget: 2000, // Changed to number with default value
        travelers: 1,
        interests: [] as string[],
    });

    const handleNext = () => {
        if (step === 1) {
            if (!formData.destination) {
                Alert.alert("Required", "Please enter a destination");
                return;
            }
            if (!formData.origin) {
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
        setShowLoadingScreen(true);
        try {
            const tripId = await createTrip({
                destination: formData.destination,
                origin: formData.origin,
                startDate: formData.startDate,
                endDate: formData.endDate,
                budget: formData.budget,
                travelers: formData.travelers,
                interests: formData.interests,
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

    if (showLoadingScreen) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1B3F92" />
                <Text style={styles.loadingText}>Generating your dream trip...</Text>
                <Text style={styles.loadingSubtext}>Finding the best flights, hotels, and activities for you.</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1B3F92" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Step {step} of 4</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${(step / 4) * 100}%` }]} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {step === 1 && (
                    <View>
                        <Text style={styles.question}>Where is your adventure?</Text>
                        
                        <Text style={styles.label}>Destination</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Paris, Tokyo, New York"
                            placeholderTextColor="#90A4AE"
                            value={formData.destination}
                            onChangeText={(text) => setFormData({ ...formData, destination: text })}
                            autoFocus
                        />
                        
                        <Text style={[styles.label, { marginTop: 24 }]}>Flying from</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Athens International Airport"
                            placeholderTextColor="#90A4AE"
                            value={formData.origin}
                            onChangeText={(text) => setFormData({ ...formData, origin: text })}
                        />
                        <Text style={styles.helperText}>Enter your departure city or airport.</Text>
                    </View>
                )}

                {step === 2 && (
                    <View>
                        <Text style={styles.question}>When are you planning to go?</Text>
                        
                        <Text style={styles.label}>Start Date</Text>
                        <TouchableOpacity 
                            style={styles.dateButton}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Ionicons name="calendar-outline" size={24} color="#1B3F92" />
                            <Text style={styles.dateText}>
                                {new Date(formData.startDate).toLocaleDateString()}
                            </Text>
                        </TouchableOpacity>

                        {showDatePicker && (
                            <DateTimePicker
                                value={new Date(formData.startDate)}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                minimumDate={new Date()}
                                onChange={(event, selectedDate) => {
                                    setShowDatePicker(false);
                                    if (selectedDate) {
                                        const newStart = selectedDate.getTime();
                                        // Maintain duration if possible, or reset end date
                                        const duration = formData.endDate - formData.startDate;
                                        setFormData({
                                            ...formData,
                                            startDate: newStart,
                                            endDate: newStart + duration
                                        });
                                    }
                                }}
                            />
                        )}

                        <Text style={[styles.label, { marginTop: 24 }]}>Duration (Days)</Text>
                        <View style={styles.row}>
                            <TouchableOpacity 
                                style={styles.counterBtn} 
                                onPress={() => {
                                    const newEnd = formData.endDate - 24 * 60 * 60 * 1000;
                                    if (newEnd > formData.startDate) {
                                        setFormData({ ...formData, endDate: newEnd });
                                    }
                                }}
                            >
                                <Ionicons name="remove" size={24} color="#1B3F92" />
                            </TouchableOpacity>
                            <Text style={styles.counterText}>
                                {Math.round((formData.endDate - formData.startDate) / (24 * 60 * 60 * 1000))} Days
                            </Text>
                            <TouchableOpacity 
                                style={styles.counterBtn}
                                onPress={() => {
                                    const newEnd = formData.endDate + 24 * 60 * 60 * 1000;
                                    setFormData({ ...formData, endDate: newEnd });
                                }}
                            >
                                <Ionicons name="add" size={24} color="#1B3F92" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.helperText}>
                            Trip ends on {new Date(formData.endDate).toLocaleDateString()}
                        </Text>
                    </View>
                )}

                {step === 3 && (
                    <View>
                        <Text style={styles.question}>Travel Style</Text>
                        
                        <Text style={styles.label}>Budget (€)</Text>
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
                        <Text style={styles.helperText}>Enter your total budget in euros.</Text>

                        <Text style={[styles.label, { marginTop: 24 }]}>Travelers</Text>
                        <View style={styles.row}>
                            <TouchableOpacity 
                                style={styles.counterBtn}
                                onPress={() => setFormData({ ...formData, travelers: Math.max(1, formData.travelers - 1) })}
                            >
                                <Ionicons name="remove" size={24} color="#1B3F92" />
                            </TouchableOpacity>
                            <Text style={styles.counterText}>{formData.travelers}</Text>
                            <TouchableOpacity 
                                style={styles.counterBtn}
                                onPress={() => setFormData({ ...formData, travelers: formData.travelers + 1 })}
                            >
                                <Ionicons name="add" size={24} color="#1B3F92" />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {step === 4 && (
                    <View>
                        <Text style={styles.question}>What are you interested in?</Text>
                        <View style={styles.tagsContainer}>
                            {["Food", "History", "Art", "Nature", "Adventure", "Relaxation", "Nightlife", "Shopping", "Culture"].map((interest) => (
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
                        <Text style={styles.nextButtonText}>{step === 4 ? "Generate Trip" : "Next"}</Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F4F6F8", // Light Gray Background
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: "white",
        borderBottomWidth: 1,
        borderBottomColor: "#ECEFF1",
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1B3F92", // Aegean Blue
        letterSpacing: 0.5,
    },
    progressBar: {
        height: 4,
        backgroundColor: "#CFD8DC",
        width: "100%",
    },
    progressFill: {
        height: "100%",
        backgroundColor: "#1B3F92", // Aegean Blue
    },
    content: {
        padding: 24,
    },
    question: {
        fontSize: 24,
        fontWeight: "300", // Elegant light weight
        color: "#1B3F92", // Aegean Blue
        marginBottom: 32,
        letterSpacing: 0.5,
    },
    input: {
        fontSize: 18,
        backgroundColor: "white",
        borderWidth: 1,
        borderColor: "#CFD8DC",
        borderRadius: 4, // Sharp corners
        padding: 16,
        marginBottom: 16,
        color: "#263238",
    },
    helperText: {
        fontSize: 14,
        color: "#78909C",
    },
    label: {
        fontSize: 14,
        fontWeight: "700",
        marginBottom: 8,
        color: "#546E7A",
        textTransform: "uppercase",
        letterSpacing: 1,
    },
    optionsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
    },
    option: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 4, // Sharp corners
        backgroundColor: "white",
        borderWidth: 1,
        borderColor: "#CFD8DC",
    },
    optionSelected: {
        backgroundColor: "#1B3F92", // Aegean Blue
        borderColor: "#1B3F92",
    },
    optionText: {
        fontSize: 16,
        color: "#546E7A",
    },
    optionTextSelected: {
        color: "white",
        fontWeight: "600",
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 24,
        marginBottom: 16,
    },
    counterBtn: {
        width: 44,
        height: 44,
        borderRadius: 4, // Sharp corners
        backgroundColor: "white",
        borderWidth: 1,
        borderColor: "#CFD8DC",
        justifyContent: "center",
        alignItems: "center",
    },
    counterText: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#263238",
    },
    tagsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
    },
    tag: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 4, // Sharp corners
        backgroundColor: "white",
        borderWidth: 1,
        borderColor: "#CFD8DC",
    },
    tagSelected: {
        backgroundColor: "#1B3F92", // Aegean Blue
        borderColor: "#1B3F92",
    },
    tagText: {
        fontSize: 16,
        color: "#546E7A",
    },
    tagTextSelected: {
        color: "white",
        fontWeight: "600",
    },
    footer: {
        padding: 24,
        backgroundColor: "white",
        borderTopWidth: 1,
        borderTopColor: "#ECEFF1",
    },
    nextButton: {
        backgroundColor: "#1B3F92", // Aegean Blue
        paddingVertical: 16,
        borderRadius: 4, // Sharp corners
        alignItems: "center",
        shadowColor: "#1B3F92",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    disabledButton: {
        opacity: 0.7,
    },
    nextButtonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "700",
        letterSpacing: 1,
        textTransform: "uppercase",
    },
    dateButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "white",
        borderWidth: 1,
        borderColor: "#CFD8DC",
        padding: 16,
        borderRadius: 4, // Sharp corners
        gap: 12,
        marginBottom: 8,
    },
    dateText: {
        fontSize: 18,
        color: "#263238",
        fontWeight: "500",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F4F6F8",
        padding: 24,
    },
    loadingText: {
        marginTop: 24,
        fontSize: 24,
        fontWeight: "300",
        color: "#1B3F92",
        textAlign: "center",
    },
    loadingSubtext: {
        marginTop: 12,
        fontSize: 16,
        color: "#546E7A",
        textAlign: "center",
        lineHeight: 24,
    },
});
