import { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/lib/ThemeContext";

interface PassengerForm {
  givenName: string;
  familyName: string;
  dateOfBirth: string;
  gender: "male" | "female";
  email: string;
  phoneNumber: string;
  title: "mr" | "ms" | "mrs" | "miss" | "dr";
}

export default function FlightBookingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useTheme();
  
  const offerId = params.offerId as string;
  const tripId = params.tripId as string;
  const numPassengers = parseInt(params.passengers as string) || 1;
  const flightInfo = params.flightInfo ? JSON.parse(params.flightInfo as string) : null;

  const getFlightOffer = useAction(api.flightBooking.getFlightOffer);
  const createBooking = useAction(api.flightBooking.createFlightBooking);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [offerValid, setOfferValid] = useState(false);
  const [offerError, setOfferError] = useState<string | null>(null);
  const [priceInfo, setPriceInfo] = useState<{ pricePerPerson: number; totalPrice: number; currency: string } | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<{ bookingReference: string; orderId: string } | null>(null);

  const [passengers, setPassengers] = useState<PassengerForm[]>(
    Array(numPassengers).fill(null).map(() => ({
      givenName: "",
      familyName: "",
      dateOfBirth: "",
      gender: "male" as const,
      email: "",
      phoneNumber: "",
      title: "mr" as const,
    }))
  );

  // Verify offer is still valid
  useEffect(() => {
    async function verifyOffer() {
      if (!offerId) {
        setOfferError("No flight offer ID provided");
        setLoading(false);
        return;
      }

      try {
        const result = await getFlightOffer({ offerId });
        if (result.valid) {
          setOfferValid(true);
          setPriceInfo({
            pricePerPerson: result.pricePerPerson,
            totalPrice: result.totalPrice,
            currency: result.currency,
          });
        } else {
          setOfferError(result.error);
        }
      } catch (error) {
        console.error("Verify offer error:", error);
        setOfferError("Failed to verify flight offer");
      } finally {
        setLoading(false);
      }
    }

    verifyOffer();
  }, [offerId]);

  const updatePassenger = (index: number, field: keyof PassengerForm, value: string) => {
    setPassengers(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const validateForm = (): boolean => {
    for (let i = 0; i < passengers.length; i++) {
      const p = passengers[i];
      if (!p.givenName.trim()) {
        showAlert("Missing Information", `Please enter first name for passenger ${i + 1}`);
        return false;
      }
      if (!p.familyName.trim()) {
        showAlert("Missing Information", `Please enter last name for passenger ${i + 1}`);
        return false;
      }
      if (!p.dateOfBirth || !/^\d{4}-\d{2}-\d{2}$/.test(p.dateOfBirth)) {
        showAlert("Missing Information", `Please enter valid date of birth (YYYY-MM-DD) for passenger ${i + 1}`);
        return false;
      }
      if (!p.email.trim() || !p.email.includes("@")) {
        showAlert("Missing Information", `Please enter valid email for passenger ${i + 1}`);
        return false;
      }
      if (!p.phoneNumber.trim()) {
        showAlert("Missing Information", `Please enter phone number for passenger ${i + 1}`);
        return false;
      }
    }
    return true;
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS !== "web") {
      Alert.alert(title, message);
    } else {
      alert(`${title}: ${message}`);
    }
  };

  const handleBookFlight = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      // For test mode with Duffel Airways, we can directly create the booking
      // The balance payment will be used automatically in sandbox
      const result = await createBooking({
        offerId,
        tripId: tripId as Id<"trips">,
        passengers: passengers.map((p, index) => ({
          id: `pas_${index}`,
          givenName: p.givenName,
          familyName: p.familyName,
          dateOfBirth: p.dateOfBirth,
          gender: p.gender,
          email: p.email,
          phoneNumber: p.phoneNumber,
          title: p.title,
        })),
      });

      if (result.success) {
        // Show success state
        setBookingSuccess({
          bookingReference: result.bookingReference,
          orderId: result.orderId,
        });
      } else {
        showAlert("Booking Error", result.error);
      }
    } catch (error) {
      console.error("Book flight error:", error);
      showAlert("Error", "Failed to process booking. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const dynamicStyles = {
    container: { backgroundColor: colors.background },
    text: { color: colors.text },
    secondaryText: { color: colors.textSecondary },
    card: { backgroundColor: colors.card, borderColor: colors.border },
    input: { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
  };

  // Success screen
  if (bookingSuccess) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={80} color="#10B981" />
          </View>
          <Text style={[styles.successTitle, dynamicStyles.text]}>Booking Confirmed!</Text>
          <Text style={[styles.successSubtitle, dynamicStyles.secondaryText]}>
            Your flight has been booked successfully
          </Text>
          
          <View style={[styles.confirmationCard, dynamicStyles.card]}>
            <Text style={[styles.confirmationLabel, dynamicStyles.secondaryText]}>Booking Reference</Text>
            <Text style={[styles.confirmationValue, dynamicStyles.text]}>{bookingSuccess.bookingReference}</Text>
            
            <View style={styles.confirmationDivider} />
            
            <Text style={[styles.confirmationLabel, dynamicStyles.secondaryText]}>Order ID</Text>
            <Text style={[styles.confirmationValueSmall, dynamicStyles.secondaryText]}>{bookingSuccess.orderId}</Text>
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color={colors.primary} />
            <Text style={[styles.infoText, dynamicStyles.secondaryText]}>
              A confirmation email will be sent to all passengers. Please check your inbox.
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.backToTripButton} 
            onPress={() => router.replace(`/trip/${tripId}`)}
          >
            <Text style={styles.backToTripButtonText}>Back to Trip</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.viewBookingsButton} 
            onPress={() => router.replace("/(tabs)/trips")}
          >
            <Text style={[styles.viewBookingsButtonText, { color: colors.primary }]}>View My Trips</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, dynamicStyles.text]}>Verifying flight availability...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (offerError || !offerValid) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, dynamicStyles.text]}>Book Flight</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#EF4444" />
          <Text style={[styles.errorTitle, dynamicStyles.text]}>Flight Unavailable</Text>
          <Text style={[styles.errorText, dynamicStyles.secondaryText]}>
            {offerError || "This flight is no longer available. Please search for new flights."}
          </Text>
          <TouchableOpacity style={styles.backToTripButton} onPress={() => router.back()}>
            <Text style={styles.backToTripButtonText}>Back to Trip</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.text]}>Book Flight</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Test Mode Banner */}
        <View style={styles.testModeBanner}>
          <Ionicons name="flask" size={20} color="#F59E0B" />
          <Text style={styles.testModeText}>
            Test Mode: Using Duffel Airways sandbox. No real charges.
          </Text>
        </View>

        {/* Flight Summary */}
        {flightInfo && (
          <View style={[styles.flightSummary, dynamicStyles.card]}>
            <Text style={[styles.sectionTitle, dynamicStyles.text]}>Flight Summary</Text>
            <View style={styles.flightDetail}>
              <Text style={[styles.flightLabel, dynamicStyles.secondaryText]}>Outbound</Text>
              <Text style={[styles.flightValue, dynamicStyles.text]}>
                {flightInfo.outbound?.airline} • {flightInfo.outbound?.departure} - {flightInfo.outbound?.arrival}
              </Text>
            </View>
            <View style={styles.flightDetail}>
              <Text style={[styles.flightLabel, dynamicStyles.secondaryText]}>Return</Text>
              <Text style={[styles.flightValue, dynamicStyles.text]}>
                {flightInfo.return?.airline} • {flightInfo.return?.departure} - {flightInfo.return?.arrival}
              </Text>
            </View>
            {priceInfo && (
              <View style={styles.priceRow}>
                <Text style={[styles.priceLabel, dynamicStyles.text]}>Total Price</Text>
                <Text style={styles.priceValue}>
                  {priceInfo.currency === "GBP" ? "£" : "€"}{priceInfo.totalPrice.toFixed(2)} ({numPassengers} passenger{numPassengers > 1 ? "s" : ""})
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Passenger Forms */}
        {passengers.map((passenger, index) => (
          <View key={index} style={[styles.passengerCard, dynamicStyles.card]}>
            <Text style={[styles.sectionTitle, dynamicStyles.text]}>
              Passenger {index + 1} {index === 0 && "(Primary Contact)"}
            </Text>

            <View style={styles.row}>
              <View style={styles.titlePicker}>
                <Text style={[styles.inputLabel, dynamicStyles.secondaryText]}>Title</Text>
                <View style={styles.titleOptions}>
                  {(["mr", "ms", "mrs", "miss", "dr"] as const).map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.titleOption,
                        passenger.title === t && styles.titleOptionSelected,
                      ]}
                      onPress={() => updatePassenger(index, "title", t)}
                    >
                      <Text
                        style={[
                          styles.titleOptionText,
                          passenger.title === t && styles.titleOptionTextSelected,
                        ]}
                      >
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={[styles.inputLabel, dynamicStyles.secondaryText]}>First Name *</Text>
                <TextInput
                  style={[styles.input, dynamicStyles.input]}
                  value={passenger.givenName}
                  onChangeText={(v) => updatePassenger(index, "givenName", v)}
                  placeholder="John"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={[styles.inputLabel, dynamicStyles.secondaryText]}>Last Name *</Text>
                <TextInput
                  style={[styles.input, dynamicStyles.input]}
                  value={passenger.familyName}
                  onChangeText={(v) => updatePassenger(index, "familyName", v)}
                  placeholder="Doe"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, dynamicStyles.secondaryText]}>Date of Birth * (YYYY-MM-DD)</Text>
              <TextInput
                style={[styles.input, dynamicStyles.input]}
                value={passenger.dateOfBirth}
                onChangeText={(v) => updatePassenger(index, "dateOfBirth", v)}
                placeholder="1990-01-15"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numbers-and-punctuation"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, dynamicStyles.secondaryText]}>Gender</Text>
              <View style={styles.genderOptions}>
                <TouchableOpacity
                  style={[
                    styles.genderOption,
                    passenger.gender === "male" && styles.genderOptionSelected,
                  ]}
                  onPress={() => updatePassenger(index, "gender", "male")}
                >
                  <Text
                    style={[
                      styles.genderOptionText,
                      passenger.gender === "male" && styles.genderOptionTextSelected,
                    ]}
                  >
                    Male
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.genderOption,
                    passenger.gender === "female" && styles.genderOptionSelected,
                  ]}
                  onPress={() => updatePassenger(index, "gender", "female")}
                >
                  <Text
                    style={[
                      styles.genderOptionText,
                      passenger.gender === "female" && styles.genderOptionTextSelected,
                    ]}
                  >
                    Female
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, dynamicStyles.secondaryText]}>Email *</Text>
              <TextInput
                style={[styles.input, dynamicStyles.input]}
                value={passenger.email}
                onChangeText={(v) => updatePassenger(index, "email", v)}
                placeholder="john.doe@email.com"
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, dynamicStyles.secondaryText]}>Phone Number *</Text>
              <TextInput
                style={[styles.input, dynamicStyles.input]}
                value={passenger.phoneNumber}
                onChangeText={(v) => updatePassenger(index, "phoneNumber", v)}
                placeholder="+1 555 123 4567"
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
              />
            </View>
          </View>
        ))}

        <View style={styles.disclaimer}>
          <Ionicons name="shield-checkmark" size={20} color="#10B981" />
          <Text style={[styles.disclaimerText, dynamicStyles.secondaryText]}>
            This is a test booking using Duffel's sandbox environment. Your booking will be processed instantly with no real payment required.
          </Text>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <View style={[styles.footer, dynamicStyles.card]}>
        <View style={styles.footerPrice}>
          <Text style={[styles.footerPriceLabel, dynamicStyles.secondaryText]}>Total</Text>
          <Text style={[styles.footerPriceValue, dynamicStyles.text]}>
            {priceInfo?.currency === "GBP" ? "£" : "€"}{priceInfo?.totalPrice.toFixed(2) || "0.00"}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.bookButton, submitting && styles.bookButtonDisabled]}
          onPress={handleBookFlight}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.bookButtonText}>Confirm Booking</Text>
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            </>
          )}
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
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
  },
  successContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    marginBottom: 24,
  },
  confirmationCard: {
    width: "100%",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  confirmationLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  confirmationValue: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 2,
  },
  confirmationValueSmall: {
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  confirmationDivider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.1)",
    marginVertical: 16,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderRadius: 12,
    marginBottom: 24,
    width: "100%",
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  backToTripButton: {
    backgroundColor: "#1A1A1A",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
    width: "100%",
    alignItems: "center",
  },
  backToTripButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  viewBookingsButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  viewBookingsButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  testModeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  testModeText: {
    flex: 1,
    fontSize: 13,
    color: "#B45309",
    fontWeight: "500",
  },
  flightSummary: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  flightDetail: {
    marginBottom: 8,
  },
  flightLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  flightValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  priceLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  priceValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#059669",
  },
  passengerCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  halfInput: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    marginBottom: 6,
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  titlePicker: {
    flex: 1,
  },
  titleOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  titleOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  titleOptionSelected: {
    backgroundColor: "#1A1A1A",
    borderColor: "#1A1A1A",
  },
  titleOptionText: {
    fontSize: 14,
    color: "#64748B",
  },
  titleOptionTextSelected: {
    color: "#FFFFFF",
    fontWeight: "500",
  },
  genderOptions: {
    flexDirection: "row",
    gap: 12,
  },
  genderOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  genderOptionSelected: {
    backgroundColor: "#1A1A1A",
    borderColor: "#1A1A1A",
  },
  genderOptionText: {
    fontSize: 14,
    color: "#64748B",
  },
  genderOptionTextSelected: {
    color: "#FFFFFF",
    fontWeight: "500",
  },
  disclaimer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderRadius: 12,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  bottomPadding: {
    height: 100,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderTopWidth: 1,
  },
  footerPrice: {
    flex: 1,
  },
  footerPriceLabel: {
    fontSize: 12,
  },
  footerPriceValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  bookButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10B981",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  bookButtonDisabled: {
    opacity: 0.6,
  },
  bookButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
