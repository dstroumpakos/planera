import React from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from "react-native";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/lib/ThemeContext";
import { useRouter } from "expo-router";

export default function BookingsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const bookings = useQuery(api.flightBookings.getMyFlightBookings);

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={[styles.airline, { color: colors.text }]}>{item.flightDetails.airline}</Text>
          <Text style={[styles.date, { color: colors.textSecondary }]}>
            {new Date(item.bookedAt).toLocaleDateString()}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.status === "confirmed" ? "#E8F5E9" : "#FFEBEE" }]}>
          <Text style={[styles.statusText, { color: item.status === "confirmed" ? "#2E7D32" : "#C62828" }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.flightRoute}>
        <View>
          <Text style={[styles.airportCode, { color: colors.text }]}>{item.flightDetails.origin}</Text>
          <Text style={[styles.time, { color: colors.textSecondary }]}>
            {item.flightDetails.departureTime ? new Date(item.flightDetails.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
          </Text>
        </View>
        <View style={styles.flightPath}>
          <Ionicons name="airplane" size={20} color={colors.primary} />
          <View style={[styles.dottedLine, { borderColor: colors.border }]} />
        </View>
        <View>
          <Text style={[styles.airportCode, { color: colors.text, textAlign: "right" }]}>{item.flightDetails.destination}</Text>
          <Text style={[styles.time, { color: colors.textSecondary, textAlign: "right" }]}>
            {item.flightDetails.arrivalTime ? new Date(item.flightDetails.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
          </Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.cardFooter}>
        <View>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Booking Ref</Text>
          <Text style={[styles.value, { color: colors.text }]}>{item.duffelBookingReference}</Text>
        </View>
        <View>
          <Text style={[styles.label, { color: colors.textSecondary, textAlign: "right" }]}>Amount</Text>
          <Text style={[styles.value, { color: colors.text, textAlign: "right" }]}>{item.currency} {item.amount}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>My Bookings</Text>
      </View>

      {bookings === undefined ? (
        <View style={styles.center}>
          <Text style={{ color: colors.textSecondary }}>Loading bookings...</Text>
        </View>
      ) : bookings.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="airplane-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No bookings yet</Text>
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/create-trip")}
          >
            <Text style={styles.buttonText}>Plan a Trip</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={bookings}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => {}} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  list: {
    padding: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  airline: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  flightRoute: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  flightPath: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 16,
  },
  dottedLine: {
    width: "100%",
    borderBottomWidth: 1,
    borderStyle: "dotted",
    marginTop: -10,
    zIndex: -1,
  },
  airportCode: {
    fontSize: 20,
    fontWeight: "bold",
  },
  time: {
    fontSize: 14,
  },
  divider: {
    height: 1,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 12,
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: "600",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
