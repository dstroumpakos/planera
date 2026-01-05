import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import * as Haptics from "expo-haptics";

interface TripFeedbackModalProps {
  visible: boolean;
  tripId: Id<"trips">;
  destination: string;
  onClose: () => void;
}

type FeedbackStep = "question" | "tip";

export default function TripFeedbackModal({
  visible,
  tripId,
  destination,
  onClose,
}: TripFeedbackModalProps) {
  const [step, setStep] = useState<FeedbackStep>("question");
  const [tip, setTip] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitDidNotTakeTrip = useMutation(api.feedback.submitDidNotTakeTrip);
  const submitTripTip = useMutation(api.feedback.submitTripTip);

  const triggerHaptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleNo = async () => {
    triggerHaptic();
    setIsSubmitting(true);
    try {
      await submitDidNotTakeTrip({ tripId });
      onClose();
    } catch (error) {
      console.error("Error submitting feedback:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleYes = () => {
    triggerHaptic();
    setStep("tip");
  };

  const handleSubmitTip = async () => {
    triggerHaptic();
    setIsSubmitting(true);
    try {
      await submitTripTip({
        tripId,
        tip: tip.trim() || undefined,
      });
      onClose();
    } catch (error) {
      console.error("Error submitting tip:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    triggerHaptic();
    setIsSubmitting(true);
    try {
      await submitTripTip({ tripId });
      onClose();
    } catch (error) {
      console.error("Error submitting feedback:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setStep("question");
    setTip("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={resetAndClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <View style={styles.modalContainer}>
          {/* Close button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={resetAndClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>

          {step === "question" ? (
            <>
              {/* Question Step */}
              <View style={styles.iconContainer}>
                <Ionicons name="airplane" size={48} color="#E8B749" />
              </View>

              <Text style={styles.title}>Did you take this trip?</Text>
              <Text style={styles.destination}>{destination}</Text>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.noButton]}
                  onPress={handleNo}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#666" />
                  ) : (
                    <Text style={styles.noButtonText}>No</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.yesButton]}
                  onPress={handleYes}
                  disabled={isSubmitting}
                >
                  <Text style={styles.yesButtonText}>Yes</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              {/* Tip Step */}
              <View style={styles.iconContainer}>
                <Ionicons name="bulb-outline" size={48} color="#E8B749" />
              </View>

              <Text style={styles.title}>Share tips for future travelers</Text>
              <Text style={styles.helperText}>
                Help travelers who haven't visited {destination} yet by sharing
                a quick tip.
              </Text>

              <TextInput
                style={styles.textInput}
                placeholder="E.g., 'Book restaurants in advance' or 'The sunset from the old town is amazing'"
                placeholderTextColor="#999"
                multiline
                maxLength={280}
                value={tip}
                onChangeText={setTip}
                textAlignVertical="top"
              />

              <Text style={styles.charCount}>{tip.length}/280</Text>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.skipButton]}
                  onPress={handleSkip}
                  disabled={isSubmitting}
                >
                  {isSubmitting && !tip.trim() ? (
                    <ActivityIndicator size="small" color="#666" />
                  ) : (
                    <Text style={styles.skipButtonText}>Skip</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.submitButton,
                    !tip.trim() && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSubmitTip}
                  disabled={isSubmitting || !tip.trim()}
                >
                  {isSubmitting && tip.trim() ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Share Tip</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    backgroundColor: "#FFFDF7",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    position: "relative",
  },
  closeButton: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 1,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFF8E7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1a1a1a",
    textAlign: "center",
    marginBottom: 8,
  },
  destination: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  helperText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  noButton: {
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  noButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  yesButton: {
    backgroundColor: "#E8B749",
  },
  yesButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  skipButton: {
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  submitButton: {
    backgroundColor: "#E8B749",
  },
  submitButtonDisabled: {
    backgroundColor: "#ccc",
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  textInput: {
    width: "100%",
    height: 120,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginBottom: 8,
  },
  charCount: {
    alignSelf: "flex-end",
    fontSize: 12,
    color: "#999",
    marginBottom: 20,
  },
});
