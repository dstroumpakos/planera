import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { DEALS } from "@/lib/data";

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

export default function Deals() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Explore Deals</Text>
                <TouchableOpacity style={styles.filterButton}>
                    <Ionicons name="options-outline" size={20} color={COLORS.text} />
                </TouchableOpacity>
            </View>

            <FlatList
                data={DEALS}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                    <TouchableOpacity 
                        style={styles.card}
                        onPress={() => router.push(`/deal/${item.id}`)}
                    >
                        <Image source={{ uri: item.image }} style={styles.cardImage} />
                        <View style={styles.discountBadge}>
                            <Text style={styles.discountText}>{item.discount}</Text>
                        </View>
                        <View style={styles.ratingBadge}>
                            <Ionicons name="star" size={12} color={COLORS.primary} />
                            <Text style={styles.ratingText}>4.8</Text>
                        </View>
                        <View style={styles.cardContent}>
                            <Text style={styles.destination}>{item.destination}</Text>
                            <View style={styles.locationRow}>
                                <Ionicons name="location" size={14} color={COLORS.textMuted} />
                                <Text style={styles.locationText}>{item.dates}</Text>
                            </View>
                            <View style={styles.priceRow}>
                                <Text style={styles.price}>${item.price}</Text>
                                <Text style={styles.originalPrice}>${item.originalPrice}</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.arrowButton}>
                            <Ionicons name="arrow-forward" size={18} color={COLORS.text} />
                        </TouchableOpacity>
                    </TouchableOpacity>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIconContainer}>
                            <Ionicons name="pricetag-outline" size={40} color={COLORS.primary} />
                        </View>
                        <Text style={styles.emptyText}>No deals available</Text>
                        <Text style={styles.emptySubtext}>Check back soon for exclusive offers!</Text>
                    </View>
                }
            />
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
        paddingTop: 8,
        paddingBottom: 16,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: "800",
        color: COLORS.text,
    },
    filterButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: COLORS.white,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    listContent: {
        padding: 20,
        paddingBottom: 100,
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 20,
        marginBottom: 16,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: COLORS.border,
        position: "relative",
    },
    cardImage: {
        width: "100%",
        height: 180,
    },
    discountBadge: {
        position: "absolute",
        top: 12,
        left: 12,
        backgroundColor: COLORS.primary,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    discountText: {
        color: COLORS.text,
        fontWeight: "700",
        fontSize: 12,
    },
    ratingBadge: {
        position: "absolute",
        top: 12,
        right: 12,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.95)",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    ratingText: {
        fontSize: 12,
        fontWeight: "700",
        color: COLORS.text,
    },
    cardContent: {
        padding: 16,
    },
    destination: {
        fontSize: 20,
        fontWeight: "700",
        color: COLORS.text,
        marginBottom: 4,
    },
    locationRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginBottom: 12,
    },
    locationText: {
        fontSize: 14,
        color: COLORS.textMuted,
    },
    priceRow: {
        flexDirection: "row",
        alignItems: "baseline",
        gap: 8,
    },
    price: {
        fontSize: 22,
        fontWeight: "800",
        color: COLORS.primary,
    },
    originalPrice: {
        fontSize: 14,
        color: COLORS.textMuted,
        textDecorationLine: "line-through",
    },
    arrowButton: {
        position: "absolute",
        bottom: 16,
        right: 16,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.white,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    emptyState: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 32,
        marginTop: 60,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.white,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    emptyText: {
        fontSize: 20,
        fontWeight: "700",
        color: COLORS.text,
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: COLORS.textMuted,
        textAlign: "center",
    },
});
