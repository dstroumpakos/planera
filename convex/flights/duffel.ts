"use node";

import { v } from "convex/values";

/**
 * Duffel Flights API Integration
 * 
 * Handles flight search, offer retrieval, and booking creation via Duffel API.
 * All responses are transformed to match the existing frontend contract.
 */

interface DuffelPassenger {
  type: "adult" | "child" | "infant";
  count: number;
}

interface DuffelSlice {
  origin_airport_iata_code: string;
  destination_airport_iata_code: string;
  departure_date: string;
}

interface DuffelOfferRequest {
  slices: DuffelSlice[];
  passengers: DuffelPassenger[];
  cabin_class?: "economy" | "premium_economy" | "business" | "first";
}

interface DuffelSegment {
  id: string;
  departing_at: string;
  arriving_at: string;
  origin_airport: { iata_code: string };
  destination_airport: { iata_code: string };
  operating_carrier: { iata_code: string; name: string };
  aircraft: { iata_code: string; name: string };
  flight_number: string;
  duration: string;
}

interface DuffelSliceSegment {
  segments: DuffelSegment[];
  duration: string;
}

interface DuffelOffer {
  id: string;
  offer_request_id: string;
  slices: DuffelSliceSegment[];
  total_emissions_kg: string;
  available_services: any[];
  passengers: Array<{
    id: string;
    type: string;
  }>;
  base_amount: string;
  tax_amount: string;
  total_amount: string;
  owner: { iata_code: string; name: string };
}

interface DuffelOrder {
  id: string;
  booking_reference: string;
  slices: DuffelSliceSegment[];
  passengers: Array<{
    id: string;
    type: string;
    given_name: string;
    family_name: string;
    email?: string;
    phone_number?: string;
  }>;
  total_amount: string;
  currency: string;
}

// Get Duffel API token
export async function getDuffelToken(): Promise<string> {
  const token = process.env.DUFFEL_ACCESS_TOKEN;
  if (!token) {
    throw new Error("DUFFEL_ACCESS_TOKEN environment variable is not set");
  }
  return token;
}

// Get Duffel API base URL based on environment
function getDuffelBaseUrl(): string {
  const env = process.env.DUFFEL_ENV || "test";
  return env === "live"
    ? "https://api.duffel.com"
    : "https://api.sandbox.duffel.com";
}

/**
 * Create an offer request (search for flights)
 */
export async function createOfferRequest(
  origin: string,
  destination: string,
  departureDate: string,
  returnDate: string | null,
  adults: number,
  children: number = 0,
  infants: number = 0,
  cabinClass: string = "economy"
): Promise<{ offerRequestId: string; offers: any[] }> {
  const token = await getDuffelToken();
  const baseUrl = getDuffelBaseUrl();

  const passengers: DuffelPassenger[] = [];
  if (adults > 0) passengers.push({ type: "adult", count: adults });
  if (children > 0) passengers.push({ type: "child", count: children });
  if (infants > 0) passengers.push({ type: "infant", count: infants });

  const slices: DuffelSlice[] = [
    {
      origin_airport_iata_code: origin,
      destination_airport_iata_code: destination,
      departure_date: departureDate,
    },
  ];

  // Add return slice if roundtrip
  if (returnDate) {
    slices.push({
      origin_airport_iata_code: destination,
      destination_airport_iata_code: origin,
      departure_date: returnDate,
    });
  }

  const payload: DuffelOfferRequest = {
    slices,
    passengers,
    cabin_class: (cabinClass.toLowerCase() as any) || "economy",
  };

  console.log("📤 Creating Duffel offer request:", {
    origin,
    destination,
    departureDate,
    returnDate,
    passengers,
  });

  try {
    const response = await fetch(`${baseUrl}/air/offer_requests`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ Duffel offer request error:", response.status, errorData);
      throw new Error(
        `Duffel API error: ${errorData.errors?.[0]?.message || response.statusText}`
      );
    }

    const data = await response.json();
    console.log("✅ Duffel offer request created:", data.data.id);

    return {
      offerRequestId: data.data.id,
      offers: data.data.offers || [],
    };
  } catch (error) {
    console.error("❌ Failed to create Duffel offer request:", error);
    throw error;
  }
}

/**
 * Get offers for an offer request (with fresh pricing)
 */
