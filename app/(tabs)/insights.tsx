import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from "react-native";
import { useQuery, useMutation, usePaginatedQuery, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Id } from "@/convex/_generated/dataModel";

const CATEGORIES = [
  { id: "food", label: "Food & Drink", icon: "restaurant" },
  { id: "transport", label: "Transport", icon: "bus" },
  { id: "neighborhoods", label: "Neighborhoods", icon: "map" },
  { id: "timing", label: "Best Time", icon: "time" },
  { id: "hidden_gem", label: "Hidden Gems", icon: "diamond" },
  { id: "avoid", label: "What to Avoid", icon: "warning" },
  { id: "other", label: "Other", icon: "information-circle" },
];

export default function InsightsScreen() {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalVisible, setModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<"browse" | "share">("browse");
  const [tripToVerify, setTripToVerify] = useState<any>(null);
  
  // Form State
  const [selectedTrip, setSelectedTrip] = useState<{
    _id: Id<"trips">;
    destination: string;
    startDate: number;
    endDate: number;
    travelers: number;
  } | null>(null);
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("other");

  // Get user's completed trips - only when authenticated
  const completedTrips = useQuery(
    api.insights.getCompletedTrips,
    isAuthenticated ? {} : "skip"
  );

  const { results, status, loadMore } = usePaginatedQuery(
    api.insights.list,
    isAuthenticated ? { destination: searchQuery || undefined } : "skip",
    { initialNumItems: 10 }
  );

  const createInsight = useMutation(api.insights.create);
  const likeInsight = useMutation(api.insights.like);

  // Show loading state while auth is initializing
  if (isAuthLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F5A623" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show sign-in prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.authContainer}>
          <Ionicons name="bulb-outline" size={64} color="#F5A623" />
          <Text style={styles.authTitle}>Traveler Insights</Text>
          <Text style={styles.authSubtitle}>
            Sign in to browse and share travel tips with other travelers
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleSubmit = async () => {
    if (!selectedTrip || !content) {
      Alert.alert("Error", "Please select a trip and write your insight");
      return;
    }

    try {
      await createInsight({
        destination: selectedTrip.destination,
        content,
        category: category as any,
        verified: true, // Always verified since they must select from completed trips
      });
      setModalVisible(false);
      resetForm();
      Alert.alert("Success", "Thank you for sharing your insight! It will help other travelers.");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to share insight");
    }
  };

  const resetForm = () => {
    setSelectedTrip(null);
    setContent("");
    setCategory("other");
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  };

  const renderInsightItem = ({ item }: { item: any }) => {
    const categoryInfo = CATEGORIES.find((c) => c.id === item.category) || CATEGORIES[6];
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.categoryBadge}>
            <Ionicons name={categoryInfo.icon as any} size={14} color="#FFF" />
            <Text style={styles.categoryText}>{categoryInfo.label}</Text>
          </View>
          {item.verified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
              <Text style={styles.verifiedText}>Verified Traveler</Text>
            </View>
          )}
        </View>
        
        <Text style={styles.destinationText}>{item.destination}</Text>
        <Text style={styles.contentText}>{item.content}</Text>
        
        <View style={styles.cardFooter}>
          <TouchableOpacity 
            style={styles.likeButton}
            onPress={() => likeInsight({ insightId: item._id })}
          >
            <Ionicons name="heart-outline" size={18} color="#666" />
            <Text style={styles.likeCount}>{item.likes}</Text>
          </TouchableOpacity>
          <Text style={styles.dateText}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>
    );
  };

  const renderTripItem = ({ item }: { item: typeof completedTrips extends (infer T)[] | undefined ? T : never }) => {
    if (!item) return null;
    const isSelected = selectedTrip?._id === item._id;
    
    return (
      <TouchableOpacity 
        style={[styles.tripCard, isSelected && styles.tripCardSelected]}
        onPress={() => setTripToVerify(item)}
      >
        <View style={styles.tripIconContainer}>
          <Ionicons name="airplane" size={24} color={isSelected ? "#FFF" : "#F5A623"} />
        </View>
        <View style={styles.tripInfo}>
          <Text style={[styles.tripDestination, isSelected && styles.tripTextSelected]}>
            {item.destination}
          </Text>
          <Text style={[styles.tripDates, isSelected && styles.tripDatesSelected]}>
            {formatDate(item.startDate)} - {formatDate(item.endDate)}
          </Text>
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={24} color="#FFF" />
        )}
      </TouchableOpacity>
    );
  };

  const handleVerifyTrip = (confirmed: boolean) => {
    if (confirmed && tripToVerify) {
      setSelectedTrip(tripToVerify);
      setTripToVerify(null);
      // Switch to share tab and open the form
      setActiveTab("share");
    } else {
      setTripToVerify(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Traveler Insights</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === "browse" && styles.tabActive]}
          onPress={() => setActiveTab("browse")}
        >
          <Ionicons 
            name="compass-outline" 
            size={18} 
            color={activeTab === "browse" ? "#F5A623" : "#999"} 
          />
          <Text style={[styles.tabText, activeTab === "browse" && styles.tabTextActive]}>
            Browse Tips
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === "share" && styles.tabActive]}
          onPress={() => setActiveTab("share")}
        >
          <Ionicons 
            name="create-outline" 
            size={18} 
            color={activeTab === "share" ? "#F5A623" : "#999"} 
          />
          <Text style={[styles.tabText, activeTab === "share" && styles.tabTextActive]}>
            Share Your Tips
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "browse" ? (
        <>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search destination..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />
          </View>

          <FlatList
            data={results}
            renderItem={renderInsightItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContent}
            onEndReached={() => status === "CanLoadMore" && loadMore(5)}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="bulb-outline" size={48} color="#CCC" />
                <Text style={styles.emptyText}>No insights found yet.</Text>
                <Text style={styles.emptySubtext}>Be the first to share tips!</Text>
              </View>
            }
          />
        </>
      ) : (
        <ScrollView style={styles.shareContainer} contentContainerStyle={styles.shareContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setActiveTab("browse")}
          >
            <Ionicons name="chevron-back" size={24} color="#F5A623" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.shareHeader}>
            <Ionicons name="airplane" size={32} color="#F5A623" />
            <Text style={styles.shareTitle}>Share Your Travel Wisdom</Text>
            <Text style={styles.shareSubtitle}>
              Select a completed trip to share tips with other travelers
            </Text>
          </View>

          {completedTrips === undefined ? (
            <ActivityIndicator size="large" color="#F5A623" style={{ marginTop: 40 }} />
          ) : completedTrips.length === 0 ? (
            <View style={styles.noTripsContainer}>
              <Ionicons name="calendar-outline" size={48} color="#CCC" />
              <Text style={styles.noTripsText}>No completed trips yet</Text>
              <Text style={styles.noTripsSubtext}>
                Once you complete a trip, you'll be able to share your insights here
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Your Completed Trips</Text>
              <FlatList
                data={completedTrips}
                renderItem={renderTripItem}
                keyExtractor={(item) => item._id}
                scrollEnabled={false}
                contentContainerStyle={styles.tripsListContent}
              />

              {selectedTrip && (
                <View style={styles.insightFormContainer}>
                  <Text style={styles.sectionTitle}>Write Your Insight</Text>
                  <Text style={styles.selectedTripLabel}>
                    Sharing tips for: <Text style={styles.selectedTripName}>{selectedTrip.destination}</Text>
                  </Text>

                  <Text style={styles.label}>Your Insight</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="What's one thing future travelers should know?"
                    placeholderTextColor="#999"
                    multiline
                    numberOfLines={4}
                    value={content}
                    onChangeText={setContent}
                  />

                  <Text style={styles.label}>What is this about?</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                    {CATEGORIES.map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        style={[styles.categoryChip, category === cat.id && styles.categoryChipSelected]}
                        onPress={() => setCategory(cat.id)}
                      >
                        <Ionicons 
                          name={cat.icon as any} 
                          size={14} 
                          color={category === cat.id ? "#000" : "#666"} 
                        />
                        <Text style={[styles.categoryChipText, category === cat.id && styles.categoryChipTextSelected]}>
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                    <Ionicons name="paper-plane" size={18} color="#000" />
                    <Text style={styles.submitButtonText}>Submit Insight</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* Trip Verification Modal */}
      <Modal
        visible={!!tripToVerify}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setTripToVerify(null)}
      >
        <View style={styles.verifyModalOverlay}>
          <View style={styles.verifyModalContent}>
            {/* Status Bar Placeholder */}
            <View style={{ height: insets.top }} />
            
            {/* Header */}
            <View style={styles.verifyHeader}>
              <TouchableOpacity 
                style={styles.verifyCloseButton}
                onPress={() => setTripToVerify(null)}
              >
                <Ionicons name="close" size={24} color="#181710" />
              </TouchableOpacity>
              <Text style={styles.verifyHeaderTitle}>Trip Feedback</Text>
              <View style={{ width: 48 }} /> 
            </View>

            <ScrollView contentContainerStyle={styles.verifyScrollContent}>
              {/* Trip Card with Image */}
              {tripToVerify && (
                <View style={styles.verifyTripCard}>
                  <View style={styles.verifyTripImageContainer}>
                    <Image
                      source={{ uri: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=200&h=200&fit=crop" }}
                      style={styles.verifyTripImage}
                    />
                  </View>
                  <View style={styles.verifyTripInfo}>
                    <Text style={styles.verifyTripDestination}>{tripToVerify.destination}</Text>
                    <Text style={styles.verifyTripDetails}>
                      {formatDate(tripToVerify.startDate)} - {formatDate(tripToVerify.endDate)} • {tripToVerify.travelers} Travelers
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#757575" />
                </View>
              )}

              {/* Main Prompt */}
              <View style={styles.verifyPromptContainer}>
                <View style={styles.verifyIconContainer}>
                  <Ionicons name="sparkles" size={28} color="#F5A623" />
                </View>
                <Text style={styles.verifyTitle}>
                  Have you taken{"\n"}this trip?
                </Text>
                <Text style={styles.verifySubtitle}>
                  Help Planera AI build better itineraries for your future adventures.
                </Text>
              </View>

              <View style={{ flex: 1 }} />

              {/* Action Buttons */}
              <View style={[styles.verifyActions, { paddingBottom: Math.max(insets.bottom, 32) }]}>
                <TouchableOpacity 
                  style={styles.verifyYesButton}
                  onPress={() => handleVerifyTrip(true)}
                >
                  <Text style={styles.verifyYesButtonText}>Yes, I have</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.verifyNoButton}
                  onPress={() => handleVerifyTrip(false)}
                >
                  <Text style={styles.verifyNoButtonText}>No, not yet</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Quick Add Modal (Alternative way to add insights) */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Share Insight</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {completedTrips === undefined ? (
                <ActivityIndicator size="large" color="#F5A623" style={{ marginTop: 40 }} />
              ) : completedTrips.length === 0 ? (
                <View style={styles.noTripsContainer}>
                  <Ionicons name="calendar-outline" size={48} color="#CCC" />
                  <Text style={styles.noTripsText}>No completed trips yet</Text>
                  <Text style={styles.noTripsSubtext}>
                    You can only share insights for trips you've completed
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={styles.label}>Select a Completed Trip</Text>
                  <FlatList
                    data={completedTrips}
                    renderItem={renderTripItem}
                    keyExtractor={(item) => item._id}
                    scrollEnabled={false}
                    contentContainerStyle={styles.tripsListContent}
                  />

                  {selectedTrip && (
                    <>
                      <Text style={styles.label}>Category</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                        {CATEGORIES.map((cat) => (
                          <TouchableOpacity
                            key={cat.id}
                            style={[styles.categoryChip, category === cat.id && styles.categoryChipSelected]}
                            onPress={() => setCategory(cat.id)}
                          >
                            <Ionicons 
                              name={cat.icon as any} 
                              size={16} 
                              color={category === cat.id ? "#FFF" : "#666"} 
                            />
                            <Text style={[styles.categoryChipText, category === cat.id && styles.categoryChipTextSelected]}>
                              {cat.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>

                      <Text style={styles.label}>Your Insight</Text>
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Share your tips, hidden gems, or advice..."
                        placeholderTextColor="#999"
                        multiline
                        numberOfLines={4}
                        value={content}
                        onChangeText={setContent}
                      />

                      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                        <Ionicons name="paper-plane" size={20} color="#000" />
                        <Text style={styles.submitButtonText}>Share Insight</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </>
              )}
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFBF0",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0E6D3",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  addButton: {
    backgroundColor: "#F5A623",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    gap: 8,
  },
  tabActive: {
    backgroundColor: "#FFF8E7",
    borderWidth: 1,
    borderColor: "#F5A623",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#999",
  },
  tabTextActive: {
    color: "#F5A623",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    margin: 20,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#333",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  verifiedText: {
    fontSize: 12,
    color: "#4CAF50",
    marginLeft: 4,
    fontWeight: "500",
  },
  destinationText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  contentText: {
    fontSize: 15,
    color: "#555",
    lineHeight: 22,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingTop: 12,
  },
  likeButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  likeCount: {
    marginLeft: 6,
    color: "#666",
    fontSize: 14,
  },
  dateText: {
    color: "#999",
    fontSize: 12,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyText: {
    marginTop: 16,
    color: "#666",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  emptySubtext: {
    marginTop: 8,
    color: "#999",
    fontSize: 14,
    textAlign: "center",
  },
  shareContainer: {
    flex: 1,
    backgroundColor: "#FFF",
    paddingTop: 60,
  },
  shareContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  shareHeader: {
    alignItems: "center",
    marginBottom: 32,
  },
  shareTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
    marginTop: 12,
    textAlign: "center",
  },
  shareSubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 16,
  },
  noTripsContainer: {
    alignItems: "center",
    padding: 40,
    backgroundColor: "#FFF",
    borderRadius: 16,
    marginTop: 20,
  },
  noTripsText: {
    marginTop: 16,
    color: "#666",
    fontSize: 18,
    fontWeight: "600",
  },
  noTripsSubtext: {
    marginTop: 8,
    color: "#999",
    fontSize: 14,
    textAlign: "center",
  },
  tripsListContent: {
    gap: 12,
  },
  tripCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  tripCardSelected: {
    backgroundColor: "#F5A623",
    borderColor: "#F5A623",
  },
  tripIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFF8E7",
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
    color: "#333",
  },
  tripTextSelected: {
    color: "#FFF",
  },
  tripDates: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
  },
  tripDatesSelected: {
    color: "rgba(255,255,255,0.8)",
  },
  insightFormContainer: {
    marginTop: 32,
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#E7E5DA",
  },
  selectedTripLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
  },
  selectedTripName: {
    fontWeight: "700",
    color: "#F5A623",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  modalSafeArea: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  modalContent: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
    marginTop: 16,
    color: "#181710",
  },
  input: {
    backgroundColor: "#F5F4F0",
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    color: "#333",
    borderWidth: 1,
    borderColor: "#E7E5DA",
  },
  textArea: {
    height: 120,
    textAlignVertical: "top",
  },
  categoryScroll: {
    flexDirection: "row",
    marginBottom: 8,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F5F4F0",
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E7E5DA",
  },
  categoryChipSelected: {
    backgroundColor: "#FFD900",
    borderColor: "#FFD900",
  },
  categoryChipText: {
    marginLeft: 6,
    fontWeight: "500",
    color: "#666",
    fontSize: 13,
  },
  categoryChipTextSelected: {
    color: "#181710",
    fontWeight: "600",
  },
  submitButton: {
    backgroundColor: "#FFD900",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
    shadowColor: "#FFD900",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  submitButtonText: {
    color: "#181710",
    fontSize: 16,
    fontWeight: "bold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  authContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginTop: 24,
  },
  authSubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 12,
    lineHeight: 24,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F5A623",
    marginLeft: 4,
  },
  // Verification Modal Styles
  verifyModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  verifyModalContent: {
    backgroundColor: "#F8F8F5",
    height: "100%",
    width: "100%",
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    overflow: "hidden",
  },
  verifyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  verifyCloseButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  verifyHeaderTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#181710",
    textAlign: "center",
  },
  verifyScrollContent: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  verifyTripCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 12,
    paddingRight: 16,
    marginBottom: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
  },
  verifyTripImageContainer: {
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: "hidden",
    marginRight: 16,
  },
  verifyTripImage: {
    width: "100%",
    height: "100%",
  },
  verifyTripInfo: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
  },
  verifyTripDestination: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#181710",
  },
  verifyTripDetails: {
    fontSize: 13,
    fontWeight: "500",
    color: "#757575",
  },
  verifyPromptContainer: {
    alignItems: "center",
    marginTop: 16,
    marginBottom: 32,
  },
  verifyIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255, 217, 0, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  verifyTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#181710",
    textAlign: "center",
    lineHeight: 38,
    marginBottom: 12,
  },
  verifySubtitle: {
    fontSize: 15,
    color: "#757575",
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 260,
  },
  verifyActions: {
    width: "100%",
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  verifyYesButton: {
    width: "100%",
    height: 56,
    backgroundColor: "#FFD900",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#FFD900",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  verifyYesButtonText: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#181710",
  },
  verifyNoButton: {
    width: "100%",
    height: 56,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  verifyNoButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#181710",
  },
});
