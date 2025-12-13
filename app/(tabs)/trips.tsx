import { Text, View, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from "react-native";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Id } from "@/convex/_generated/dataModel";
import { SafeAreaView } from "react-native-safe-area-context";

// Planera Colors
const COLORS = {
    primary: "#FFE500",
    background: "#FAF9F6",
    text: "#1A1A1A",
    textSecondary: "#6B6B6B",
    textMuted: "#9B9B9B",
    white: "#FFFFFF",
    border: "#E8E6E1",
};

export default function TripsScreen() {
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
                <ActivityIndicator size="large" color={COLORS.primary} />
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
                    <Ionicons name="add" size={24} color={COLORS.text} />
                </TouchableOpacity>
            </View>

            {trips.length === 0 ? (
                <View style={styles.emptyState}>
                    <View style={styles.emptyIconContainer}>
                        <Ionicons name="airplane-outline" size={48} color={COLORS.primary} />
                    </View>
                    <Text style={styles.emptyText}>No trips yet</Text>
                    <Text style={styles.emptySubtext}>Tap the + button to plan your first adventure!</Text>
                    <TouchableOpacity 
                        style={styles.createTripButton}
                        onPress={() => router.push("/create-trip")}
                    >
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
                                <Ionicons name="airplane" size={28} color={COLORS.white} />
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
                                        <Ionicons name="people-outline" size={16} color={COLORS.textMuted} />
                                        <Text style={styles.details}>{item.travelers}</Text>
                                    </View>
                                    <View style={styles.detailItem}>
                                        <Ionicons name="wallet-outline" size={16} color={COLORS.textMuted} />
                                        <Text style={styles.details}>{item.budget}</Text>
                                    </View>
                                    <TouchableOpacity 
                                        onPress={() => handleDelete(item._id)}
                                        style={styles.deleteBtn}
                                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    >
                                        <Ionicons name="trash-outline" size={18} color={COLORS.textMuted} />
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
    const getStatusStyle = () => {
        switch (status) {
            case "generating":
                return { bg: "#FFF8E1", text: "#F59E0B" };
            case "completed":
                return { bg: "#E8F5E9", text: "#4CAF50" };
            case "failed":
                return { bg: "#FFEBEE", text: "#EF4444" };
            default:
                return { bg: COLORS.border, text: COLORS.textMuted };
        }
    };
    
    const style = getStatusStyle();
    
    return (
        <View style={[styles.badge, { backgroundColor: style.bg }]}>
            <Text style={[styles.badgeText, { color: style.text }]}>{status.toUpperCase()}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: COLORS.background,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: "800",
        color: COLORS.text,
    },
    addButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: COLORS.primary,
        justifyContent: "center",
        alignItems: "center",
    },
    listContent: {
        padding: 20,
        paddingBottom: 100,
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        marginBottom: 12,
        flexDirection: "row",
        overflow: "hidden",
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    cardImagePlaceholder: {
        width: 80,
        backgroundColor: COLORS.text,
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
        color: COLORS.text,
        flex: 1,
        marginRight: 8,
    },
    dates: {
        fontSize: 14,
        color: COLORS.textMuted,
        marginBottom: 12,
    },
    cardFooter: {
        flexDirection: "row",
        alignItems: "center",
    },
    detailItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginRight: 16,
    },
    details: {
        fontSize: 13,
        color: COLORS.textSecondary,
        fontWeight: "600",
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeText: {
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
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: COLORS.white,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 24,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    emptyText: {
        fontSize: 22,
        fontWeight: "800",
        color: COLORS.text,
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 16,
        color: COLORS.textMuted,
        textAlign: "center",
        marginBottom: 32,
        lineHeight: 24,
    },
    createTripButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 28,
        paddingVertical: 16,
        borderRadius: 14,
    },
    createTripButtonText: {
        color: COLORS.text,
        fontSize: 17,
        fontWeight: "700",
    },
});
