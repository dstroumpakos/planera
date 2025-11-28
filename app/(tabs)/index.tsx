import { Text, View, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, Image } from "react-native";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Id } from "@/convex/_generated/dataModel";
import { SafeAreaView } from "react-native-safe-area-context";

import logoImage from "@/assets/bloom/images/image-zyrrgm.png";

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
                <ActivityIndicator size="large" color="#00BFA6" />
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
        generating: "#FFB300",
        completed: "#00BFA6",
        failed: "#EF5350",
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
        backgroundColor: "#F5F7FA",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: "white",
        borderBottomWidth: 1,
        borderBottomColor: "#E8EDF2",
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
    },
    headerLogo: {
        width: 44,
        height: 44,
        marginRight: 12,
    },
    headerSubtitle: {
        fontSize: 12,
        color: "#90A4AE",
        fontWeight: "500",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: "#1A237E",
    },
    addButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#00BFA6",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#00BFA6",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F5F7FA",
    },
    listContent: {
        padding: 20,
        paddingBottom: 100,
    },
    card: {
        backgroundColor: "white",
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
        flexDirection: "row",
        overflow: "hidden",
    },
    cardImagePlaceholder: {
        width: 80,
        backgroundColor: "#00BFA6",
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
        color: "#1A237E",
        flex: 1,
        marginRight: 8,
    },
    dates: {
        fontSize: 14,
        color: "#607D8B",
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
        color: "#607D8B",
        fontWeight: "500",
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
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
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: "#E0F7F4",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 24,
    },
    emptyText: {
        fontSize: 22,
        fontWeight: "700",
        color: "#1A237E",
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 16,
        color: "#78909C",
        textAlign: "center",
        marginBottom: 32,
        lineHeight: 24,
    },
    createTripButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#00BFA6",
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
        shadowColor: "#00BFA6",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    createTripButtonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "700",
    },
});
