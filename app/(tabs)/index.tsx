import { Text, View, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from "react-native";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Id } from "@/convex/_generated/dataModel";
import { SafeAreaView } from "react-native-safe-area-context";

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
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>My Trips</Text>
                <TouchableOpacity 
                    style={styles.addButton}
                    onPress={() => router.push("/create-trip")}
                >
                    <Ionicons name="add" size={24} color="white" />
                </TouchableOpacity>
            </View>

            {trips.length === 0 ? (
                <View style={styles.emptyState}>
                    <Ionicons name="airplane-outline" size={64} color="#ccc" />
                    <Text style={styles.emptyText}>No trips yet.</Text>
                    <Text style={styles.emptySubtext}>Tap the + button to plan your first adventure!</Text>
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
                        >
                            <View style={styles.cardHeader}>
                                <Text style={styles.destination}>{item.destination}</Text>
                                <View style={styles.headerRight}>
                                    <StatusBadge status={item.status} />
                                    <TouchableOpacity 
                                        onPress={() => handleDelete(item._id)}
                                        style={styles.deleteBtn}
                                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    >
                                        <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <Text style={styles.dates}>
                                {new Date(item.startDate).toLocaleDateString()} - {new Date(item.endDate).toLocaleDateString()}
                            </Text>
                            <Text style={styles.details}>
                                {item.travelers} Traveler{item.travelers > 1 ? 's' : ''} • {item.budget} Budget
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            )}
        </SafeAreaView>
    );
}

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        generating: "#FF9500",
        completed: "#34C759",
        failed: "#FF3B30",
    };
    
    return (
        <View style={[styles.badge, { backgroundColor: colors[status] || "#8E8E93" }]}>
            <Text style={styles.badgeText}>{status.toUpperCase()}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F2F2F7",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: "white",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E5EA",
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#1C1C1E",
    },
    addButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#007AFF",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    listContent: {
        padding: 16,
        paddingBottom: 100,
    },
    card: {
        backgroundColor: "white",
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    destination: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#1C1C1E",
    },
    dates: {
        fontSize: 14,
        color: "#8E8E93",
        marginBottom: 4,
    },
    details: {
        fontSize: 14,
        color: "#3A3A3C",
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeText: {
        color: "white",
        fontSize: 10,
        fontWeight: "bold",
    },
    headerRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    deleteBtn: {
        padding: 4,
    },
    emptyState: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 32,
    },
    emptyText: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#1C1C1E",
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 16,
        color: "#8E8E93",
        textAlign: "center",
        marginTop: 8,
    },
});
