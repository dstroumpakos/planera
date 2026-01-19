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
    
    console.log(`✅ Duffel: ${offerRequestId}, found ${offers.length} offers`);

    if (offers.length === 0) {
      console.log("⏳ No inline offers, polling...");
      let attempts = 0;
      const maxAttempts = 15;

      while (attempts < maxAttempts) {
        const offersResponse = await fetch(
          `${DUFFEL_API_BASE}/air/offers?offer_request_id=${offerRequestId}&limit=10&sort=total_amount`,
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

    return { offerRequestId, offers };
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

  // First get the offer to check the price
  const offer = await getOffer(params.offerId);
  if (!offer) {
    throw new Error("Offer not found or expired");
  }

  // Create a Duffel Links session for payment
  const payload = {
    data: {
      offer_id: params.offerId,
      passengers: params.passengers,
      client_key: config.accessToken,
      success_url: params.successUrl,
      failure_url: params.cancelUrl,
      markup_amount: "0",
      markup_currency: offer.total_currency || "EUR",
    },
  };

  try {
    const response = await fetch(`${DUFFEL_API_BASE}/links/sessions`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`Duffel Links Error: ${response.status} - ${errorData}`);
      
      // Fallback: Return airline website for booking
      const airlineUrl = offer.owner?.website_url;
      if (airlineUrl) {
        return {
          type: "redirect",
          url: airlineUrl,
          offer,
        };
      }
      
      throw new Error(`Failed to create payment session: ${response.status}`);
    }

    const data = await response.json();
    return {
      type: "duffel_links",
      url: data.data.url,
      sessionId: data.data.id,
      offer,
    };
  } catch (error) {
    console.error("Duffel Links Error:", error);
    
    // Fallback to Skyscanner or airline website
    const slices = offer?.slices || [];
    const outbound = slices[0];
    const return_slice = slices[1];
    
    if (outbound && return_slice) {
      const originCode = outbound.origin?.iata_code;
      const destCode = outbound.destination?.iata_code;
      const depDate = outbound.departure_date;
      const retDate = return_slice.departure_date;
      
      if (originCode && destCode && depDate && retDate) {
        const depDateStr = depDate.slice(2).replace(/-/g, '');
        const retDateStr = retDate.slice(2).replace(/-/g, '');
        return {
          type: "redirect",
          url: `https://www.skyscanner.com/transport/flights/${originCode}/${destCode}/${depDateStr}/${retDateStr}`,
          offer,
        };
      }
    }
    
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
