import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { useConvexAuth } from "convex/react";
import { ImageWithAttribution } from "@/components/ImageWithAttribution";

const COLORS = {
  primary: "#FFE500", // Bright Yellow
  secondary: "#FFF8E1", // Light Yellow/Cream
  background: "#FAF9F6", // Off-white
  text: "#1A1A1A", // Black
  textMuted: "#9B9B9B", // Gray
  white: "#FFFFFF",
  border: "#E8E6E1",
  lightGray: "#F2F2F7",
  darkOverlay: "rgba(0,0,0,0.4)",
};

export default function HomeScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const [destinationImages, setDestinationImages] = useState<Record<string, any>>({});
  const [searchQuery, setSearchQuery] = useState("");

  const userSettings = useQuery(api.users.getSettings);

  const userPlan = useQuery(api.users.getPlan);
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

  const userName = userSettings?.name?.split(" ")[0] || "Traveler";

  // Log to debug
  console.log("User Settings:", userSettings);
  console.log("User Name:", userName);

  const getGreeting = () => {
    const hour = new Date().getHours();
    let greeting = "";
    
    if (hour < 12) {
      greeting = "Good Morning";
    } else if (hour < 18) {
      greeting = "Good Afternoon";
    } else if (hour < 21) {
      greeting = "Good Evening";
    } else {
      greeting = "Good Night";
    }
    
    return `${greeting}, ${userName}`;
  };

  const getCreditDisplay = () => {
    if (!userPlan) return null;
    
    if (userPlan.isSubscriptionActive) {
      return (
        <View style={styles.creditBadge}>
          <Ionicons name="infinite" size={16} color={COLORS.text} />
          <Text style={styles.creditText}>Unlimited</Text>
        </View>
      );
    }

    return (
      <View style={styles.creditBadge}>
        <Ionicons name="ticket-outline" size={16} color={COLORS.text} />
        <Text style={styles.creditText}>{userPlan.tripCredits} Credits</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarContainer}>
              <Ionicons name="person-circle" size={48} color={COLORS.textMuted} />
              <View style={styles.onlineBadge} />
            </View>
            <View style={styles.headerTexts}>
              <Text style={styles.greetingSub}>{getGreeting()}</Text>
              <Text style={styles.greetingMain}>Ready for your next journey?</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.creditContainer}
            onPress={() => router.push("/subscription")}
          >
            {getCreditDisplay()}
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={COLORS.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Where do you want to go?"
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity style={styles.searchButton}>
            <Ionicons name="arrow-forward" size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {/* Feature Cards */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.featuresScroll}
          contentContainerStyle={styles.featuresContent}
        >
          <TouchableOpacity 
            style={[styles.featureCard, styles.featureCardPrimary]}
            onPress={() => router.push("/create-trip")}
          >
            <View style={[styles.featureIcon, styles.featureIconPrimary]}>
              <Ionicons name="sparkles" size={20} color={COLORS.text} />
            </View>
            <Text style={styles.featureTextPrimary}>AI Trip Planner</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <Ionicons name="map-outline" size={20} color={COLORS.text} />
            </View>
            <Text style={styles.featureText}>Multi-City Route</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <Ionicons name="pricetag-outline" size={20} color={COLORS.text} />
            </View>
            <Text style={styles.featureText}>Explore Deals</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Trending Destinations Section */}
        {trendingDestinations && trendingDestinations.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Trending Now</Text>
              <TouchableOpacity onPress={() => {}}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.trendingScroll}
              contentContainerStyle={styles.trendingContent}
            >
              {trendingDestinations.map((destination: any, index: number) => (
                <TouchableOpacity 
                  key={index}
                  style={styles.trendingCard}
                  onPress={() => router.push({
                    pathname: "/destination-preview",
                    params: {
                      destination: destination.destination,
                      avgBudget: destination.avgBudget.toString(),
                      avgRating: destination.avgRating.toString(),
                      count: destination.count.toString(),
                    }
                  })}
                  activeOpacity={0.9}
                >
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
                  
                  <View style={styles.trendingOverlay}>
                    <View style={styles.ratingBadge}>
                      <Ionicons name="star" size={12} color={COLORS.primary} />
                      <Text style={styles.ratingText}>{destination.avgRating.toFixed(1)}</Text>
                    </View>
                    
                    <View style={styles.trendingCardContent}>
                      <Text style={styles.trendingName}>{destination.destination}</Text>
                      <View style={styles.trendingLocationRow}>
                        <Ionicons name="location-sharp" size={12} color={COLORS.white} />
                        <Text style={styles.trendingCountry}>Popular Destination</Text>
                      </View>
                      <View style={styles.trendingFooter}>
                        <Text style={styles.trendingPrice}>€{Math.round(destination.avgBudget)}</Text>
                        <View style={styles.trendingArrow}>
                          <Ionicons name="arrow-forward" size={16} color={COLORS.text} />
                        </View>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* My Trips Section */}
        {trips && trips.length > 0 && (
          <View style={styles.sectionContainer}>
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
          </View>
        )}
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
    paddingBottom: 100, // Extra padding for tab bar
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
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 20,
    marginBottom: 24,
  },
  headerLeft: {
    flex: 1,
    marginRight: 16,
  },
  avatarContainer: {
    position: "relative",
    width: 48,
    height: 48,
    marginBottom: 12,
  },
  onlineBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  headerTexts: {
    justifyContent: "center",
  },
  greetingSub: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: "500",
  },
  greetingMain: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },
  creditContainer: {
    justifyContent: "center",
  },
  creditBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.secondary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  creditText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 30,
    padding: 8,
    marginHorizontal: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  searchIcon: {
    marginLeft: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: COLORS.text,
    height: 40,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  featuresScroll: {
    marginBottom: 32,
  },
  featuresContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  featureCardPrimary: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.secondary,
    justifyContent: "center",
    alignItems: "center",
  },
  featureIconPrimary: {
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  featureText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  featureTextPrimary: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
  },
  viewAllText: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: "500",
  },
  trendingScroll: {
    paddingLeft: 20,
  },
  trendingContent: {
    paddingRight: 20,
    gap: 16,
  },
  trendingCard: {
    width: 260,
    height: 340,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: COLORS.lightGray,
    position: "relative",
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
    backgroundColor: COLORS.secondary,
    justifyContent: "center",
    alignItems: "center",
  },
  trendingEmoji: {
    fontSize: 64,
  },
  trendingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "rgba(0,0,0,0.1)", // Slight tint
  },
  ratingBadge: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.text,
  },
  trendingCardContent: {
    width: "100%",
  },
  trendingName: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.white,
    marginBottom: 4,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  trendingLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 12,
  },
  trendingCountry: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "500",
  },
  trendingFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  trendingPrice: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.primary,
  },
  trendingArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
  },
  tripCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tripIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  tripInfo: {
    flex: 1,
  },
  tripDestination: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  tripDates: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
});
