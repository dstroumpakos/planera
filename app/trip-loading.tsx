import React, { useEffect } from "react";
import { useRouter } from "expo-router";
import GeneratingLoadingScreen from "@/components/GeneratingLoadingScreen";

export default function TripLoading() {
  const router = useRouter();

  useEffect(() => {
    // This page just shows the loading screen
    // The actual trip data is passed via route params
  }, []);

  return <GeneratingLoadingScreen />;
}
