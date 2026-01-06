import { Text, View, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, Image, ScrollView, TextInput } from "react-native";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Id } from "@/convex/_generated/dataModel";
import { SafeAreaView } from "react-native-safe-area-context";
import { authClient } from "@/lib/auth-client";
import TripCounter from "@/components/TripCounter";

// Planera Colors
const COLORS = {
    primary: "#FFE500",
    primaryDark: "#E6CF00",
    background: "#FAF9F6",
    backgroundDark: "#F5F3EE",
    text: "#1A1A1A",
    textSecondary: "#6B6B6B",
    textMuted: "#9B9B9B",
    white: "#FFFFFF",
    border: "#E8E6E1",
    cardBg: "#FFFFFF",
};

export default function HomeScreen() {
    const router = useRouter();
    const { isAuthenticated } = useConvexAuth();
    const { data: session } = authClient.useSession();
    const trips = useQuery(api.trips.list, isAuthenticated ? {} : "skip");
    const trendingDestinations = useQuery(api.trips.getTrendingDestinations, isAuthenticated ? {} : "skip");

    const user = session?.user;
    const userName = user?.name?.split(" ")[0] || "Traveler";
    
    // Get greeting based on time
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 18) return "Good Afternoon";
        return "Good Evening";
    };

    const quickActions = [
        { id: "ai", icon: "sparkles", label: "AI", sublabel: "Trip Planner", color: COLORS.primary, onPress: () => router.push("/create-trip") },
        { id: "multi", icon: "git-compare-outline", label: "Multi-City", sublabel: "Route", color: COLORS.white, onPress: () => router.push("/create-trip") },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView 
                style={styles.scrollView} 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <View style={styles.avatarContainer}>
                            <Text style={styles.avatarText}>{userName[0]?.toUpperCase()}</Text>
                            <View style={styles.onlineIndicator} />
                        </View>
                        <View>
                            <Text style={styles.greeting}>{getGreeting()},</Text>
                            <Text style={styles.userName}>{userName}</Text>
                        </View>
                    </View>
                    <View style={styles.headerRight}>
                        <TripCounter />
                    </View>
                </View>

                {/* Hero Text */}
                <View style={styles.heroSection}>
                    <Text style={styles.heroTitle}>Ready for your</Text>
                    <Text style={styles.heroTitleHighlight}>next journey?</Text>
                </View>

                {/* Search Bar */}
                <TouchableOpacity 
                    style={styles.searchBar}
                    onPress={() => router.push("/create-trip")}
                    activeOpacity={0.8}
                >
                    <Ionicons name="search" size={20} color={COLORS.textMuted} />
                    <Text style={styles.searchPlaceholder}>Where do you want to go?</Text>
                    <View style={styles.searchButton}>
                        <Ionicons name="arrow-forward" size={20} color={COLORS.text} />
                    </View>
                </TouchableOpacity>

                {/* Quick Actions */}
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.quickActionsContainer}
                >
                    {quickActions.map((action) => (
                        <TouchableOpacity 
                            key={action.id}
                            style={[
                                styles.quickActionCard,
                                { backgroundColor: action.color }
                            ]}
                            onPress={action.onPress}
                        >
                            <View style={styles.quickActionIcon}>
                                <Ionicons 
                                    name={action.icon as any} 
                                    size={20} 
                                    color={action.color === COLORS.primary ? COLORS.text : COLORS.text} 
                                />
                            </View>
                            <Text style={styles.quickActionLabel}>{action.label}</Text>
                            <Text style={styles.quickActionSublabel}>{action.sublabel}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Trending Now */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Trending Now</Text>
                    <TouchableOpacity>
                        <Text style={styles.viewAllText}>View All</Text>
                    </TouchableOpacity>
                </View>

                {trendingDestinations === undefined ? (
                    <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 20 }} />
                ) : trendingDestinations.length === 0 ? (
                    <View style={styles.emptyTrendingContainer}>
                        <Text style={styles.emptyTrendingText}>No trending destinations yet</Text>
                    </View>
                ) : (
                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.trendingContainer}
                    >
                        {trendingDestinations.map((destination, index) => (
                            <TouchableOpacity 
                                key={index}
                                style={styles.trendingCard}
                                onPress={() => router.push("/create-trip")}
                            >
                                <View style={styles.trendingImageContainer}>
                                    <View style={styles.trendingImagePlaceholder}>
                                        <Text style={styles.trendingEmoji}>✈️</Text>
                                    </View>
                                    <View style={styles.ratingBadge}>
                                        <Ionicons name="star" size={12} color={COLORS.primary} />
                                        <Text style={styles.ratingText}>{destination.avgRating.toFixed(1)}</Text>
                                    </View>
                                    <TouchableOpacity style={styles.arrowButton}>
                                        <Ionicons name="arrow-forward" size={16} color={COLORS.text} />
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.trendingInfo}>
                                    <Text style={styles.trendingName}>{destination.destination}</Text>
                                    <View style={styles.trendingLocation}>
                                        <Ionicons name="people" size={12} color={COLORS.textMuted} />
                                        <Text style={styles.trendingCountry}>{destination.count} trips</Text>
                                    </View>
                                    <Text style={styles.trendingPrice}>€{Math.round(destination.avgBudget)}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}

                {/* My Trips Section */}
                {trips && trips.length > 0 && (
                    <>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>My Trips</Text>
                            <TouchableOpacity onPress={() => router.push("/(tabs)/trips")}>
                                <Text style={styles.viewAllText}>View All</Text>
                            </TouchableOpacity>
                        </View>

                        {trips.slice(0, 2).map((trip) => (
                            <TouchableOpacity 
                                key={trip._id}
                                style={styles.tripCard}
                                onPress={() => router.push(`/trip/${trip._id}`)}
                            >
                                <View style={styles.tripIconContainer}>
                                    <Ionicons name="airplane" size={24} color={COLORS.white} />
                                </View>
                                <View style={styles.tripInfo}>
                                    <Text style={styles.tripDestination}>{trip.destination}</Text>
                                    <Text style={styles.tripDates}>
                                        {new Date(trip.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - {new Date(trip.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                    </Text>
                                </View>
                                <View style={[
                                    styles.tripStatusBadge,
                                    trip.status === "completed" && styles.tripStatusCompleted,
                                    trip.status === "generating" && styles.tripStatusGenerating,
                                ]}>
                                    <Text style={styles.tripStatusText}>{trip.status}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </>
                )}

                {/* Empty State for No Trips */}
                {trips && trips.length === 0 && (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIconContainer}>
                            <Ionicons name="airplane-outline" size={40} color={COLORS.primary} />
                        </View>
                        <Text style={styles.emptyTitle}>No trips yet</Text>
                        <Text style={styles.emptySubtitle}>Start planning your next adventure!</Text>
                        <TouchableOpacity 
                            style={styles.createTripButton}
                            onPress={() => router.push("/create-trip")}
                        >
                            <Text style={styles.createTripButtonText}>Create Your First Trip</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Bottom Spacing for Tab Bar */}
                <View style={{ height: 100 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: 8,
        paddingBottom: 16,
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    headerRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    avatarContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#FFD6CC",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
    },
    avatarText: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.text,
    },
    onlineIndicator: {
        position: "absolute",
        bottom: 2,
        right: 2,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: "#4CAF50",
        borderWidth: 2,
        borderColor: COLORS.background,
    },
    greeting: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    userName: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.text,
    },
    notificationButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: COLORS.white,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: COLORS.border,
        position: "relative",
    },
    notificationBadge: {
        position: "absolute",
        top: 12,
        right: 12,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#EF4444",
    },
    heroSection: {
        marginBottom: 20,
    },
    heroTitle: {
        fontSize: 32,
        fontWeight: "800",
        color: COLORS.text,
    },
    heroTitleHighlight: {
        fontSize: 32,
        fontWeight: "800",
        color: COLORS.textMuted,
    },
    searchBar: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.white,
        borderRadius: 16,
        paddingLeft: 16,
        paddingRight: 6,
        paddingVertical: 6,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    searchPlaceholder: {
        flex: 1,
        fontSize: 16,
        color: COLORS.textMuted,
        marginLeft: 12,
    },
    searchButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: COLORS.primary,
        justifyContent: "center",
        alignItems: "center",
    },
    quickActionsContainer: {
        paddingBottom: 24,
        gap: 12,
    },
    quickActionCard: {
        width: 140,
        padding: 16,
        borderRadius: 20,
        marginRight: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    quickActionIcon: {
        marginBottom: 12,
    },
    quickActionLabel: {
        fontSize: 18,
        fontWeight: "800",
        color: COLORS.text,
    },
    quickActionSublabel: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "800",
        color: COLORS.text,
    },
    viewAllText: {
        fontSize: 14,
        color: COLORS.textMuted,
        fontWeight: "600",
    },
    trendingContainer: {
        paddingBottom: 24,
    },
    trendingCard: {
        width: 220,
        marginRight: 16,
        borderRadius: 20,
        overflow: "hidden",
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    trendingImageContainer: {
        height: 180,
        position: "relative",
    },
    trendingImagePlaceholder: {
        flex: 1,
        backgroundColor: "#1A1A2E",
        justifyContent: "center",
        alignItems: "center",
    },
    trendingEmoji: {
        fontSize: 48,
    },
    ratingBadge: {
        position: "absolute",
        top: 12,
        right: 12,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.95)",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    ratingText: {
        fontSize: 12,
        fontWeight: "700",
        color: COLORS.text,
    },
    arrowButton: {
        position: "absolute",
        bottom: 12,
        right: 12,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.white,
        justifyContent: "center",
        alignItems: "center",
    },
    trendingInfo: {
        padding: 16,
    },
    trendingName: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.white,
        position: "absolute",
        bottom: 60,
        left: 16,
    },
    trendingLocation: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginBottom: 8,
    },
    trendingCountry: {
        fontSize: 14,
        color: COLORS.textMuted,
    },
    trendingPrice: {
        fontSize: 18,
        fontWeight: "800",
        color: COLORS.primary,
    },
    tripCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    tripIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: COLORS.text,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    tripInfo: {
        flex: 1,
    },
    tripDestination: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.text,
        marginBottom: 4,
    },
    tripDates: {
        fontSize: 14,
        color: COLORS.textMuted,
    },
    tripStatusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: COLORS.backgroundDark,
    },
    tripStatusCompleted: {
        backgroundColor: "#E8F5E9",
    },
    tripStatusGenerating: {
        backgroundColor: "#FFF8E1",
    },
    tripStatusText: {
        fontSize: 12,
        fontWeight: "600",
        color: COLORS.text,
        textTransform: "capitalize",
    },
    emptyState: {
        alignItems: "center",
        paddingVertical: 40,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.white,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: COLORS.text,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: COLORS.textMuted,
        marginBottom: 24,
    },
    createTripButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 12,
    },
    createTripButtonText: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.text,
    },
    emptyTrendingContainer: {
        paddingVertical: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    emptyTrendingText: {
        fontSize: 14,
        color: COLORS.textMuted,
    },
});
