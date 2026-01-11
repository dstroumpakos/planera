import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { useConvexAuth } from "convex/react";
import { ImageWithAttribution } from "@/components/ImageWithAttribution";

const COLORS = {
  primary: "#FFC107",
  secondary: "#F5E6D3",
  background: "#FFFFFF",
  text: "#000000",
  textMuted: "#666666",
  white: "#FFFFFF",
  border: "#E0E0E0",
};

export default function HomeScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const [destinationImages, setDestinationImages] = useState<Record<string, any>>({});

  const trips = useQuery(api.trips.list);
  const trendingDestinations = useQuery(api.trips.getTrendingDestinations);
  const getImages = useAction(api.images.getDestinationImages);

  useEffect(() => {
    if (trendingDestinations && trendingDestinations.length > 0) {
      const fetchImages = async () => {
        const imageMap: Record<string, any> = {};
        for (const destination of trendingDestinations) {
          try {
            const images = await getImages({ destination: destination.destination });
            if (images && images.length > 0) {
              imageMap[destination.destination] = images[0];
            }
          } catch (error) {
            console.error(`Failed to fetch images for ${destination.destination}:`, error);
          }
        }
        setDestinationImages(imageMap);
      };
      fetchImages();
    }
  }, [trendingDestinations, getImages]);

  if (authLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.authContainer}>
          <Text style={styles.authText}>Please log in to see your trips</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Planera</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/profile")}>
            <Ionicons name="person-circle" size={32} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {/* Trending Destinations Section */}
        {trendingDestinations && trendingDestinations.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Trending Destinations</Text>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.trendingScroll}
              contentContainerStyle={styles.trendingContent}
            >
              {trendingDestinations.map((destination: any, index: number) => (
                <View 
                  key={index}
                  style={styles.trendingCard}
                >
                  <View style={styles.trendingImageContainer}>
                    {destinationImages[destination.destination] ? (
                      <ImageWithAttribution
                        imageUrl={destinationImages[destination.destination].url}
                        photographerName={destinationImages[destination.destination].photographer}
                        unsplashUrl={destinationImages[destination.destination].attribution}
                        style={styles.trendingImageContainer}
                        imageStyle={styles.trendingImage}
                      />
                    ) : (
                      <View style={styles.trendingImagePlaceholder}>
                        <Text style={styles.trendingEmoji}>✈️</Text>
                      </View>
                    )}
                    <View style={styles.ratingBadge}>
                      <Ionicons name="star" size={12} color={COLORS.primary} />
                      <Text style={styles.ratingText}>{destination.avgRating.toFixed(1)}</Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.arrowButton}
                      onPress={() => router.push({
                        pathname: "/destination-preview",
                        params: {
                          destination: destination.destination,
                          avgBudget: destination.avgBudget.toString(),
                          avgRating: destination.avgRating.toString(),
                          count: destination.count.toString(),
                        }
                      })}
                    >
                      <Ionicons name="arrow-forward" size={16} color={COLORS.text} />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity 
                    style={styles.trendingInfo}
                    onPress={() => router.push({
                      pathname: "/destination-preview",
                      params: {
                        destination: destination.destination,
                        avgBudget: destination.avgBudget.toString(),
                        avgRating: destination.avgRating.toString(),
                        count: destination.count.toString(),
                      }
                    })}
                  >
                    <Text style={styles.trendingName}>{destination.destination}</Text>
                    <View style={styles.trendingLocation}>
                      <Ionicons name="people" size={12} color={COLORS.textMuted} />
                      <Text style={styles.trendingCountry}>{destination.count} trips</Text>
                    </View>
                    <Text style={styles.trendingPrice}>€{Math.round(destination.avgBudget)}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </>
        )}

        {/* My Trips Section */}
        {trips && trips.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My Trips</Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/trips")}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>

            {trips.slice(0, 2).map((trip: any) => (
              <TouchableOpacity 
                key={trip._id}
                style={styles.tripCard}
                onPress={() => router.push(`/trip/${trip._id}`)}
              >
                <View style={styles.tripIconContainer}>
                  <Ionicons name="airplane" size={24} color={COLORS.white} />
                </View>
                <View style={styles.tripInfo}>
                  <Text style={styles.tripDestination}>{trip.destination}</Text>
                  <Text style={styles.tripDates}>
                    {new Date(trip.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - {new Date(trip.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Create Trip Button */}
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => router.push("/create-trip")}
        >
          <Ionicons name="add" size={24} color={COLORS.white} />
          <Text style={styles.createButtonText}>Create New Trip</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
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
    color: COLORS.textMuted,
    textAlign: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    marginTop: 12,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.text,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
  },
  viewAllText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "500",
  },
  trendingScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  trendingContent: {
    paddingRight: 16,
  },
  trendingCard: {
    marginRight: 12,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  trendingImageContainer: {
    width: 200,
    height: 140,
    position: "relative",
  },
  trendingImage: {
    width: "100%",
    height: "100%",
  },
  trendingImagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: COLORS.secondary,
    justifyContent: "center",
    alignItems: "center",
  },
  trendingEmoji: {
    fontSize: 40,
  },
  ratingBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: COLORS.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text,
  },
  arrowButton: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: COLORS.white,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  trendingInfo: {
    padding: 12,
  },
  trendingName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  trendingLocation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  trendingCountry: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  trendingPrice: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
  },
  tripCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tripIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  tripInfo: {
    flex: 1,
  },
  tripDestination: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 2,
  },
  tripDates: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 20,
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
});
