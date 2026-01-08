import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Image, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useDestinationImage } from "@/lib/useImages";
import { ImageWithAttribution } from "@/components/ImageWithAttribution";

const { width } = Dimensions.get("window");

const COLORS = {
    primary: "#FFE500",
    primaryDark: "#E6CF00",
    background: "#FAF9F6",
    text: "#1A1A1A",
    textSecondary: "#6B6B6B",
    textMuted: "#9B9B9B",
    white: "#FFFFFF",
    border: "#E8E6E1",
};

// Destination highlights data
const DESTINATION_HIGHLIGHTS: Record<string, { emoji: string; highlights: string[]; bestFor: string[]; bestTime: string }> = {
    "Paris": {
        emoji: "🗼",
        highlights: ["Eiffel Tower", "Louvre Museum", "Champs-Élysées", "Notre-Dame"],
        bestFor: ["Romance", "Art & Culture", "Food & Wine"],
        bestTime: "Apr - Jun, Sep - Nov"
    },
    "Tokyo": {
        emoji: "🏯",
        highlights: ["Shibuya Crossing", "Senso-ji Temple", "Mount Fuji", "Akihabara"],
        bestFor: ["Culture", "Food", "Technology", "Shopping"],
        bestTime: "Mar - May, Sep - Nov"
    },
    "New York": {
        emoji: "🗽",
        highlights: ["Times Square", "Central Park", "Statue of Liberty", "Broadway"],
        bestFor: ["Entertainment", "Shopping", "Food", "Art"],
        bestTime: "Apr - Jun, Sep - Nov"
    },
    "London": {
        emoji: "🎡",
        highlights: ["Big Ben", "Tower Bridge", "British Museum", "Hyde Park"],
        bestFor: ["History", "Theatre", "Shopping", "Pubs"],
        bestTime: "May - Sep"
    },
    "Rome": {
        emoji: "🏛️",
        highlights: ["Colosseum", "Vatican City", "Trevi Fountain", "Pantheon"],
        bestFor: ["History", "Art", "Food", "Architecture"],
        bestTime: "Apr - Jun, Sep - Oct"
    },
    "Barcelona": {
        emoji: "⛪",
        highlights: ["Sagrada Familia", "Park Güell", "La Rambla", "Gothic Quarter"],
        bestFor: ["Architecture", "Beach", "Nightlife", "Food"],
        bestTime: "May - Jun, Sep - Oct"
    },
    "Dubai": {
        emoji: "🏙️",
        highlights: ["Burj Khalifa", "Dubai Mall", "Palm Jumeirah", "Desert Safari"],
        bestFor: ["Luxury", "Shopping", "Adventure", "Architecture"],
        bestTime: "Nov - Mar"
    },
    "Bali": {
        emoji: "🌴",
        highlights: ["Ubud Rice Terraces", "Uluwatu Temple", "Seminyak Beach", "Mount Batur"],
        bestFor: ["Relaxation", "Spirituality", "Nature", "Surfing"],
        bestTime: "Apr - Oct"
    },
    "Amsterdam": {
        emoji: "🚲",
        highlights: ["Anne Frank House", "Van Gogh Museum", "Canal Cruise", "Vondelpark"],
        bestFor: ["Art", "Cycling", "History", "Nightlife"],
        bestTime: "Apr - May, Sep - Nov"
    },
    "Sydney": {
        emoji: "🌉",
        highlights: ["Sydney Opera House", "Harbour Bridge", "Bondi Beach", "Taronga Zoo"],
        bestFor: ["Beach", "Wildlife", "Adventure", "Food"],
        bestTime: "Sep - Nov, Mar - May"
    },
};

const DEFAULT_HIGHLIGHTS = {
    emoji: "✈️",
    highlights: ["Local attractions", "Cultural sites", "Local cuisine", "Hidden gems"],
    bestFor: ["Adventure", "Culture", "Relaxation"],
    bestTime: "Check local weather"
};

