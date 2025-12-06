import { useState } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform, Modal, Image, Switch } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar, DateData } from 'react-native-calendars';

import logoImage from "@/assets/bloom/images/image-1dbiuq.png";

export default function CreateTrip() {
    const router = useRouter();
    const createTrip = useMutation(api.trips.create);
    const userPlan = useQuery(api.users.getPlan);
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [showCalendar, setShowCalendar] = useState(false);
    const [selectingDate, setSelectingDate] = useState<'start' | 'end'>('start');
    const [showLoadingScreen, setShowLoadingScreen] = useState(false);

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
            if (!formData.destination) {
                Alert.alert("Required", "Please enter a destination");
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

            <ScrollView contentContainerStyle={styles.content}>
                {step === 1 && (
                    <View>
                        <Text style={styles.question}>Where is your adventure?</Text>
                        
                        <Text style={styles.label}>Destination</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="location-outline" size={20} color="#00BFA6" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Paris, Tokyo, New York"
                                placeholderTextColor="#90A4AE"
                                value={formData.destination}
                                onChangeText={(text) => setFormData({ ...formData, destination: text })}
                                autoFocus
                            />
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
                                <Text style={[styles.label, { marginTop: 24 }]}>Flying from</Text>
                                <View style={styles.inputContainer}>
                                    <Ionicons name="airplane-outline" size={20} color="#00BFA6" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="e.g. Athens International Airport"
                                        placeholderTextColor="#90A4AE"
                                        value={formData.origin}
                                        onChangeText={(text) => setFormData({ ...formData, origin: text })}
                                    />
                                </View>
                                <Text style={styles.helperText}>Enter your departure city or airport.</Text>
                                
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
});
