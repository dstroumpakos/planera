import { useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export default function TripLoadingScreen() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();

  // Poll for the trip to ensure it exists before navigating
  const trip = useQuery(
    tripId ? api.trips.getTripDetails : "skip",
    tripId ? { tripId: tripId as Id<"trips"> } : "skip"
  );

  useEffect(() => {
    if (trip) {
      // Trip exists, navigate to the details page
      router.replace(`/trip/${tripId}`);
    }
  }, [trip, tripId, router]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color="#4F6DF5" />
        <Text style={styles.text}>Loading your trip...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFEF5",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    gap: 16,
  },
  text: {
    fontSize: 16,
    color: "#1A2433",
    fontWeight: "500",
  },
});