export default function DestinationPreviewScreen() {
    const router = useRouter();
    const { destination } = useLocalSearchParams<{ destination: string }>();
    const { image, loading } = useDestinationImage(destination);
    
    const avgBudget = parseFloat((useLocalSearchParams() as any).avgBudget) || 0;
    const avgRating = parseFloat((useLocalSearchParams() as any).avgRating) || 0;
    const tripCount = parseInt((useLocalSearchParams() as any).count) || 0;

    // Get destination-specific data or defaults
    const destinationKey = Object.keys(DESTINATION_HIGHLIGHTS).find(
        key => destination.toLowerCase().includes(key.toLowerCase())
    );
    const destinationData = destinationKey 
        ? DESTINATION_HIGHLIGHTS[destinationKey] 
        : DEFAULT_HIGHLIGHTS;

    const handleCreateTrip = () => {
        router.push({
            pathname: "/create-trip",
            params: { prefilledDestination: destination }
        });
    };

    return (
        <View style={styles.container}>
            {/* Hero Image Section */}
            <View style={styles.heroSection}>
                {loading ? (
                    <View style={styles.heroBackground}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                    </View>
                ) : image ? (
                    <View style={styles.heroImageWrapper}>
                        <ImageWithAttribution
                            imageUrl={image.url}
                            photographerName={image.photographer}
                            unsplashUrl={image.attribution}
                            photographerUrl={image.photographerUrl}
                            style={styles.heroImageContainer}
                            imageStyle={styles.heroImage}
                        />
                    </View>
                ) : (
                    <View style={styles.heroBackground}>
                        <Text style={styles.heroEmoji}>{destinationData.emoji}</Text>
                    </View>
                )}
                <LinearGradient
                    colors={["transparent", "rgba(0,0,0,0.7)"]}
                    style={styles.heroGradient}
                />
                
                {/* Back Button */}
                <SafeAreaView style={styles.headerOverlay}>
                    <TouchableOpacity 
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="arrow-back" size={24} color={COLORS.white} />
                    </TouchableOpacity>
                </SafeAreaView>

                {/* Hero Content */}
                <View style={styles.heroContent}>
                    <Text style={styles.heroTitle}>{destination}</Text>
                    <View style={styles.heroStats}>
                        <View style={styles.statItem}>
                            <Ionicons name="star" size={16} color={COLORS.primary} />
                            <Text style={styles.statValue}>{avgRating.toFixed(1)}</Text>
                            <Text style={styles.statLabel}>rating</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Ionicons name="people" size={16} color={COLORS.primary} />
                            <Text style={styles.statValue}>{tripCount}</Text>
                            <Text style={styles.statLabel}>trips</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Ionicons name="wallet" size={16} color={COLORS.primary} />
                            <Text style={styles.statValue}>€{Math.round(avgBudget)}</Text>
                            <Text style={styles.statLabel}>avg budget</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Content Section */}
            <ScrollView 
                style={styles.contentSection}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                {/* Best Time to Visit */}
                <View style={styles.infoCard}>
                    <View style={styles.infoCardHeader}>
                        <Ionicons name="calendar" size={20} color={COLORS.primary} />
                        <Text style={styles.infoCardTitle}>Best Time to Visit</Text>
                    </View>
                    <Text style={styles.infoCardText}>{destinationData.bestTime}</Text>
                </View>

                {/* Top Highlights */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Top Highlights</Text>
                    <View style={styles.highlightsGrid}>
                        {destinationData.highlights.map((highlight, index) => (
                            <View key={index} style={styles.highlightChip}>
                                <Ionicons name="location" size={14} color={COLORS.primary} />
                                <Text style={styles.highlightText}>{highlight}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Best For */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Perfect For</Text>
                    <View style={styles.tagsContainer}>
                        {destinationData.bestFor.map((tag, index) => (
                            <View key={index} style={styles.tag}>
                                <Text style={styles.tagText}>{tag}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Traveler Insights */}
                <View style={styles.insightCard}>
                    <View style={styles.insightHeader}>
                        <Ionicons name="bulb" size={24} color={COLORS.primary} />
                        <Text style={styles.insightTitle}>From Our Travelers</Text>
                    </View>
                    <Text style={styles.insightText}>
                        {tripCount > 0 
                            ? `${tripCount} travelers have explored ${destination} with Planera. The average trip budget is €${Math.round(avgBudget)}, with an overall satisfaction rating of ${avgRating.toFixed(1)}/5.`
                            : `Be the first to explore ${destination} with Planera and share your experience!`
                        }
                    </Text>
                </View>

                {/* Spacer for CTA */}
                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Fixed CTA */}
            <SafeAreaView edges={["bottom"]} style={styles.ctaContainer}>
                <View style={styles.ctaContent}>
                    <View style={styles.ctaPricing}>
                        <Text style={styles.ctaLabel}>From</Text>
                        <Text style={styles.ctaPrice}>€{Math.round(avgBudget * 0.7)}</Text>
                        <Text style={styles.ctaPerPerson}>/person</Text>
                    </View>
                    <TouchableOpacity 
                        style={styles.ctaButton}
                        onPress={handleCreateTrip}
                    >
                        <Text style={styles.ctaButtonText}>Plan My Trip</Text>
                        <Ionicons name="arrow-forward" size={20} color={COLORS.text} />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    heroSection: {
        height: 320,
        position: "relative",
    },
    heroImageWrapper: {
        flex: 1,
        overflow: "hidden",
    },
    heroImageContainer: {
        flex: 1,
        width: "100%",
        height: "100%",
    },
    heroBackground: {
        flex: 1,
        backgroundColor: "#1A1A2E",
        justifyContent: "center",
        alignItems: "center",
    },
    heroImage: {
        ...StyleSheet.absoluteFillObject,
        width: "100%",
        height: "100%",
    },
    heroEmoji: {
        fontSize: 100,
        opacity: 0.3,
    },
    heroGradient: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 200,
    },
    headerOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "rgba(0,0,0,0.3)",
        justifyContent: "center",
        alignItems: "center",
        marginLeft: 16,
        marginTop: 8,
    },
    heroContent: {
        position: "absolute",
        bottom: 24,
        left: 20,
        right: 20,
    },
    heroTitle: {
        fontSize: 36,
        fontWeight: "800",
        color: COLORS.white,
        marginBottom: 16,
    },
    heroStats: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.15)",
        borderRadius: 16,
        padding: 16,
    },
    statItem: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
    },
    statValue: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.white,
    },
    statLabel: {
        fontSize: 12,
        color: "rgba(255,255,255,0.7)",
    },
    statDivider: {
        width: 1,
        height: 24,
        backgroundColor: "rgba(255,255,255,0.2)",
    },
    contentSection: {
        flex: 1,
    },
    contentContainer: {
        padding: 20,
    },
    infoCard: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    infoCardHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginBottom: 8,
    },
    infoCardTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.text,
    },
    infoCardText: {
        fontSize: 15,
        color: COLORS.textSecondary,
        marginLeft: 30,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.text,
        marginBottom: 12,
    },
    highlightsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    },
    highlightChip: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.white,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        gap: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    highlightText: {
        fontSize: 14,
        color: COLORS.text,
        fontWeight: "500",
    },
    tagsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    },
    tag: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
    },
    tagText: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.text,
    },
    insightCard: {
        backgroundColor: "#FFF9E6",
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    insightHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 12,
    },
    insightTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.text,
    },
    insightText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        lineHeight: 22,
    },
    ctaContainer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.white,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    ctaContent: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    ctaPricing: {
        flexDirection: "row",
        alignItems: "baseline",
        gap: 4,
    },
    ctaLabel: {
        fontSize: 14,
        color: COLORS.textMuted,
    },
    ctaPrice: {
        fontSize: 24,
        fontWeight: "800",
        color: COLORS.text,
    },
    ctaPerPerson: {
        fontSize: 14,
        color: COLORS.textMuted,
    },
    ctaButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.primary,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 14,
        gap: 8,
    },
    ctaButtonText: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.text,
    },
});
