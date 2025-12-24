import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery, useAction, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";

const COLORS = {
  primary: "#FFC107",
  secondary: "#1E88E5",
  background: "#F5F5F5",
  text: "#000000",
  lightText: "#999999",
  white: "#FFFFFF",
  success: "#4CAF50",
};

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
  weatherData?: {
    location: string;
    temperature: number;
    condition: string;
    humidity: number;
    wind: number;
    uvIndex: number;
  };
}

export default function AssistantScreen() {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "assistant",
      content: "Hi there! 👋 I'm here to help with weather forecasts, local insights, and general travel info. What can I check for you?",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const userPlan = useQuery(api.users.getPlan);
  const chatAction = useAction(api.aiAssistant.chat);
  const weatherAction = useAction(api.aiAssistant.getWeather);

  // Check subscription access
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/(tabs)");
      return;
    }

    if (userPlan && userPlan.plan === "free") {
      router.replace("/(tabs)");
      return;
    }
  }, [isAuthenticated, userPlan]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setLoading(true);

    try {
      // Check if user is asking about weather
      const isWeatherQuery = /weather|temperature|forecast|rain|snow|wind|humidity|condition/i.test(inputText);
      const locationMatch = inputText.match(/(?:in|at|for)\s+([A-Za-z\s]+?)(?:\s+(?:right\s+)?now|weather|\?|$)/i);
      const location = locationMatch?.[1]?.trim();

      let assistantContent = "";
      let weatherData = undefined;

      if (isWeatherQuery && location) {
        try {
          weatherData = await weatherAction({ location });
          assistantContent = `It's pleasant out! A great time to walk around. Would you like a forecast for the weekend?`;
        } catch (error) {
          // Fall back to AI response if weather API fails
          assistantContent = await chatAction({ message: inputText, location });
        }
      } else {
        assistantContent = await chatAction({ message: inputText, location });
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: assistantContent,
        timestamp: new Date(),
        weatherData,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: "Sorry, I couldn't process that. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    if (item.type === "user") {
      return (
        <View style={styles.userMessageContainer}>
          <View style={styles.userMessage}>
            <Text style={styles.userMessageText}>{item.content}</Text>
            <Text style={styles.timestamp}>
              {item.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.assistantMessageContainer}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Ionicons name="sparkles" size={20} color={COLORS.secondary} />
          </View>
        </View>
        <View style={styles.assistantContent}>
          <Text style={styles.assistantLabel}>Planera AI</Text>
          {item.weatherData ? (
            <View style={styles.weatherCard}>
              <View style={styles.weatherHeader}>
                <View>
                  <Text style={styles.temperature}>{item.weatherData.temperature}°C</Text>
                  <Text style={styles.location}>{item.weatherData.location}</Text>
                </View>
                <View style={styles.weatherIconContainer}>
                  <Ionicons name="partly-sunny" size={56} color={COLORS.white} />
                </View>
              </View>
              <Text style={styles.condition}>{item.weatherData.condition}</Text>
              <View style={styles.weatherDivider} />
              <View style={styles.weatherDetails}>
                <View style={styles.weatherDetail}>
                  <Text style={styles.weatherLabel}>Humidity</Text>
                  <Text style={styles.weatherValue}>{item.weatherData.humidity}%</Text>
                </View>
                <View style={styles.weatherDetail}>
                  <Text style={styles.weatherLabel}>Wind</Text>
                  <Text style={styles.weatherValue}>{item.weatherData.wind} km/h</Text>
                </View>
                <View style={styles.weatherDetail}>
                  <Text style={styles.weatherLabel}>UV Index</Text>
                  <Text style={styles.weatherValue}>
                    {item.weatherData.uvIndex > 6 ? "High" : item.weatherData.uvIndex > 3 ? "Moderate" : "Low"}
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.assistantMessage}>
              <Text style={styles.assistantMessageText}>{item.content}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (!isAuthenticated || (userPlan && userPlan.plan === "free")) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.lockedContainer}>
          <Ionicons name="lock-closed" size={64} color={COLORS.lightText} />
          <Text style={styles.lockedTitle}>Premium Feature</Text>
          <Text style={styles.lockedText}>AI Assistant is available for monthly and yearly subscribers only.</Text>
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => router.push("/subscription")}
          >
            <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Planera AI Assistant</Text>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Weather & Info</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.menuButton}>
          <Ionicons name="ellipsis-vertical" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.dateContainer}>
        <Text style={styles.dateText}>Today</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.inputContainer}
      >
        <View style={styles.inputWrapper}>
          <TouchableOpacity style={styles.addButton}>
            <Ionicons name="add" size={24} color={COLORS.lightText} />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder="Ask about weather, info..."
            placeholderTextColor={COLORS.lightText}
            value={inputText}
            onChangeText={setInputText}
            editable={!loading}
            multiline
            maxHeight={100}
          />

          <TouchableOpacity
            style={[styles.sendButton, loading && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={loading || !inputText.trim()}
          >
            {loading ? (
              <ActivityIndicator size="small" color={COLORS.text} />
            ) : (
              <Ionicons name="arrow-up" size={20} color={COLORS.text} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  lockedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  lockedTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.text,
    marginTop: 16,
  },
  lockedText: {
    fontSize: 14,
    color: COLORS.lightText,
    marginTop: 8,
    textAlign: "center",
  },
  upgradeButton: {
    marginTop: 24,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    color: COLORS.lightText,
  },
  menuButton: {
    padding: 8,
  },
  dateContainer: {
    alignItems: "center",
    paddingVertical: 12,
  },
  dateText: {
    fontSize: 14,
    color: COLORS.lightText,
    backgroundColor: "#E8E8E8",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userMessageContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 16,
  },
  userMessage: {
    maxWidth: "85%",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userMessageText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: "500",
    lineHeight: 22,
  },
  timestamp: {
    fontSize: 12,
    color: COLORS.text,
    marginTop: 4,
    textAlign: "right",
    opacity: 0.7,
  },
  assistantMessageContainer: {
    flexDirection: "row",
    marginBottom: 16,
  },
  avatarContainer: {
    marginRight: 12,
    marginTop: 4,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
  },
  assistantContent: {
    flex: 1,
  },
  assistantLabel: {
    fontSize: 12,
    color: COLORS.lightText,
    marginBottom: 4,
    fontWeight: "500",
  },
  assistantMessage: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  assistantMessageText: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 22,
  },
  weatherCard: {
    backgroundColor: COLORS.secondary,
    borderRadius: 20,
    padding: 16,
    marginTop: 8,
  },
  weatherHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  temperature: {
    fontSize: 36,
    fontWeight: "700",
    color: COLORS.white,
  },
  location: {
    fontSize: 14,
    color: COLORS.white,
    marginTop: 4,
  },
  weatherIconContainer: {
    alignItems: "center",
  },
  condition: {
    fontSize: 16,
    color: COLORS.white,
    fontWeight: "500",
    marginBottom: 12,
  },
  weatherDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    marginBottom: 12,
  },
  weatherDetails: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  weatherDetail: {
    alignItems: "center",
  },
  weatherLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 4,
  },
  weatherValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.white,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    backgroundColor: COLORS.white,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#F5F5F5",
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addButton: {
    padding: 8,
    marginRight: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    paddingHorizontal: 8,
    paddingVertical: 8,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
