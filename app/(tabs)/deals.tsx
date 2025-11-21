
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { DEALS } from "@/lib/data";

export default function Deals() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Last Minute Deals</Text>
                <Text style={styles.headerSubtitle}>Exclusive offers for your next getaway</Text>
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
                        <View style={styles.cardContent}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.destination}>{item.destination}</Text>
                                <View style={styles.priceContainer}>
                                    <Text style={styles.originalPrice}>${item.originalPrice}</Text>
                                    <Text style={styles.price}>${item.price}</Text>
                                </View>
                            </View>
                            <View style={styles.cardFooter}>
                                <View style={styles.dateContainer}>
                                    <Ionicons name="calendar-outline" size={16} color="#8E8E93" />
                                    <Text style={styles.dateText}>{item.dates}</Text>
                                </View>
                                <TouchableOpacity style={styles.bookButton}>
                                    <Text style={styles.bookButtonText}>Book Now</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableOpacity>
                )}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F2F2F7",
    },
    header: {
        padding: 20,
        backgroundColor: "white",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E5EA",
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#1C1C1E",
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 16,
        color: "#8E8E93",
    },
    listContent: {
        padding: 16,
    },
    card: {
        backgroundColor: "white",
        borderRadius: 20,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
        overflow: "hidden",
    },
    cardImage: {
        width: "100%",
        height: 200,
    },
    discountBadge: {
        position: "absolute",
        top: 16,
        right: 16,
        backgroundColor: "#FF3B30",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    discountText: {
        color: "white",
        fontWeight: "bold",
        fontSize: 14,
    },
    cardContent: {
        padding: 16,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 12,
    },
    destination: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#1C1C1E",
        flex: 1,
        marginRight: 8,
    },
    priceContainer: {
        alignItems: "flex-end",
    },
    originalPrice: {
        fontSize: 14,
        color: "#8E8E93",
        textDecorationLine: "line-through",
        marginBottom: 2,
    },
    price: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#007AFF",
    },
    cardFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: "#F2F2F7",
    },
    dateContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    dateText: {
        fontSize: 14,
        color: "#8E8E93",
    },
    bookButton: {
        backgroundColor: "#E1F0FF",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
    },
    bookButtonText: {
        color: "#007AFF",
        fontWeight: "600",
        fontSize: 14,
    },
});
