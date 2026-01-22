/**
 * Flight Extras Screen
 * Tabs for: Bags, Policy, Seats
 * User can customize their booking before proceeding to review
 */

import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAction, useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

const colors = {
  background: "#FFFDF7",
  surface: "#FFFFFF",
  primary: "#F5C543",
  primaryDark: "#D4A73A",
  text: "#1A1A1A",
  textSecondary: "#6B7280",
  border: "#E8E6E1",
  success: "#22C55E",
  warning: "#F59E0B",
  error: "#EF4444",
};

type TabType = "bags" | "policy" | "seats";

interface SeatElement {
  type: string;
  designator?: string;
  name?: string;
  disclosures?: string[];
  availableServices?: Array<{
    id: string;
    passengerId: string;
    priceDisplay: string;
  }>;
}

interface SeatSelection {
  passengerId: string;
  segmentId: string;
  serviceId: string;
  seatDesignator: string;
  priceCents: number;
  currency: string;
}

export default function FlightExtrasScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const draftId = params.draftId as Id<"flightBookingDrafts">;
  const tripId = params.tripId as Id<"trips">;
  const offerId = params.offerId as string;
  const flightInfoParam = params.flightInfo as string;

  const [activeTab, setActiveTab] = useState<TabType>("bags");
  const [policyAcknowledged, setPolicyAcknowledged] = useState(false);
  const [seatMaps, setSeatMaps] = useState<any[] | null>(null);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [selectedSeats, setSelectedSeats] = useState<SeatSelection[]>([]);
  const [seatModalVisible, setSeatModalVisible] = useState(false);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);
  const [activePassengerIndex, setActivePassengerIndex] = useState(0);

  // Queries and mutations
  const draft = useQuery(api.bookingDraftMutations.getBookingDraft, { draftId });
  const updateBaggage = useMutation(api.bookingDraftMutations.updateBaggageSelections);
  const updateSeats = useMutation(api.bookingDraftMutations.updateSeatSelections);
  const acknowledgePolicy = useMutation(api.bookingDraftMutations.acknowledgePolicy);
  const fetchSeatMaps = useAction(api.bookingDraft.fetchSeatMaps);

  const flightInfo = flightInfoParam ? JSON.parse(flightInfoParam) : null;

  useEffect(() => {
    if (draft) {
      setPolicyAcknowledged(draft.policyAcknowledged);
    }
  }, [draft]);

  const handleTabChange = (tab: TabType) => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    setActiveTab(tab);
  };

  const handleLoadSeatMaps = async () => {
    if (seatMaps) return;

    setLoadingSeats(true);
    try {
      const result = await fetchSeatMaps({ offerId });
      if (result.success) {
        setSeatMaps(result.seatMaps);
      } else {
        if (Platform.OS !== "web") {
          Alert.alert("Seat Selection", result.error);
        }
      }
    } catch (error) {
      console.error("Error loading seat maps:", error);
    } finally {
      setLoadingSeats(false);
    }
  };

  const handlePolicyAcknowledge = async () => {
    const newValue = !policyAcknowledged;
    setPolicyAcknowledged(newValue);

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      await acknowledgePolicy({
        draftId,
        acknowledged: newValue,
      });
    } catch (error) {
      console.error("Error acknowledging policy:", error);
      setPolicyAcknowledged(!newValue); // Revert on error
    }
  };

  const handleSeatSelect = (
    seat: SeatElement,
    segmentId: string,
    passengerId: string
  ) => {
    if (!seat.designator || !seat.availableServices?.length) return;

    const service = seat.availableServices.find(s => s.passengerId === passengerId);
    if (!service) return;

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Parse price from display string (e.g., "EUR 15.00")
    const priceMatch = service.priceDisplay.match(/([A-Z]+)\s+([\d.]+)/);
    const currency = priceMatch?.[1] || "EUR";
    const priceCents = Math.round(parseFloat(priceMatch?.[2] || "0") * 100);

    setSelectedSeats(prev => {
      // Remove existing selection for this passenger/segment
      const filtered = prev.filter(
        s => !(s.passengerId === passengerId && s.segmentId === segmentId)
      );

      // Add new selection
      return [
        ...filtered,
        {
          passengerId,
          segmentId,
          serviceId: service.id,
          seatDesignator: seat.designator!,
          priceCents,
          currency,
        },
      ];
    });
  };

  const handleSaveSeatSelections = async () => {
    try {
      await updateSeats({
        draftId,
        selectedSeats: selectedSeats.map(s => ({
          ...s,
          priceCents: BigInt(s.priceCents),
        })),
      });
      setSeatModalVisible(false);
    } catch (error) {
      console.error("Error saving seat selections:", error);
      if (Platform.OS !== "web") {
        Alert.alert("Error", "Failed to save seat selections");
      }
    }
  };

  const handleContinueToReview = () => {
    if (!policyAcknowledged) {
      if (Platform.OS !== "web") {
        Alert.alert(
          "Policy Acknowledgment Required",
          "Please review and acknowledge the booking policy before continuing."
        );
      }
      setActiveTab("policy");
      return;
    }

    router.push({
      pathname: "/flight-review",
      params: {
        draftId,
        tripId,
        flightInfo: flightInfoParam,
      },
    });
  };

  const renderBagsTab = () => {
    // In a real implementation, you would show available bag options
    // For now, show included baggage and note that extras may not be available
    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Included Baggage</Text>
          <Text style={styles.sectionDescription}>
            Your fare includes the following baggage allowance per passenger:
          </Text>

          <View style={styles.baggageList}>
            <View style={styles.baggageItem}>
              <View style={styles.baggageIconContainer}>
                <Ionicons name="bag-handle-outline" size={24} color={colors.primary} />
              </View>
              <View style={styles.baggageInfo}>
                <Text style={styles.baggageTitle}>Carry-on Bag</Text>
                <Text style={styles.baggageDescription}>
                  1 cabin bag (max 8kg) + 1 personal item
                </Text>
              </View>
              <View style={styles.includedBadge}>
                <Text style={styles.includedBadgeText}>Included</Text>
              </View>
            </View>

            <View style={styles.baggageItem}>
              <View style={styles.baggageIconContainer}>
                <Ionicons name="briefcase-outline" size={24} color={colors.primary} />
              </View>
              <View style={styles.baggageInfo}>
                <Text style={styles.baggageTitle}>Checked Bag</Text>
                <Text style={styles.baggageDescription}>
                  Check your fare details for checked baggage allowance
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
          <Text style={styles.infoText}>
            Additional baggage options may be available during check-in or at the airport.
            Prices and availability vary by route and airline.
          </Text>
        </View>
      </ScrollView>
    );
  };

  const renderPolicyTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Booking Policy</Text>
        <Text style={styles.sectionDescription}>
          Please review the cancellation and change policies for your selected fare:
        </Text>

        <View style={styles.policyList}>
          {/* Changes Policy */}
          <View style={styles.policyItem}>
            <View style={[
              styles.policyIconContainer,
              draft?.canChange ? styles.policyAllowed : styles.policyNotAllowed
            ]}>
              <Ionicons
                name="swap-horizontal"
                size={24}
                color={draft?.canChange ? colors.success : colors.error}
              />
            </View>
            <View style={styles.policyInfo}>
              <Text style={styles.policyTitle}>Flight Changes</Text>
              <Text style={[
                styles.policyDescription,
                !draft?.canChange && styles.policyNotAllowedText
              ]}>
                {draft?.changePolicy || "Loading..."}
              </Text>
            </View>
          </View>

          {/* Refund Policy */}
          <View style={styles.policyItem}>
            <View style={[
              styles.policyIconContainer,
              draft?.canRefund ? styles.policyAllowed : styles.policyNotAllowed
            ]}>
              <Ionicons
                name="cash-outline"
                size={24}
                color={draft?.canRefund ? colors.success : colors.error}
              />
            </View>
            <View style={styles.policyInfo}>
              <Text style={styles.policyTitle}>Cancellation & Refund</Text>
              <Text style={[
                styles.policyDescription,
                !draft?.canRefund && styles.policyNotAllowedText
              ]}>
                {draft?.refundPolicy || "Loading..."}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Acknowledgment Checkbox */}
      <TouchableOpacity
        style={styles.acknowledgmentCard}
        onPress={handlePolicyAcknowledge}
        activeOpacity={0.7}
      >
        <View style={[
          styles.checkbox,
          policyAcknowledged && styles.checkboxChecked
        ]}>
          {policyAcknowledged && (
            <Ionicons name="checkmark" size={16} color="#FFF" />
          )}
        </View>
        <Text style={styles.acknowledgmentText}>
          I have read and understand the cancellation and change policies for this booking.
          I agree to proceed with this fare.
        </Text>
      </TouchableOpacity>

      {!policyAcknowledged && (
        <View style={styles.warningCard}>
          <Ionicons name="warning-outline" size={20} color={colors.warning} />
          <Text style={styles.warningText}>
            You must acknowledge the policy to continue with your booking.
          </Text>
        </View>
      )}
    </ScrollView>
  );

  const renderSeatsTab = () => {
    if (!seatMaps) {
      return (
        <View style={styles.tabContent}>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Seat Selection</Text>
            <Text style={styles.sectionDescription}>
              Choose your preferred seats for each flight segment.
            </Text>

            <TouchableOpacity
              style={styles.loadSeatsButton}
              onPress={handleLoadSeatMaps}
              disabled={loadingSeats}
            >
              {loadingSeats ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <>
                  <Ionicons name="grid-outline" size={20} color={colors.primary} />
                  <Text style={styles.loadSeatsButtonText}>View Available Seats</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.infoText}>
              Seat selection may not be available for all flights. If unavailable,
              seats will be assigned at check-in.
            </Text>
          </View>
        </View>
      );
    }

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Your Seat Selections</Text>

          {draft?.passengers.map((passenger, index) => {
            const passengerSeats = selectedSeats.filter(s => s.passengerId === passenger.passengerId);
            return (
              <View key={index} style={styles.passengerSeatCard}>
                <View style={styles.passengerSeatHeader}>
                  <Ionicons name="person" size={18} color={colors.textSecondary} />
                  <Text style={styles.passengerSeatName}>{passenger.name}</Text>
                </View>
                {passengerSeats.length > 0 ? (
                  passengerSeats.map((seat, seatIndex) => (
                    <View key={seatIndex} style={styles.seatBadge}>
                      <Text style={styles.seatBadgeText}>Seat {seat.seatDesignator}</Text>
                      <Text style={styles.seatPriceText}>
                        {seat.currency} {(seat.priceCents / 100).toFixed(2)}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noSeatText}>No seat selected</Text>
                )}
              </View>
            );
          })}

          <TouchableOpacity
            style={styles.selectSeatsButton}
            onPress={() => setSeatModalVisible(true)}
          >
            <Ionicons name="grid-outline" size={20} color="#FFF" />
            <Text style={styles.selectSeatsButtonText}>
              {selectedSeats.length > 0 ? "Change Seats" : "Select Seats"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  // Seat selection modal
  const renderSeatModal = () => {
    if (!seatMaps || seatMaps.length === 0) return null;

    const currentSeatMap = seatMaps[activeSegmentIndex];
    const currentPassenger = draft?.passengers[activePassengerIndex];

    return (
      <Modal
        visible={seatModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSeatModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSeatModalVisible(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Seat</Text>
            <TouchableOpacity onPress={handleSaveSeatSelections}>
              <Text style={styles.modalDoneText}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Segment tabs */}
          {seatMaps.length > 1 && (
            <ScrollView horizontal style={styles.segmentTabs} showsHorizontalScrollIndicator={false}>
              {seatMaps.map((_, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.segmentTab,
                    activeSegmentIndex === index && styles.segmentTabActive
                  ]}
                  onPress={() => setActiveSegmentIndex(index)}
                >
                  <Text style={[
                    styles.segmentTabText,
                    activeSegmentIndex === index && styles.segmentTabTextActive
                  ]}>
                    Flight {index + 1}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Passenger selector */}
          {draft && draft.passengers.length > 1 && (
            <ScrollView horizontal style={styles.passengerTabs} showsHorizontalScrollIndicator={false}>
              {draft.passengers.map((passenger, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.passengerTab,
                    activePassengerIndex === index && styles.passengerTabActive
                  ]}
                  onPress={() => setActivePassengerIndex(index)}
                >
                  <Text style={[
                    styles.passengerTabText,
                    activePassengerIndex === index && styles.passengerTabTextActive
                  ]}>
                    {passenger.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Seat map */}
          <ScrollView style={styles.seatMapContainer}>
            {currentSeatMap?.cabins.map((cabin: any, cabinIndex: number) => (
              <View key={cabinIndex} style={styles.cabinContainer}>
                <Text style={styles.cabinTitle}>{cabin.cabinClass}</Text>
                {cabin.rows.map((row: any, rowIndex: number) => (
                  <View key={rowIndex} style={styles.seatRow}>
                    {row.sections.map((section: any, sectionIndex: number) => (
                      <View key={sectionIndex} style={styles.seatSection}>
                        {section.elements.map((element: SeatElement, elementIndex: number) => {
                          const isSelected = selectedSeats.some(
                            s => s.seatDesignator === element.designator &&
                              s.segmentId === currentSeatMap.segmentId &&
                              s.passengerId === currentPassenger?.passengerId
                          );
                          const isOccupied = element.type === "seat" && !element.availableServices?.length;
                          const isAisle = element.type === "empty";

                          if (isAisle) {
                            return <View key={elementIndex} style={styles.aisle} />;
                          }

                          if (element.type !== "seat") {
                            return (
                              <View key={elementIndex} style={styles.nonSeatElement}>
                                <Ionicons
                                  name={
                                    element.type === "lavatory" ? "water" :
                                    element.type === "galley" ? "restaurant" :
                                    element.type === "exit_row" ? "exit-outline" : "help"
                                  }
                                  size={16}
                                  color={colors.textSecondary}
                                />
                              </View>
                            );
                          }

                          return (
                            <TouchableOpacity
                              key={elementIndex}
                              style={[
                                styles.seat,
                                isSelected && styles.seatSelected,
                                isOccupied && styles.seatOccupied,
                              ]}
                              onPress={() => {
                                if (!isOccupied && currentPassenger) {
                                  handleSeatSelect(
                                    element,
                                    currentSeatMap.segmentId,
                                    currentPassenger.passengerId
                                  );
                                }
                              }}
                              disabled={isOccupied}
                            >
                              <Text style={[
                                styles.seatText,
                                isSelected && styles.seatTextSelected,
                                isOccupied && styles.seatTextOccupied,
                              ]}>
                                {element.designator}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>

          {/* Legend */}
          <View style={styles.seatLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendSeat, styles.legendAvailable]} />
              <Text style={styles.legendText}>Available</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendSeat, styles.legendSelected]} />
              <Text style={styles.legendText}>Selected</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendSeat, styles.legendOccupied]} />
              <Text style={styles.legendText}>Occupied</Text>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    );
  };

  if (!draft) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Customize Booking</Text>
        <View style={styles.headerRight}>
          {draft.expiresIn !== undefined && (
            <Text style={styles.expiryText}>{draft.expiresIn}m</Text>
          )}
        </View>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {(["bags", "policy", "seats"] as TabType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => handleTabChange(tab)}
          >
            <Ionicons
              name={
                tab === "bags" ? "briefcase-outline" :
                tab === "policy" ? "document-text-outline" : "grid-outline"
              }
              size={20}
              color={activeTab === tab ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
            {tab === "policy" && policyAcknowledged && (
              <View style={styles.tabBadge}>
                <Ionicons name="checkmark" size={12} color="#FFF" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      {activeTab === "bags" && renderBagsTab()}
      {activeTab === "policy" && renderPolicyTab()}
      {activeTab === "seats" && renderSeatsTab()}

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.priceInfo}>
          <Text style={styles.priceLabel}>Total</Text>
          <Text style={styles.priceValue}>{draft.totalPriceDisplay}</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.continueButton,
            !policyAcknowledged && styles.continueButtonDisabled
          ]}
          onPress={handleContinueToReview}
        >
          <Text style={styles.continueButtonText}>Continue to Review</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Seat Selection Modal */}
      {renderSeatModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
  },
  headerRight: {
    width: 60,
    alignItems: "flex-end",
  },
  expiryText: {
    fontSize: 14,
    color: colors.warning,
    fontWeight: "500",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
  },
  tabBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.success,
    justifyContent: "center",
    alignItems: "center",
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  baggageList: {
    gap: 12,
  },
  baggageItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 12,
  },
  baggageIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  baggageInfo: {
    flex: 1,
  },
  baggageTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  baggageDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  includedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
  },
  includedBadgeText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.success,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    backgroundColor: "#FEF3C7",
    borderRadius: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  policyList: {
    gap: 16,
  },
  policyItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  policyIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  policyAllowed: {
    backgroundColor: "#ECFDF5",
  },
  policyNotAllowed: {
    backgroundColor: "#FEF2F2",
  },
  policyInfo: {
    flex: 1,
  },
  policyTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  policyDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 20,
  },
  policyNotAllowedText: {
    color: colors.error,
  },
  acknowledgmentCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    marginBottom: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.primary,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
  },
  acknowledgmentText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  warningCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: "#FEF3C7",
    borderRadius: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
  },
  loadSeatsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 12,
    marginTop: 8,
  },
  loadSeatsButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.primary,
  },
  passengerSeatCard: {
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 12,
    marginBottom: 12,
  },
  passengerSeatHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  passengerSeatName: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.text,
  },
  seatBadge: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.primary + "20",
    borderRadius: 8,
    marginTop: 4,
  },
  seatBadgeText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  seatPriceText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  noSeatText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: "italic",
  },
  selectSeatsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    backgroundColor: colors.primary,
    borderRadius: 12,
    marginTop: 8,
  },
  selectSeatsButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFF",
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  priceInfo: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  priceValue: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFF",
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
  },
  modalDoneText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
  },
  segmentTabs: {
    flexGrow: 0,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  segmentTab: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  segmentTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  segmentTabText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  segmentTabTextActive: {
    color: colors.primary,
    fontWeight: "600",
  },
  passengerTabs: {
    flexGrow: 0,
    backgroundColor: colors.background,
    paddingVertical: 8,
  },
  passengerTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  passengerTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  passengerTabText: {
    fontSize: 13,
    color: colors.text,
  },
  passengerTabTextActive: {
    color: "#FFF",
    fontWeight: "600",
  },
  seatMapContainer: {
    flex: 1,
    padding: 16,
  },
  cabinContainer: {
    marginBottom: 24,
  },
  cabinTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 16,
    textTransform: "uppercase",
  },
  seatRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 4,
  },
  seatSection: {
    flexDirection: "row",
  },
  seat: {
    width: 36,
    height: 36,
    margin: 2,
    borderRadius: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  seatSelected: {
    backgroundColor: colors.primary,
  },
  seatOccupied: {
    backgroundColor: colors.border,
    borderColor: colors.border,
  },
  seatText: {
    fontSize: 11,
    fontWeight: "500",
    color: colors.primary,
  },
  seatTextSelected: {
    color: "#FFF",
  },
  seatTextOccupied: {
    color: colors.textSecondary,
  },
  aisle: {
    width: 20,
    height: 36,
    margin: 2,
  },
  nonSeatElement: {
    width: 36,
    height: 36,
    margin: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  seatLegend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendSeat: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
  },
  legendAvailable: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
  },
  legendSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  legendOccupied: {
    backgroundColor: colors.border,
    borderColor: colors.border,
  },
  legendText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
