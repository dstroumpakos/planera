import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexAuth } from "convex/react";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/lib/ThemeContext";
import { ImageWithAttribution } from "@/components/ImageWithAttribution";

export default function HomeScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const { colors } = useTheme();

  const [greeting, setGreeting] = useState("");
  const [userName, setUserName] = useState("");
  const [destinationImages, setDestinationImages] = useState<Record<string, any>>({});

  const settings = useQuery(api.users.getSettings);
  const trendingDestinations = useQuery(api.trips.getTrendingDestinations);
  const trips = useQuery(api.trips.list);
  const getDestinationImages = useAction(api.images.getDestinationImages);

  // Set greeting based on time of day
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting("Good morning");
    } else if (hour < 18) {
      setGreeting("Good afternoon");
    } else {
      setGreeting("Good evening");
    }
  }, []);

  // Extract user name from settings
  useEffect(() => {
    if (settings?.name) {
      setUserName(settings.name);
    }
  }, [settings]);

  // Fetch destination images
  useEffect(() => {
    const fetchImages = async () => {
      if (!trendingDestinations || trendingDestinations.length === 0) return;

      const images: Record<string, any> = {};
      for (const destination of trendingDestinations) {
        try {
          const result = await getDestinationImages({
            destination: destination.destination,
          });
          if (result && result.length > 0) {
            images[destination.destination] = {
              url: result[0].url,
              photographer: result[0].photographer,
              photographerUrl: result[0].photographerUrl,
              downloadLocation: result[0].downloadLocation,
            };
          }
        } catch (error) {
          console.error(`Failed to fetch image for ${destination.destination}:`, error);
        }
      }
      setDestinationImages(images);
    };

    fetchImages();
  }, [trendingDestinations, getDestinationImages]);

  if (authLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.authContainer}>
          <Text style={[styles.authText, { color: colors.text }]}>
            Please log in to view your trips
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.greeting, { color: colors.textMuted }]}>
              {greeting}
            </Text>
            <Text style={[styles.userName, { color: colors.text }]}>
              {userName || "Traveler"}
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push("/(tabs)/profile")}>
            <View
              style={[
                styles.creditBadge,
                { backgroundColor: colors.primary },
              ]}
            >
              <Ionicons name="airplane" size={16} color={colors.text} />
              <Text style={[styles.creditText, { color: colors.text }]}>
                {settings?.tripCredits === -1 ? "∞" : settings?.tripCredits || 0}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Features Section */}
        <View style={styles.sectionContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.featuresScroll}
            contentContainerStyle={styles.featuresContent}
          >
            <TouchableOpacity
              style={[styles.featureCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push("/create-trip")}
            >
              <View style={[styles.featureIcon, { backgroundColor: colors.primary }]}>
                <Ionicons name="sparkles" size={20} color={colors.text} />
              </View>
              <Text style={[styles.featureText, { color: colors.text }]}>
                Create Trip
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.featureCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.featureIcon, { backgroundColor: colors.secondary }]}>
                <Ionicons name="map-outline" size={20} color={colors.text} />
              </View>
              <Text style={[styles.featureText, { color: colors.text }]}>Multi-City Route</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Trending Destinations Section */}
        {trendingDestinations && trendingDestinations.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Trending Now
              </Text>
              <TouchableOpacity onPress={() => {}}>
                <Text style={[styles.viewAllText, { color: colors.textMuted }]}>
                  View All
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.trendingScroll}
              contentContainerStyle={styles.trendingContent}
            >
              {trendingDestinations.map((destination: any, index: number) => (
                <View key={index} style={styles.trendingCard}>
                  {destinationImages[destination.destination] ? (
                    <ImageWithAttribution
                      imageUrl={destinationImages[destination.destination].url}
                      photographerName={destinationImages[destination.destination].photographer}
                      photographerUrl={destinationImages[destination.destination].photographerUrl}
                    />
                  ) : (
                    <View style={[styles.trendingImagePlaceholder, { backgroundColor: colors.secondary }]}>
                      <Text style={styles.trendingEmoji}>✈️</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.trendingOverlay}
                    onPress={() =>
                      router.push({
                        pathname: "/destination-preview",
                        params: {
                          destination: destination.destination,
                          avgBudget: destination.avgBudget.toString(),
                          avgRating: destination.avgRating.toString(),
                          count: destination.count.toString(),
                        },
                      })
                    }
                    activeOpacity={0.9}
                    pointerEvents="box-none"
                  >
                    <View style={styles.ratingBadge} pointerEvents="none">
                      <Ionicons name="star" size={12} color={colors.primary} />
                      <Text style={[styles.ratingText, { color: "#000000" }]}>
                        {destination.avgRating.toFixed(1)}
                      </Text>
                    </View>

                    <View style={styles.trendingCardContent} pointerEvents="none">
                      <Text style={styles.trendingName}>
                        {destination.destination}
                      </Text>
                      <View style={styles.trendingLocationRow}>
                        <Ionicons
                          name="location-sharp"
                          size={12}
                          color="#FFFFFF"
                        />
                        <Text style={styles.trendingCountry}>
                          Popular Destination
                        </Text>
                      </View>
                      <View style={styles.trendingFooter}>
                        <Text
                          style={[
                            styles.trendingPrice,
                            { color: colors.primary },
                          ]}
                        >
                          €{Math.round(destination.avgBudget)}
                        </Text>
                        <View style={styles.trendingArrow}>
                          <Ionicons
                            name="arrow-forward"
                            size={16}
                            color="#000000"
                          />
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* My Trips Section */}
        {trips && trips.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                My Trips
              </Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/trips")}>
                <Text style={[styles.viewAllText, { color: colors.textMuted }]}>
                  View All
                </Text>
              </TouchableOpacity>
            </View>

            {trips.slice(0, 2).map((trip: any) => (
              <TouchableOpacity
                key={trip._id}
                style={[
                  styles.tripCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={() => router.push(`/trip/${trip._id}`)}
              >
                <View
                  style={[
                    styles.tripIconContainer,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Ionicons name="airplane" size={24} color={colors.text} />
                </View>
                <View style={styles.tripInfo}>
                  <Text
                    style={[styles.tripDestination, { color: colors.text }]}
                  >
                    {trip.destination}
                  </Text>
                  <Text
                    style={[styles.tripDates, { color: colors.textMuted }]}
                  >
                    {new Date(trip.startDate).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}{" "}
                    -{" "}
                    {new Date(trip.endDate).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  authContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  authText: {
    fontSize: 16,
    textAlign: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 20,
    marginBottom: 24,
  },
  headerLeft: {
    flex: 1,
    marginRight: 16,
  },
  greeting: {
    fontSize: 14,
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: "600",
  },
  creditBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  creditText: {
    fontSize: 14,
    fontWeight: "600",
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  viewAllText: {
    fontSize: 14,
  },
  featuresScroll: {
    paddingHorizontal: 20,
  },
  featuresContent: {
    gap: 12,
  },
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    minWidth: 160,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  featureText: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  trendingScroll: {
    paddingHorizontal: 20,
  },
  trendingContent: {
    gap: 12,
  },
  trendingCard: {
    width: 280,
    height: 200,
    borderRadius: 16,
    overflow: "hidden",
  },
  trendingImageContainer: {
    width: "100%",
    height: "100%",
  },
  trendingImage: {
    width: "100%",
    height: "100%",
  },
  trendingImagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  trendingEmoji: {
    fontSize: 48,
  },
  trendingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "70%",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "600",
  },
  trendingCardContent: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
  },
  trendingName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  trendingLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  trendingCountry: {
    fontSize: 12,
    color: "#FFFFFF",
  },
  trendingFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  trendingPrice: {
    fontSize: 14,
    fontWeight: "600",
  },
  trendingArrow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  tripCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  tripIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  tripInfo: {
    flex: 1,
  },
  tripDestination: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  tripDates: {
    fontSize: 12,
  },
});
