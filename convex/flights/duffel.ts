"use node";

const DUFFEL_API_BASE = "https://api.duffel.com";

function getDuffelConfig() {
  const token = process.env.DUFFEL_ACCESS_TOKEN;

  if (!token) throw new Error("DUFFEL_ACCESS_TOKEN not configured");
  return { accessToken: token };
}

function getHeaders(config: any) {
  return {
    "Authorization": `Bearer ${config.accessToken}`,
    "Content-Type": "application/json",
    "Duffel-Version": "v2",
  };
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

// Create a Duffel order (booking) with passenger details
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
  metadata?: Record<string, string>;
}) {
  const config = getDuffelConfig();
  const headers = getHeaders(config);

  const payload = {
    data: {
      type: "instant",
      selected_offers: [params.offerId],
      passengers: params.passengers,
      payments: [
        {
          type: "balance",
          currency: "EUR",
          amount: "0", // Will be set by Duffel based on offer
        },
      ],
      metadata: params.metadata || {},
    },
  };

  try {
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
    return data.data;
  } catch (error) {
    console.error("Duffel Create Order Error:", error);
    throw error;
  }
}

// Create a payment intent for collecting card details (Duffel Links)
// Falls back to booking URL if Duffel Links is not enabled for this account
export async function createPaymentIntent(params: {
  offerId: string;
  passengers: Array<{
    id: string;
    given_name: string;
    family_name: string;
    born_on: string;
    gender: "m" | "f";
    email: string;
    phone_number: string;
    title: "mr" | "ms" | "mrs" | "miss" | "dr";
  }>;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}) {
  const config = getDuffelConfig();
  const headers = getHeaders(config);

  // First get the offer to check the price and get flight details
  const offer = await getOffer(params.offerId);
  if (!offer) {
    throw new Error("Offer not found or expired");
  }

  // Extract flight details for fallback booking
  const slices = offer.slices || [];
  const outbound = slices[0];
  const return_slice = slices[1];
  
  // Get airline info
  const airlineCode = outbound?.segments?.[0]?.operating_carrier?.iata_code || "";
  const airlineName = outbound?.segments?.[0]?.operating_carrier?.name || "Airline";
  
  // Build a booking-friendly URL
  const originCode = outbound?.origin?.iata_code || "";
  const destCode = outbound?.destination?.iata_code || "";
  const depDate = outbound?.segments?.[0]?.departing_at?.split("T")[0] || "";
  const retDate = return_slice?.segments?.[0]?.departing_at?.split("T")[0] || "";

  // Generate a unique reference for this booking session
  const reference = `PLN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  // Try Duffel Links first (requires Duffel Links product to be enabled)
  try {
    console.log("🔗 Attempting Duffel Links session...");
    
    const payload = {
      data: {
        offer_id: params.offerId,
        passengers: params.passengers,
        success_url: params.successUrl,
        failure_url: params.cancelUrl,
        abandonment_url: params.cancelUrl,
        reference: reference,
        markup_amount: "0",
        markup_currency: offer.total_currency || "EUR",
      },
    };
    
    const response = await fetch(`${DUFFEL_API_BASE}/links/sessions`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Duffel Links session created: ${data.data.id}`);
      
      return {
        type: "duffel_links",
        url: data.data.url,
        sessionId: data.data.id,
        offer,
      };
    }

    // Log the error but continue to fallback
    const errorData = await response.text();
    console.log(`ℹ️ Duffel Links not available (${response.status}), using fallback booking`);
    console.log(`   Error: ${errorData}`);
  } catch (error) {
    console.log(`ℹ️ Duffel Links error, using fallback:`, error);
  }

  // Fallback Strategy: Build the best booking URL we can
  console.log("🔄 Building fallback booking URL...");
  
  // Option 1: Try airline's direct website
  const airlineWebsite = offer.owner?.website_url;
  if (airlineWebsite) {
    console.log(`✅ Using airline website: ${airlineWebsite}`);
    return {
      type: "redirect",
      url: airlineWebsite,
      offer,
    };
  }

  // Option 2: Use Google Flights (most reliable universal option)
  if (originCode && destCode && depDate) {
    // Google Flights URL format
    const googleFlightsUrl = buildGoogleFlightsUrl(originCode, destCode, depDate, retDate, params.passengers.length);
    console.log(`✅ Using Google Flights: ${googleFlightsUrl}`);
    return {
      type: "redirect",
      url: googleFlightsUrl,
      offer,
    };
  }

  // Option 3: Kayak as another fallback
  if (originCode && destCode && depDate) {
    const kayakUrl = `https://www.kayak.com/flights/${originCode}-${destCode}/${depDate}${retDate ? `/${retDate}` : ""}`;
    console.log(`✅ Using Kayak: ${kayakUrl}`);
    return {
      type: "redirect",
      url: kayakUrl,
      offer,
    };
  }

  // Last resort: Generic Skyscanner
  const skyscannerUrl = `https://www.skyscanner.com/transport/flights/${originCode || "anywhere"}/${destCode || "anywhere"}/`;
  console.log(`✅ Using Skyscanner: ${skyscannerUrl}`);
  return {
    type: "redirect",
    url: skyscannerUrl,
    offer,
  };
}

// Helper function to build Google Flights URL
function buildGoogleFlightsUrl(origin: string, dest: string, depDate: string, retDate: string, passengers: number): string {
  // Google Flights URL structure
  // Format: https://www.google.com/travel/flights?q=Flights%20to%20{dest}%20from%20{origin}%20on%20{date}
  const baseUrl = "https://www.google.com/travel/flights";
  
  // Build search parameters
  const searchQuery = `Flights from ${origin} to ${dest}`;
  const params = new URLSearchParams({
    q: searchQuery,
    curr: "EUR",
  });
  
  // For a cleaner deep link format
  // Example: /flights/JFK/LHR/2024-03-15/2024-03-22
  const flightPath = retDate 
    ? `/flights/${origin}/${dest}/${depDate}/${retDate}`
    : `/flights/${origin}/${dest}/${depDate}`;
  
  return `${baseUrl}${flightPath}?curr=EUR&hl=en`;
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
