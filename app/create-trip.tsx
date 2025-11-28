import { useState } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform, Modal, Image } from "react-native";
import { useRouter } from "expo-router";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar, DateData } from 'react-native-calendars';

import logoImage from "@/assets/bloom/images/image-zyrrgm.png";

export default function CreateTrip() {
    const router = useRouter();
    const createTrip = useMutation(api.trips.create);
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
            color: '#00BFA6',
            textColor: 'white',
        };
        
        // Mark end date
        marked[endStr] = {
            endingDay: true,
            color: '#00BFA6',
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
                color: '#E0F7F4',
                textColor: '#00BFA6',
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

    const tripDuration = Math.round((formData.endDate - formData.startDate) / (24 * 60 * 60 * 1000));

    if (showLoadingScreen) {
        return (
            <View style={styles.loadingContainer}>
                <Image source={logoImage} style={styles.loadingLogo} resizeMode="contain" />
                <ActivityIndicator size="large" color="#00BFA6" style={{ marginTop: 24 }} />
                <Text style={styles.loadingText}>Generating your dream trip...</Text>
                <Text style={styles.loadingSubtext}>Finding the best flights, hotels, and activities for you.</Text>
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
                                            textSectionTitleColor: '#607D8B',
                                            selectedDayBackgroundColor: '#00BFA6',
                                            selectedDayTextColor: '#ffffff',
                                            todayTextColor: '#00BFA6',
                                            dayTextColor: '#263238',
                                            textDisabledColor: '#CFD8DC',
                                            dotColor: '#00BFA6',
                                            selectedDotColor: '#ffffff',
                                            arrowColor: '#00BFA6',
                                            monthTextColor: '#1A237E',
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
                                            <View style={[styles.legendDot, { backgroundColor: '#00BFA6' }]} />
                                            <Text style={styles.legendText}>Selected dates</Text>
                                        </View>
                                        <View style={styles.legendItem}>
                                            <View style={[styles.legendDot, { backgroundColor: '#E0F7F4' }]} />
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
        backgroundColor: "#F5F7FA",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: "white",
        borderBottomWidth: 1,
        borderBottomColor: "#E8EDF2",
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: "#F5F7FA",
        justifyContent: "center",
        alignItems: "center",
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1A237E",
        letterSpacing: 0.5,
    },
    progressBar: {
        height: 4,
        backgroundColor: "#E8EDF2",
        width: "100%",
    },
    progressFill: {
        height: "100%",
        backgroundColor: "#00BFA6",
    },
    content: {
        padding: 24,
    },
    question: {
        fontSize: 28,
        fontWeight: "700",
        color: "#1A237E",
        marginBottom: 32,
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "white",
        borderWidth: 1,
        borderColor: "#E8EDF2",
        borderRadius: 12,
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        paddingVertical: 16,
        color: "#263238",
    },
    helperText: {
        fontSize: 14,
        color: "#90A4AE",
        marginTop: 4,
    },
    label: {
        fontSize: 12,
        fontWeight: "700",
        marginBottom: 10,
        color: "#607D8B",
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
        width: 52,
        height: 52,
        borderRadius: 12,
        backgroundColor: "white",
        borderWidth: 1,
        borderColor: "#E8EDF2",
        justifyContent: "center",
        alignItems: "center",
    },
    counterText: {
        fontSize: 32,
        fontWeight: "700",
        color: "#1A237E",
    },
    tagsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
    },
    tag: {
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: "white",
        borderWidth: 1,
        borderColor: "#E8EDF2",
    },
    tagSelected: {
        backgroundColor: "#00BFA6",
        borderColor: "#00BFA6",
    },
    tagText: {
        fontSize: 16,
        color: "#607D8B",
        fontWeight: "500",
    },
    tagTextSelected: {
        color: "white",
        fontWeight: "600",
    },
    footer: {
        padding: 24,
        backgroundColor: "white",
        borderTopWidth: 1,
        borderTopColor: "#E8EDF2",
    },
    nextButton: {
        backgroundColor: "#00BFA6",
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
        shadowColor: "#00BFA6",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
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
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F5F7FA",
        padding: 24,
    },
    loadingLogo: {
        width: 120,
        height: 120,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 24,
        fontWeight: "700",
        color: "#1A237E",
        textAlign: "center",
    },
    loadingSubtext: {
        marginTop: 8,
        fontSize: 16,
        color: "#607D8B",
        textAlign: "center",
        lineHeight: 24,
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
        borderRadius: 16,
        padding: 16,
        borderWidth: 2,
        borderColor: "#E8EDF2",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    dateCardActive: {
        borderColor: "#00BFA6",
    },
    dateCardIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: "#E0F7F4",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 12,
    },
    dateCardLabel: {
        fontSize: 11,
        fontWeight: "700",
        color: "#90A4AE",
        letterSpacing: 1,
        marginBottom: 4,
    },
    dateCardValue: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1A237E",
    },
    durationSummary: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#E0F7F4",
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 12,
        gap: 8,
    },
    durationText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#00BFA6",
    },
    // Calendar Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    calendarModal: {
        backgroundColor: "white",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: 40,
    },
    calendarHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#E8EDF2",
    },
    calendarTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1A237E",
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
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    legendText: {
        fontSize: 13,
        color: "#607D8B",
    },
});
