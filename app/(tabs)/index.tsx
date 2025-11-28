import { Text, View, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, Image } from "react-native";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Id } from "@/convex/_generated/dataModel";
import { SafeAreaView } from "react-native-safe-area-context";

import logoImage from "@/assets/bloom/images/image-1dbiuq.png";

export default function TripListScreen() {
    const router = useRouter();
    const { isAuthenticated } = useConvexAuth();
    const trips = useQuery(api.trips.list, isAuthenticated ? {} : "skip");
    const deleteTrip = useMutation(api.trips.deleteTrip);

    const handleDelete = (tripId: Id<"trips">) => {
        Alert.alert(
            "Delete Trip",
            "Are you sure you want to delete this trip?",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete", 
                    style: "destructive", 
                    onPress: () => deleteTrip({ tripId }) 
                }
            ]
        );
    };

    if (trips === undefined) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#14B8A6" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Image source={logoImage} style={styles.headerLogo} resizeMode="contain" />
                    <View>
                        <Text style={styles.headerSubtitle}>Welcome to</Text>
                        <Text style={styles.headerTitle}>Voyage Buddy</Text>
                    </View>
                </View>
                <TouchableOpacity 
                    style={styles.addButton}
                    onPress={() => router.push("/create-trip")}
                >
                    <Ionicons name="add" size={28} color="white" />
                </TouchableOpacity>
            </View>

            {trips.length === 0 ? (
                <View style={styles.emptyState}>
                    <View style={styles.emptyIconContainer}>
                        <Ionicons name="airplane-outline" size={48} color="#00BFA6" />
                    </View>
                    <Text style={styles.emptyText}>No trips yet</Text>
                    <Text style={styles.emptySubtext}>Tap the + button to plan your first adventure!</Text>
                    <TouchableOpacity 
                        style={styles.createTripButton}
                        onPress={() => router.push("/create-trip")}
                    >
                        <Ionicons name="add-circle" size={20} color="white" />
                        <Text style={styles.createTripButtonText}>Create Your First Trip</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={trips}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => (
                        <TouchableOpacity 
                            style={styles.card} 
                            onPress={() => router.push(`/trip/${item._id}`)}
                            activeOpacity={0.9}
                        >
                            <View style={styles.cardImagePlaceholder}>
                                <Ionicons name="airplane" size={32} color="white" />
                            </View>
                            <View style={styles.cardContent}>
                                <View style={styles.cardHeader}>
                                    <Text style={styles.destination}>{item.destination}</Text>
                                    <StatusBadge status={item.status} />
                                </View>
                                <Text style={styles.dates}>
                                    {new Date(item.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - {new Date(item.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </Text>
                                <View style={styles.cardFooter}>
                                    <View style={styles.detailItem}>
                                        <Ionicons name="people-outline" size={16} color="#607D8B" />
                                        <Text style={styles.details}>{item.travelers}</Text>
                                    </View>
                                    <View style={styles.detailItem}>
                                        <Ionicons name="wallet-outline" size={16} color="#607D8B" />
                                        <Text style={styles.details}>{item.budget}</Text>
                                    </View>
                                    <TouchableOpacity 
                                        onPress={() => handleDelete(item._id)}
                                        style={styles.deleteBtn}
                                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    >
                                        <Ionicons name="trash-outline" size={18} color="#B0BEC5" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </TouchableOpacity>
                    )}
                />
            )}
        </SafeAreaView>
    );
}

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        generating: "#F59E0B",
        completed: "#14B8A6",
        failed: "#EF4444",
    };
    
    return (
        <View style={[styles.badge, { backgroundColor: colors[status] || "#94A3B8" }]}>
            <Text style={styles.badgeText}>{status.toUpperCase()}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F0FFFE",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: "white",
        borderBottomWidth: 0,
        shadowColor: "#14B8A6",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
    },
    headerLogo: {
        width: 50,
        height: 50,
        marginRight: 12,
    },
    headerSubtitle: {
        fontSize: 12,
        color: "#5EEAD4",
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: "800",
        color: "#0D9488",
    },
    addButton: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: "#14B8A6",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#14B8A6",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F0FFFE",
    },
    listContent: {
        padding: 20,
        paddingBottom: 100,
    },
    card: {
        backgroundColor: "white",
        borderRadius: 20,
        marginBottom: 16,
        shadowColor: "#0D9488",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 4,
        flexDirection: "row",
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "#CCFBF1",
    },
    cardImagePlaceholder: {
        width: 85,
        backgroundColor: "#14B8A6",
        justifyContent: "center",
        alignItems: "center",
    },
    cardContent: {
        flex: 1,
        padding: 16,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 4,
    },
    destination: {
        fontSize: 18,
        fontWeight: "700",
        color: "#0D9488",
        flex: 1,
        marginRight: 8,
    },
    dates: {
        fontSize: 14,
        color: "#5EEAD4",
        marginBottom: 12,
        fontWeight: "500",
    },
    cardFooter: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 4,
    },
    detailItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginRight: 16,
    },
    details: {
        fontSize: 13,
        color: "#5EEAD4",
        fontWeight: "600",
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    badgeText: {
        color: "white",
        fontSize: 10,
        fontWeight: "700",
        letterSpacing: 0.5,
    },
    deleteBtn: {
        padding: 4,
        marginLeft: "auto",
    },
    emptyState: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 32,
    },
    emptyIconContainer: {
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: "#CCFBF1",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 24,
    },
    emptyText: {
        fontSize: 24,
        fontWeight: "800",
        color: "#0D9488",
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 16,
        color: "#5EEAD4",
        textAlign: "center",
        marginBottom: 32,
        lineHeight: 24,
        fontWeight: "500",
    },
    createTripButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#14B8A6",
        paddingHorizontal: 28,
        paddingVertical: 16,
        borderRadius: 16,
        gap: 10,
        shadowColor: "#14B8A6",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 6,
    },
    createTripButtonText: {
        color: "white",
        fontSize: 17,
        fontWeight: "700",
    },
});
