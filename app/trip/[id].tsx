import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Image, Linking, Platform, Alert, Modal, TextInput, KeyboardAvoidingView } from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import { BlurView } from "expo-blur";
import { LinearGradient } from 'expo-linear-gradient';
import { useDestinationImage, useActivityImage } from "@/lib/useImages";
import ActivityCard from "@/components/ActivityCard";
import { ImageWithAttribution } from "@/components/ImageWithAttribution";
import DateTimePicker from '@react-native-community/datetimepicker';
import RegenerateTripModal from "@/components/RegenerateTripModal";

const COLORS = {
  primary: "#FFE500",
  secondary: "#FFF8E1",
  background: "#FFFDF5",
  text: "#1A1A1A",
  textSecondary: "#666666",
  border: "#E5E5E5",
  white: "#FFFFFF",
};

export default function TripDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const trip = useQuery(api.trips.get, id ? { tripId: id as Id<"trips"> } : "skip");
  const regenerateTrip = useMutation(api.trips.regenerate);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [regeneratingTrip, setRegeneratingTrip] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'itinerary' | 'flights' | 'hotels'>('overview');

  const destinationImage = useDestinationImage(trip?.destination || "");

  const handleRegenerate = async (params: {
    startDate: number;
    endDate: number;
    budget: number;
    travelers: number;
    interests: string[];
    skipFlights: boolean;
    skipHotel: boolean;
    preferredFlightTime: "any" | "morning" | "afternoon" | "evening" | "night";
  }) => {
    if (!id) return;
    setRegeneratingTrip(true);
    try {
      await regenerateTrip({
        tripId: id as Id<"trips">,
        startDate: params.startDate,
        endDate: params.endDate,
        budget: params.budget,
        travelers: params.travelers,
        interests: params.interests,
        skipFlights: params.skipFlights,
        skipHotel: params.skipHotel,
        preferredFlightTime: params.preferredFlightTime,
      });
      Alert.alert("Success", "Trip regenerated successfully!");
      setShowRegenerateModal(false);
    } catch (error) {
      console.error("Regenerate error:", error);
      Alert.alert("Error", "Failed to regenerate trip. Please try again.");
    } finally {
      setRegeneratingTrip(false);
    }
  };

  if (!id) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Trip not found</Text>
      </SafeAreaView>
    );
  }

  if (trip === undefined) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading trip details...</Text>
      </SafeAreaView>
    );
  }

  if (trip === null) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Trip not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Show generating screen while trip is being created
  if (trip.status === "generating") {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingTitle}>Generating your trip...</Text>
        <Text style={styles.loadingSubtitle}>
          Planning the perfect itinerary for {trip.destination}
        </Text>
        <Text style={styles.loadingHint}>This usually takes 30-60 seconds</Text>
      </SafeAreaView>
    );
  }

  // Show failed screen if trip generation failed
  if (trip.status === "failed") {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#FF6B6B" />
        <Text style={styles.loadingTitle}>Trip generation failed</Text>
        <Text style={styles.loadingSubtitle}>
          We couldn't generate your trip. Please try again.
        </Text>
        <TouchableOpacity 
          style={[styles.backButton, { marginTop: 24 }]} 
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const tripDuration = Math.ceil((trip.endDate - trip.startDate) / (1000 * 60 * 60 * 24));

  const itinerary = trip.itinerary ? JSON.parse(trip.itinerary) : null;
  const flights = itinerary?.flights;
  const hotels = itinerary?.hotels;
  const activities = itinerary?.activities || [];
  const dayByDay = itinerary?.dayByDay || [];

  const flightsSkipped = flights?.skipped === true;
  const hotelsSkipped = hotels?.skipped === true;

  const renderOverview = () => (
    <View style={styles.overviewContainer}>
      {/* Trip Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Ionicons name="calendar-outline" size={20} color={COLORS.textSecondary} />
            <Text style={styles.summaryLabel}>Duration</Text>
            <Text style={styles.summaryValue}>{tripDuration} days</Text>
          </View>
          <View style={styles.summaryItem}>
            <Ionicons name="people-outline" size={20} color={COLORS.textSecondary} />
            <Text style={styles.summaryLabel}>Travelers</Text>
            <Text style={styles.summaryValue}>{trip.travelers}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Ionicons name="wallet-outline" size={20} color={COLORS.textSecondary} />
            <Text style={styles.summaryLabel}>Budget</Text>
            <Text style={styles.summaryValue}>€{trip.budget}</Text>
          </View>
        </View>
      </View>

      {/* Dates */}
      <View style={styles.datesCard}>
        <View style={styles.dateItem}>
          <Text style={styles.dateLabel}>Departure</Text>
          <Text style={styles.dateValue}>{formatDate(trip.startDate)}</Text>
        </View>
        <View style={styles.dateDivider}>
          <Ionicons name="arrow-forward" size={20} color={COLORS.textSecondary} />
        </View>
        <View style={styles.dateItem}>
          <Text style={styles.dateLabel}>Return</Text>
          <Text style={styles.dateValue}>{formatDate(trip.endDate)}</Text>
        </View>
      </View>

      {/* Interests */}
      {trip.interests && trip.interests.length > 0 && (
        <View style={styles.interestsSection}>
          <Text style={styles.sectionTitle}>Trip Interests</Text>
          <View style={styles.interestTags}>
            {trip.interests.map((interest, index) => (
              <View key={index} style={styles.interestTag}>
                <Text style={styles.interestTagText}>{interest}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Quick Links */}
      <View style={styles.quickLinksSection}>
        <Text style={styles.sectionTitle}>Quick Access</Text>
        <View style={styles.quickLinks}>
          {!flightsSkipped && (
            <TouchableOpacity style={styles.quickLink} onPress={() => setActiveTab('flights')}>
              <Ionicons name="airplane" size={24} color={COLORS.primary} />
              <Text style={styles.quickLinkText}>Flights</Text>
            </TouchableOpacity>
          )}
          {!hotelsSkipped && (
            <TouchableOpacity style={styles.quickLink} onPress={() => setActiveTab('hotels')}>
              <Ionicons name="bed" size={24} color={COLORS.primary} />
              <Text style={styles.quickLinkText}>Hotels</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.quickLink} onPress={() => setActiveTab('itinerary')}>
            <Ionicons name="map" size={24} color={COLORS.primary} />
            <Text style={styles.quickLinkText}>Itinerary</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderFlights = () => {
    if (flightsSkipped) {
      return (
        <View style={styles.skippedContainer}>
          <Ionicons name="airplane-outline" size={48} color={COLORS.textSecondary} />
          <Text style={styles.skippedTitle}>Flights Skipped</Text>
          <Text style={styles.skippedText}>You indicated you already have flights booked for this trip.</Text>
        </View>
      );
    }

    if (!flights || (Array.isArray(flights) && flights.length === 0)) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="airplane-outline" size={48} color={COLORS.textSecondary} />
          <Text style={styles.emptyText}>No flight information available</Text>
        </View>
      );
    }

    const flightList = Array.isArray(flights) ? flights : [flights];

    return (
      <View style={styles.flightsContainer}>
        {flightList.map((flight: any, index: number) => (
          <View key={index} style={styles.flightCard}>
            <View style={styles.flightHeader}>
              <Text style={styles.flightAirline}>{flight.airline || 'Airline'}</Text>
              <Text style={styles.flightPrice}>€{flight.price || 'N/A'}</Text>
            </View>
            <View style={styles.flightRoute}>
              <View style={styles.flightPoint}>
                <Text style={styles.flightCode}>{flight.departureAirport || flight.from || 'DEP'}</Text>
                <Text style={styles.flightTime}>{flight.departureTime || ''}</Text>
              </View>
              <View style={styles.flightLine}>
                <Ionicons name="airplane" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.flightPoint}>
                <Text style={styles.flightCode}>{flight.arrivalAirport || flight.to || 'ARR'}</Text>
                <Text style={styles.flightTime}>{flight.arrivalTime || ''}</Text>
              </View>
            </View>
            {flight.duration && (
              <Text style={styles.flightDuration}>Duration: {flight.duration}</Text>
            )}
            {flight.bookingUrl && (
              <TouchableOpacity 
                style={styles.bookButton}
                onPress={() => Linking.openURL(flight.bookingUrl)}
              >
                <Text style={styles.bookButtonText}>Book Now</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderHotels = () => {
    if (hotelsSkipped) {
      return (
        <View style={styles.skippedContainer}>
          <Ionicons name="bed-outline" size={48} color={COLORS.textSecondary} />
          <Text style={styles.skippedTitle}>Hotel Skipped</Text>
          <Text style={styles.skippedText}>You indicated you already have accommodation booked for this trip.</Text>
        </View>
      );
    }

    if (!hotels || (Array.isArray(hotels) && hotels.length === 0)) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="bed-outline" size={48} color={COLORS.textSecondary} />
          <Text style={styles.emptyText}>No hotel information available</Text>
        </View>
      );
    }

    const hotelList = Array.isArray(hotels) ? hotels : [hotels];

    return (
      <View style={styles.hotelsContainer}>
        {hotelList.map((hotel: any, index: number) => (
          <View key={index} style={styles.hotelCard}>
            <Text style={styles.hotelName}>{hotel.name || 'Hotel'}</Text>
            {hotel.rating && (
              <View style={styles.hotelRating}>
                {[...Array(Math.floor(hotel.rating))].map((_, i) => (
                  <Ionicons key={i} name="star" size={16} color={COLORS.primary} />
                ))}
                <Text style={styles.hotelRatingText}>{hotel.rating}</Text>
              </View>
            )}
            {hotel.address && (
              <Text style={styles.hotelAddress}>{hotel.address}</Text>
            )}
            <View style={styles.hotelPriceRow}>
              <Text style={styles.hotelPrice}>€{hotel.pricePerNight || hotel.price || 'N/A'}/night</Text>
            </View>
            {hotel.amenities && hotel.amenities.length > 0 && (
              <View style={styles.hotelAmenities}>
                {hotel.amenities.slice(0, 4).map((amenity: string, i: number) => (
                  <View key={i} style={styles.amenityTag}>
                    <Text style={styles.amenityText}>{amenity}</Text>
                  </View>
                ))}
              </View>
            )}
            {hotel.bookingUrl && (
              <TouchableOpacity 
                style={styles.bookButton}
                onPress={() => Linking.openURL(hotel.bookingUrl)}
              >
                <Text style={styles.bookButtonText}>Book Now</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderItinerary = () => {
    if (!dayByDay || dayByDay.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="map-outline" size={48} color={COLORS.textSecondary} />
          <Text style={styles.emptyText}>No itinerary available yet</Text>
        </View>
      );
    }

    return (
      <View style={styles.itineraryContainer}>
        {dayByDay.map((day: any, dayIndex: number) => (
          <View key={dayIndex} style={styles.dayCard}>
            <View style={styles.dayHeader}>
              <View style={styles.dayBadge}>
                <Text style={styles.dayBadgeText}>Day {day.day || dayIndex + 1}</Text>
              </View>
              {day.title && <Text style={styles.dayTitle}>{day.title}</Text>}
            </View>
            
            {day.activities && day.activities.map((activity: any, actIndex: number) => (
              <View key={actIndex} style={styles.activityItem}>
                <View style={styles.activityTime}>
                  <Text style={styles.activityTimeText}>{activity.time || ''}</Text>
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityName}>{activity.name || activity.activity || 'Activity'}</Text>
                  {activity.description && (
                    <Text style={styles.activityDescription}>{activity.description}</Text>
                  )}
                  {activity.location && (
                    <View style={styles.activityLocation}>
                      <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
                      <Text style={styles.activityLocationText}>{activity.location}</Text>
                    </View>
                  )}
                  {activity.price && (
                    <Text style={styles.activityPrice}>€{activity.price}</Text>
                  )}
                  {activity.bookingUrl && (
                    <TouchableOpacity 
                      style={styles.smallBookButton}
                      onPress={() => Linking.openURL(activity.bookingUrl)}
                    >
                      <Text style={styles.smallBookButtonText}>Book</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Image */}
      <View style={styles.header}>
        {destinationImage.image ? (
          <ImageWithAttribution
            imageUrl={destinationImage.image.url}
            photographerName={destinationImage.image.photographer}
            unsplashUrl={destinationImage.image.attribution}
            style={styles.headerImage}
          />
        ) : (
          <View style={[styles.headerImage, styles.headerImagePlaceholder]}>
            <Ionicons name="image-outline" size={48} color={COLORS.textSecondary} />
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.headerGradient}
        />
        <TouchableOpacity style={styles.headerBackButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{trip.destination}</Text>
          <Text style={styles.headerSubtitle}>
            {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.regenerateButton}
          onPress={() => setShowRegenerateModal(true)}
        >
          <Ionicons name="refresh" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>Overview</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'itinerary' && styles.activeTab]}
          onPress={() => setActiveTab('itinerary')}
        >
          <Text style={[styles.tabText, activeTab === 'itinerary' && styles.activeTabText]}>Itinerary</Text>
        </TouchableOpacity>
        {!flightsSkipped && (
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'flights' && styles.activeTab]}
            onPress={() => setActiveTab('flights')}
          >
            <Text style={[styles.tabText, activeTab === 'flights' && styles.activeTabText]}>Flights</Text>
          </TouchableOpacity>
        )}
        {!hotelsSkipped && (
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'hotels' && styles.activeTab]}
            onPress={() => setActiveTab('hotels')}
          >
            <Text style={[styles.tabText, activeTab === 'hotels' && styles.activeTabText]}>Hotels</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'itinerary' && renderItinerary()}
        {activeTab === 'flights' && renderFlights()}
        {activeTab === 'hotels' && renderHotels()}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Regenerate Modal */}
      {trip && (
        <RegenerateTripModal
          visible={showRegenerateModal}
          onClose={() => setShowRegenerateModal(false)}
          onRegenerate={handleRegenerate}
          destination={trip.destination}
          currentTrip={{
            startDate: trip.startDate,
            endDate: trip.endDate,
            budget: typeof trip.budget === 'string' ? Number(trip.budget) : trip.budget,
            travelers: trip.travelers,
            interests: trip.interests,
          }}
          loading={regeneratingTrip}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  loadingTitle: {
    marginTop: 24,
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  loadingSubtitle: {
    marginTop: 8,
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  loadingHint: {
    marginTop: 24,
    fontSize: 14,
    color: COLORS.textSecondary,
    opacity: 0.7,
  },
  errorText: {
    fontSize: 18,
    color: COLORS.text,
    textAlign: 'center',
    marginTop: 40,
  },
  backButton: {
    marginTop: 20,
    padding: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    alignSelf: 'center',
  },
  backButtonText: {
    color: COLORS.text,
    fontWeight: '600',
  },
  header: {
    height: 250,
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  headerImagePlaceholder: {
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 150,
  },
  headerBackButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 60,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.9,
    marginTop: 4,
  },
  regenerateButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  activeTabText: {
    color: COLORS.text,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  overviewContainer: {
    gap: 16,
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 4,
  },
  datesCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateItem: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  dateValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 4,
  },
  dateDivider: {
    paddingHorizontal: 16,
  },
  interestsSection: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  interestTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestTag: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  interestTagText: {
    fontSize: 14,
    color: COLORS.text,
  },
  quickLinksSection: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickLinks: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickLink: {
    alignItems: 'center',
    padding: 12,
  },
  quickLinkText: {
    fontSize: 14,
    color: COLORS.text,
    marginTop: 8,
  },
  skippedContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  skippedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  skippedText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  emptyContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 16,
  },
  flightsContainer: {
    gap: 16,
  },
  flightCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  flightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  flightAirline: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  flightPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  flightRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  flightPoint: {
    alignItems: 'center',
  },
  flightCode: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  flightTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  flightLine: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  flightDuration: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
  bookButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  hotelsContainer: {
    gap: 16,
  },
  hotelCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  hotelName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  hotelRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  hotelRatingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  hotelAddress: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  hotelPriceRow: {
    marginTop: 12,
  },
  hotelPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  hotelAmenities: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  amenityTag: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  amenityText: {
    fontSize: 12,
    color: COLORS.text,
  },
  itineraryContainer: {
    gap: 16,
  },
  dayCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dayBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  dayBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 12,
    flex: 1,
  },
  activityItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  activityTime: {
    width: 70,
  },
  activityTimeText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  activityContent: {
    flex: 1,
  },
  activityName: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  activityDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  activityLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  activityLocationText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  activityPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 6,
  },
  smallBookButton: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  smallBookButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
});
