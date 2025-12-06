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
    const cancelSubscription = useMutation(api.users.cancelSubscription);
    const userPlan = useQuery(api.users.getPlan);
    const [loading, setLoading] = useState<string | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("yearly");

    const handleUpgrade = async (planType: "monthly" | "yearly") => {
        setLoading(planType);
        try {
            await upgradeToPremium({ planType });
            if (Platform.OS !== "web") {
                const duration = planType === "yearly" ? "1 year" : "30 days";
                Alert.alert("Success", `You are now a Premium member! Enjoy unlimited trips for ${duration}.`);
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

    const handleCancelSubscription = async () => {
        if (Platform.OS !== "web") {
            Alert.alert(
                "Cancel Subscription",
                "Are you sure you want to cancel your subscription? You will still have access until your current billing period ends.",
                [
                    { text: "Keep Subscription", style: "cancel" },
                    { 
                        text: "Cancel Subscription", 
                        style: "destructive",
                        onPress: async () => {
                            setLoading("cancel");
                            try {
                                await cancelSubscription({});
                                Alert.alert("Subscription Cancelled", "Your subscription has been cancelled. You can resubscribe anytime.");
                            } catch (error) {
                                console.error("Cancel failed:", error);
                                Alert.alert("Error", "Failed to cancel subscription");
                            } finally {
                                setLoading(null);
                            }
                        }
                    },
                ]
            );
        } else {
            setLoading("cancel");
            try {
                await cancelSubscription({});
            } catch (error) {
                console.error("Cancel failed:", error);
            } finally {
                setLoading(null);
            }
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
                <Ionicons name="arrow-back" size={24} color="#0D9488" />
            </TouchableOpacity>

            <View style={styles.header}>
                <Text style={styles.title}>Choose Your Plan</Text>
                <Text style={styles.subtitle}>Unlock AI-powered travel planning</Text>
            </View>

            {/* Current Status */}
            <View style={styles.statusCard}>
                <View style={styles.statusRow}>
                    <Ionicons name="ticket-outline" size={24} color="#14B8A6" />
                    <Text style={styles.statusText}>
                        Trip Credits: <Text style={styles.statusValue}>{tripCredits}</Text>
                    </Text>
                </View>
                <View style={styles.statusRow}>
                    <Ionicons name="star-outline" size={24} color={isSubscriptionActive ? "#F59E0B" : "#999"} />
                    <Text style={styles.statusText}>
                        Status: <Text style={[styles.statusValue, isSubscriptionActive ? styles.premiumStatus : undefined]}>
                            {isSubscriptionActive ? "Premium Active" : "Free Plan"}
                        </Text>
                    </Text>
                </View>
            </View>

            {/* Premium Plans Section */}
            <Text style={styles.sectionTitle}>Premium Subscription</Text>
            <Text style={styles.sectionSubtitle}>Choose your billing cycle</Text>

            {/* Plan Toggle */}
            <View style={styles.planToggle}>
                <TouchableOpacity 
                    style={[styles.toggleOption, selectedPlan === "monthly" && styles.toggleOptionActive]}
                    onPress={() => setSelectedPlan("monthly")}
                >
                    <Text style={[styles.toggleText, selectedPlan === "monthly" && styles.toggleTextActive]}>Monthly</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.toggleOption, selectedPlan === "yearly" && styles.toggleOptionActive]}
                    onPress={() => setSelectedPlan("yearly")}
                >
                    <Text style={[styles.toggleText, selectedPlan === "yearly" && styles.toggleTextActive]}>Yearly</Text>
                    <View style={styles.saveBadge}>
                        <Text style={styles.saveBadgeText}>SAVE 39%</Text>
                    </View>
                </TouchableOpacity>
            </View>

            {/* Yearly Plan Card */}
            {selectedPlan === "yearly" && (
                <View style={styles.premiumCard}>
                    <View style={styles.bestValueBadge}>
                        <Ionicons name="diamond" size={14} color="#FFF" />
                        <Text style={styles.bestValueText}>BEST VALUE</Text>
                    </View>
                    
                    <View style={styles.planHeader}>
                        <Text style={styles.planName}>Yearly Premium</Text>
                        <View style={styles.priceContainer}>
                            <View style={styles.priceRow}>
                                <Text style={styles.price}>€2.91</Text>
                                <Text style={styles.period}>/month</Text>
                            </View>
                            <Text style={styles.billedText}>Billed €34.99/year</Text>
                        </View>
                    </View>

                    <View style={styles.featuresList}>
                        {premiumFeatures.map((feature, index) => (
                            <View key={index} style={styles.featureItem}>
                                <Ionicons name={feature.icon as any} size={20} color="#14B8A6" />
                                <Text style={styles.featureText}>{feature.text}</Text>
                            </View>
                        ))}
                    </View>

                    {isSubscriptionActive ? (
                        <View style={styles.subscribedActions}>
                            <View style={styles.currentPlanButton}>
                                <Ionicons name="checkmark-circle" size={20} color="#34C759" />
                                <Text style={styles.currentPlanText}>Active Until {new Date(userPlan?.subscriptionExpiresAt || 0).toLocaleDateString()}</Text>
                            </View>
                            <TouchableOpacity 
                                style={[styles.cancelButton, loading === "cancel" && styles.loadingButton]}
                                onPress={handleCancelSubscription}
                                disabled={loading !== null}
                            >
                                <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
                                <Text style={styles.cancelButtonText}>
                                    {loading === "cancel" ? "Cancelling..." : "Cancel Subscription"}
                                </Text>
                            </TouchableOpacity>
                            <Text style={styles.flexibleNote}>Flexible - Cancel anytime</Text>
                        </View>
                    ) : (
                        <TouchableOpacity 
                            style={[styles.upgradeButton, loading === "yearly" && styles.loadingButton]} 
                            onPress={() => handleUpgrade("yearly")}
                            disabled={loading !== null}
                        >
                            <Text style={styles.upgradeButtonText}>
                                {loading === "yearly" ? "Processing..." : "Subscribe Yearly - €34.99"}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Monthly Plan Card */}
            {selectedPlan === "monthly" && (
                <View style={styles.monthlyCard}>
                    <View style={styles.planHeader}>
                        <Text style={styles.planName}>Monthly Premium</Text>
                        <View style={styles.priceContainer}>
                            <View style={styles.priceRow}>
                                <Text style={styles.price}>€3.99</Text>
                                <Text style={styles.period}>/month</Text>
                            </View>
                            <Text style={styles.billedText}>Billed monthly</Text>
                        </View>
                    </View>

                    <View style={styles.featuresList}>
                        {premiumFeatures.map((feature, index) => (
                            <View key={index} style={styles.featureItem}>
                                <Ionicons name={feature.icon as any} size={20} color="#14B8A6" />
                                <Text style={styles.featureText}>{feature.text}</Text>
                            </View>
                        ))}
                    </View>

                    {isSubscriptionActive ? (
                        <View style={styles.subscribedActions}>
                            <View style={styles.currentPlanButton}>
                                <Ionicons name="checkmark-circle" size={20} color="#34C759" />
                                <Text style={styles.currentPlanText}>Active Until {new Date(userPlan?.subscriptionExpiresAt || 0).toLocaleDateString()}</Text>
                            </View>
                            <TouchableOpacity 
                                style={[styles.cancelButton, loading === "cancel" && styles.loadingButton]}
                                onPress={handleCancelSubscription}
                                disabled={loading !== null}
                            >
                                <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
                                <Text style={styles.cancelButtonText}>
                                    {loading === "cancel" ? "Cancelling..." : "Cancel Subscription"}
                                </Text>
                            </TouchableOpacity>
                            <Text style={styles.flexibleNote}>Flexible - Cancel anytime</Text>
                        </View>
                    ) : (
                        <TouchableOpacity 
                            style={[styles.upgradeButton, loading === "monthly" && styles.loadingButton]} 
                            onPress={() => handleUpgrade("monthly")}
                            disabled={loading !== null}
                        >
                            <Text style={styles.upgradeButtonText}>
                                {loading === "monthly" ? "Processing..." : "Subscribe Monthly - €3.99"}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Trip Packs */}
            <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Or Buy Trip Packs</Text>
            <Text style={styles.sectionSubtitle}>Pay per trip, use your credits anytime</Text>

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

            {/* Credits Info */}
            {tripCredits > 0 && (
                <View style={styles.creditsInfo}>
                    <Ionicons name="information-circle" size={20} color="#14B8A6" />
                    <Text style={styles.creditsInfoText}>
                        You have <Text style={styles.creditsHighlight}>{tripCredits} trip credit{tripCredits > 1 ? "s" : ""}</Text> available. 
                        Each trip generation uses 1 credit.
                    </Text>
                </View>
            )}

            {/* Free Plan Info */}
            <View style={styles.freePlan}>
                <Ionicons name="gift-outline" size={24} color="#14B8A6" />
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
        backgroundColor: "#F0FFFE",
    },
    content: {
        padding: 20,
        paddingTop: 60,
        paddingBottom: 40,
    },
    backButton: {
        marginBottom: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#FFFFFF",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#0D9488",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    header: {
        marginBottom: 24,
    },
    title: {
        fontSize: 32,
        fontWeight: "800",
        color: "#0D9488",
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: "#5EEAD4",
        fontWeight: "500",
    },
    statusCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 16,
        marginBottom: 24,
        gap: 12,
        borderWidth: 1,
        borderColor: "#CCFBF1",
        shadowColor: "#0D9488",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 3,
    },
    statusRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    statusText: {
        fontSize: 16,
        color: "#5EEAD4",
    },
    statusValue: {
        fontWeight: "bold",
        color: "#134E4A",
    },
    premiumStatus: {
        color: "#F59E0B",
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "800",
        color: "#0D9488",
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: "#5EEAD4",
        marginBottom: 16,
        fontWeight: "500",
    },
    planToggle: {
        flexDirection: "row",
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 4,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: "#CCFBF1",
    },
    toggleOption: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "center",
        gap: 8,
    },
    toggleOptionActive: {
        backgroundColor: "#14B8A6",
    },
    toggleText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#5EEAD4",
    },
    toggleTextActive: {
        color: "#FFFFFF",
    },
    saveBadge: {
        backgroundColor: "#F59E0B",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    saveBadgeText: {
        fontSize: 10,
        fontWeight: "bold",
        color: "#FFFFFF",
    },
    premiumCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 24,
        shadowColor: "#14B8A6",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 6,
        marginBottom: 8,
        borderWidth: 2,
        borderColor: "#F59E0B",
        position: "relative",
        overflow: "hidden",
    },
    monthlyCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 24,
        shadowColor: "#14B8A6",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 4,
        marginBottom: 8,
        borderWidth: 2,
        borderColor: "#CCFBF1",
        position: "relative",
        overflow: "hidden",
    },
    subscribedActions: {
        gap: 12,
    },
    cancelButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FEF2F2",
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 14,
        gap: 8,
        borderWidth: 2,
        borderColor: "#FECACA",
    },
    cancelButtonText: {
        color: "#EF4444",
        fontSize: 16,
        fontWeight: "600",
    },
    flexibleNote: {
        textAlign: "center",
        color: "#14B8A6",
        fontSize: 13,
        fontWeight: "500",
    },
    bestValueBadge: {
        position: "absolute",
        top: 16,
        right: -35,
        backgroundColor: "#F59E0B",
        paddingVertical: 6,
        paddingHorizontal: 45,
        transform: [{ rotate: "45deg" }],
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    bestValueText: {
        color: "#FFF",
        fontSize: 11,
        fontWeight: "bold",
    },
    planHeader: {
        marginBottom: 20,
    },
    planName: {
        fontSize: 22,
        fontWeight: "800",
        color: "#0D9488",
        marginBottom: 8,
    },
    priceContainer: {
        gap: 4,
    },
    priceRow: {
        flexDirection: "row",
        alignItems: "baseline",
    },
    price: {
        fontSize: 40,
        fontWeight: "800",
        color: "#14B8A6",
    },
    period: {
        fontSize: 16,
        color: "#5EEAD4",
        marginLeft: 4,
        fontWeight: "500",
    },
    billedText: {
        fontSize: 14,
        color: "#99F6E4",
        fontWeight: "500",
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
        color: "#134E4A",
        fontWeight: "500",
    },
    upgradeButton: {
        backgroundColor: "#14B8A6",
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: "center",
        shadowColor: "#14B8A6",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 6,
    },
    loadingButton: {
        opacity: 0.7,
    },
    upgradeButtonText: {
        color: "#FFF",
        fontSize: 18,
        fontWeight: "700",
    },
    currentPlanButton: {
        backgroundColor: "#D1FAE5",
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "center",
        gap: 8,
    },
    currentPlanText: {
        color: "#059669",
        fontSize: 16,
        fontWeight: "600",
    },
    packsContainer: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 20,
    },
    packCard: {
        flex: 1,
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 16,
        alignItems: "center",
        borderWidth: 2,
        borderColor: "#CCFBF1",
        position: "relative",
        overflow: "hidden",
    },
    popularPack: {
        borderColor: "#F59E0B",
        borderWidth: 2,
    },
    popularBadge: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: "#F59E0B",
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
        fontWeight: "800",
        color: "#0D9488",
        marginTop: 16,
    },
    packLabel: {
        fontSize: 14,
        color: "#5EEAD4",
        marginBottom: 8,
        fontWeight: "500",
    },
    packPrice: {
        fontSize: 24,
        fontWeight: "800",
        color: "#14B8A6",
    },
    packPerTrip: {
        fontSize: 12,
        color: "#99F6E4",
        marginBottom: 12,
        fontWeight: "500",
    },
    packButton: {
        backgroundColor: "#14B8A6",
        paddingVertical: 10,
        paddingHorizontal: 24,
        borderRadius: 10,
    },
    packButtonText: {
        color: "#FFF",
        fontSize: 14,
        fontWeight: "bold",
    },
    creditsInfo: {
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: "#CCFBF1",
        padding: 16,
        borderRadius: 16,
        gap: 12,
        marginBottom: 20,
    },
    creditsInfoText: {
        flex: 1,
        fontSize: 14,
        color: "#134E4A",
        lineHeight: 20,
    },
    creditsHighlight: {
        fontWeight: "bold",
        color: "#0D9488",
    },
    freePlan: {
        alignItems: "center",
        padding: 24,
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        gap: 8,
        borderWidth: 1,
        borderColor: "#CCFBF1",
    },
    freePlanTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#0D9488",
    },
    freePlanText: {
        fontSize: 14,
        color: "#5EEAD4",
        textAlign: "center",
        fontWeight: "500",
    },
});
