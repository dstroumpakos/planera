import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from "react-native";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

// Planera Colors
const COLORS = {
    primary: "#FFE500",
    background: "#FAF9F6",
    backgroundDark: "#1A2433",
    text: "#1A1A1A",
    textSecondary: "#6B6B6B",
    textMuted: "#9B9B9B",
    white: "#FFFFFF",
    border: "#E8E6E1",
    error: "#EF4444",
};

export default function Profile() {
    const router = useRouter();
    const { data: session } = authClient.useSession();
    const trips = useQuery(api.trips.list);
    const userPlan = useQuery(api.users.getPlan);

    const handleLogout = async () => {
        try {
            await authClient.signOut();
            router.replace("/");
        } catch (error) {
            console.error("Logout failed:", error);
            Alert.alert("Error", "Failed to log out");
        }
    };

    const user = session?.user;
    const tripCount = trips?.length || 0;
    const completedTrips = trips?.filter(t => t.status === "completed").length || 0;
    const isPremium = userPlan?.plan === "premium";

    const menuItems = [
        {
            title: "Saved Trips",
            subtitle: `${completedTrips} upcoming, ${tripCount - completedTrips} past`,
            icon: "bookmark-outline",
            iconBg: "#FFF8E1",
            iconColor: COLORS.primary,
            action: () => router.push("/(tabs)/trips")
        },
        {
            title: "Travel Preferences",
            subtitle: "Dietary, Airlines, Seats",
            icon: "options-outline",
            iconBg: "#FFF8E1",
            iconColor: COLORS.primary,
            action: () => router.push("/settings/travel-preferences")
        },
        {
            title: "Payment Methods",
            subtitle: "Visa ending in 4242",
            icon: "card-outline",
            iconBg: "#F3E8FF",
            iconColor: "#9333EA",
            action: () => router.push("/subscription")
        },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Profile</Text>
                <TouchableOpacity>
                    <Ionicons name="ellipsis-horizontal" size={24} color={COLORS.text} />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                {/* Profile Card */}
                <View style={styles.profileSection}>
                    <View style={styles.avatarContainer}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {user?.name?.[0]?.toUpperCase() || "P"}
                            </Text>
                        </View>
                        <TouchableOpacity style={styles.editAvatarButton}>
                            <Ionicons name="pencil" size={14} color={COLORS.text} />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.userName}>{user?.name || "Planera User"}</Text>
                    <View style={styles.memberBadge}>
                        <Ionicons name="diamond-outline" size={14} color={COLORS.textMuted} />
                        <Text style={styles.memberText}>
                            Planera {isPremium ? "Premium" : "Free"} Member
                        </Text>
                    </View>
                </View>

                {/* Premium Upsell Card */}
                {!isPremium && (
                    <TouchableOpacity 
                        style={styles.premiumCard}
                        onPress={() => router.push("/subscription")}
                    >
                        <View style={styles.premiumHeader}>
                            <Ionicons name="sparkles" size={20} color={COLORS.primary} />
                            <Text style={styles.premiumTitle}>Planera Premium</Text>
                        </View>
                        <Text style={styles.premiumDescription}>
                            Unlock AI superpowers for unlimited routing and smart travel recommendations.
                        </Text>
                        <View style={styles.upgradeButton}>
                            <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
                            <Ionicons name="arrow-forward" size={18} color={COLORS.text} />
                        </View>
                    </TouchableOpacity>
                )}

                {/* Account Settings */}
                <Text style={styles.sectionTitle}>ACCOUNT SETTINGS</Text>
                <View style={styles.menuContainer}>
                    {menuItems.map((item, index) => (
                        <TouchableOpacity 
                            key={index} 
                            style={styles.menuItem}
                            onPress={item.action}
                        >
                            <View style={[styles.menuIconContainer, { backgroundColor: item.iconBg }]}>
                                <Ionicons name={item.icon as any} size={20} color={item.iconColor} />
                            </View>
                            <View style={styles.menuTextContainer}>
                                <Text style={styles.menuTitle}>{item.title}</Text>
                                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Help & Support */}
                <View style={styles.helpSection}>
                    <TouchableOpacity style={styles.helpItem}>
                        <Ionicons name="help-circle-outline" size={20} color={COLORS.textSecondary} />
                        <Text style={styles.helpText}>Help & Support</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.helpItem} onPress={() => router.push("/terms")}>
                        <Ionicons name="document-text-outline" size={20} color={COLORS.textSecondary} />
                        <Text style={styles.helpText}>Terms of Service</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.helpItem} onPress={handleLogout}>
                        <Ionicons name="log-out-outline" size={20} color={COLORS.textSecondary} />
                        <Text style={styles.helpText}>Log Out</Text>
                    </TouchableOpacity>
                </View>

                {/* Version */}
                <Text style={styles.versionText}>PLANERA V2.4.0</Text>

                {/* Bottom Spacing */}
                <View style={{ height: 120 }} />
            </ScrollView>
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
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.text,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
    },
    profileSection: {
        alignItems: "center",
        paddingVertical: 24,
    },
    avatarContainer: {
        position: "relative",
        marginBottom: 16,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: "#E8E6E1",
        justifyContent: "center",
        alignItems: "center",
    },
    avatarText: {
        fontSize: 36,
        fontWeight: "700",
        color: COLORS.text,
    },
    editAvatarButton: {
        position: "absolute",
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.primary,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 3,
        borderColor: COLORS.background,
    },
    userName: {
        fontSize: 24,
        fontWeight: "800",
        color: COLORS.text,
        marginBottom: 8,
    },
    memberBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.white,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    memberText: {
        fontSize: 14,
        color: COLORS.textMuted,
        fontWeight: "500",
    },
    premiumCard: {
        backgroundColor: COLORS.backgroundDark,
        borderRadius: 20,
        padding: 20,
        marginBottom: 24,
    },
    premiumHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 8,
    },
    premiumTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.white,
    },
    premiumDescription: {
        fontSize: 14,
        color: "rgba(255,255,255,0.7)",
        lineHeight: 20,
        marginBottom: 16,
    },
    upgradeButton: {
        backgroundColor: "#4A90D9",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    upgradeButtonText: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.white,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: "700",
        color: COLORS.textMuted,
        letterSpacing: 1,
        marginBottom: 12,
    },
    menuContainer: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        overflow: "hidden",
        marginBottom: 24,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    menuIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    menuTextContainer: {
        flex: 1,
    },
    menuTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.text,
        marginBottom: 2,
    },
    menuSubtitle: {
        fontSize: 13,
        color: COLORS.textMuted,
    },
    helpSection: {
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: 16,
        marginBottom: 24,
    },
    helpItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        gap: 12,
    },
    helpText: {
        fontSize: 16,
        color: COLORS.textSecondary,
    },
    versionText: {
        fontSize: 12,
        color: COLORS.textMuted,
        textAlign: "center",
        letterSpacing: 1,
    },
});
