import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";

const COLORS = {
  primary: "#F4D03F",
  text: "#1A1A1A",
  textMuted: "#666666",
  background: "#FFFFFF",
  border: "#E0E0E0",
  success: "#4CAF50",
};

export default function TripFeedbackPage() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const [step, setStep] = useState<"question" | "tip">("question");
  const [tip, setTip] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trip = useQuery(api.trips.get, tripId ? { tripId: tripId as any } : "skip");
  const submitDidNotTakeTrip = useMutation(api.feedback.submitDidNotTakeTrip);
  const submitTripTip = useMutation(api.feedback.submitTripTip);

  const handleYes = async () => {
    try {
      setIsSubmitting(true);
      setStep("tip");
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNo = async () => {
    try {
      setIsSubmitting(true);
      if (tripId) {
        await submitDidNotTakeTrip({ tripId: tripId as any });
      }
      router.back();
    } catch (error) {
      console.error("Error recording feedback:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitTip = async () => {
    try {
      setIsSubmitting(true);
      if (tripId) {
        await submitTripTip({
          tripId: tripId as any,
          tip: tip.trim() || undefined,
        });
      }
      router.back();
    } catch (error) {
      console.error("Error submitting tip:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (trip === undefined) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Trip not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backIconButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={28} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Trip Feedback</Text>
          <View style={{ width: 28 }} />
        </View>

        {step === "question" ? (
          <View style={styles.content}>
            {/* Destination Info */}
            <View style={styles.destinationCard}>
              <Text style={styles.destinationName}>{trip.destination}</Text>
              <Text style={styles.destinationDates}>
                {new Date(trip.startDate).toLocaleDateString()} -{" "}
                {new Date(trip.endDate).toLocaleDateString()}
              </Text>
            </View>

            {/* Question */}
            <View style={styles.questionSection}>
              <Text style={styles.questionTitle}>Did you take this trip?</Text>
              <Text style={styles.questionSubtitle}>
                Help us understand your travel experience
              </Text>
            </View>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.yesButton]}
                onPress={handleYes}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={COLORS.text} />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color={COLORS.text}
                    />
                    <Text style={styles.buttonText}>Yes, I took it</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.noButton]}
                onPress={handleNo}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={COLORS.text} />
                ) : (
                  <>
                    <Ionicons
                      name="close-circle"
                      size={24}
                      color={COLORS.text}
                    />
                    <Text style={styles.buttonText}>No, I didn't</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.content}>
            {/* Tip Section */}
            <View style={styles.tipSection}>
              <Text style={styles.tipTitle}>Share tips for future travelers</Text>
              <Text style={styles.tipSubtitle}>
                Help travelers who haven't visited {trip.destination} yet by
                sharing a quick tip.
              </Text>
            </View>

            {/* Text Input */}
            <TextInput
              style={styles.tipInput}
              placeholder="Share your tip (optional, max 2-3 sentences)..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              maxLength={300}
              value={tip}
              onChangeText={setTip}
              editable={!isSubmitting}
            />

            {/* Character Count */}
            <Text style={styles.charCount}>{tip.length}/300</Text>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleSubmitTip}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={COLORS.text} />
              ) : (
                <>
                  <Ionicons name="send" size={20} color={COLORS.text} />
                  <Text style={styles.submitButtonText}>Submit Tip</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Skip Button */}
            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => router.back()}
              disabled={isSubmitting}
            >
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backIconButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  destinationCard: {
    backgroundColor: "#FFF9E6",
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  destinationName: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  destinationDates: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  questionSection: {
    marginBottom: 32,
  },
  questionTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
  },
  questionSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 12,
  },
  yesButton: {
    backgroundColor: COLORS.primary,
  },
  noButton: {
    backgroundColor: COLORS.border,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  tipSection: {
    marginBottom: 24,
  },
  tipTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
  },
  tipSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  tipInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: COLORS.text,
    minHeight: 120,
    textAlignVertical: "top",
    marginBottom: 8,
  },
  charCount: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: "right",
    marginBottom: 24,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  skipButtonText: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: "500",
  },
  errorText: {
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
});
