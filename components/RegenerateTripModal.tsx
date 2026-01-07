import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Switch,
  FlatList,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Calendar, DateData } from "react-native-calendars";
import { INTERESTS } from "@/lib/data";
import { LinearGradient } from "expo-linear-gradient";

interface RegenerateTripModalProps {
  visible: boolean;
  onClose: () => void;
  onRegenerate: (params: {
    startDate: number;
    endDate: number;
    budget: number;
    travelers: number;
    interests: string[];
    skipFlights: boolean;
    skipHotel: boolean;
    preferredFlightTime: "any" | "morning" | "afternoon" | "evening" | "night";
  }) => Promise<void>;
  destination: string;
  currentTrip?: {
    startDate?: number;
    endDate?: number;
    budget?: number;
    travelers?: number;
    interests?: string[];
    skipFlights?: boolean;
    skipHotel?: boolean;
    preferredFlightTime?: "any" | "morning" | "afternoon" | "evening" | "night";
  };
  loading?: boolean;
}

export default function RegenerateTripModal({
  visible,
  onClose,
  onRegenerate,
  destination,
  currentTrip,
  loading = false,
}: RegenerateTripModalProps) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectingDate, setSelectingDate] = useState<"start" | "end">("start");
  const [showInterests, setShowInterests] = useState(false);

  const [formData, setFormData] = useState({
    startDate: currentTrip?.startDate || new Date().getTime(),
    endDate:
      currentTrip?.endDate ||
      new Date().getTime() + 7 * 24 * 60 * 60 * 1000,
    budget: currentTrip?.budget || 2000,
    travelers: currentTrip?.travelers || 1,
    interests: currentTrip?.interests || ([] as string[]),
    skipFlights: currentTrip?.skipFlights || false,
    skipHotel: currentTrip?.skipHotel || false,
    preferredFlightTime:
      (currentTrip?.preferredFlightTime as any) || ("any" as const),
  });

  useEffect(() => {
    if (currentTrip) {
      setFormData({
        startDate: currentTrip.startDate || new Date().getTime(),
        endDate:
          currentTrip.endDate ||
          new Date().getTime() + 7 * 24 * 60 * 60 * 1000,
        budget: currentTrip.budget || 2000,
        travelers: currentTrip.travelers || 1,
        interests: currentTrip.interests || [],
        skipFlights: currentTrip.skipFlights || false,
        skipHotel: currentTrip.skipHotel || false,
        preferredFlightTime:
          (currentTrip.preferredFlightTime as any) || "any",
      });
    }
  }, [currentTrip, visible]);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleDateSelect = (day: DateData) => {
    const selectedDate = new Date(day.dateString).getTime();

    if (selectingDate === "start") {
      setFormData({
        ...formData,
        startDate: selectedDate,
        endDate: Math.max(selectedDate + 7 * 24 * 60 * 60 * 1000, formData.endDate),
      });
    } else {
      if (selectedDate >= formData.startDate) {
        setFormData({ ...formData, endDate: selectedDate });
      }
    }
    setShowCalendar(false);
  };

  const toggleInterest = (interest: string) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const handleRegenerate = async () => {
    if (formData.startDate >= formData.endDate) {
      alert("End date must be after start date");
      return;
    }

    try {
      await onRegenerate(formData);
      onClose();
    } catch (error) {
      console.error("Regenerate error:", error);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <LinearGradient
          colors={["#FFFBF0", "#FFF8E7"]}
          style={styles.gradient}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} disabled={loading}>
              <Ionicons name="chevron-back" size={28} color="#181710" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Regenerate Trip</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Destination (Locked) */}
            <View style={styles.section}>
              <Text style={styles.label}>Destination</Text>
              <View style={[styles.input, styles.lockedInput]}>
                <Text style={styles.lockedText}>{destination}</Text>
                <Ionicons name="lock-closed" size={16} color="#F5A623" />
              </View>
              <Text style={styles.helperText}>
                Destination is locked for regeneration
              </Text>
            </View>

            {/* Dates */}
            <View style={styles.section}>
              <Text style={styles.label}>Travel Dates</Text>

              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => {
                  setSelectingDate("start");
                  setShowCalendar(true);
                }}
                disabled={loading}
              >
                <View style={styles.dateButtonContent}>
                  <Ionicons name="calendar" size={18} color="#F5A623" />
                  <View style={styles.dateButtonText}>
                    <Text style={styles.dateLabel}>Start Date</Text>
                    <Text style={styles.dateValue}>
                      {formatDate(formData.startDate)}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#999" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => {
                  setSelectingDate("end");
                  setShowCalendar(true);
                }}
                disabled={loading}
              >
                <View style={styles.dateButtonContent}>
                  <Ionicons name="calendar" size={18} color="#F5A623" />
                  <View style={styles.dateButtonText}>
                    <Text style={styles.dateLabel}>End Date</Text>
                    <Text style={styles.dateValue}>
                      {formatDate(formData.endDate)}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#999" />
              </TouchableOpacity>
            </View>

            {/* Budget */}
            <View style={styles.section}>
              <Text style={styles.label}>Budget per Person</Text>
              <View style={styles.inputWithUnit}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.numberInput}
                  value={formData.budget.toString()}
                  onChangeText={(text) =>
                    setFormData({
                      ...formData,
                      budget: parseInt(text) || 0,
                    })
                  }
                  keyboardType="number-pad"
                  editable={!loading}
                />
              </View>
            </View>

            {/* Travelers */}
            <View style={styles.section}>
              <Text style={styles.label}>Number of Travelers</Text>
              <View style={styles.counterContainer}>
                <TouchableOpacity
                  style={styles.counterButton}
                  onPress={() =>
                    setFormData({
                      ...formData,
                      travelers: Math.max(1, formData.travelers - 1),
                    })
                  }
                  disabled={loading || formData.travelers <= 1}
                >
                  <Ionicons name="remove" size={20} color="#F5A623" />
                </TouchableOpacity>
                <Text style={styles.counterValue}>{formData.travelers}</Text>
                <TouchableOpacity
                  style={styles.counterButton}
                  onPress={() =>
                    setFormData({
                      ...formData,
                      travelers: formData.travelers + 1,
                    })
                  }
                  disabled={loading}
                >
                  <Ionicons name="add" size={20} color="#F5A623" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Interests */}
            <View style={styles.section}>
              <View style={styles.interestHeader}>
                <Text style={styles.label}>Interests</Text>
                <TouchableOpacity
                  onPress={() => setShowInterests(!showInterests)}
                  disabled={loading}
                >
                  <Ionicons
                    name={showInterests ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#F5A623"
                  />
                </TouchableOpacity>
              </View>

              {showInterests && (
                <View style={styles.interestGrid}>
                  {INTERESTS.map((interest) => (
                    <TouchableOpacity
                      key={interest}
                      style={[
                        styles.interestChip,
                        formData.interests.includes(interest) &&
                          styles.interestChipActive,
                      ]}
                      onPress={() => toggleInterest(interest)}
                      disabled={loading}
                    >
                      <Text
                        style={[
                          styles.interestChipText,
                          formData.interests.includes(interest) &&
                            styles.interestChipTextActive,
                        ]}
                      >
                        {interest}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Skip Options */}
            <View style={styles.section}>
              <View style={styles.optionRow}>
                <View>
                  <Text style={styles.optionLabel}>Skip Flights</Text>
                  <Text style={styles.optionDescription}>
                    Generate itinerary without flights
                  </Text>
                </View>
                <Switch
                  value={formData.skipFlights}
                  onValueChange={(value) =>
                    setFormData({ ...formData, skipFlights: value })
                  }
                  trackColor={{ false: "#E8E8E8", true: "#F5A623" }}
                  thumbColor={formData.skipFlights ? "#FFF8E7" : "#fff"}
                  disabled={loading}
                />
              </View>

              <View style={styles.optionRow}>
                <View>
                  <Text style={styles.optionLabel}>Skip Hotel</Text>
                  <Text style={styles.optionDescription}>
                    Generate itinerary without hotels
                  </Text>
                </View>
                <Switch
                  value={formData.skipHotel}
                  onValueChange={(value) =>
                    setFormData({ ...formData, skipHotel: value })
                  }
                  trackColor={{ false: "#E8E8E8", true: "#F5A623" }}
                  thumbColor={formData.skipHotel ? "#FFF8E7" : "#fff"}
                  disabled={loading}
                />
              </View>
            </View>

            {/* Preferred Flight Time */}
            <View style={styles.section}>
              <Text style={styles.label}>Preferred Flight Time</Text>
              <View style={styles.flightTimeGrid}>
                {[
                  { value: "any", label: "Any Time" },
                  { value: "morning", label: "Morning" },
                  { value: "afternoon", label: "Afternoon" },
                  { value: "evening", label: "Evening" },
                  { value: "night", label: "Night" },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.flightTimeButton,
                      formData.preferredFlightTime === option.value &&
                        styles.flightTimeButtonActive,
                    ]}
                    onPress={() =>
                      setFormData({
                        ...formData,
                        preferredFlightTime: option.value as any,
                      })
                    }
                    disabled={loading}
                  >
                    <Text
                      style={[
                        styles.flightTimeButtonText,
                        formData.preferredFlightTime === option.value &&
                          styles.flightTimeButtonTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Calendar Modal */}
          <Modal
            visible={showCalendar}
            transparent
            animationType="fade"
            onRequestClose={() => setShowCalendar(false)}
          >
            <View style={styles.calendarOverlay}>
              <View style={styles.calendarContainer}>
                <View style={styles.calendarHeader}>
                  <Text style={styles.calendarTitle}>
                    Select {selectingDate === "start" ? "Start" : "End"} Date
                  </Text>
                  <TouchableOpacity onPress={() => setShowCalendar(false)}>
                    <Ionicons name="close" size={24} color="#000" />
                  </TouchableOpacity>
                </View>
                <Calendar
                  onDayPress={handleDateSelect}
                  markedDates={{
                    [new Date(formData.startDate).toISOString().split("T")[0]]:
                      {
                        selected: true,
                        selectedColor: "#F5A623",
                      },
                    [new Date(formData.endDate).toISOString().split("T")[0]]: {
                      selected: true,
                      selectedColor: "#F5A623",
                    },
                  }}
                  minDate={new Date().toISOString().split("T")[0]}
                  theme={{
                    selectedDayBackgroundColor: "#F5A623",
                    selectedDayTextColor: "#fff",
                    todayTextColor: "#F5A623",
                    arrowColor: "#F5A623",
                    monthTextColor: "#000",
                    textDayFontSize: 14,
                    textMonthFontSize: 16,
                    textDayHeaderFontSize: 12,
                  }}
                />
              </View>
            </View>
          </Modal>

          {/* Action Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.regenerateButton]}
              onPress={handleRegenerate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="refresh" size={18} color="#fff" />
                  <Text style={styles.regenerateButtonText}>Regenerate</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFBF0",
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E8E8E8",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fff",
    fontSize: 14,
    color: "#000",
  },
  lockedInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F5F5F5",
  },
  lockedText: {
    fontSize: 14,
    color: "#000",
    fontWeight: "500",
  },
  helperText: {
    fontSize: 12,
    color: "#999",
    marginTop: 6,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E8E8E8",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fff",
    marginBottom: 10,
  },
  dateButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  dateButtonText: {
    marginLeft: 12,
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000",
  },
  inputWithUnit: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E8E8E8",
    borderRadius: 12,
    backgroundColor: "#fff",
    paddingLeft: 14,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F5A623",
  },
  numberInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 12,
    fontSize: 14,
    color: "#000",
  },
  counterContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  counterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  counterValue: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    minWidth: 40,
    textAlign: "center",
  },
  interestHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  interestGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  interestChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    backgroundColor: "#fff",
  },
  interestChipActive: {
    backgroundColor: "#F5A623",
    borderColor: "#F5A623",
  },
  interestChipText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  interestChipTextActive: {
    color: "#fff",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 12,
    color: "#999",
  },
  flightTimeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  flightTimeButton: {
    flex: 1,
    minWidth: "30%",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    backgroundColor: "#fff",
    alignItems: "center",
  },
  flightTimeButtonActive: {
    backgroundColor: "#F5A623",
    borderColor: "#F5A623",
  },
  flightTimeButtonText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#666",
  },
  flightTimeButtonTextActive: {
    color: "#fff",
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E8E8E8",
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  cancelButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
  regenerateButton: {
    backgroundColor: "#FFD900",
  },
  regenerateButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#181710",
  },
  calendarOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  calendarContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
});
