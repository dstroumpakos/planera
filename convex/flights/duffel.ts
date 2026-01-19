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
    "Duffel-Version": "v1",
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
      type: "offer_request",
      passengers: Array(params.adults).fill(null).map(() => ({
        type: "passenger",
        age: 30,
      })),
      slices: [
        {
          origin_airport_iata_code: params.originCode,
          destination_airport_iata_code: params.destinationCode,
          departure_date: params.departureDate,
        },
        {
          origin_airport_iata_code: params.destinationCode,
          destination_airport_iata_code: params.originCode,
          departure_date: params.returnDate,
        },
      ],
    },
  };

  try {
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

    // Poll for offers
    let offers: any[] = [];
    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      const offersResponse = await fetch(
        `${DUFFEL_API_BASE}/air/offer_requests/${offerRequestId}/offers`,
        { headers }
      );

      if (!offersResponse.ok) {
        throw new Error(`Failed to fetch offers: ${offersResponse.status}`);
      }

      const offersData = await offersResponse.json();
      offers = offersData.data || [];

      if (offers.length > 0) break;

      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;
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
