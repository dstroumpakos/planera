import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { DEALS } from "@/lib/data";

import logoImage from "@/assets/images/image.png";

export default function Deals() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Image source={logoImage} style={styles.headerLogo} resizeMode="contain" />
                <View>
                    <Text style={styles.headerTitle}>Last Minute Deals</Text>
                    <Text style={styles.headerSubtitle}>Exclusive offers for your next getaway</Text>
                </View>
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
                                    <Ionicons name="calendar-outline" size={16} color="#78909C" />
                                    <Text style={styles.dateText}>{item.dates}</Text>
                                </View>
                                <TouchableOpacity style={styles.bookButton}>
                                    <Text style={styles.bookButtonText}>View Deal</Text>
                                    <Ionicons name="arrow-forward" size={14} color="#00BFA6" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableOpacity>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIconContainer}>
                            <Ionicons name="pricetag-outline" size={48} color="#00BFA6" />
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
        backgroundColor: "#F8FAFC",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        padding: 20,
        backgroundColor: "white",
        borderBottomWidth: 1,
        borderBottomColor: "#E2E8F0",
        gap: 14,
        shadowColor: "#1A2433",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    headerLogo: {
        width: 50,
        height: 50,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: "800",
        color: "#1A2433",
        marginBottom: 2,
    },
    headerSubtitle: {
        fontSize: 14,
        color: "#A1AEC6",
        fontWeight: "500",
    },
    listContent: {
        padding: 16,
        paddingBottom: 100,
    },
    card: {
        backgroundColor: "white",
        borderRadius: 20,
        marginBottom: 20,
        shadowColor: "#1A2433",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 4,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    cardImage: {
        width: "100%",
        height: 180,
    },
    discountBadge: {
        position: "absolute",
        top: 16,
        right: 16,
        backgroundColor: "#4F6DF5",
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
        shadowColor: "#4F6DF5",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    discountText: {
        color: "white",
        fontWeight: "700",
        fontSize: 14,
    },
    cardContent: {
        padding: 18,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 14,
    },
    destination: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1A2433",
        flex: 1,
        marginRight: 8,
    },
    priceContainer: {
        alignItems: "flex-end",
    },
    originalPrice: {
        fontSize: 14,
        color: "#A1AEC6",
        textDecorationLine: "line-through",
        marginBottom: 2,
    },
    price: {
        fontSize: 24,
        fontWeight: "800",
        color: "#4F6DF5",
    },
    cardFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: "#F8FAFC",
    },
    dateContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    dateText: {
        fontSize: 14,
        color: "#A1AEC6",
        fontWeight: "500",
    },
    bookButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#E0E7FF",
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
        gap: 6,
    },
    bookButtonText: {
        color: "#4F6DF5",
        fontWeight: "700",
        fontSize: 14,
    },
    emptyState: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 32,
        marginTop: 60,
    },
    emptyIconContainer: {
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: "#E0E7FF",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 24,
    },
    emptyText: {
        fontSize: 24,
        fontWeight: "800",
        color: "#1A2433",
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 16,
        color: "#A1AEC6",
        textAlign: "center",
        lineHeight: 24,
        fontWeight: "500",
    },
});
