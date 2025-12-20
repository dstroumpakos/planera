import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import GeneratingLoadingScreen from "@/components/GeneratingLoadingScreen";

export default function LoadingScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  // Poll for trip status to know when generation is complete
  const tripStatus = useQuery(
    api.trips.getTripStatus,
    tripId ? { tripId: tripId as Id<"trips"> } : "skip"
  );

  useEffect(() => {
    if (!tripId) {
      router.back();
      return;
    }
    setIsReady(true);
  }, [tripId, router]);

  // When trip status shows it exists and is ready, redirect to trip details
  useEffect(() => {
    if (tripStatus && isReady && tripStatus.exists) {
      // Small delay to ensure smooth transition
      const timer = setTimeout(() => {
        router.replace(`/trip/${tripId}`);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [tripStatus, isReady, tripId, router]);

  const handleCancel = () => {
    router.back();
  };

  return <GeneratingLoadingScreen onCancel={handleCancel} />;
}
