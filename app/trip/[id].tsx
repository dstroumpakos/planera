import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Image, Linking, Platform, Alert, Modal, TextInput, KeyboardAvoidingView } from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import { BlurView } from "expo-blur";
import { LinearGradient } from 'expo-linear-gradient';
import { useDestinationImage, useActivityImage } from "@/lib/useImages";
import ActivityCard from "@/components/ActivityCard";
import { ImageWithAttribution } from "@/components/ImageWithAttribution";

import DateTimePicker from '@react-native-community/datetimepicker';
import RegenerateTripModal from "@/components/RegenerateTripModal";

export default function TripDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const trip = useQuery(api.trips.get, id ? { tripId: id as Id<"trips"> } : "skip");
  const regenerateTrip = useMutation(api.trips.regenerate);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [regeneratingTrip, setRegeneratingTrip] = useState(false);

  const handleRegenerate = async (params: {
    startDate: number;
    endDate: number;
    budget: number;
    travelers: number;
    interests: string[];
    skipFlights: boolean;
    skipHotel: boolean;
    preferredFlightTime: "any" | "morning" | "afternoon" | "evening" | "night";
  }) => {
    if (!id) return;
    setRegeneratingTrip(true);
    try {
      await regenerateTrip({
        tripId: id as Id<"trips">,
        startDate: params.startDate,
        endDate: params.endDate,
        budget: params.budget,
        travelers: params.travelers,
        interests: params.interests,
        skipFlights: params.skipFlights,
        skipHotel: params.skipHotel,
        preferredFlightTime: params.preferredFlightTime,
      });
      Alert.alert("Success", "Trip regenerated successfully!");
      setShowRegenerateModal(false);
    } catch (error) {
      console.error("Regenerate error:", error);
      Alert.alert("Error", "Failed to regenerate trip. Please try again.");
    } finally {
      setRegeneratingTrip(false);
    }
  };
}