export async function getOffers(
  offerRequestId: string,
  limit: number = 10
): Promise<DuffelOffer[]> {
  const token = await getDuffelToken();
  const baseUrl = getDuffelBaseUrl();

  console.log("📥 Fetching Duffel offers for request:", offerRequestId);

  try {
    const response = await fetch(
      `${baseUrl}/air/offer_requests/${offerRequestId}/offers?limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ Duffel get offers error:", response.status, errorData);
      throw new Error(
        `Duffel API error: ${errorData.errors?.[0]?.message || response.statusText}`
      );
    }

    const data = await response.json();
    console.log(`✅ Retrieved ${data.data.length} offers`);
    return data.data;
  } catch (error) {
    console.error("❌ Failed to get Duffel offers:", error);
    throw error;
  }
}

/**
 * Get a single offer by ID (for fresh pricing before booking)
 */
export async function getOffer(offerId: string): Promise<DuffelOffer> {
  const token = await getDuffelToken();
  const baseUrl = getDuffelBaseUrl();

  console.log("📥 Fetching Duffel offer:", offerId);

  try {
    const response = await fetch(`${baseUrl}/air/offers/${offerId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ Duffel get offer error:", response.status, errorData);
      throw new Error(
        `Duffel API error: ${errorData.errors?.[0]?.message || response.statusText}`
      );
    }

    const data = await response.json();
    console.log("✅ Retrieved offer:", data.data.id);
    return data.data;
  } catch (error) {
    console.error("❌ Failed to get Duffel offer:", error);
    throw error;
  }
}

/**
 * Create an order (booking) from an offer
 */
export async function createOrder(
  offerId: string,
  passengers: Array<{
    id: string;
    given_name: string;
    family_name: string;
    email?: string;
    phone_number?: string;
  }>,
  paymentType: string = "balance"
): Promise<DuffelOrder> {
  const token = await getDuffelToken();
  const baseUrl = getDuffelBaseUrl();

  const payload = {
    selected_offers: [offerId],
    passengers,
    payments: [
      {
        type: paymentType, // "balance", "card", etc.
        currency: "EUR",
      },
    ],
  };

  console.log("📤 Creating Duffel order for offer:", offerId);

  try {
    const response = await fetch(`${baseUrl}/air/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ Duffel order creation error:", response.status, errorData);
      throw new Error(
        `Duffel API error: ${errorData.errors?.[0]?.message || response.statusText}`
      );
    }

    const data = await response.json();
    console.log("✅ Order created:", data.data.id, "Booking ref:", data.data.booking_reference);
    return data.data;
  } catch (error) {
    console.error("❌ Failed to create Duffel order:", error);
    throw error;
  }
}

/**
 * Transform Duffel offer to frontend contract format
 */
export function transformOfferToFlightOption(
  offer: DuffelOffer,
  adults: number,
  index: number
): any {
  const outboundSlice = offer.slices[0];
  const returnSlice = offer.slices[1];

  const outboundSegment = outboundSlice.segments[0];
  const returnSegment = returnSlice?.segments[0];

  const totalPrice = parseFloat(offer.total_amount);
  const pricePerPerson = totalPrice / adults;

  return {
    id: offer.id,
    offerId: offer.id,
    offerRequestId: offer.offer_request_id,
    outbound: {
      airline: outboundSegment.operating_carrier.name,
      airlineCode: outboundSegment.operating_carrier.iata_code,
      flightNumber: `${outboundSegment.operating_carrier.iata_code}${outboundSegment.flight_number}`,
      duration: formatDuration(outboundSlice.duration),
      departure: formatTime(outboundSegment.departing_at),
      arrival: formatTime(outboundSegment.arriving_at),
      stops: outboundSlice.segments.length - 1,
      departureTime: outboundSegment.departing_at,
    },
    return: returnSegment
      ? {
          airline: returnSegment.operating_carrier.name,
          airlineCode: returnSegment.operating_carrier.iata_code,
          flightNumber: `${returnSegment.operating_carrier.iata_code}${returnSegment.flight_number}`,
          duration: formatDuration(returnSlice.duration),
          departure: formatTime(returnSegment.departing_at),
          arrival: formatTime(returnSegment.arriving_at),
          stops: returnSlice.segments.length - 1,
          departureTime: returnSegment.departing_at,
        }
      : null,
    pricePerPerson,
    totalPrice,
    currency: "EUR",
    isBestPrice: index === 0,
    luggage: "1 checked bag included",
    cabinBaggage: "1 cabin bag (8kg) included",
    checkedBaggageIncluded: true,
    checkedBaggagePrice: 0,
    timeCategory: "any",
    matchesPreference: true,
    label: index === 0 ? "Best Value" : undefined,
  };
}

/**
 * Helper: Format ISO 8601 duration (e.g., "PT2H30M" -> "2h 30m")
 */
function formatDuration(duration: string): string {
  const match = duration.match(/PT(\d+H)?(\d+M)?/);
  if (!match) return duration;

  const hours = match[1] ? parseInt(match[1]) : 0;
  const minutes = match[2] ? parseInt(match[2]) : 0;

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/**
 * Helper: Format ISO 8601 timestamp to readable time (e.g., "2025-11-23T10:00:00" -> "10:00 AM")
 */
function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}
