import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, Platform, ActivityIndicator } from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";

interface CartItem {
    type: string;
    name: string;
    price: number;
    currency: string;
    quantity: number;
    day?: number;
    bookingUrl?: string;
    productCode?: string;
    skipTheLine?: boolean;
    image?: string;
    details?: any;
}

export default function CartScreen() {
    const { tripId } = useLocalSearchParams();
    const router = useRouter();
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    
    const cart = useQuery(api.cart.getCart, { tripId: tripId as Id<"trips"> });
    const trip = useQuery(api.trips.get, { tripId: tripId as Id<"trips"> });
    const removeFromCart = useMutation(api.cart.removeFromCart);
    const updateQuantity = useMutation(api.cart.updateCartItemQuantity);
    const clearCart = useMutation(api.cart.clearCart);
    const checkout = useMutation(api.cart.checkout);

    const handleRemoveItem = async (item: CartItem) => {
        try {
            await removeFromCart({
                tripId: tripId as Id<"trips">,
                itemName: item.name,
                itemType: item.type,
                day: item.day,
            });
        } catch (error) {
            console.error("Failed to remove item:", error);
        }
    };

    const handleUpdateQuantity = async (item: CartItem, newQuantity: number) => {
        try {
            await updateQuantity({
                tripId: tripId as Id<"trips">,
                itemName: item.name,
                itemType: item.type,
                day: item.day,
                quantity: newQuantity,
            });
        } catch (error) {
            console.error("Failed to update quantity:", error);
        }
    };

    const handleClearCart = () => {
        if (Platform.OS !== 'web') {
            Alert.alert(
                "Clear Cart",
                "Are you sure you want to remove all items from your cart?",
                [
                    { text: "Cancel", style: "cancel" },
                    { 
                        text: "Clear", 
                        style: "destructive",
                        onPress: async () => {
                            await clearCart({ tripId: tripId as Id<"trips"> });
                        }
                    }
                ]
            );
        } else {
            clearCart({ tripId: tripId as Id<"trips"> });
        }
    };

    const handleCheckout = async () => {
        setIsCheckingOut(true);
        try {
            const result = await checkout({ tripId: tripId as Id<"trips"> });
            
            if (result.success) {
                if (Platform.OS !== 'web') {
                    Alert.alert(
                        "Checkout Ready! 🎉",
                        result.message + "\n\nNote: In the full version, this would redirect you to complete payment and automatically book with suppliers.",
                        [
                            { text: "OK", onPress: () => router.back() }
                        ]
                    );
                } else {
                    router.back();
                }
            } else {
                if (Platform.OS !== 'web') {
                    Alert.alert("Checkout Failed", result.message);
                }
            }
        } catch (error) {
            console.error("Checkout failed:", error);
            if (Platform.OS !== 'web') {
                Alert.alert("Error", "Failed to process checkout. Please try again.");
            }
        } finally {
            setIsCheckingOut(false);
        }
    };

    if (cart === undefined || trip === undefined) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#14B8A6" />
            </View>
        );
    }

    const travelers = trip?.travelers || 1;
    const items = cart?.items || [];
    const totalAmount = cart?.totalAmount || 0;

    // Group items by type
    const flightItems = items.filter((i: CartItem) => i.type === "flight");
    const hotelItems = items.filter((i: CartItem) => i.type === "hotel");
    const activityItems = items.filter((i: CartItem) => i.type === "activity");

    const getItemIcon = (type: string) => {
        switch (type) {
            case "flight": return "airplane";
            case "hotel": return "bed";
            case "activity": return "ticket";
            default: return "cart";
        }
    };

    const getItemColor = (type: string) => {
        switch (type) {
            case "flight": return "#3B82F6";
            case "hotel": return "#8B5CF6";
            case "activity": return "#14B8A6";
            default: return "#6B7280";
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#134E4A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Your Cart</Text>
                {items.length > 0 && (
                    <TouchableOpacity onPress={handleClearCart} style={styles.clearButton}>
                        <Text style={styles.clearButtonText}>Clear</Text>
                    </TouchableOpacity>
                )}
            </View>

            {items.length === 0 ? (
                <View style={styles.emptyCart}>
                    <Ionicons name="cart-outline" size={80} color="#CCFBF1" />
                    <Text style={styles.emptyTitle}>Your cart is empty</Text>
                    <Text style={styles.emptySubtitle}>
                        Add flights, hotels, and activities from your trip to book them all at once!
                    </Text>
                    <TouchableOpacity 
                        style={styles.browseButton}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.browseButtonText}>Browse Trip</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <>
                    <ScrollView contentContainerStyle={styles.content}>
                        {/* Trip Summary */}
                        <View style={styles.tripSummary}>
                            <Text style={styles.tripDestination}>{trip?.destination}</Text>
                            <Text style={styles.tripDates}>
                                {trip?.startDate && new Date(trip.startDate).toLocaleDateString()} - {trip?.endDate && new Date(trip.endDate).toLocaleDateString()}
                            </Text>
                            <Text style={styles.tripTravelers}>{travelers} traveler{travelers > 1 ? 's' : ''}</Text>
                        </View>

                        {/* Flight Items */}
                        {flightItems.length > 0 && (
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Ionicons name="airplane" size={20} color="#3B82F6" />
                                    <Text style={styles.sectionTitle}>Flights</Text>
                                </View>
                                {flightItems.map((item: CartItem, index: number) => (
                                    <CartItemCard 
                                        key={`flight-${index}`}
                                        item={item}
                                        color="#3B82F6"
                                        onRemove={() => handleRemoveItem(item)}
                                        onUpdateQuantity={(qty) => handleUpdateQuantity(item, qty)}
                                    />
                                ))}
                            </View>
                        )}

                        {/* Hotel Items */}
                        {hotelItems.length > 0 && (
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Ionicons name="bed" size={20} color="#8B5CF6" />
                                    <Text style={styles.sectionTitle}>Accommodation</Text>
                                </View>
                                {hotelItems.map((item: CartItem, index: number) => (
                                    <CartItemCard 
                                        key={`hotel-${index}`}
                                        item={item}
                                        color="#8B5CF6"
                                        onRemove={() => handleRemoveItem(item)}
                                        onUpdateQuantity={(qty) => handleUpdateQuantity(item, qty)}
                                    />
                                ))}
                            </View>
                        )}

                        {/* Activity Items */}
                        {activityItems.length > 0 && (
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Ionicons name="ticket" size={20} color="#14B8A6" />
                                    <Text style={styles.sectionTitle}>Activities & Tours</Text>
                                </View>
                                {activityItems.map((item: CartItem, index: number) => (
                                    <CartItemCard 
                                        key={`activity-${index}`}
                                        item={item}
                                        color="#14B8A6"
                                        onRemove={() => handleRemoveItem(item)}
                                        onUpdateQuantity={(qty) => handleUpdateQuantity(item, qty)}
                                        showDay={true}
                                    />
                                ))}
                            </View>
                        )}

                        {/* Price Breakdown */}
                        <View style={styles.priceBreakdown}>
                            <Text style={styles.breakdownTitle}>Price Breakdown</Text>
                            
                            {flightItems.length > 0 && (
                                <View style={styles.breakdownRow}>
                                    <Text style={styles.breakdownLabel}>
                                        ✈️ Flights ({flightItems.reduce((sum: number, i: CartItem) => sum + i.quantity, 0)} tickets)
                                    </Text>
                                    <Text style={styles.breakdownValue}>
                                        €{flightItems.reduce((sum: number, i: CartItem) => sum + (i.price * i.quantity), 0).toFixed(2)}
                                    </Text>
                                </View>
                            )}
                            
                            {hotelItems.length > 0 && (
                                <View style={styles.breakdownRow}>
                                    <Text style={styles.breakdownLabel}>
                                        🏨 Accommodation ({hotelItems.reduce((sum: number, i: CartItem) => sum + i.quantity, 0)} nights)
                                    </Text>
                                    <Text style={styles.breakdownValue}>
                                        €{hotelItems.reduce((sum: number, i: CartItem) => sum + (i.price * i.quantity), 0).toFixed(2)}
                                    </Text>
                                </View>
                            )}
                            
                            {activityItems.length > 0 && (
                                <View style={styles.breakdownRow}>
                                    <Text style={styles.breakdownLabel}>
                                        🎫 Activities ({activityItems.reduce((sum: number, i: CartItem) => sum + i.quantity, 0)} tickets)
                                    </Text>
                                    <Text style={styles.breakdownValue}>
                                        €{activityItems.reduce((sum: number, i: CartItem) => sum + (i.price * i.quantity), 0).toFixed(2)}
                                    </Text>
                                </View>
                            )}
                            
                            <View style={styles.divider} />
                            
                            <View style={styles.totalRow}>
                                <Text style={styles.totalLabel}>Total</Text>
                                <Text style={styles.totalValue}>€{totalAmount.toFixed(2)}</Text>
                            </View>
                            
                            <Text style={styles.perPersonText}>
                                €{(totalAmount / travelers).toFixed(2)} per person
                            </Text>
                        </View>

                        {/* Booking Info */}
                        <View style={styles.bookingInfo}>
                            <View style={styles.infoRow}>
                                <Ionicons name="shield-checkmark" size={20} color="#14B8A6" />
                                <Text style={styles.infoText}>Secure payment processing</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Ionicons name="refresh" size={20} color="#14B8A6" />
                                <Text style={styles.infoText}>Free cancellation on most bookings</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Ionicons name="flash" size={20} color="#14B8A6" />
                                <Text style={styles.infoText}>Instant confirmation</Text>
                            </View>
                        </View>

                        <View style={{ height: 120 }} />
                    </ScrollView>

                    {/* Checkout Footer */}
                    <View style={styles.footer}>
                        <View style={styles.footerPrice}>
                            <Text style={styles.footerLabel}>Total</Text>
                            <Text style={styles.footerTotal}>€{totalAmount.toFixed(2)}</Text>
                        </View>
                        <TouchableOpacity 
                            style={[styles.checkoutButton, isCheckingOut && styles.checkoutButtonDisabled]}
                            onPress={handleCheckout}
                            disabled={isCheckingOut}
                        >
                            {isCheckingOut ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    <Text style={styles.checkoutButtonText}>Checkout</Text>
                                    <Ionicons name="arrow-forward" size={20} color="white" />
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </>
            )}
        </SafeAreaView>
    );
}

