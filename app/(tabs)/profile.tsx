import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Image } from "react-native";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

import logoImage from "@/assets/bloom/images/image-zyrrgm.png";

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

    const menuItems = [
        {
            title: "Personal Info",
            icon: "person-outline",
            action: () => router.push("/settings/personal-info")
        },
        {
            title: "Payment (Subscriptions)",
            icon: "card-outline",
            action: () => router.push("/subscription")
        },
        {
            title: "Travel Preferences",
            icon: "airplane-outline",
            action: () => router.push("/settings/travel-preferences")
        },
        {
            title: "App Language",
            icon: "language-outline",
            action: () => router.push("/settings/language")
        }
    ];

    const user = session?.user;
    const tripCount = trips?.length || 0;
    const completedTrips = trips?.filter(t => t.status === "completed").length || 0;
    const isPremium = userPlan?.plan === "premium";

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Image source={logoImage} style={styles.headerLogo} resizeMode="contain" />
                <Text style={styles.headerTitle}>Profile</Text>
                <View style={styles.headerPlaceholder} />
            </View>

            <ScrollView style={styles.content}>
                {/* User Profile Card */}
                <View style={styles.profileCard}>
                    <View style={styles.avatarContainer}>
                        <Text style={styles.avatarText}>
                            {user?.name?.[0]?.toUpperCase() || "V"}
                        </Text>
                    </View>
                    <View style={styles.userInfo}>
                        <Text style={styles.userName}>{user?.name || "Voyager"}</Text>
                        <Text style={styles.userEmail}>{user?.email || "Guest User"}</Text>
                        <View style={[styles.planBadge, isPremium && styles.premiumBadge]}>
                            <Ionicons 
                                name={isPremium ? "diamond" : "compass"} 
                                size={12} 
                                color={isPremium ? "#FFD700" : "#00BFA6"} 
                            />
                            <Text style={[styles.planText, isPremium && styles.premiumText]}>
                                {isPremium ? "PREMIUM" : "FREE PLAN"}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Stats Card */}
                <View style={styles.statsCard}>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{tripCount}</Text>
                        <Text style={styles.statLabel}>Total Trips</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{completedTrips}</Text>
                        <Text style={styles.statLabel}>Completed</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{isPremium ? "∞" : "3"}</Text>
                        <Text style={styles.statLabel}>Trips Left</Text>
                    </View>
                </View>

                {/* Settings Menu */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Settings</Text>
                    {menuItems.map((item, index) => (
                        <TouchableOpacity 
                            key={index} 
                            style={styles.menuItem}
                            onPress={item.action}
                        >
                            <View style={styles.menuIconContainer}>
                                <Ionicons name={item.icon as any} size={22} color="#00BFA6" />
                            </View>
                            <Text style={styles.menuText}>{item.title}</Text>
                            <Ionicons name="chevron-forward" size={20} color="#CFD8DC" />
                        </TouchableOpacity>
                    ))}

                    {/* Notifications Toggle */}
                    <TouchableOpacity 
                        style={styles.menuItem}
                        onPress={() => router.push("/settings/notifications")}
                    >
                        <View style={styles.menuIconContainer}>
                            <Ionicons name="notifications-outline" size={22} color="#00BFA6" />
                        </View>
                        <Text style={styles.menuText}>Notifications</Text>
                        <Ionicons name="chevron-forward" size={20} color="#CFD8DC" />
                    </TouchableOpacity>
                </View>

                {/* Upgrade Banner (for free users) */}
                {!isPremium && (
                    <TouchableOpacity 
                        style={styles.upgradeBanner}
                        onPress={() => router.push("/subscription")}
                    >
                        <View style={styles.upgradeContent}>
                            <Ionicons name="rocket" size={24} color="#FFD700" />
                            <View style={styles.upgradeTextContainer}>
                                <Text style={styles.upgradeTitle}>Upgrade to Premium</Text>
                                <Text style={styles.upgradeSubtitle}>Unlimited trips & exclusive features</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="white" />
                    </TouchableOpacity>
                )}

                {/* Logout Button */}
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={20} color="#EF5350" />
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>

                <View style={styles.versionInfo}>
                    <Text style={styles.versionText}>Voyage Buddy v1.0.0</Text>
                    <Text style={styles.copyrightText}>Made with ❤️ for travelers</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F7FA',
    },
    header: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E8EDF2',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerLogo: {
        width: 36,
        height: 36,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1A237E',
    },
    headerPlaceholder: {
        width: 36,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    profileCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
    },
    avatarContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#00BFA6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    avatarText: {
        color: '#FFFFFF',
        fontSize: 26,
        fontWeight: '700',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1A237E',
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 14,
        color: '#78909C',
        marginBottom: 10,
    },
    planBadge: {
        backgroundColor: '#E0F7F4',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    premiumBadge: {
        backgroundColor: '#FFF8E1',
    },
    planText: {
        color: '#00BFA6',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    premiumText: {
        color: '#F9A825',
    },
    statsCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
    },
    statItem: {
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 28,
        fontWeight: '700',
        color: '#00BFA6',
    },
    statLabel: {
        fontSize: 12,
        color: '#90A4AE',
        marginTop: 4,
        fontWeight: '500',
    },
    statDivider: {
        width: 1,
        height: 40,
        backgroundColor: '#E8EDF2',
    },
    section: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#90A4AE',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        padding: 16,
        paddingBottom: 8,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F7FA',
    },
    menuIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#E0F7F4',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    menuText: {
        flex: 1,
        fontSize: 16,
        color: '#37474F',
        fontWeight: '500',
    },
    upgradeBanner: {
        backgroundColor: '#00BFA6',
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        shadowColor: '#00BFA6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    upgradeContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    upgradeTextContainer: {
        gap: 2,
    },
    upgradeTitle: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
    },
    upgradeSubtitle: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 13,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#FFEBEE',
        gap: 8,
    },
    logoutText: {
        color: '#EF5350',
        fontSize: 16,
        fontWeight: '600',
    },
    versionInfo: {
        alignItems: 'center',
        marginBottom: 40,
        gap: 4,
    },
    versionText: {
        color: '#B0BEC5',
        fontSize: 12,
    },
    copyrightText: {
        color: '#CFD8DC',
        fontSize: 11,
    },
});
