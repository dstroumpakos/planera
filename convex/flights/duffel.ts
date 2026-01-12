"use node";

const DUFFEL_API_BASE = "https://api.duffel.com";

function getDuffelConfig() {
  const token = process.env.DUFFEL_ACCESS_TOKEN;
  if (!token) throw new Error("DUFFEL_ACCESS_TOKEN required");
  return { accessToken: token };
}

function getHeaders(config: any) {
  return {
    "Authorization": `Bearer ${config.accessToken}`,
    "Content-Type": "application/json",
    "Duffel-Version": "v1",
  };
}

export async function createOfferRequest(params: any) {
  const config = getDuffelConfig();
  const slices = [{
    origin_airport_iata_code: params.originCode,
    destination_airport_iata_code: params.destinationCode,
    departure_date: params.departureDate,
  }];
  if (params.returnDate) {
    slices.push({
      origin_airport_iata_code: params.destinationCode,
      destination_airport_iata_code: params.originCode,
      departure_date: params.returnDate,
    });
  }
  const passengers = Array(params.adults || 1).fill({ type: "adult" });
  const body = { slices, passengers, cabin_class: "economy" };
  const response = await fetch(`${DUFFEL_API_BASE}/air/offer_requests`, {
    method: "POST",
    headers: getHeaders(config),
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Duffel offer request failed");
  const data = await response.json();
  return { offerRequestId: data.data.id, offers: data.data.offers || [] };
}

export async function getOffer(offerId: string) {
  const config = getDuffelConfig();
  const response = await fetch(`${DUFFEL_API_BASE}/air/offers/${offerId}`, {
    headers: getHeaders(config),
  });
  if (!response.ok) throw new Error("Duffel get offer failed");
  return (await response.json()).data;
}

export async function createOrder(params: any) {
  const config = getDuffelConfig();
  const body = {
    selected_offers: params.selectedOffers,
    passengers: params.passengers,
    payments: [{ type: "balance", currency: "EUR", amount: "0" }],
  };
  const response = await fetch(`${DUFFEL_API_BASE}/air/orders`, {
    method: "POST",
    headers: getHeaders(config),
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Duffel order creation failed");
  const data = await response.json();
  return { orderId: data.data.id, bookingReference: data.data.booking_reference };
}

export function validateConfig(): boolean {
  try {
    getDuffelConfig();
    return true;
  } catch {
    return false;
  }
}

export function transformOfferToFlightOption(offer: any, adults: number, index: number) {
  // Transform Duffel offer to our flight option format
  const slices = offer.slices || [];
  const outbound = slices[0];
  const returnFlight = slices[1];
  
  const outboundSegments = outbound?.segments || [];
  const returnSegments = returnFlight?.segments || [];
  
  const outboundDeparture = outboundSegments[0]?.departing_at || "";
  const outboundArrival = outboundSegments[outboundSegments.length - 1]?.arriving_at || "";
  const returnDeparture = returnSegments[0]?.departing_at || "";
  const returnArrival = returnSegments[returnSegments.length - 1]?.arriving_at || "";
  
  // Calculate duration
  const outboundDurationMs = new Date(outboundArrival).getTime() - new Date(outboundDeparture).getTime();
  const outboundDurationHours = outboundDurationMs / (1000 * 60 * 60);
  
  const returnDurationMs = new Date(returnArrival).getTime() - new Date(returnDeparture).getTime();
  const returnDurationHours = returnDurationMs / (1000 * 60 * 60);
  
  const pricePerPerson = parseInt(offer.total_amount || "0");
  
  return {
    id: offer.id,
    outbound: {
      airline: outboundSegments[0]?.operating_airline?.name || "Unknown",
      airlineCode: outboundSegments[0]?.operating_airline?.iata_code || "XX",
      flightNumber: outboundSegments[0]?.flight_number || "N/A",
      duration: `${Math.floor(outboundDurationHours)}h ${Math.round((outboundDurationHours % 1) * 60)}m`,
      departure: new Date(outboundDeparture).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      arrival: new Date(outboundArrival).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      stops: outboundSegments.length - 1,
      departureTime: outboundDeparture,
    },
    return: {
      airline: returnSegments[0]?.operating_airline?.name || "Unknown",
      airlineCode: returnSegments[0]?.operating_airline?.iata_code || "XX",
      flightNumber: returnSegments[0]?.flight_number || "N/A",
      duration: `${Math.floor(returnDurationHours)}h ${Math.round((returnDurationHours % 1) * 60)}m`,
      departure: new Date(returnDeparture).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      arrival: new Date(returnArrival).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      stops: returnSegments.length - 1,
      departureTime: returnDeparture,
    },
    luggage: "Cabin bag included",
    cabinBaggage: "1 cabin bag (8kg) included",
    checkedBaggageIncluded: false,
    checkedBaggagePrice: 0,
    pricePerPerson,
    totalPrice: pricePerPerson * adults,
    currency: "EUR",
    isBestPrice: index === 0,
    timeCategory: "any",
    matchesPreference: true,
    label: `Option ${index + 1}`,
    bookingUrl: `https://www.duffel.com/bookings/${offer.id}`,
  };
}
