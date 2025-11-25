import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from "react-native";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function Profile() {
    const router = useRouter();
    const { data: session } = authClient.useSession();
    const trips = useQuery(api.trips.list);
    const userPlan = useQuery(api.users.getPlan);

    const handleSignOut = async () => {
        try {
            await authClient.signOut();
            router.replace("/");
        } catch (error) {
            console.error("Sign out error:", error);
            Alert.alert("Error", "Failed to sign out");
        }
    };

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
                <Text style={styles.headerTitle}>Settings</Text>
            </View>

            <ScrollView style={styles.content}>
                {/* User Profile Card */}
                <View style={styles.profileCard}>
                    <View style={styles.avatarContainer}>
                        <Text style={styles.avatarText}>
                            {user?.name?.[0]?.toUpperCase() || "U"}
                        </Text>
                    </View>
                    <View style={styles.userInfo}>
                        <Text style={styles.userName}>{user?.name || "Traveler"}</Text>
                        <Text style={styles.userEmail}>{user?.email}</Text>
                        <View style={styles.planBadge}>
                            <Text style={styles.planText}>
                                {isPremium ? "PREMIUM PLAN" : "FREE PLAN"}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Settings Menu */}
                <View style={styles.section}>
                    {menuItems.map((item, index) => (
                        <TouchableOpacity 
                            key={index} 
                            style={styles.menuItem}
                            onPress={item.action}
                        >
                            <View style={styles.menuIconContainer}>
                                <Ionicons name={item.icon as any} size={22} color="#1B3F92" />
                            </View>
                            <Text style={styles.menuText}>{item.title}</Text>
                            <Ionicons name="chevron-forward" size={20} color="#CFD8DC" />
                        </TouchableOpacity>
                    ))}

                    {/* Notifications Toggle */}
                    <View style={styles.menuItem}>
                        <View style={styles.menuIconContainer}>
                            <Ionicons name="notifications-outline" size={22} color="#1B3F92" />
                        </View>
                        <Text style={styles.menuText}>Notifications</Text>
                        <TouchableOpacity onPress={() => router.push("/settings/notifications")}>
                            <Ionicons name="chevron-forward" size={20} color="#CFD8DC" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Logout Button */}
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>

                <View style={styles.versionInfo}>
                    <Text style={styles.versionText}>Version 1.0.0</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F4F6F8',
    },
    header: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1B3F92',
        textAlign: 'center',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    profileCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    avatarContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#1B3F92',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    avatarText: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: '600',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#263238',
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 14,
        color: '#78909C',
        marginBottom: 8,
    },
    planBadge: {
        backgroundColor: '#E3F2FD',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        alignSelf: 'flex-start',
    },
    planText: {
        color: '#1B3F92',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    section: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
    },
    menuIconContainer: {
        width: 32,
        alignItems: 'center',
        marginRight: 12,
    },
    menuText: {
        flex: 1,
        fontSize: 16,
        color: '#37474F',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        marginBottom: 32,
        borderWidth: 1,
        borderColor: '#FFEBEE',
    },
    logoutText: {
        color: '#FF3B30',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    versionInfo: {
        alignItems: 'center',
        marginBottom: 40,
    },
    versionText: {
        color: '#B0BEC5',
        fontSize: 12,
    },
});
