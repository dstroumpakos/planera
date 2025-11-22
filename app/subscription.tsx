import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function SubscriptionScreen() {
    const router = useRouter();
    const upgradeToPremium = useMutation(api.users.upgradeToPremium);
    const userPlan = useQuery(api.users.getPlan);

    const handleUpgrade = async () => {
        try {
            await upgradeToPremium();
            Alert.alert("Success", "You are now a Premium member!");
            router.back();
        } catch (error) {
            console.error("Upgrade failed:", error);
            Alert.alert("Error", "Failed to upgrade plan");
        }
    };

    const features = [
        { icon: "infinite", text: "Unlimited package generation" },
        { icon: "map", text: "Route optimization" },
        { icon: "pricetag", text: "Best-price alerts" },
        { icon: "calendar", text: "Personalized itineraries" },
        { icon: "heart", text: "Saved trips" },
        { icon: "airplane", text: "Multi-city planning" },
    ];

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>

            <View style={styles.header}>
                <Text style={styles.title}>Upgrade to Premium</Text>
                <Text style={styles.subtitle}>Unlock the full potential of AI travel planning</Text>
            </View>

            <View style={styles.card}>
                <View style={styles.planHeader}>
                    <Text style={styles.planName}>Premium AI Plan</Text>
                    <Text style={styles.price}>€5–€12<Text style={styles.period}>/month</Text></Text>
                </View>

                <View style={styles.featuresList}>
                    {features.map((feature, index) => (
                        <View key={index} style={styles.featureItem}>
                            <Ionicons name={feature.icon as any} size={24} color="#007AFF" />
                            <Text style={styles.featureText}>{feature.text}</Text>
                        </View>
                    ))}
                </View>

                {userPlan?.plan === "premium" ? (
                    <View style={styles.currentPlanButton}>
                        <Text style={styles.currentPlanText}>Current Plan</Text>
                    </View>
                ) : (
                    <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgrade}>
                        <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.freePlan}>
                <Text style={styles.freePlanTitle}>Free AI Plan</Text>
                <Text style={styles.freePlanText}>Includes package summary and 3 free trip generations.</Text>
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
    },
    backButton: {
        marginBottom: 20,
    },
    header: {
        marginBottom: 30,
    },
    title: {
        fontSize: 32,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: "#666",
        lineHeight: 24,
    },
    card: {
        backgroundColor: "#FFF",
        borderRadius: 20,
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
        marginBottom: 24,
    },
    planHeader: {
        marginBottom: 24,
        borderBottomWidth: 1,
        borderBottomColor: "#F0F0F0",
        paddingBottom: 24,
    },
    planName: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 8,
    },
    price: {
        fontSize: 36,
        fontWeight: "bold",
        color: "#007AFF",
    },
    period: {
        fontSize: 16,
        color: "#666",
        fontWeight: "normal",
    },
    featuresList: {
        gap: 16,
        marginBottom: 32,
    },
    featureItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    featureText: {
        fontSize: 16,
        color: "#444",
    },
    upgradeButton: {
        backgroundColor: "#007AFF",
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: "center",
    },
    upgradeButtonText: {
        color: "#FFF",
        fontSize: 18,
        fontWeight: "bold",
    },
    currentPlanButton: {
        backgroundColor: "#E5E5EA",
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: "center",
    },
    currentPlanText: {
        color: "#8E8E93",
        fontSize: 18,
        fontWeight: "bold",
    },
    freePlan: {
        alignItems: "center",
        padding: 20,
    },
    freePlanTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#666",
        marginBottom: 8,
    },
    freePlanText: {
        fontSize: 14,
        color: "#888",
        textAlign: "center",
    },
});
