import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Image, ActivityIndicator, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useDestinationImage } from "@/lib/useImages";
import { ImageWithAttribution } from "@/components/ImageWithAttribution";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useTheme } from "@/lib/ThemeContext";

const { width } = Dimensions.get("window");

// Destination highlights data
const DESTINATION_HIGHLIGHTS: Record<string, { emoji: string; highlights: string[]; bestFor: string[]; bestTime: string; currency: string; tip: string }> = {
    "Paris": {
        emoji: "🗼",
        highlights: ["Eiffel Tower", "Louvre Museum", "Champs-Élysées", "Notre-Dame"],
        bestFor: ["Romance", "Art & Culture", "Food & Wine"],
        bestTime: "May – Sept",
        currency: "EUR",
        tip: "Book Louvre tickets 4 weeks in advance to skip the long lines."
    },
    "Tokyo": {
        emoji: "🏯",
        highlights: ["Shibuya Crossing", "Senso-ji Temple", "Mount Fuji", "Akihabara"],
        bestFor: ["Culture", "Food", "Technology", "Shopping"],
        bestTime: "May – Sept",
        currency: "JPY",
        tip: "Book Shibuya Sky tickets 4 weeks in advance for the best sunset views over the city."
    },
    "New York": {
        emoji: "🗽",
        highlights: ["Times Square", "Central Park", "Statue of Liberty", "Broadway"],
        bestFor: ["Entertainment", "Shopping", "Food", "Art"],
        bestTime: "Apr – Jun",
        currency: "USD",
        tip: "Walk the High Line early in the morning to avoid the crowds."
    },
    "London": {
        emoji: "🎡",
        highlights: ["Big Ben", "Tower Bridge", "British Museum", "Hyde Park"],
        bestFor: ["History", "Theatre", "Shopping", "Pubs"],
        bestTime: "May – Sep",
        currency: "GBP",
        tip: "Use contactless payment for the Tube, it's cheaper than buying single tickets."
    },
    "Rome": {
        emoji: "🏛️",
        highlights: ["Colosseum", "Vatican City", "Trevi Fountain", "Pantheon"],
        bestFor: ["History", "Art", "Food", "Architecture"],
        bestTime: "Apr – Jun",
        currency: "EUR",
        tip: "Visit the Trevi Fountain at sunrise to get a photo without the crowds."
    },
    "Barcelona": {
        emoji: "⛪",
        highlights: ["Sagrada Familia", "Park Güell", "La Rambla", "Gothic Quarter"],
        bestFor: ["Architecture", "Beach", "Nightlife", "Food"],
        bestTime: "May – Jun",
        currency: "EUR",
        tip: "Buy tickets for Sagrada Familia online to avoid sold-out days."
    },
    "Dubai": {
        emoji: "🏙️",
        highlights: ["Burj Khalifa", "Dubai Mall", "Palm Jumeirah", "Desert Safari"],
        bestFor: ["Luxury", "Shopping", "Adventure", "Architecture"],
        bestTime: "Nov – Mar",
        currency: "AED",
        tip: "Book the Burj Khalifa observation deck for sunset."
    },
    "Bali": {
        emoji: "🌴",
        highlights: ["Ubud Rice Terraces", "Uluwatu Temple", "Seminyak Beach", "Mount Batur"],
        bestFor: ["Relaxation", "Spirituality", "Nature", "Surfing"],
        bestTime: "Apr – Oct",
        currency: "IDR",
        tip: "Hire a private driver for day trips, it's affordable and convenient."
    },
    "Amsterdam": {
        emoji: "🚲",
        highlights: ["Anne Frank House", "Van Gogh Museum", "Canal Cruise", "Vondelpark"],
        bestFor: ["Art", "Cycling", "History", "Nightlife"],
        bestTime: "Apr – May",
        currency: "EUR",
        tip: "Book Anne Frank House tickets exactly 6 weeks in advance."
    },
    "Sydney": {
        emoji: "🌉",
        highlights: ["Sydney Opera House", "Harbour Bridge", "Bondi Beach", "Taronga Zoo"],
        bestFor: ["Beach", "Wildlife", "Adventure", "Food"],
        bestTime: "Sep – Nov",
        currency: "AUD",
        tip: "Take the ferry to Manly for the best views of the harbor."
    },
};

const DEFAULT_HIGHLIGHTS = {
    emoji: "✈️",
    highlights: ["Local attractions", "Cultural sites", "Local cuisine", "Hidden gems"],
    bestFor: ["Adventure", "Culture", "Relaxation"],
    bestTime: "Check weather",
    currency: "USD",
    tip: "Explore the local markets for authentic food and souvenirs."
};