function CartItemCard({ 
    item, 
    color, 
    onRemove, 
    onUpdateQuantity,
    showDay = false 
}: { 
    item: CartItem; 
    color: string; 
    onRemove: () => void;
    onUpdateQuantity: (qty: number) => void;
    showDay?: boolean;
}) {
    return (
        <View style={styles.itemCard}>
            {item.image && (
                <Image source={{ uri: item.image }} style={styles.itemImage} />
            )}
            <View style={styles.itemContent}>
                <View style={styles.itemHeader}>
                    <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                    <TouchableOpacity onPress={onRemove} style={styles.removeButton}>
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                </View>
                
                {showDay && item.day && (
                    <View style={[styles.dayBadge, { backgroundColor: color + '20' }]}>
                        <Text style={[styles.dayText, { color }]}>Day {item.day}</Text>
                    </View>
                )}
                
                {item.skipTheLine && (
                    <View style={styles.skipLineBadge}>
                        <Ionicons name="flash" size={12} color="#FF9500" />
                        <Text style={styles.skipLineText}>Skip the Line</Text>
                    </View>
                )}
                
                <View style={styles.itemFooter}>
                    <View style={styles.quantityControl}>
                        <TouchableOpacity 
                            style={styles.quantityButton}
                            onPress={() => onUpdateQuantity(Math.max(0, item.quantity - 1))}
                        >
                            <Ionicons name="remove" size={16} color="#134E4A" />
                        </TouchableOpacity>
                        <Text style={styles.quantityText}>{item.quantity}</Text>
                        <TouchableOpacity 
                            style={styles.quantityButton}
                            onPress={() => onUpdateQuantity(item.quantity + 1)}
                        >
                            <Ionicons name="add" size={16} color="#134E4A" />
                        </TouchableOpacity>
                    </View>
                    <Text style={[styles.itemPrice, { color }]}>
                        €{(item.price * item.quantity).toFixed(2)}
                    </Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F0FFFE",
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F0FFFE",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
        backgroundColor: "white",
        borderBottomWidth: 1,
        borderBottomColor: "#CCFBF1",
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#134E4A",
    },
    clearButton: {
        padding: 8,
    },
    clearButtonText: {
        color: "#EF4444",
        fontWeight: "600",
    },
    emptyCart: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 40,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#134E4A",
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 14,
        color: "#5EEAD4",
        textAlign: "center",
        marginTop: 8,
        lineHeight: 22,
    },
    browseButton: {
        marginTop: 24,
        backgroundColor: "#14B8A6",
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    browseButtonText: {
        color: "white",
        fontWeight: "700",
        fontSize: 16,
    },
    content: {
        padding: 16,
    },
    tripSummary: {
        backgroundColor: "white",
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#CCFBF1",
    },
    tripDestination: {
        fontSize: 20,
        fontWeight: "700",
        color: "#134E4A",
    },
    tripDates: {
        fontSize: 14,
        color: "#5EEAD4",
        marginTop: 4,
    },
    tripTravelers: {
        fontSize: 14,
        color: "#14B8A6",
        fontWeight: "600",
        marginTop: 4,
    },
    section: {
        marginBottom: 20,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#134E4A",
    },
    itemCard: {
        backgroundColor: "white",
        borderRadius: 12,
        marginBottom: 12,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "#CCFBF1",
    },
    itemImage: {
        width: "100%",
        height: 100,
    },
    itemContent: {
        padding: 12,
    },
    itemHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    itemName: {
        fontSize: 15,
        fontWeight: "600",
        color: "#134E4A",
        flex: 1,
        marginRight: 8,
    },
    removeButton: {
        padding: 4,
    },
    dayBadge: {
        alignSelf: "flex-start",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginTop: 8,
    },
    dayText: {
        fontSize: 12,
        fontWeight: "600",
    },
    skipLineBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: 8,
    },
    skipLineText: {
        fontSize: 12,
        color: "#FF9500",
        fontWeight: "500",
    },
    itemFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 12,
    },
    quantityControl: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F0FFFE",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#CCFBF1",
    },
    quantityButton: {
        padding: 8,
    },
    quantityText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#134E4A",
        paddingHorizontal: 12,
    },
    itemPrice: {
        fontSize: 18,
        fontWeight: "700",
    },
    priceBreakdown: {
        backgroundColor: "white",
        borderRadius: 16,
        padding: 16,
        marginTop: 8,
        borderWidth: 1,
        borderColor: "#CCFBF1",
    },
    breakdownTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#134E4A",
        marginBottom: 16,
    },
    breakdownRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    breakdownLabel: {
        fontSize: 14,
        color: "#5EEAD4",
    },
    breakdownValue: {
        fontSize: 14,
        fontWeight: "600",
        color: "#134E4A",
    },
    divider: {
        height: 1,
        backgroundColor: "#CCFBF1",
        marginVertical: 12,
    },
    totalRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    totalLabel: {
        fontSize: 18,
        fontWeight: "700",
        color: "#134E4A",
    },
    totalValue: {
        fontSize: 24,
        fontWeight: "700",
        color: "#14B8A6",
    },
    perPersonText: {
        fontSize: 14,
        color: "#5EEAD4",
        textAlign: "right",
        marginTop: 4,
    },
    bookingInfo: {
        backgroundColor: "#CCFBF1",
        borderRadius: 16,
        padding: 16,
        marginTop: 16,
        gap: 12,
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    infoText: {
        fontSize: 14,
        color: "#0D9488",
        fontWeight: "500",
    },
    footer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "white",
        padding: 16,
        paddingBottom: Platform.OS === "ios" ? 32 : 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderTopWidth: 1,
        borderTopColor: "#CCFBF1",
        shadowColor: "#14B8A6",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
    },
    footerPrice: {
        flex: 1,
    },
    footerLabel: {
        fontSize: 12,
        color: "#5EEAD4",
        textTransform: "uppercase",
    },
    footerTotal: {
        fontSize: 24,
        fontWeight: "700",
        color: "#14B8A6",
    },
    checkoutButton: {
        backgroundColor: "#14B8A6",
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 12,
        shadowColor: "#14B8A6",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    checkoutButtonDisabled: {
        opacity: 0.7,
    },
    checkoutButtonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "700",
    },
});
