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
                <View>
                    <Text style={styles.headerSubtitle}>Welcome back</Text>
                    <Text style={styles.headerTitle}>My Trips</Text>
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
                                        <Ionicons name="people-outline" size={16} color="#546E7A" />
                                        <Text style={styles.details}>{item.travelers}</Text>
                                    </View>
                                    <View style={styles.detailItem}>
                                        <Ionicons name="wallet-outline" size={16} color="#546E7A" />
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
        generating: "#FFB300", // Amber
        completed: "#1B3F92", // Aegean Blue
        failed: "#D32F2F", // Red
    };
    
    return (
        <View style={[styles.badge, { backgroundColor: colors[status] || "#90A4AE" }]}>
            <Text style={styles.badgeText}>{status.toUpperCase()}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F4F6F8", // Light Gray Background
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 24,
        paddingVertical: 20,
        backgroundColor: "white",
        borderBottomWidth: 1,
        borderBottomColor: "#ECEFF1",
    },
    headerSubtitle: {
        fontSize: 14,
        color: "#546E7A",
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 1,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: "300", // Elegant light weight
        color: "#1B3F92", // Aegean Blue
    },
    addButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#1B3F92", // Aegean Blue
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#1B3F92",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    listContent: {
        padding: 20,
        paddingBottom: 100,
    },
    card: {
        backgroundColor: "white",
        borderRadius: 8, // Sharper corners
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
        flexDirection: "row",
        overflow: "hidden",
    },
    cardImagePlaceholder: {
        width: 80,
        backgroundColor: "#1B3F92",
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
        color: "#263238",
        flex: 1,
        marginRight: 8,
    },
    dates: {
        fontSize: 14,
        color: "#546E7A",
        marginBottom: 12,
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
        color: "#546E7A",
        fontWeight: "500",
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    badgeText: {
        color: "white",
        fontSize: 10,
        fontWeight: "700",
        letterSpacing: 0.5,
    },
    headerRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
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
    emptyText: {
        fontSize: 20,
        fontWeight: "600",
        color: "#263238",
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 16,
        color: "#78909C",
        textAlign: "center",
        marginTop: 8,
        lineHeight: 24,
    },
});
