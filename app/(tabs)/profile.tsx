
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from "react-native";
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

    const handleSignOut = async () => {
        try {
            await authClient.signOut();
            router.replace("/");
        } catch (error) {
            console.error("Sign out error:", error);
            Alert.alert("Error", "Failed to sign out");
        }
    };

    const user = session?.user;
    const tripCount = trips?.length || 0;
    const completedTrips = trips?.filter(t => t.status === "completed").length || 0;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Profile</Text>
            </View>

            <View style={styles.content}>
                <View style={styles.profileHeader}>
                    <View style={styles.avatarContainer}>
                        {user?.image ? (
                            <Image source={{ uri: user.image }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                <Text style={styles.avatarText}>
                                    {user?.name?.charAt(0).toUpperCase() || "U"}
                                </Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.name}>{user?.name || "Traveler"}</Text>
                    <Text style={styles.email}>{user?.email || "Anonymous User"}</Text>
                </View>

                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{tripCount}</Text>
                        <Text style={styles.statLabel}>Total Trips</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{completedTrips}</Text>
                        <Text style={styles.statLabel}>Completed</Text>
                    </View>
                </View>

                <View style={styles.menu}>
                    <TouchableOpacity style={styles.menuItem}>
                        <View style={styles.menuIcon}>
                            <Ionicons name="settings-outline" size={22} color="#1C1C1E" />
                        </View>
                        <Text style={styles.menuText}>Settings</Text>
                        <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.menuItem}>
                        <View style={styles.menuIcon}>
                            <Ionicons name="heart-outline" size={22} color="#1C1C1E" />
                        </View>
                        <Text style={styles.menuText}>Saved Places</Text>
                        <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem}>
                        <View style={styles.menuIcon}>
                            <Ionicons name="help-circle-outline" size={22} color="#1C1C1E" />
                        </View>
                        <Text style={styles.menuText}>Help & Support</Text>
                        <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                    <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F2F2F7",
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: "white",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E5EA",
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#1C1C1E",
    },
    content: {
        flex: 1,
        padding: 20,
    },
    profileHeader: {
        alignItems: "center",
        marginBottom: 32,
    },
    avatarContainer: {
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: "white",
    },
    avatarPlaceholder: {
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#E1F0FF",
    },
    avatarText: {
        fontSize: 40,
        fontWeight: "bold",
        color: "#007AFF",
    },
    name: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#1C1C1E",
        marginBottom: 4,
    },
    email: {
        fontSize: 16,
        color: "#8E8E93",
    },
    statsContainer: {
        flexDirection: "row",
        backgroundColor: "white",
        borderRadius: 16,
        padding: 20,
        marginBottom: 32,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    statItem: {
        flex: 1,
        alignItems: "center",
    },
    statValue: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#007AFF",
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 14,
        color: "#8E8E93",
    },
    divider: {
        width: 1,
        backgroundColor: "#E5E5EA",
    },
    menu: {
        backgroundColor: "white",
        borderRadius: 16,
        marginBottom: 32,
        overflow: "hidden",
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#F2F2F7",
    },
    menuIcon: {
        width: 32,
        alignItems: "center",
        marginRight: 12,
    },
    menuText: {
        flex: 1,
        fontSize: 16,
        color: "#1C1C1E",
    },
    signOutButton: {
        backgroundColor: "#FF3B30",
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: "center",
    },
    signOutText: {
        color: "white",
        fontSize: 16,
        fontWeight: "bold",
    },
});
