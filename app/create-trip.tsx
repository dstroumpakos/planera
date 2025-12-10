import { useState } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform, Modal, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar } from "react-native-calendars";
import DateTimePicker from "@react-native-community/datetimepicker";

interface FormData {
  destination: string;
  startDate: Date;
  endDate: Date;
  budget: string;
  travelers: string;
  interests: string[];
  origin: string;
  skipFlights: boolean;
  preferredFlightTime: string;
  skipHotel: boolean;
}

const INTERESTS = ["Beach", "Culture", "Adventure", "Food", "History", "Nature", "Nightlife", "Shopping", "Sports"];
const FLIGHT_TIMES = ["Morning", "Late Evening", "Night"];

export default function CreateTrip() {
  const router = useRouter();
  const createTrip = useMutation(api.trips.create);
  const userPlan = useQuery(api.users.getPlan);
  const canGenerate = useQuery(api.users.canGenerateTrip);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarType, setCalendarType] = useState<"start" | "end">("start");
  const [showDestinationSuggestions, setShowDestinationSuggestions] = useState(false);
  const [destinationSuggestions, setDestinationSuggestions] = useState<string[]>([]);
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const [originSuggestions, setOriginSuggestions] = useState<string[]>([]);

  const [formData, setFormData] = useState<FormData>({
    destination: "",
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    budget: "",
    travelers: "1",
    interests: [],
    origin: "",
    skipFlights: false,
    preferredFlightTime: "Morning",
    skipHotel: false,
  });

  const POPULAR_DESTINATIONS = [
    "Paris", "Barcelona", "Rome", "Amsterdam", "London", "Tokyo", "New York", "Dubai", "Bangkok", "Bali",
    "Santorini", "Venice", "Berlin", "Madrid", "Vienna", "Prague", "Istanbul", "Lisbon", "Athens", "Cairo"
  ];

  const POPULAR_AIRPORTS = [
    { code: "CDG", city: "Paris" },
    { code: "BCN", city: "Barcelona" },
    { code: "FCO", city: "Rome" },
    { code: "AMS", city: "Amsterdam" },
    { code: "LHR", city: "London" },
    { code: "NRT", city: "Tokyo" },
    { code: "JFK", city: "New York" },
    { code: "DXB", city: "Dubai" },
    { code: "BKK", city: "Bangkok" },
    { code: "DPS", city: "Bali" },
    { code: "JTR", city: "Santorini" },
    { code: "VCE", city: "Venice" },
    { code: "BER", city: "Berlin" },
    { code: "MAD", city: "Madrid" },
    { code: "VIE", city: "Vienna" },
    { code: "PRG", city: "Prague" },
    { code: "IST", city: "Istanbul" },
    { code: "LIS", city: "Lisbon" },
    { code: "ATH", city: "Athens" },
    { code: "CAI", city: "Cairo" }
  ];

  const handleDestinationSearch = (query: string) => {
    setFormData({ ...formData, destination: query });
    if (query.length < 2) {
      setShowDestinationSuggestions(false);
      setDestinationSuggestions([]);
      return;
    }
    const filtered = POPULAR_DESTINATIONS.filter(d =>
      d.toLowerCase().includes(query.toLowerCase())
    );
    setDestinationSuggestions(filtered);
    setShowDestinationSuggestions(true);
  };

  const handleOriginSearch = (query: string) => {
    setFormData({ ...formData, origin: query });
    if (query.length < 2) {
      setShowOriginSuggestions(false);
      setOriginSuggestions([]);
      return;
    }
    const filtered = POPULAR_AIRPORTS
      .filter(a => a.city.toLowerCase().includes(query.toLowerCase()) || a.code.includes(query.toUpperCase()))
      .map(a => `${a.city} (${a.code})`);
    setOriginSuggestions(filtered);
    setShowOriginSuggestions(true);
  };

  const selectDestination = (destination: string) => {
    setFormData({ ...formData, destination });
    setShowDestinationSuggestions(false);
  };

  const selectOrigin = (origin: string) => {
    setFormData({ ...formData, origin });
    setShowOriginSuggestions(false);
  };

  const toggleInterest = (interest: string) => {
    setFormData({
      ...formData,
      interests: formData.interests.includes(interest)
        ? formData.interests.filter(i => i !== interest)
        : [...formData.interests, interest]
    });
  };

  const handleDateSelect = (day: any) => {
    const selectedDate = new Date(day.dateString);
    if (calendarType === "start") {
      setFormData({ ...formData, startDate: selectedDate });
    } else {
      setFormData({ ...formData, endDate: selectedDate });
    }
    setShowCalendar(false);
  };

  const getMarkedDates = () => {
    const marked: any = {};
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    let current = new Date(start);

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      marked[dateStr] = {
        color: '#14B8A6',
        textColor: '#fff',
        marked: true,
      };
      current.setDate(current.getDate() + 1);
    }

    return marked;
  };

  const handleNext = () => {
    if (step === 1) {
      if (!formData.destination.trim()) {
        Alert.alert("Error", "Please enter a destination");
        return;
      }
      if (!formData.origin.trim()) {
        Alert.alert("Error", "Please enter where you're flying from");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!formData.budget.trim()) {
        Alert.alert("Error", "Please enter your budget");
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (formData.interests.length === 0) {
        Alert.alert("Error", "Please select at least one interest");
        return;
      }
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setShowLoadingScreen(true);
    try {
      const tripId = await createTrip({
        destination: formData.destination,
        startDate: formData.startDate.getTime(),
        endDate: formData.endDate.getTime(),
        budget: parseInt(formData.budget),
        travelers: parseInt(formData.travelers),
        interests: formData.interests,
        origin: formData.origin,
        skipFlights: formData.skipFlights,
        preferredFlightTime: formData.preferredFlightTime,
        skipHotel: formData.skipHotel,
      });

      router.push(`/trip/${tripId}`);
    } catch (error: any) {
      console.error("Trip creation error:", error);
      if (error.message?.includes("Trip credits")) {
        Alert.alert("No Trip Credits", "You've used all your trip credits. Please upgrade to premium.", [
          { text: "Upgrade", onPress: () => router.push("/subscription") },
          { text: "Cancel", style: "cancel" }
        ]);
      } else {
        Alert.alert("Error", error.message || "Failed to create trip");
      }
    } finally {
      setShowLoadingScreen(false);
    }
  };

  if (showLoadingScreen) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#14B8A6" />
          <Text style={styles.generatingText}>Creating your perfect trip...</Text>
          <Text style={styles.generatingSubtext}>
            {formData.skipFlights
              ? "Finding the best hotels, activities, and restaurants for you."
              : "Searching for flights, hotels, activities, and restaurants."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {step > 1 && (
          <TouchableOpacity onPress={() => setStep(step - 1)}>
            <Ionicons name="chevron-back" size={28} color="#0D9488" />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Create Trip</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {step === 1 && (
          <View>
            <Text style={styles.stepTitle}>Where are you going?</Text>

            <Text style={styles.label}>Destination</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter destination"
              value={formData.destination}
              onChangeText={handleDestinationSearch}
              placeholderTextColor="#90A4AE"
            />
            {showDestinationSuggestions && destinationSuggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                {destinationSuggestions.map((dest, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.suggestionItem}
                    onPress={() => selectDestination(dest)}
                  >
                    <Text style={styles.suggestionText}>{dest}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.label}>Flying From</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter city or airport code"
              value={formData.origin}
              onChangeText={handleOriginSearch}
              placeholderTextColor="#90A4AE"
            />
            {showOriginSuggestions && originSuggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                {originSuggestions.map((origin, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.suggestionItem}
                    onPress={() => selectOrigin(origin)}
                  >
                    <Text style={styles.suggestionText}>{origin}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.label}>Start Date</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => {
                setCalendarType("start");
                setShowCalendar(true);
              }}
            >
              <Ionicons name="calendar" size={20} color="#14B8A6" />
              <Text style={styles.dateText}>{formData.startDate.toLocaleDateString()}</Text>
            </TouchableOpacity>

            <Text style={styles.label}>End Date</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => {
                setCalendarType("end");
                setShowCalendar(true);
              }}
            >
              <Ionicons name="calendar" size={20} color="#14B8A6" />
              <Text style={styles.dateText}>{formData.endDate.toLocaleDateString()}</Text>
            </TouchableOpacity>

            <Text style={styles.label}>Number of Travelers</Text>
            <TextInput
              style={styles.input}
              placeholder="1"
              value={formData.travelers}
              onChangeText={(text) => setFormData({ ...formData, travelers: text })}
              keyboardType="number-pad"
              placeholderTextColor="#90A4AE"
            />

            <View style={styles.checkboxContainer}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setFormData({ ...formData, skipFlights: !formData.skipFlights })}
              >
                {formData.skipFlights && <Ionicons name="checkmark" size={16} color="#14B8A6" />}
              </TouchableOpacity>
              <Text style={styles.checkboxLabel}>I already have flights</Text>
            </View>

            {!formData.skipFlights && (
              <>
                <Text style={styles.label}>Preferred Flight Time</Text>
                <View style={styles.flightTimeContainer}>
                  {FLIGHT_TIMES.map((time) => (
                    <TouchableOpacity
                      key={time}
                      style={[
                        styles.flightTimeButton,
                        formData.preferredFlightTime === time && styles.flightTimeButtonSelected
                      ]}
                      onPress={() => setFormData({ ...formData, preferredFlightTime: time })}
                    >
                      <Text style={[
                        styles.flightTimeText,
                        formData.preferredFlightTime === time && styles.flightTimeTextSelected
                      ]}>
                        {time}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <View style={styles.checkboxContainer}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setFormData({ ...formData, skipHotel: !formData.skipHotel })}
              >
                {formData.skipHotel && <Ionicons name="checkmark" size={16} color="#14B8A6" />}
              </TouchableOpacity>
              <Text style={styles.checkboxLabel}>Skip hotel selection</Text>
            </View>
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={styles.stepTitle}>What's your budget?</Text>
            <Text style={styles.label}>Total Budget (€)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your budget"
              value={formData.budget}
              onChangeText={(text) => setFormData({ ...formData, budget: text })}
              keyboardType="number-pad"
              placeholderTextColor="#90A4AE"
            />
            <Text style={styles.budgetInfo}>
              This will be split across flights, accommodation, activities, and meals for {formData.travelers} traveler(s).
            </Text>
          </View>
        )}

        {step === 3 && (
          <View>
            <Text style={styles.stepTitle}>What interests you?</Text>
            <Text style={styles.label}>Select your interests</Text>
            <View style={styles.interestsGrid}>
              {INTERESTS.map((interest) => (
                <TouchableOpacity
                  key={interest}
                  style={[
                    styles.interestButton,
                    formData.interests.includes(interest) && styles.interestButtonSelected
                  ]}
                  onPress={() => toggleInterest(interest)}
                >
                  <Text style={[
                    styles.interestText,
                    formData.interests.includes(interest) && styles.interestTextSelected
                  ]}>
                    {interest}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.nextButtonText}>
              {step === 3 ? "Create Trip" : "Next"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal visible={showCalendar} transparent animationType="slide">
        <View style={styles.calendarModal}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={() => setShowCalendar(false)}>
              <Text style={styles.calendarClose}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.calendarTitle}>
              {calendarType === "start" ? "Select Start Date" : "Select End Date"}
            </Text>
            <View style={{ width: 60 }} />
          </View>
          <Calendar
            onDayPress={handleDateSelect}
            markedDates={getMarkedDates()}
            theme={{
              backgroundColor: '#fff',
              calendarBackground: '#fff',
              textSectionTitleColor: '#0D9488',
              selectedDayBackgroundColor: '#14B8A6',
              selectedDayTextColor: '#fff',
              todayTextColor: '#14B8A6',
              dayTextColor: '#2c3e50',
              textDisabledColor: '#d9e1e8',
              dotColor: '#14B8A6',
              selectedDotColor: '#fff',
              monthTextColor: '#0D9488',
              textDayFontWeight: '300',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '300',
              textDayFontSize: 16,
              textMonthFontSize: 16,
              textDayHeaderFontSize: 13
            }}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0F2F1",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0D9488",
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0D9488",
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0D9488",
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E0F2F1",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: "#0D9488",
  },
  suggestionsContainer: {
    backgroundColor: "#F0FFFE",
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
    zIndex: 1000,
  },
  suggestionItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E0F2F1",
  },
  suggestionText: {
    fontSize: 14,
    color: "#0D9488",
  },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0F2F1",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  dateText: {
    fontSize: 16,
    color: "#0D9488",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    gap: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: "#14B8A6",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxLabel: {
    fontSize: 14,
    color: "#0D9488",
    fontWeight: "500",
  },
  flightTimeContainer: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  flightTimeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E0F2F1",
    borderRadius: 8,
    alignItems: "center",
  },
  flightTimeButtonSelected: {
    backgroundColor: "#14B8A6",
    borderColor: "#14B8A6",
  },
  flightTimeText: {
    fontSize: 12,
    color: "#0D9488",
    fontWeight: "500",
  },
  flightTimeTextSelected: {
    color: "#fff",
  },
  budgetInfo: {
    fontSize: 12,
    color: "#90A4AE",
    marginTop: 8,
  },
  interestsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  interestButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E0F2F1",
    borderRadius: 20,
    width: "48%",
    alignItems: "center",
  },
  interestButtonSelected: {
    backgroundColor: "#14B8A6",
    borderColor: "#14B8A6",
  },
  interestText: {
    fontSize: 13,
    color: "#0D9488",
    fontWeight: "500",
  },
  interestTextSelected: {
    color: "#fff",
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#E0F2F1",
  },
  nextButton: {
    backgroundColor: "#14B8A6",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  generatingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "600",
    color: "#0D9488",
  },
  generatingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: "#5EEAD4",
    textAlign: "center",
    paddingHorizontal: 16,
  },
  calendarModal: {
    flex: 1,
    backgroundColor: "#fff",
    marginTop: 50,
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0F2F1",
  },
  calendarClose: {
    fontSize: 16,
    color: "#14B8A6",
    fontWeight: "600",
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0D9488",
  },
});
