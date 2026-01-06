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
} from "react-native";
import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalVisible, setModalVisible] = useState(false);
  
  // Form State
  const [destination, setDestination] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("other");
  const [hasVisited, setHasVisited] = useState<boolean | null>(null);

  const { results, status, loadMore, isLoading } = usePaginatedQuery(
    api.insights.list,
    { destination: searchQuery || undefined },
    { initialNumItems: 10 }
  );

  const createInsight = useMutation(api.insights.create);
  const likeInsight = useMutation(api.insights.like);

  const handleSubmit = async () => {
    if (!destination || !content || hasVisited === null) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (!hasVisited) {
      Alert.alert("Notice", "You can only submit insights for trips you have taken.");
      return;
    }

    try {
      await createInsight({
        destination,
        content,
        category: category as any,
        verified: hasVisited,
      });
      setModalVisible(false);
      resetForm();
      Alert.alert("Success", "Insight shared successfully!");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to share insight");
    }
  };

  const resetForm = () => {
    setDestination("");
    setContent("");
    setCategory("other");
    setHasVisited(null);
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

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search destination..."
          value={searchQuery}
          onChangeText={setSearchQuery}
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
            <Text style={styles.emptyText}>No insights found. Be the first to share!</Text>
          </View>
        }
      />

      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Share Insight</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.label}>Destination</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Paris, France"
              value={destination}
              onChangeText={setDestination}
            />

            <Text style={styles.label}>Have you taken this trip?</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity 
                style={[styles.radioButton, hasVisited === true && styles.radioButtonSelected]}
                onPress={() => setHasVisited(true)}
              >
                <Text style={[styles.radioText, hasVisited === true && styles.radioTextSelected]}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.radioButton, hasVisited === false && styles.radioButtonSelected]}
                onPress={() => setHasVisited(false)}
              >
                <Text style={[styles.radioText, hasVisited === false && styles.radioTextSelected]}>No</Text>
              </TouchableOpacity>
            </View>

            {hasVisited === false && (
              <Text style={styles.warningText}>
                You can only browse insights if you haven't visited the destination.
              </Text>
            )}

            {hasVisited && (
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
                  multiline
                  numberOfLines={4}
                  value={content}
                  onChangeText={setContent}
                />

                <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                  <Text style={styles.submitButtonText}>Share Insight</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#FFF",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  addButton: {
    backgroundColor: "#000",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    margin: 20,
    marginTop: 0,
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
    color: "#999",
    fontSize: 16,
    textAlign: "center",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#FFF",
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
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 16,
    color: "#333",
  },
  input: {
    backgroundColor: "#F5F5F5",
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
  },
  textArea: {
    height: 120,
    textAlignVertical: "top",
  },
  radioGroup: {
    flexDirection: "row",
    gap: 12,
  },
  radioButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    alignItems: "center",
  },
  radioButtonSelected: {
    backgroundColor: "#000",
    borderColor: "#000",
  },
  radioText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  radioTextSelected: {
    color: "#FFF",
  },
  warningText: {
    color: "#666",
    marginTop: 12,
    fontStyle: "italic",
  },
  categoryScroll: {
    flexDirection: "row",
    marginBottom: 8,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    marginRight: 8,
  },
  categoryChipSelected: {
    backgroundColor: "#000",
  },
  categoryChipText: {
    marginLeft: 6,
    fontWeight: "500",
    color: "#666",
  },
  categoryChipTextSelected: {
    color: "#FFF",
  },
  submitButton: {
    backgroundColor: "#000",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 32,
    marginBottom: 40,
  },
  submitButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});
