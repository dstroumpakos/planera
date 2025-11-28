
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";

export default function SubscriptionScreen() {
    const router = useRouter();
    const upgradeToPremium = useMutation(api.users.upgradeToPremium);
    const purchaseTripPack = useMutation(api.users.purchaseTripPack);
    const userPlan = useQuery(api.users.getPlan);
    const [loading, setLoading] = useState<string | null>(null);

    const handleUpgrade = async () => {
        setLoading("premium");
        try {
            await upgradeToPremium();
            if (Platform.OS !== "web") {
                Alert.alert("Success", "You are now a Premium member! Enjoy unlimited trips for 30 days.");
            }
            router.back();
        } catch (error) {
            console.error("Upgrade failed:", error);
            if (Platform.OS !== "web") {
                Alert.alert("Error", "Failed to upgrade plan");
            }
        } finally {
            setLoading(null);
        }
    };

    const handlePurchasePack = async (pack: "single" | "triple" | "ten") => {
        setLoading(pack);
        try {
            const result = await purchaseTripPack({ pack });
            if (Platform.OS !== "web") {
                Alert.alert("Success", `Added ${result.creditsAdded} trip credit${result.creditsAdded > 1 ? "s" : ""} to your account!`);
            }
            router.back();
        } catch (error) {
            console.error("Purchase failed:", error);
            if (Platform.OS !== "web") {
                Alert.alert("Error", "Failed to purchase trip pack");
            }
        } finally {
            setLoading(null);
        }
    };

    const premiumFeatures = [
        { icon: "infinite", text: "Unlimited trip generation" },
        { icon: "map", text: "Route optimization" },
        { icon: "pricetag", text: "Best-price alerts" },
        { icon: "calendar", text: "Personalized itineraries" },
        { icon: "heart", text: "Saved trips" },
        { icon: "airplane", text: "Multi-city planning" },
    ];

    const tripPacks = [
        { id: "single" as const, trips: 1, price: "€4", pricePerTrip: "€4/trip", popular: false },
        { id: "triple" as const, trips: 3, price: "€7", pricePerTrip: "€2.33/trip", popular: true },
        { id: "ten" as const, trips: 10, price: "€10", pricePerTrip: "€1/trip", popular: false },
    ];

    const isSubscriptionActive = userPlan?.isSubscriptionActive;
    const tripCredits = userPlan?.tripCredits ?? 0;

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>

            <View style={styles.header}>
                <Text style={styles.title}>Choose Your Plan</Text>
                <Text style={styles.subtitle}>Unlock AI-powered travel planning</Text>
            </View>

            {/* Current Status */}
            <View style={styles.statusCard}>
                <View style={styles.statusRow}>
                    <Ionicons name="ticket-outline" size={24} color="#007AFF" />
                    <Text style={styles.statusText}>
                        Trip Credits: <Text style={styles.statusValue}>{tripCredits}</Text>
                    </Text>
                </View>
                <View style={styles.statusRow}>
                    <Ionicons name="star-outline" size={24} color={isSubscriptionActive ? "#FFD700" : "#999"} />
                    <Text style={styles.statusText}>
                        Status: <Text style={[styles.statusValue, isSubscriptionActive ? styles.premiumStatus : undefined]}>
                            {isSubscriptionActive ? "Premium Active" : "Free Plan"}
                        </Text>
                    </Text>
                </View>
            </View>

            {/* Premium Subscription */}
            <View style={styles.premiumCard}>
                <View style={styles.premiumBadge}>
                    <Ionicons name="diamond" size={16} color="#FFF" />
                    <Text style={styles.premiumBadgeText}>BEST VALUE</Text>
                </View>
                
                <View style={styles.planHeader}>
                    <Text style={styles.planName}>Premium Subscription</Text>
                    <View style={styles.priceRow}>
                        <Text style={styles.price}>€3.99</Text>
                        <Text style={styles.period}>/month</Text>
                    </View>
                </View>

                <View style={styles.featuresList}>
                    {premiumFeatures.map((feature, index) => (
                        <View key={index} style={styles.featureItem}>
                            <Ionicons name={feature.icon as any} size={20} color="#007AFF" />
                            <Text style={styles.featureText}>{feature.text}</Text>
                        </View>
                    ))}
                </View>

                {isSubscriptionActive ? (
                    <View style={styles.currentPlanButton}>
                        <Ionicons name="checkmark-circle" size={20} color="#34C759" />
                        <Text style={styles.currentPlanText}>Active Until {new Date(userPlan?.subscriptionExpiresAt || 0).toLocaleDateString()}</Text>
                    </View>
                ) : (
                    <TouchableOpacity 
                        style={[styles.upgradeButton, loading === "premium" && styles.loadingButton]} 
                        onPress={handleUpgrade}
                        disabled={loading !== null}
                    >
                        <Text style={styles.upgradeButtonText}>
                            {loading === "premium" ? "Processing..." : "Subscribe Now"}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Trip Packs */}
            <Text style={styles.sectionTitle}>Or Buy Trip Packs</Text>
            <Text style={styles.sectionSubtitle}>Pay per trip, no subscription needed</Text>

            <View style={styles.packsContainer}>
                {tripPacks.map((pack) => (
                    <TouchableOpacity 
                        key={pack.id}
                        style={[styles.packCard, pack.popular && styles.popularPack]}
                        onPress={() => handlePurchasePack(pack.id)}
                        disabled={loading !== null}
                    >
                        {pack.popular && (
                            <View style={styles.popularBadge}>
                                <Text style={styles.popularBadgeText}>POPULAR</Text>
                            </View>
                        )}
                        <Text style={styles.packTrips}>{pack.trips}</Text>
                        <Text style={styles.packLabel}>Trip{pack.trips > 1 ? "s" : ""}</Text>
                        <Text style={styles.packPrice}>{pack.price}</Text>
                        <Text style={styles.packPerTrip}>{pack.pricePerTrip}</Text>
                        <View style={[styles.packButton, loading === pack.id && styles.loadingButton]}>
                            <Text style={styles.packButtonText}>
                                {loading === pack.id ? "..." : "Buy"}
                            </Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Free Plan Info */}
            <View style={styles.freePlan}>
                <Ionicons name="gift-outline" size={24} color="#666" />
                <Text style={styles.freePlanTitle}>Free Trial</Text>
                <Text style={styles.freePlanText}>
                    New users get 1 free trip to try our AI travel planner!
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F5F5F5",
    },
    content: {
        padding: 20,
        paddingTop: 60,
        paddingBottom: 40,
    },
    backButton: {
        marginBottom: 20,
    },
    header: {
        marginBottom: 24,
    },
    title: {
        fontSize: 32,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: "#666",
    },
    statusCard: {
        backgroundColor: "#FFF",
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
        gap: 12,
    },
    statusRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    statusText: {
        fontSize: 16,
        color: "#666",
    },
    statusValue: {
        fontWeight: "bold",
        color: "#333",
    },
    premiumStatus: {
        color: "#FFD700",
    },
    premiumCard: {
        backgroundColor: "#FFF",
        borderRadius: 20,
        padding: 24,
        shadowColor: "#007AFF",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 5,
        marginBottom: 32,
        borderWidth: 2,
        borderColor: "#007AFF",
        position: "relative",
        overflow: "hidden",
    },
    premiumBadge: {
        position: "absolute",
        top: 16,
        right: -30,
        backgroundColor: "#007AFF",
        paddingVertical: 4,
        paddingHorizontal: 40,
        transform: [{ rotate: "45deg" }],
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    premiumBadgeText: {
        color: "#FFF",
        fontSize: 10,
        fontWeight: "bold",
    },
    planHeader: {
        marginBottom: 20,
    },
    planName: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 8,
    },
    priceRow: {
        flexDirection: "row",
        alignItems: "baseline",
    },
    price: {
        fontSize: 40,
        fontWeight: "bold",
        color: "#007AFF",
    },
    period: {
        fontSize: 16,
        color: "#666",
        marginLeft: 4,
    },
    featuresList: {
        gap: 12,
        marginBottom: 24,
    },
    featureItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    featureText: {
        fontSize: 15,
        color: "#444",
    },
    upgradeButton: {
        backgroundColor: "#007AFF",
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: "center",
    },
    loadingButton: {
        opacity: 0.7,
    },
    upgradeButtonText: {
        color: "#FFF",
        fontSize: 18,
        fontWeight: "bold",
    },
    currentPlanButton: {
        backgroundColor: "#E8F5E9",
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "center",
        gap: 8,
    },
    currentPlanText: {
        color: "#34C759",
        fontSize: 16,
        fontWeight: "600",
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: "#666",
        marginBottom: 16,
    },
    packsContainer: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 32,
    },
    packCard: {
        flex: 1,
        backgroundColor: "#FFF",
        borderRadius: 16,
        padding: 16,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#E0E0E0",
        position: "relative",
        overflow: "hidden",
    },
    popularPack: {
        borderColor: "#FF9500",
        borderWidth: 2,
    },
    popularBadge: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: "#FF9500",
        paddingVertical: 4,
    },
    popularBadgeText: {
        color: "#FFF",
        fontSize: 10,
        fontWeight: "bold",
        textAlign: "center",
    },
    packTrips: {
        fontSize: 36,
        fontWeight: "bold",
        color: "#333",
        marginTop: 16,
    },
    packLabel: {
        fontSize: 14,
        color: "#666",
        marginBottom: 8,
    },
    packPrice: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#007AFF",
    },
    packPerTrip: {
        fontSize: 12,
        color: "#999",
        marginBottom: 12,
    },
    packButton: {
        backgroundColor: "#007AFF",
        paddingVertical: 10,
        paddingHorizontal: 24,
        borderRadius: 8,
    },
    packButtonText: {
        color: "#FFF",
        fontSize: 14,
        fontWeight: "bold",
    },
    freePlan: {
        alignItems: "center",
        padding: 24,
        backgroundColor: "#FFF",
        borderRadius: 16,
        gap: 8,
    },
    freePlanTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#666",
    },
    freePlanText: {
        fontSize: 14,
        color: "#888",
        textAlign: "center",
    },
});
