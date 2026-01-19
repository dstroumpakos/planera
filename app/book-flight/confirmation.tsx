import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/lib/ThemeContext";

export default function ConfirmationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useTheme();
  
  const { orderId, bookingReference } = params;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="checkmark-circle" size={80} color={colors.primary} />
        </View>
        
        <Text style={[styles.title, { color: colors.text }]}>Booking Confirmed!</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Your flight has been successfully booked.
        </Text>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Booking Reference</Text>
          <Text style={[styles.reference, { color: colors.text }]}>{bookingReference}</Text>
          
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          
          <Text style={[styles.label, { color: colors.textSecondary }]}>Order ID</Text>
          <Text style={[styles.value, { color: colors.text }]}>{orderId}</Text>
        </View>

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/(tabs)/bookings")}
        >
          <Text style={styles.buttonText}>View My Bookings</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.secondaryButton, { borderColor: colors.border }]}
          onPress={() => router.push("/(tabs)")}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
  },
  card: {
    width: "100%",
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    marginBottom: 4,
  },
  reference: {
    fontSize: 32,
    fontWeight: "bold",
    letterSpacing: 2,
  },
  value: {
    fontSize: 16,
    fontWeight: "500",
  },
  divider: {
    width: "100%",
    height: 1,
    marginVertical: 16,
  },
  button: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  secondaryButton: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontWeight: "600",
    fontSize: 16,
  },
});
