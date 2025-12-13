import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

// Planora Colors
const COLORS = {
    primary: "#FFE500",
    background: "#FAF9F6",
    text: "#1A1A1A",
    textSecondary: "#6B6B6B",
    textMuted: "#9B9B9B",
    white: "#FFFFFF",
    border: "#E8E6E1",
    success: "#4CAF50",
    error: "#EF4444",
};

export default function SubscriptionScreen() {
    const router = useRouter();
    const upgradeToPremium = useMutation(api.users.upgradeToPremium);
    const purchaseTripPack = useMutation(api.users.purchaseTripPack);
    const cancelSubscription = useMutation(api.users.cancelSubscription);
    const userPlan = useQuery(api.users.getPlan);
    const [loading, setLoading] = useState<string | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<"yearly" | "monthly" | "single">("yearly");

    const handleUpgrade = async (planType: "monthly" | "yearly") => {
        setLoading(planType);
        try {
            await upgradeToPremium({ planType });
            if (Platform.OS !== "web") {
                Alert.alert("Success", "You are now a Premium member!");
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

    const handlePurchasePack = async () => {
        setLoading("single");
        try {
            await purchaseTripPack({ pack: "single" });
            if (Platform.OS !== "web") {
                Alert.alert("Success", "Trip credit added!");
            }
            router.back();
        } catch (error) {
            console.error("Purchase failed:", error);
            if (Platform.OS !== "web") {
                Alert.alert("Error", "Failed to purchase");
            }
        } finally {
            setLoading(null);
        }
    };

    const isSubscriptionActive = userPlan?.isSubscriptionActive;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.brandText}>PLANERA</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color={COLORS.text} />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                <Text style={styles.title}>Unlock your next{"\n"}era of travel.</Text>
                <Text style={styles.subtitle}>
                    AI-powered itineraries, unlimited inspiration, and smart recommendations.
                </Text>

                {/* Yearly Plan - Best Value */}
                <TouchableOpacity 
                    style={[
                        styles.planCard, 
                        selectedPlan === "yearly" && styles.planCardSelected
                    ]}
                    onPress={() => setSelectedPlan("yearly")}
                >
                    <View style={styles.bestValueBadge}>
                        <Text style={styles.bestValueText}>BEST VALUE</Text>
                    </View>
                    <View style={styles.planHeader}>
                        <View>
                            <Text style={styles.planName}>Yearly Era</Text>
                            <Text style={styles.planBilled}>Billed $59.99 yearly</Text>
                        </View>
                        <View style={styles.planPriceContainer}>
                            <Text style={styles.planPrice}>$4.99</Text>
                            <Text style={styles.planPeriod}>/ mo</Text>
                        </View>
                        <View style={[
                            styles.radioButton,
                            selectedPlan === "yearly" && styles.radioButtonSelected
                        ]}>
                            {selectedPlan === "yearly" && (
                                <Ionicons name="checkmark" size={16} color={COLORS.text} />
                            )}
                        </View>
                    </View>
                    
                    {selectedPlan === "yearly" && (
                        <View style={styles.planFeatures}>
                            <View style={styles.featureItem}>
                                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                                <Text style={styles.featureText}>Unlimited AI Planning</Text>
                            </View>
                            <View style={styles.featureItem}>
                                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                                <Text style={styles.featureText}>Smart Recommendations</Text>
                            </View>
                            <View style={styles.featureItem}>
                                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                                <Text style={styles.featureText}>Full Multi-City Routing</Text>
                            </View>
                        </View>
                    )}
                </TouchableOpacity>

                {/* Monthly Plan */}
                <TouchableOpacity 
                    style={[
                        styles.planCard, 
                        styles.planCardSimple,
                        selectedPlan === "monthly" && styles.planCardSelected
                    ]}
                    onPress={() => setSelectedPlan("monthly")}
                >
                    <View style={styles.planHeader}>
                        <View>
                            <Text style={styles.planName}>Monthly Era</Text>
                            <Text style={styles.cancelAnytime}>
                                <Ionicons name="close-circle" size={12} color={COLORS.error} /> Cancel anytime
                            </Text>
                        </View>
                        <View style={styles.planPriceContainer}>
                            <Text style={styles.planPrice}>$9.99</Text>
                            <Text style={styles.planPeriod}>/ mo</Text>
                        </View>
                        <View style={[
                            styles.radioButton,
                            selectedPlan === "monthly" && styles.radioButtonSelected
                        ]}>
                            {selectedPlan === "monthly" && (
                                <Ionicons name="checkmark" size={16} color={COLORS.text} />
                            )}
                        </View>
                    </View>
                </TouchableOpacity>

                {/* Single Trip */}
                <TouchableOpacity 
                    style={[
                        styles.planCard, 
                        styles.planCardSimple,
                        selectedPlan === "single" && styles.planCardSelected
                    ]}
                    onPress={() => setSelectedPlan("single")}
                >
                    <View style={styles.planHeader}>
                        <View>
                            <Text style={styles.planName}>Single Trip</Text>
                            <Text style={styles.planSubtext}>One-time AI planning</Text>
                        </View>
                        <View style={styles.planPriceContainer}>
                            <Text style={styles.planPrice}>$2.99</Text>
                        </View>
                        <View style={[
                            styles.radioButton,
                            selectedPlan === "single" && styles.radioButtonSelected
                        ]}>
                            {selectedPlan === "single" && (
                                <Ionicons name="checkmark" size={16} color={COLORS.text} />
                            )}
                        </View>
                    </View>
                </TouchableOpacity>

                {/* Continue with Free */}
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.freePlanLink}>Continue with Free Plan</Text>
                </TouchableOpacity>

                {/* Terms */}
                <Text style={styles.termsText}>
                    Subscription automatically renews unless auto-renew is turned off at least 24-hours before the end of the current period. Your account will be charged for renewal within 24-hours prior to the end of the current period. You can manage and cancel your subscriptions by going to your App Store account settings after purchase.
                </Text>

                <View style={styles.linksRow}>
                    <TouchableOpacity>
                        <Text style={styles.linkText}>Privacy Policy</Text>
                    </TouchableOpacity>
                    <Text style={styles.linkDot}>•</Text>
                    <TouchableOpacity>
                        <Text style={styles.linkText}>Terms of Service</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity>
                    <Text style={styles.restoreText}>Restore Purchases</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Bottom CTA */}
            <View style={styles.bottomCTA}>
                <TouchableOpacity 
                    style={[styles.ctaButton, loading && styles.ctaButtonLoading]}
                    onPress={() => {
                        if (selectedPlan === "single") {
                            handlePurchasePack();
                        } else {
                            handleUpgrade(selectedPlan);
                        }
                    }}
                    disabled={loading !== null}
                >
                    <Text style={styles.ctaButtonText}>
                        {loading ? "Processing..." : "Start my next era"}
                    </Text>
                </TouchableOpacity>
                <View style={styles.securedRow}>
                    <Ionicons name="lock-closed" size={14} color={COLORS.textMuted} />
                    <Text style={styles.securedText}>Secured with App Store</Text>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
        position: "relative",
    },
    brandText: {
        fontSize: 16,
        fontWeight: "800",
        color: COLORS.text,
        letterSpacing: 2,
    },
    closeButton: {
        position: "absolute",
        right: 20,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: "800",
        color: COLORS.text,
        textAlign: "center",
        marginBottom: 12,
        lineHeight: 40,
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.textSecondary,
        textAlign: "center",
        marginBottom: 32,
        lineHeight: 24,
    },
    planCard: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 20,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: COLORS.border,
        position: "relative",
        overflow: "hidden",
    },
    planCardSimple: {
        paddingVertical: 16,
    },
    planCardSelected: {
        borderColor: COLORS.primary,
    },
    bestValueBadge: {
        position: "absolute",
        top: -1,
        left: "50%",
        transform: [{ translateX: -50 }],
        backgroundColor: COLORS.primary,
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
    },
    bestValueText: {
        fontSize: 11,
        fontWeight: "800",
        color: COLORS.text,
        letterSpacing: 1,
    },
    planHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 16,
    },
    planName: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.text,
    },
    planBilled: {
        fontSize: 13,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    planSubtext: {
        fontSize: 13,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    cancelAnytime: {
        fontSize: 13,
        color: COLORS.error,
        marginTop: 2,
    },
    planPriceContainer: {
        flexDirection: "row",
        alignItems: "baseline",
        marginLeft: "auto",
        marginRight: 16,
    },
    planPrice: {
        fontSize: 24,
        fontWeight: "800",
        color: COLORS.text,
    },
    planPeriod: {
        fontSize: 14,
        color: COLORS.textMuted,
        marginLeft: 2,
    },
    radioButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: COLORS.border,
        justifyContent: "center",
        alignItems: "center",
    },
    radioButtonSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    planFeatures: {
        marginTop: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        gap: 12,
    },
    featureItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    featureText: {
        fontSize: 15,
        color: COLORS.text,
        fontWeight: "500",
    },
    freePlanLink: {
        fontSize: 16,
        color: COLORS.textSecondary,
        textAlign: "center",
        marginTop: 8,
        marginBottom: 24,
        fontWeight: "600",
    },
    termsText: {
        fontSize: 11,
        color: COLORS.textMuted,
        textAlign: "center",
        lineHeight: 16,
        marginBottom: 16,
    },
    linksRow: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 8,
        marginBottom: 12,
    },
    linkText: {
        fontSize: 13,
        color: COLORS.textSecondary,
        fontWeight: "500",
    },
    linkDot: {
        color: COLORS.textMuted,
    },
    restoreText: {
        fontSize: 14,
        color: COLORS.text,
        textAlign: "center",
        fontWeight: "600",
    },
    bottomCTA: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        paddingBottom: 32,
        backgroundColor: COLORS.background,
    },
    ctaButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: 18,
        borderRadius: 14,
        alignItems: "center",
    },
    ctaButtonLoading: {
        opacity: 0.7,
    },
    ctaButtonText: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.text,
    },
    securedRow: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 6,
        marginTop: 12,
    },
    securedText: {
        fontSize: 12,
        color: COLORS.textMuted,
    },
});
