"use node";

const DUFFEL_API_BASE = "https://api.duffel.com";

function getDuffelConfig() {
  const token = process.env.DUFFEL_ACCESS_TOKEN;

  if (!token) throw new Error("DUFFEL_ACCESS_TOKEN not configured");
  return { accessToken: token };
}

function getHeaders(config: { accessToken: string }) {
  return {
    "Authorization": `Bearer ${config.accessToken}`,
    "Content-Type": "application/json",
    "Duffel-Version": "v2",
  };
}

// Helper to calculate age from date of birth
function calculateAgeFromDOB(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export async function createOfferRequest(params: {
  originCode: string;
  destinationCode: string;
  departureDate: string;
  returnDate: string;
  adults: number;
}) {
  const config = getDuffelConfig();
  const headers = getHeaders(config);

  const payload = {
    data: {
      passengers: Array(params.adults).fill(null).map(() => ({
        age: 30,
      })),
      slices: [
        {
          origin: params.originCode,
          destination: params.destinationCode,
          departure_date: params.departureDate,
        },
        {
          origin: params.destinationCode,
          destination: params.originCode,
          departure_date: params.returnDate,
        },
      ],
      return_offers: true,
    },
  };

  try {
    console.log("🔍 Creating Duffel offer request...");
    
    const response = await fetch(`${DUFFEL_API_BASE}/air/offer_requests`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`Duffel API Error: ${response.status} \`${errorData}\``);
      throw new Error(`Duffel offer request failed: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    const offerRequestId = data.data.id;
    let offers = data.data.offers || [];
    
    console.log(`✅ Duffel: ${offerRequestId}, found ${offers.length} total offers`);

    if (offers.length === 0) {
      console.log("⏳ No inline offers, polling...");
      let attempts = 0;
      const maxAttempts = 15;

      while (attempts < maxAttempts) {
        const offersResponse = await fetch(
          `${DUFFEL_API_BASE}/air/offers?offer_request_id=${offerRequestId}&limit=50&sort=total_amount`,
          { headers }
        );

        if (offersResponse.ok) {
          const offersData = await offersResponse.json();
          offers = offersData.data || [];
          if (offers.length > 0) break;
        }

        await new Promise((resolve) => setTimeout(resolve, 2000));
        attempts++;
      }
    }

    // Filter for Duffel Airways (ZZ) test offers only - enables safe end-to-end booking flow in sandbox
    const duffelAirwaysOffers = offers.filter((offer: any) => {
      const ownerIataCode = offer.owner?.iata_code;
      const ownerName = offer.owner?.name;
      return ownerIataCode === "ZZ" || ownerName === "Duffel Airways";
    });

    console.log(`✈️ Filtered to ${duffelAirwaysOffers.length} Duffel Airways (ZZ) test offers`);

    return { offerRequestId, offers: duffelAirwaysOffers };
  } catch (error) {
    console.error("Duffel API Error:", error);
    throw error;
  }
}

// Helper to format time from ISO string (e.g. 2023-10-27T10:00:00) to HH:MM AM/PM
function formatTime(isoString: string): string {
  if (!isoString) return "";
  try {
    const timePart = isoString.split('T')[1];
    if (!timePart) return isoString;
    const [hoursStr, minutesStr] = timePart.split(':');
    const hours = parseInt(hoursStr, 10);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${String(hours12).padStart(2, '0')}:${minutesStr} ${period}`;
  } catch (e) {
    return isoString;
  }
}

// Helper to format ISO 8601 duration (e.g. PT2H30M) to "2h 30m"
function formatDuration(isoDuration: string): string {
  if (!isoDuration) return "";
  try {
    const match = isoDuration.match(/PT(\d+H)?(\d+M)?/);
    if (!match) return isoDuration;
    const hours = match[1] ? match[1].replace('H', 'h') : '';
    const minutes = match[2] ? match[2].replace('M', 'm') : '';
    return `${hours} ${minutes}`.trim();
  } catch (e) {
    return isoDuration;
  }
}

export function transformOfferToFlightOption(offer: any) {
  const slices = offer.slices || [];
  const outbound = slices[0];
  const return_slice = slices[1];

  // Extract airline name
  const outboundAirline = outbound?.segments?.[0]?.operating_carrier?.name || 
                         outbound?.segments?.[0]?.operating_carrier?.iata_code || 
                         "Unknown";
  const returnAirline = return_slice?.segments?.[0]?.operating_carrier?.name || 
                        return_slice?.segments?.[0]?.operating_carrier?.iata_code || 
                        "Unknown";

  // Extract flight number
  const outboundFlightNumber = outbound?.segments?.[0] 
    ? `${outbound.segments[0].operating_carrier?.iata_code || ""}${outbound.segments[0].operating_carrier_flight_number || ""}`
    : "";
  
  const returnFlightNumber = return_slice?.segments?.[0]
    ? `${return_slice.segments[0].operating_carrier?.iata_code || ""}${return_slice.segments[0].operating_carrier_flight_number || ""}`
    : "";

  // Generate fallback booking URL (Skyscanner)
  let bookingUrl = offer.owner?.website_url || "";
  if (!bookingUrl && outbound && return_slice) {
    const originCode = outbound.origin?.iata_code || outbound.origin_airport_iata_code;
    const destCode = outbound.destination?.iata_code || outbound.destination_airport_iata_code;
    const depDate = outbound.departure_date; // YYYY-MM-DD
    const retDate = return_slice.departure_date; // YYYY-MM-DD
    
    if (originCode && destCode && depDate && retDate) {
      const depDateStr = depDate.slice(2).replace(/-/g, '');
      const retDateStr = retDate.slice(2).replace(/-/g, '');
      bookingUrl = `https://www.skyscanner.com/transport/flights/${originCode}/${destCode}/${depDateStr}/${retDateStr}`;
    }
  }

  // Duffel returns total_amount as a string (e.g., "150.00") - parse it correctly
  // Also get number of passengers to calculate per-person price
  const totalAmount = parseFloat(offer.total_amount || "0");
  const numPassengers = offer.passengers?.length || 1;
  const pricePerPerson = Math.round(totalAmount / numPassengers);

  return {
    id: offer.id,
    pricePerPerson: pricePerPerson,
    currency: offer.total_currency || "EUR",
    outbound: {
      airline: outboundAirline,
      flightNumber: outboundFlightNumber,
      departure: formatTime(outbound?.departure_time || ""),
      arrival: formatTime(outbound?.arrival_time || ""),
      duration: formatDuration(outbound?.duration || ""),
      stops: (outbound?.segments?.length || 1) - 1,
    },
    return: {
      airline: returnAirline,
      flightNumber: returnFlightNumber,
      departure: formatTime(return_slice?.departure_time || ""),
      arrival: formatTime(return_slice?.arrival_time || ""),
      duration: formatDuration(return_slice?.duration || ""),
      stops: (return_slice?.segments?.length || 1) - 1,
    },
    luggage: "1 checked bag included",
    checkedBaggageIncluded: true,
    checkedBaggagePrice: 0,
    arrivalAirport: return_slice?.origin_airport_iata_code || "",
    bookingUrl: bookingUrl,
    isBestPrice: false,
  };
}

export function validateConfig(): boolean {
  try {
    getDuffelConfig();
    return true;
  } catch {
    return false;
  }
}

// Get a specific offer by ID to verify it's still valid
export async function getOffer(offerId: string) {
  const config = getDuffelConfig();
  const headers = getHeaders(config);

  try {
    const response = await fetch(`${DUFFEL_API_BASE}/air/offers/${offerId}`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`Duffel Get Offer Error: ${response.status} - ${errorData}`);
      return null;
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("Duffel Get Offer Error:", error);
    return null;
  }
}

// Create a Payment Intent for collecting card details
// This is required before creating an order with customer card payment
export async function createPaymentIntent(params: {
  amount: string;
  currency: string;
}) {
  const config = getDuffelConfig();
  const headers = getHeaders(config);

  const payload = {
    data: {
      amount: params.amount,
      currency: params.currency,
    },
  };

  try {
    console.log(`💳 Creating Duffel Payment Intent for ${params.currency} ${params.amount}...`);
    
    const response = await fetch(`${DUFFEL_API_BASE}/payments/payment_intents`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`Duffel Payment Intent Error: ${response.status} - ${errorData}`);
      throw new Error(`Failed to create payment intent: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log(`✅ Payment Intent created: ${data.data.id}`);
    
    return {
      id: data.data.id,
      clientToken: data.data.client_token,
      amount: data.data.amount,
      currency: data.data.currency,
      status: data.data.status,
    };
  } catch (error) {
    console.error("Create Payment Intent Error:", error);
    throw error;
  }
}

// Confirm a Payment Intent after card details are collected
export async function confirmPaymentIntent(paymentIntentId: string) {
  const config = getDuffelConfig();
  const headers = getHeaders(config);

  try {
    console.log(`✅ Confirming Payment Intent: ${paymentIntentId}...`);
    
    const response = await fetch(`${DUFFEL_API_BASE}/payments/payment_intents/${paymentIntentId}/actions/confirm`, {
      method: "POST",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`Duffel Confirm Payment Error: ${response.status} - ${errorData}`);
      throw new Error(`Failed to confirm payment: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log(`✅ Payment confirmed: ${data.data.status}`);
    
    return data.data;
  } catch (error) {
    console.error("Confirm Payment Error:", error);
    throw error;
  }
}

// Create a Duffel order (booking) with passenger details and payment
export async function createOrder(params: {
  offerId: string;
  passengers: Array<{
    id: string;
    given_name: string;
    family_name: string;
    born_on: string; // YYYY-MM-DD
    gender: "m" | "f";
    email: string;
    phone_number: string;
    title: "mr" | "ms" | "mrs" | "miss" | "dr";
  }>;
  paymentIntentId?: string;
  metadata?: Record<string, string>;
}) {
  const config = getDuffelConfig();
  const headers = getHeaders(config);

  // First get the offer to know the amount
  const offer = await getOffer(params.offerId);
  if (!offer) {
    throw new Error("Offer not found or expired");
  }

  // Build payments array - use payment intent if provided, otherwise balance
  const payments = params.paymentIntentId
    ? [
        {
          type: "payment_intent",
          payment_intent_id: params.paymentIntentId,
        },
      ]
    : [
        {
          type: "balance",
          currency: offer.total_currency || "GBP",
          amount: offer.total_amount,
        },
      ];

  // Add age to each passenger (calculated from born_on)
  const passengersWithAge = params.passengers.map(p => ({
    ...p,
    age: calculateAgeFromDOB(p.born_on),
  }));

  const payload = {
    data: {
      type: "instant",
      selected_offers: [params.offerId],
      passengers: passengersWithAge,
      payments,
      metadata: params.metadata || {},
    },
  };

  try {
    console.log(`📝 Creating Duffel Order for offer ${params.offerId}...`);
    console.log(`👤 Passengers:`, passengersWithAge.map(p => ({ name: `${p.given_name} ${p.family_name}`, dob: p.born_on, age: p.age })));
    
    const response = await fetch(`${DUFFEL_API_BASE}/air/orders`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`Duffel Create Order Error: ${response.status} - ${errorData}`);
      throw new Error(`Failed to create order: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log(`✅ Order created: ${data.data.id}, Booking Ref: ${data.data.booking_reference}`);
    
    return {
      id: data.data.id,
      bookingReference: data.data.booking_reference,
      status: data.data.status,
      totalAmount: parseFloat(data.data.total_amount),
      currency: data.data.total_currency,
      passengers: data.data.passengers,
      slices: data.data.slices,
      createdAt: data.data.created_at,
    };
  } catch (error) {
    console.error("Duffel Create Order Error:", error);
    throw error;
  }
}

// Get order status
export async function getOrder(orderId: string) {
  const config = getDuffelConfig();
  const headers = getHeaders(config);

  try {
    const response = await fetch(`${DUFFEL_API_BASE}/air/orders/${orderId}`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`Duffel Get Order Error: ${response.status} - ${errorData}`);
      return null;
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("Duffel Get Order Error:", error);
    return null;
  }
}

// Extract flight details from an offer for storage
export function extractFlightDetails(offer: any) {
  const slices = offer.slices || [];
  const outbound = slices[0];
  const returnSlice = slices[1];

  const outboundSegment = outbound?.segments?.[0];
  const returnSegment = returnSlice?.segments?.[0];

  return {
    outbound: {
      airline: outboundSegment?.operating_carrier?.name || outboundSegment?.operating_carrier?.iata_code || "Unknown",
      flightNumber: `${outboundSegment?.operating_carrier?.iata_code || ""}${outboundSegment?.operating_carrier_flight_number || ""}`,
      departure: formatTime(outboundSegment?.departing_at || ""),
      arrival: formatTime(outboundSegment?.arriving_at || ""),
      departureDate: outboundSegment?.departing_at?.split("T")[0] || "",
      origin: outbound?.origin?.iata_code || "",
      destination: outbound?.destination?.iata_code || "",
    },
    return: returnSegment ? {
      airline: returnSegment?.operating_carrier?.name || returnSegment?.operating_carrier?.iata_code || "Unknown",
      flightNumber: `${returnSegment?.operating_carrier?.iata_code || ""}${returnSegment?.operating_carrier_flight_number || ""}`,
      departure: formatTime(returnSegment?.departing_at || ""),
      arrival: formatTime(returnSegment?.arriving_at || ""),
      departureDate: returnSegment?.departing_at?.split("T")[0] || "",
      origin: returnSlice?.origin?.iata_code || "",
      destination: returnSlice?.destination?.iata_code || "",
    } : undefined,
  };
}
