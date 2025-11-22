import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Image, Linking, Platform } from "react-native";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect } from "react";

export default function TripDetails() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const trip = useQuery(api.trips.get, { tripId: id as Id<"trips"> });
    const [selectedHotelIndex, setSelectedHotelIndex] = useState(0);

    if (trip === undefined) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#007AFF" />
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
                <ActivityIndicator size="large" color="#007AFF" />
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

    const hotels = Array.isArray(itinerary.hotels) ? itinerary.hotels : (itinerary.hotels ? [itinerary.hotels] : []);
    const selectedHotel = hotels[selectedHotelIndex] || hotels[0];
    
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
                        <Ionicons name="briefcase-outline" size={14} color="#007AFF" />
                        <Text style={styles.luggageText}>{itinerary.flights.luggage}</Text>
                    </View>
                </View>
                
                <View style={styles.flightSegment}>
                    <View style={styles.segmentHeader}>
                        <Ionicons name="airplane" size={20} color="#007AFF" />
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
                        <Ionicons name="airplane" size={20} color="#007AFF" style={{ transform: [{ rotate: '180deg' }] }} />
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
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
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
                                            <Ionicons key={i} name="star" size={12} color="#FF9500" />
                                        ))}
                                    </View>
                                </View>
                                <Text style={styles.hotelDesc} numberOfLines={2}>{hotel.description}</Text>
                                <Text style={styles.price}>${hotel.pricePerNight}/night</Text>
                                <TouchableOpacity onPress={() => openMap(hotel.address)}>
                                    <Text style={styles.address} numberOfLines={1}>{hotel.address} <Ionicons name="map" size={12} color="#007AFF" /></Text>
                                </TouchableOpacity>
                                {selectedHotelIndex === index && (
                                    <View style={styles.selectedBadge}>
                                        <Ionicons name="checkmark-circle" size={20} color="#007AFF" />
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </Section>

                <Section title="Daily Itinerary">
                    {itinerary.dailyPlan.map((day: any, index: number) => (
                        <View key={index} style={styles.dayContainer}>
                            <View style={styles.dayHeader}>
                                <Text style={styles.dayTitle}>Day {day.day}</Text>
                            </View>
                            {day.activities.map((activity: any, actIndex: number) => (
                                <View key={actIndex} style={styles.activityRow}>
                                    <Text style={styles.activityTime}>{activity.time}</Text>
                                    <View style={styles.activityContent}>
                                        <Text style={styles.activityTitle}>{activity.title}</Text>
                                        <Text style={styles.activityDesc}>{activity.description}</Text>
                                        <TouchableOpacity onPress={() => openMap(`${activity.title} ${trip.destination}`)} style={styles.mapLink}>
                                            <Text style={styles.mapLinkText}>View on Map</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </View>
                    ))}
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
                <TouchableOpacity style={styles.bookButton}>
                    <Text style={styles.bookButtonText}>Book This Trip</Text>
                </TouchableOpacity>
            </View>
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
        backgroundColor: "#F2F2F7",
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    generatingText: {
        marginTop: 16,
        fontSize: 18,
        fontWeight: "600",
        color: "#1C1C1E",
    },
    generatingSubtext: {
        marginTop: 8,
        fontSize: 14,
        color: "#8E8E93",
    },
    errorText: {
        marginTop: 16,
        fontSize: 18,
        color: "#FF3B30",
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
        backgroundColor: "rgba(0,0,0,0.4)",
    },
    headerContent: {
        position: "absolute",
        bottom: 16,
        left: 16,
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
    destination: {
        fontSize: 32,
        fontWeight: "bold",
        color: "white",
    },
    dates: {
        fontSize: 16,
        color: "rgba(255,255,255,0.9)",
        marginTop: 4,
    },
    content: {
        padding: 16,
        paddingBottom: 100,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#1C1C1E",
        marginBottom: 12,
    },
    card: {
        backgroundColor: "white",
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
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
        fontWeight: "600",
        color: "#1C1C1E",
    },
    cardSubtitle: {
        fontSize: 14,
        color: "#8E8E93",
    },
    price: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#007AFF",
    },
    flightTimes: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: "#F2F2F7",
    },
    time: {
        fontSize: 14,
        fontWeight: "500",
        color: "#1C1C1E",
    },
    stars: {
        flexDirection: "row",
        gap: 2,
        marginTop: 2,
    },
    address: {
        fontSize: 14,
        color: "#8E8E93",
        marginTop: 8,
    },
    dayContainer: {
        backgroundColor: "white",
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    dayHeader: {
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#F2F2F7",
        paddingBottom: 12,
    },
    dayTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#1C1C1E",
    },
    activityRow: {
        flexDirection: "row",
        marginBottom: 20,
    },
    activityTime: {
        width: 70,
        fontSize: 14,
        fontWeight: "600",
        color: "#8E8E93",
    },
    activityContent: {
        flex: 1,
    },
    activityTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1C1C1E",
        marginBottom: 4,
    },
    activityDesc: {
        fontSize: 14,
        color: "#3A3A3C",
        lineHeight: 20,
    },
    mapLink: {
        marginTop: 4,
    },
    mapLinkText: {
        fontSize: 12,
        color: "#007AFF",
        fontWeight: "500",
    },
    flightHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    flightPrice: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#007AFF",
    },
    luggageBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#E1F0FF",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    luggageText: {
        fontSize: 12,
        color: "#007AFF",
        fontWeight: "600",
    },
    flightSegment: {
        marginBottom: 8,
    },
    segmentHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 8,
    },
    segmentTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: "#8E8E93",
    },
    duration: {
        fontSize: 14,
        color: "#8E8E93",
    },
    divider: {
        height: 1,
        backgroundColor: "#F2F2F7",
        marginVertical: 16,
    },
    hotelList: {
        paddingRight: 16,
        gap: 12,
    },
    hotelCard: {
        width: 280,
        backgroundColor: "white",
        borderRadius: 16,
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
        borderColor: "#007AFF",
        backgroundColor: "#F0F8FF",
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
        color: "#3A3A3C",
        marginBottom: 8,
        lineHeight: 18,
    },
    footer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "white",
        padding: 16,
        paddingBottom: Platform.OS === "ios" ? 32 : 16,
        borderTopWidth: 1,
        borderTopColor: "#E5E5EA",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
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
        color: "#8E8E93",
    },
    totalPrice: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#007AFF",
    },
    perPersonPrice: {
        fontSize: 14,
        color: "#3A3A3C",
        fontWeight: "500",
    },
    bookButton: {
        backgroundColor: "#007AFF",
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 24,
        marginLeft: 16,
    },
    bookButtonText: {
        color: "white",
        fontWeight: "bold",
        fontSize: 16,
    },
});
