import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/lib/ThemeContext";

export default function PassengerDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useTheme();
  
  const { offerId, price, currency, flightDetails } = params;
  const parsedFlightDetails = typeof flightDetails === 'string' ? JSON.parse(flightDetails) : flightDetails;

  const [passenger, setPassenger] = useState({
    title: "mr",
    given_name: "",
    family_name: "",
    born_on: "",
    gender: "m",
    email: "",
    phone_number: "",
  });

  const validate = () => {
    if (!passenger.given_name || !passenger.family_name || !passenger.born_on || !passenger.email || !passenger.phone_number) {
      Alert.alert("Missing Information", "Please fill in all fields.");
      return false;
    }
    // Basic date validation YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(passenger.born_on)) {
      Alert.alert("Invalid Date", "Date of birth must be in YYYY-MM-DD format.");
      return false;
    }
    return true;
  };

  const handleContinue = () => {
    if (validate()) {
      router.push({
        pathname: "/book-flight/payment",
        params: {
          offerId,
          price,
          currency,
          flightDetails: JSON.stringify(parsedFlightDetails),
          passenger: JSON.stringify(passenger),
        },
      });
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Passenger Details</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Primary Passenger</Text>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Title</Text>
            <View style={styles.row}>
              <TouchableOpacity 
                style={[styles.option, passenger.title === "mr" && { backgroundColor: colors.primary }]}
                onPress={() => setPassenger({ ...passenger, title: "mr" })}
              >
                <Text style={[styles.optionText, passenger.title === "mr" && { color: "#fff" }]}>Mr</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.option, passenger.title === "ms" && { backgroundColor: colors.primary }]}
                onPress={() => setPassenger({ ...passenger, title: "ms" })}
              >
                <Text style={[styles.optionText, passenger.title === "ms" && { color: "#fff" }]}>Ms</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.option, passenger.title === "mrs" && { backgroundColor: colors.primary }]}
                onPress={() => setPassenger({ ...passenger, title: "mrs" })}
              >
                <Text style={[styles.optionText, passenger.title === "mrs" && { color: "#fff" }]}>Mrs</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>First Name (as on passport)</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
              value={passenger.given_name}
              onChangeText={(text) => setPassenger({ ...passenger, given_name: text })}
              placeholder="John"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Last Name (as on passport)</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
              value={passenger.family_name}
              onChangeText={(text) => setPassenger({ ...passenger, family_name: text })}
              placeholder="Doe"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Date of Birth (YYYY-MM-DD)</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
              value={passenger.born_on}
              onChangeText={(text) => setPassenger({ ...passenger, born_on: text })}
              placeholder="1990-01-01"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numbers-and-punctuation"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Gender</Text>
            <View style={styles.row}>
              <TouchableOpacity 
                style={[styles.option, passenger.gender === "m" && { backgroundColor: colors.primary }]}
                onPress={() => setPassenger({ ...passenger, gender: "m" })}
              >
                <Text style={[styles.optionText, passenger.gender === "m" && { color: "#fff" }]}>Male</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.option, passenger.gender === "f" && { backgroundColor: colors.primary }]}
                onPress={() => setPassenger({ ...passenger, gender: "f" })}
              >
                <Text style={[styles.optionText, passenger.gender === "f" && { color: "#fff" }]}>Female</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Email</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
              value={passenger.email}
              onChangeText={(text) => setPassenger({ ...passenger, email: text })}
              placeholder="john@example.com"
              placeholderTextColor={colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Phone Number</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
              value={passenger.phone_number}
              onChangeText={(text) => setPassenger({ ...passenger, phone_number: text })}
              placeholder="+1234567890"
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
            />
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
        <View>
          <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>Total Price</Text>
          <Text style={[styles.priceValue, { color: colors.text }]}>{currency} {price}</Text>
        </View>
        <TouchableOpacity style={[styles.continueButton, { backgroundColor: colors.primary }]} onPress={handleContinue}>
          <Text style={styles.continueButtonText}>Continue to Payment</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  option: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#f0f0f0",
  },
  optionText: {
    fontWeight: "500",
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceLabel: {
    fontSize: 12,
  },
  priceValue: {
    fontSize: 20,
    fontWeight: "bold",
  },
  continueButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  continueButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
