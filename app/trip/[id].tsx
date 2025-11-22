import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Image, Linking, Platform, Alert, Modal, TextInput, KeyboardAvoidingView } from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import { BlurView } from "expo-blur";
import DateTimePicker from '@react-native-community/datetimepicker';

export default function TripDetails() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const trip = useQuery(api.trips.get, { tripId: id as Id<"trips"> });
    const updateTrip = useMutation(api.trips.update);
    const regenerateTrip = useMutation(api.trips.regenerate);
    
    const [selectedHotelIndex, setSelectedHotelIndex] = useState<number | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [datePickerMode, setDatePickerMode] = useState<'start' | 'end'>('start');

    const [editForm, setEditForm] = useState({
        destination: "",
        origin: "",
        startDate: new Date().getTime(),
        endDate: new Date().getTime(),
        budget: "",
        travelers: "1",
        interests: "",
    });

    useEffect(() => {
        if (trip) {
            setEditForm({
                destination: trip.destination,
                origin: trip.origin || "",
                startDate: trip.startDate,
                endDate: trip.endDate,
                budget: trip.budget || "",
                travelers: (trip.travelers || 1).toString(),
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
            budget: editForm.budget,
            travelers: parseInt(editForm.travelers) || 1,
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

    if (trip === undefined) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#1B3F92" />
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
                <ActivityIndicator size="large" color="#1B3F92" />
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

    const hotels = trip.itinerary?.hotels || [];
    const selectedHotel = selectedHotelIndex !== null ? hotels[selectedHotelIndex] : hotels[0];
    
    // Calculate costs
    const flightPricePerPerson = itinerary.flights?.pricePerPerson || (itinerary.flights?.price ? itinerary.flights.price / travelers : 0);
    const hotelPricePerNight = selectedHotel?.pricePerNight || 0;
    const dailyExpensesPerPerson = itinerary.estimatedDailyExpenses || 50; // Fallback

    const totalFlightCost = flightPricePerPerson * travelers;
    const totalHotelCost = hotelPricePerNight * duration;
    const totalDailyExpenses = dailyExpensesPerPerson * travelers * duration;
    
    const grandTotal = totalFlightCost + totalHotelCost + totalDailyExpenses;
    const pricePerPerson = grandTotal / travelers;

    const openMap = (query: string) => {
        const url = Platform.select({
            ios: `maps:0,0?q=${encodeURIComponent(query)}`,
            android: `geo:0,0?q=${encodeURIComponent(query)}`,
            web: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
        });
        if (url) Linking.openURL(url);
    };

    const openAffiliateLink = (type: 'flight' | 'hotel', query: string) => {
        // In a real app, you would use your actual affiliate IDs and endpoints
        // Examples: Skyscanner, Booking.com, Expedia, etc.
        let url = "";
        if (type === 'flight') {
            url = `https://www.skyscanner.com/transport/flights?q=${encodeURIComponent(query)}`;
        } else {
            url = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(query)}`;
        }
        Linking.openURL(url);
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
        if (Array.isArray(itinerary.flights)) {
            return (
                <View style={styles.card}>
                    {itinerary.flights.map((flight: any, index: number) => (
                        <View key={index} style={styles.row}>
                            <View style={styles.flightInfo}>
                                <Text style={styles.cardTitle}>{flight.airline}</Text>
                                <Text style={styles.cardSubtitle}>{flight.flightNumber}</Text>
                            </View>
                            <Text style={styles.price}>${flight.price}</Text>
                        </View>
                    ))}
                </View>
            );
        }

        if (!itinerary.flights || !itinerary.flights.outbound) {
            return (
                <View style={styles.card}>
                    <Text style={styles.cardSubtitle}>Flight details unavailable</Text>
                </View>
            );
        }

        return (
            <View style={styles.card}>
                <View style={styles.flightHeader}>
                    <Text style={styles.flightPrice}>${flightPricePerPerson}/person</Text>
                    <View style={styles.luggageBadge}>
                        <Ionicons name="briefcase-outline" size={14} color="#1B3F92" />
                        <Text style={styles.luggageText}>{itinerary.flights.luggage}</Text>
                    </View>
                </View>
                
                <View style={styles.flightSegment}>
                    <View style={styles.segmentHeader}>
                        <Ionicons name="airplane" size={20} color="#1B3F92" />
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
                        <Ionicons name="airplane" size={20} color="#1B3F92" style={{ transform: [{ rotate: '180deg' }] }} />
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
                    <Ionicons name="open-outline" size={16} color="#1B3F92" />
                </TouchableOpacity>
            </View>
        );
    };

    const isPremium = trip.userPlan === "premium";

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                
                <View style={styles.headerRightButtons}>
                    <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.iconButton}>
                        <Ionicons name="pencil" size={20} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => regenerateTrip({ tripId: trip._id })} 
                        style={styles.iconButton}
                    >
                        <Ionicons name="refresh" size={20} color="white" />
                    </TouchableOpacity>
                </View>

                <Image 
                    source={{ uri: `https://source.unsplash.com/800x600/?${trip.destination}` }} 
                    style={styles.headerImage} 
                />
                <View style={styles.headerOverlay} />
                <View style={styles.headerContent}>
                    <Text style={styles.destination}>{trip.destination}</Text>
                    <Text style={styles.dates}>
                        {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
                    </Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Section title="Flights">
                    {renderFlights()}
                </Section>

                <Section title="Accommodation Options">
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hotelList}>
                        {hotels.map((hotel: any, index: number) => (
                            <TouchableOpacity 
                                key={index} 
                                onPress={() => setSelectedHotelIndex(index)}
                                activeOpacity={0.9}
                                style={[
                                    styles.hotelCard,
                                    selectedHotelIndex === index && styles.selectedHotelCard
                                ]}
                            >
                                <View style={styles.hotelHeader}>
                                    <Text style={styles.cardTitle} numberOfLines={1}>{hotel.name}</Text>
                                    <View style={styles.stars}>
                                        {[...Array(hotel.stars || 0)].map((_, i) => (
                                            <Ionicons key={i} name="star" size={12} color="#FFB300" />
                                        ))}
                                    </View>
                                </View>
                                <Text style={styles.hotelDesc} numberOfLines={2}>{hotel.description}</Text>
                                <Text style={styles.price}>${hotel.pricePerNight}/night</Text>
                                <TouchableOpacity onPress={() => openMap(hotel.address)}>
                                    <Text style={styles.address} numberOfLines={1}>{hotel.address} <Ionicons name="map" size={12} color="#1B3F92" /></Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity 
                                    style={styles.miniBookButton}
                                    onPress={() => openAffiliateLink('hotel', hotel.name + " " + trip.destination)}
                                >
                                    <Text style={styles.miniBookButtonText}>Book Hotel</Text>
                                </TouchableOpacity>

                                {selectedHotelIndex === index && (
                                    <View style={styles.selectedBadge}>
                                        <Ionicons name="checkmark-circle" size={20} color="#1B3F92" />
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </Section>

                <Section title="Daily Itinerary">
                    {trip.itinerary?.dailyPlan?.map((day: any, index: number) => (
                        <View key={index} style={styles.dayCard}>
                            <View style={styles.dayHeader}>
                                <View style={styles.dayBadge}>
                                    <Text style={styles.dayBadgeText}>Day {day.day}</Text>
                                </View>
                            </View>
                            {day.activities.map((activity: any, actIndex: number) => (
                                <View key={actIndex} style={styles.activityItem}>
                                    <Text style={styles.activityTime}>{activity.time}</Text>
                                    <View style={styles.activityContent}>
                                        <Text style={styles.activityTitle}>{activity.title}</Text>
                                        <Text style={styles.activityDesc}>{activity.description}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    ))}
                    
                    {!isPremium && (
                        <View style={styles.blurContainer}>
                            <BlurView intensity={20} style={StyleSheet.absoluteFill} />
                            <View style={styles.lockContent}>
                                <Ionicons name="lock-closed" size={48} color="#1B3F92" />
                                <Text style={styles.lockTitle}>Unlock Full Itinerary</Text>
                                <Text style={styles.lockText}>
                                    Upgrade to Premium to see the detailed daily plan, maps, and more.
                                </Text>
                                <TouchableOpacity 
                                    style={styles.unlockButton}
                                    onPress={() => router.push("/subscription")}
                                >
                                    <Text style={styles.unlockButtonText}>Upgrade Now</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={styles.notNowButton}
                                    onPress={() => {
                                        // Just dismiss the overlay or scroll up? 
                                        // Actually, the overlay covers the content, so "Not Now" 
                                        // implies they accept seeing the limited version (which is just the blurred view).
                                        // But usually "Not Now" means "Close this upsell".
                                        // Since the content IS locked, they can't really "close" it to see the content.
                                        // So "Not Now" might just be a way to go back or stay on the limited view.
                                        // For this flow, let's make it just a secondary action that maybe scrolls to top or does nothing (just acknowledges).
                                        // Or better, let's make it clear they are staying on the limited plan.
                                    }}
                                >
                                    <Text style={styles.notNowButtonText}>Not Now</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </Section>
            </ScrollView>

            <View style={styles.footer}>
                <View style={styles.priceBreakdown}>
                    <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>Total for {travelers} travelers</Text>
                        <Text style={styles.totalPrice}>${Math.round(grandTotal).toLocaleString()}</Text>
                    </View>
                    <Text style={styles.perPersonPrice}>${Math.round(pricePerPerson).toLocaleString()} per person</Text>
                </View>
                <TouchableOpacity style={styles.bookButton} onPress={handleBookTrip}>
                    <Text style={styles.bookButtonText}>Book This Trip</Text>
                </TouchableOpacity>
            </View>

            <Modal 
                visible={isEditing} 
                animationType="slide" 
                presentationStyle="pageSheet"
                onRequestClose={() => setIsEditing(false)}
            >
                <KeyboardAvoidingView 
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.modalContainer}
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
                            <Text style={styles.label}>Budget</Text>
                            <View style={styles.budgetOptions}>
                                {["Low", "Medium", "High", "Luxury"].map((opt) => (
                                    <TouchableOpacity
                                        key={opt}
                                        style={[
                                            styles.budgetOption,
                                            editForm.budget === opt && styles.budgetOptionSelected
                                        ]}
                                        onPress={() => setEditForm(prev => ({ ...prev, budget: opt }))}
                                    >
                                        <Text style={[
                                            styles.budgetOptionText,
                                            editForm.budget === opt && styles.budgetOptionTextSelected
                                        ]}>{opt}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Travelers</Text>
                            <TextInput
                                style={styles.input}
                                value={editForm.travelers}
                                onChangeText={(text) => setEditForm(prev => ({ ...prev, travelers: text }))}
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
        </SafeAreaView>
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
        backgroundColor: "#F4F6F8", // Light Gray
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    generatingText: {
        marginTop: 16,
        fontSize: 18,
        fontWeight: "300",
        color: "#1B3F92",
    },
    generatingSubtext: {
        marginTop: 8,
        fontSize: 14,
        color: "#546E7A",
    },
    errorText: {
        marginTop: 16,
        fontSize: 18,
        color: "#D32F2F",
    },
    header: {
        height: 200,
        position: "relative",
    },
    headerImage: {
        width: "100%",
        height: "100%",
    },
    headerOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(27, 63, 146, 0.4)", // Blue tint
    },
    headerContent: {
        position: "absolute",
        bottom: 20,
        left: 20,
    },
    backButton: {
        position: "absolute",
        top: 16,
        left: 16,
        zIndex: 10,
        padding: 8,
        borderRadius: 20,
        backgroundColor: "rgba(0,0,0,0.3)",
    },
    headerRightButtons: {
        position: "absolute",
        top: 16,
        right: 16,
        zIndex: 10,
        flexDirection: "row",
        gap: 8,
    },
    iconButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: "rgba(0,0,0,0.3)",
    },
    destination: {
        fontSize: 36,
        fontWeight: "300",
        color: "white",
        letterSpacing: 1,
    },
    dates: {
        fontSize: 16,
        color: "rgba(255,255,255,0.9)",
        marginTop: 4,
        fontWeight: "500",
    },
    content: {
        padding: 20,
        paddingBottom: 100,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "300",
        color: "#1B3F92",
        marginBottom: 16,
        letterSpacing: 0.5,
    },
    card: {
        backgroundColor: "white",
        borderRadius: 4, // Sharp corners
        padding: 20,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: "#ECEFF1",
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
        color: "#263238",
    },
    cardSubtitle: {
        fontSize: 14,
        color: "#546E7A",
    },
    price: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1B3F92",
    },
    flightTimes: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: "#ECEFF1",
    },
    time: {
        fontSize: 16,
        fontWeight: "500",
        color: "#263238",
    },
    stars: {
        flexDirection: "row",
        gap: 2,
        marginTop: 4,
    },
    address: {
        fontSize: 13,
        color: "#78909C",
        marginTop: 8,
    },
    dayCard: {
        backgroundColor: "white",
        borderRadius: 4, // Sharp corners
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#ECEFF1",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    dayHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    dayBadge: {
        backgroundColor: "#E3F2FD",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
    },
    dayBadgeText: {
        color: "#1B3F92",
        fontWeight: "700",
        fontSize: 12,
        textTransform: "uppercase",
    },
    dayTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#1C1C1E",
    },
    activityItem: {
        flexDirection: "row",
        marginBottom: 24,
    },
    activityRow: {
        flexDirection: "row",
        marginBottom: 20,
    },
    activityTime: {
        width: 70,
        fontSize: 14,
        fontWeight: "600",
        color: "#546E7A",
    },
    activityContent: {
        flex: 1,
        paddingLeft: 16,
        borderLeftWidth: 2,
        borderLeftColor: "#ECEFF1",
        paddingBottom: 4,
    },
    activityTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#263238",
        marginBottom: 4,
    },
    activityDesc: {
        fontSize: 14,
        color: "#546E7A",
        lineHeight: 22,
    },
    mapLink: {
        marginTop: 4,
    },
    mapLinkText: {
        fontSize: 12,
        color: "#1B3F92",
        fontWeight: "500",
    },
    flightHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    flightPrice: {
        fontSize: 24,
        fontWeight: "300",
        color: "#1B3F92",
    },
    luggageBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#E3F2FD",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        gap: 4,
    },
    luggageText: {
        fontSize: 12,
        color: "#1B3F92",
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
        color: "#78909C",
        textTransform: "uppercase",
        letterSpacing: 1,
    },
    duration: {
        fontSize: 14,
        color: "#546E7A",
    },
    divider: {
        height: 1,
        backgroundColor: "#ECEFF1",
        marginVertical: 20,
    },
    hotelList: {
        paddingRight: 16,
        gap: 16,
    },
    hotelCard: {
        width: 280,
        backgroundColor: "white",
        borderRadius: 4, // Sharp corners
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 2,
        borderColor: "transparent",
    },
    selectedHotelCard: {
        borderColor: "#1B3F92",
        backgroundColor: "#F4F6F8",
    },
    selectedBadge: {
        position: "absolute",
        top: 8,
        right: 8,
    },
    hotelHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    hotelDesc: {
        fontSize: 13,
        color: "#546E7A",
        marginBottom: 12,
        lineHeight: 20,
    },
    footer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "white",
        padding: 20,
        paddingBottom: Platform.OS === "ios" ? 32 : 20,
        borderTopWidth: 1,
        borderTopColor: "#ECEFF1",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 10,
    },
    priceBreakdown: {
        flex: 1,
    },
    priceRow: {
        flexDirection: "row",
        alignItems: "baseline",
        gap: 8,
    },
    priceLabel: {
        fontSize: 12,
        color: "#78909C",
        textTransform: "uppercase",
    },
    totalPrice: {
        fontSize: 24,
        fontWeight: "700",
        color: "#1B3F92",
    },
    perPersonPrice: {
        fontSize: 14,
        color: "#546E7A",
        fontWeight: "500",
    },
    bookButton: {
        backgroundColor: "#1B3F92",
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 4, // Sharp corners
        marginLeft: 16,
        shadowColor: "#1B3F92",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    bookButtonText: {
        color: "white",
        fontWeight: "700",
        fontSize: 16,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    blurContainer: {
        position: "absolute",
        top: 50,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(255,255,255,0.9)",
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 4,
        zIndex: 10,
    },
    lockContent: {
        alignItems: "center",
        padding: 24,
    },
    lockTitle: {
        fontSize: 20,
        fontWeight: "300",
        color: "#1B3F92",
        marginTop: 16,
        marginBottom: 8,
    },
    lockText: {
        fontSize: 14,
        color: "#546E7A",
        textAlign: "center",
        marginBottom: 24,
        lineHeight: 22,
    },
    unlockButton: {
        backgroundColor: "#1B3F92",
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 4,
        marginBottom: 12,
    },
    unlockButtonText: {
        color: "#FFF",
        fontSize: 16,
        fontWeight: "700",
        textTransform: "uppercase",
    },
    notNowButton: {
        paddingVertical: 8,
    },
    notNowButtonText: {
        color: "#78909C",
        fontSize: 14,
        fontWeight: "500",
    },
    affiliateButton: {
        marginTop: 20,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 14,
        backgroundColor: "#E3F2FD",
        borderRadius: 4,
        gap: 8,
    },
    affiliateButtonText: {
        color: "#1B3F92",
        fontWeight: "700",
        fontSize: 14,
        textTransform: "uppercase",
    },
    miniBookButton: {
        marginTop: 16,
        backgroundColor: "#1B3F92",
        paddingVertical: 10,
        borderRadius: 4,
        alignItems: "center",
    },
    miniBookButtonText: {
        color: "white",
        fontSize: 12,
        fontWeight: "700",
        textTransform: "uppercase",
    },
    modalContainer: {
        flex: 1,
        backgroundColor: "#F4F6F8",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 20,
        backgroundColor: "white",
        borderBottomWidth: 1,
        borderBottomColor: "#ECEFF1",
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1B3F92",
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
        color: "#546E7A",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    input: {
        backgroundColor: "white",
        padding: 14,
        borderRadius: 4,
        fontSize: 16,
        borderWidth: 1,
        borderColor: "#CFD8DC",
        color: "#263238",
    },
    textArea: {
        height: 100,
        textAlignVertical: "top",
    },
    budgetOptions: {
        flexDirection: "row",
        gap: 8,
    },
    budgetOption: {
        flex: 1,
        padding: 12,
        borderRadius: 4,
        backgroundColor: "white",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#CFD8DC",
    },
    budgetOptionSelected: {
        backgroundColor: "#1B3F92",
        borderColor: "#1B3F92",
    },
    budgetOptionText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#546E7A",
    },
    budgetOptionTextSelected: {
        color: "white",
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
        borderRadius: 4,
        borderWidth: 1,
        borderColor: "#CFD8DC",
    },
    dateLabel: {
        fontSize: 12,
        color: "#78909C",
        marginBottom: 4,
        textTransform: "uppercase",
    },
    dateValue: {
        fontSize: 16,
        color: "#263238",
        fontWeight: "500",
    },
    saveButton: {
        backgroundColor: "#1B3F92",
        padding: 16,
        borderRadius: 4,
        alignItems: "center",
        marginTop: 24,
        shadowColor: "#1B3F92",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    saveButtonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 1,
    },
});
