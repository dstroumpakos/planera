import React, { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import GeneratingLoadingScreen from "@/components/GeneratingLoadingScreen";
import { Alert } from "react-native";

export default function TripLoadingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [hasNavigated, setHasNavigated] = useState(false);

  // Poll for trip status
  const trip = useQuery(
    id ? api.trips.get : null,
    id ? { tripId: id as Id<"trips"> } : "skip"
  );

  useEffect(() => {
    if (!trip || hasNavigated) return;

    // Check if trip is ready (has itinerary)
    if (trip.itinerary && trip.status === "completed") {
      setHasNavigated(true);
      // Navigate to trip details
      router.replace(`/trip/${id}` as any);
    } else if (trip.status === "failed") {
      // Handle failed trip generation
      Alert.alert(
        "Trip Generation Failed",
        "There was an error generating your trip. Please try again.",
        [
          {
            text: "Go Back",
            onPress: () => router.back(),
          },
        ]
      );
    }
  }, [trip, id, hasNavigated, router]);

  const handleCancel = () => {
    router.back();
  };

  return <GeneratingLoadingScreen onCancel={handleCancel} />;
}