export default function DestinationPreviewScreen() {
    const router = useRouter();
    const { colors, isDarkMode } = useTheme();
    const {
        destination: destinationParam,
        image: imageParam,
        avgBudget,
        avgRating,
        tripCount
    } = useLocalSearchParams();
    
    const destination = typeof destinationParam === 'string' ? destinationParam : '';
    const { image, loading } = useDestinationImage(destination);
    const trackDownload = useAction(api.images.trackUnsplashDownload);
    const trendingDestinations = useQuery(api.trips.getTrendingDestinations) || [];
    
    const avgBudgetValue = parseFloat(typeof avgBudget === 'string' ? avgBudget : '2500') || 2500;
    const avgRatingValue = parseFloat(typeof avgRating === 'string' ? avgRating : '4.8') || 4.8;
    const tripCountValue = parseInt(typeof tripCount === 'string' ? tripCount : '1240') || 1240;

    const destinationKey = Object.keys(DESTINATION_HIGHLIGHTS).find(
        key => destination.toLowerCase().includes(key.toLowerCase())
    );
    const destinationData = destinationKey 
        ? DESTINATION_HIGHLIGHTS[destinationKey] 
        : DEFAULT_HIGHLIGHTS;

    const handleCreateTrip = async () => {
        if (image?.downloadLocation) {
            try {
                await trackDownload({ downloadLocation: image.downloadLocation });
            } catch (error) {
                console.error("Error tracking download:", error);
            }
        }
        router.push({
            pathname: "/create-trip",
            params: { prefilledDestination: destination }
        });
    };

    const otherDestinations = trendingDestinations.filter(d => d.city !== destination);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Trending</Text>
                    <TouchableOpacity style={styles.headerButton}>
                        <Ionicons name="search" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            <ScrollView 
                style={styles.scrollView} 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Hero Section */}
                <View style={styles.heroContainer}>
                    <View style={styles.heroImageWrapper}>
                        {loading ? (
                            <View style={[styles.heroPlaceholder, { backgroundColor: colors.card }]}>
                                <ActivityIndicator size="large" color={colors.primary} />
                            </View>
                        ) : image ? (
                            <ImageWithAttribution
                                imageUrl={image.url}
                                photographerName={image.photographer}
                                photographerUrl={image.photographerUrl || ""}
                                downloadLocation={image.downloadLocation}
                                onDownload={() => {
                                    if (image.downloadLocation) {
                                        trackDownload({ downloadLocation: image.downloadLocation }).catch(console.error);
                                    }
                                }}
                            />
                        ) : (
                            <View style={[styles.heroPlaceholder, { backgroundColor: colors.card }]}>
                                <Text style={styles.heroEmoji}>{destinationData.emoji}</Text>
                            </View>
                        )}
                        
                        <LinearGradient 
                            colors={["transparent", "rgba(0,0,0,0.6)"]} 
                            style={styles.heroGradient} 
                        />

                        <View style={styles.heroOverlay}>
                            <View style={styles.trendingBadge}>
                                <Text style={styles.trendingText}>Trending Now</Text>
                                <Ionicons name="arrow-up" size={12} color="#000" />
                            </View>
                            
                            <View style={styles.heroTextContent}>
                                <Text style={styles.planeraChoice}>PLANERA CHOICE</Text>
                                <Text style={styles.destinationTitle}>{destination}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Fast Facts */}
                <View style={styles.section}>
                    <Text style={[styles.sectionHeader, { color: colors.text }]}>Fast Facts</Text>
                    <View style={styles.fastFactsRow}>
                        <View style={[styles.factCard, { backgroundColor: colors.card }]}>
                            <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
                                <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                            </View>
                            <View>
                                <Text style={[styles.factLabel, { color: colors.textMuted }]}>Best visit</Text>
                                <Text style={[styles.factValue, { color: colors.text }]}>{destinationData.bestTime}</Text>
                            </View>
                        </View>
                        <View style={[styles.factCard, { backgroundColor: colors.card }]}>
                            <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
                                <Ionicons name="cash-outline" size={20} color={colors.primary} />
                            </View>
                            <View>
                                <Text style={[styles.factLabel, { color: colors.textMuted }]}>Currency</Text>
                                <Text style={[styles.factValue, { color: colors.text }]}>{destinationData.currency}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Community Data */}
                <View style={styles.section}>
                    <Text style={[styles.sectionHeader, { color: colors.text }]}>Community Data</Text>
                    <View style={[styles.communityContainer, { backgroundColor: colors.card }]}>
                        <View style={styles.communityItem}>
                            <Ionicons name="people" size={20} color={colors.primary} />
                            <Text style={[styles.communityText, { color: colors.text }]}>
                                <Text style={{ fontWeight: '700' }}>{tripCount.toLocaleString()}+</Text> Trips generated
                            </Text>
                        </View>
                        <View style={[styles.divider, { backgroundColor: colors.border }]} />
                        <View style={styles.communityItem}>
                            <Ionicons name="wallet" size={20} color={colors.primary} />
                            <Text style={[styles.communityText, { color: colors.text }]}>
                                Avg. Budget: <Text style={{ fontWeight: '700' }}>${Math.round(avgBudget).toLocaleString()}</Text>
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Traveler Insight */}
                <View style={styles.section}>
                    <Text style={[styles.sectionHeader, { color: colors.text }]}>Traveler Insight</Text>
                    <View style={[styles.insightCard, { backgroundColor: isDarkMode ? colors.card : '#FFF9E6' }]}>
                        <View style={styles.insightIconContainer}>
                            <Ionicons name="bulb" size={24} color={colors.primary} />
                        </View>
                        <Text style={[styles.insightQuote, { color: colors.text }]}>
                            "{destinationData.tip}"
                        </Text>
                    </View>
                </View>

                {/* More for you */}
                {otherDestinations.length > 0 && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionHeader, { color: colors.text }]}>More for you</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.moreScroll}>
                            {otherDestinations.map((item, index) => (
                                <TouchableOpacity 
                                    key={index} 
                                    style={[styles.moreCard, { backgroundColor: colors.card }]}
                                    onPress={() => router.push({
                                        pathname: "/destination-preview",
                                        params: { 
                                            destination: item.city,
                                            avgBudget: item.avgBudget,
                                            avgRating: item.rating,
                                            count: item.tripCount
                                        }
                                    })}
                                >
                                    <Image source={{ uri: item.imageUrl }} style={styles.moreImage} />
                                    <View style={styles.moreContent}>
                                        <Text style={[styles.moreTitle, { color: colors.text }]}>{item.city}</Text>
                                        <Text style={[styles.moreSubtitle, { color: colors.textMuted }]}>{item.tripCount} trips planned</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Fixed CTA */}
            <View style={[styles.ctaWrapper, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
                <TouchableOpacity 
                    style={[styles.ctaButton, { backgroundColor: colors.primary }]} 
                    onPress={handleCreateTrip}
                >
                    <Text style={styles.ctaText}>Plan Similar Trip</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    safeArea: {
        backgroundColor: 'transparent',
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    headerButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: colors.text,
    },
    iconButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: isDarkMode ? colors.card : colors.white,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 100,
    },
    heroContainer: {
        marginHorizontal: 20,
        marginTop: 10,
        height: 400,
        borderRadius: 24,
        overflow: "hidden",
        backgroundColor: colors.card,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 5,
    },
    heroImageWrapper: {
        height: 400,
        borderRadius: 24,
        overflow: 'hidden',
        position: 'relative',
    },
    heroPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroEmoji: {
        fontSize: 80,
    },
    heroGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 200,
    },
    heroOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.2)',
        justifyContent: 'space-between',
        padding: 20,
    },
    trendingBadge: {
        alignSelf: 'flex-start',
        backgroundColor: '#FFD700',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    trendingText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#000',
    },
    heroTextContent: {
        gap: 8,
    },
    planeraChoice: {
        color: "#FFF",
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: 1,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    destinationTitle: {
        color: "#FFF",
        fontSize: 36,
        fontWeight: "800",
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    section: {
        marginTop: 24,
        paddingHorizontal: 20,
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 12,
    },
    fastFactsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    factCard: {
        flex: 1,
        backgroundColor: colors.card,
        padding: 16,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: isDarkMode ? 1 : 0,
        borderColor: colors.border,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    factLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 4,
        fontWeight: "600",
    },
    factValue: {
        fontSize: 14,
        fontWeight: "700",
        color: colors.text,
    },
    communityContainer: {
        padding: 16,
        borderRadius: 16,
        gap: 16,
    },
    communityCard: {
        backgroundColor: colors.card,
        padding: 20,
        borderRadius: 20,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: isDarkMode ? 1 : 0,
        borderColor: colors.border,
    },
    communityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    communityText: {
        fontSize: 15,
    },
    communityValue: {
        fontSize: 16,
        fontWeight: "700",
        color: colors.text,
    },
    communityLabel: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    divider: {
        width: 1,
        height: 40,
        backgroundColor: colors.border,
    },
    insightCard: {
        backgroundColor: colors.secondary,
        padding: 20,
        borderRadius: 20,
        flexDirection: 'row',
        gap: 16,
        borderWidth: 1,
        borderColor: colors.primary + "40",
    },
    insightIconContainer: {
        marginTop: 2,
    },
    insightQuote: {
        flex: 1,
        fontSize: 16,
        fontStyle: 'italic',
        color: colors.text,
        lineHeight: 24,
    },
    moreScroll: {
        marginHorizontal: -20,
        paddingHorizontal: 20,
    },
    moreCard: {
        width: 160,
        borderRadius: 16,
        overflow: 'hidden',
    },
    moreImage: {
        width: '100%',
        height: 100,
    },
    moreContent: {
        padding: 12,
    },
    moreTitle: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 4,
    },
    moreSubtitle: {
        fontSize: 12,
    },
    ctaWrapper: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        paddingBottom: 34,
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    ctaButton: {
        backgroundColor: colors.primary,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    ctaText: {
        fontSize: 18,
        fontWeight: "700",
        color: "#000",
    },
});
