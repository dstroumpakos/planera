import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";

interface TravelerInsightsProps {
  destination: string;
}

export default function TravelerInsights({ destination }: TravelerInsightsProps) {
  const tips = useQuery(api.feedback.getTipsForDestination, { destination });

  // Don't render if no tips or still loading
  if (!tips || tips.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="bulb" size={20} color="#E8B749" />
        </View>
        <View>
          <Text style={styles.title}>Traveler Insights</Text>
          <Text style={styles.subtitle}>
            Tips from travelers who've been here
          </Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tipsContainer}
      >
        {tips.map((tip, index) => (
          <View key={index} style={styles.tipCard}>
            <View style={styles.quoteIcon}>
              <Ionicons name="chatbubble-ellipses" size={16} color="#E8B749" />
            </View>
            <Text style={styles.tipText}>"{tip.tip}"</Text>
            <Text style={styles.tipDate}>
              {new Date(tip.submittedAt).toLocaleDateString("en-GB", {
                month: "short",
                year: "numeric",
              })}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFF8E7",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  subtitle: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  tipsContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  tipCard: {
    width: 260,
    backgroundColor: "#FFFDF7",
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#E8E6E1",
  },
  quoteIcon: {
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: "#1A1A1A",
    lineHeight: 20,
    fontStyle: "italic",
  },
  tipDate: {
    fontSize: 12,
    color: "#999",
    marginTop: 12,
  },
});
