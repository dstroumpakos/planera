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

export async function createOrder(params: {
  offerId: string;
  passengers: Array<{
    id?: string; // Optional, we will map it
    title: string;
    given_name: string;
    family_name: string;
    born_on: string;
    gender: "m" | "f";
    email: string;
    phone_number: string;
  }>;
  payment?: {
    amount: string;
    currency: string;
    card?: {
      number: string;
      exp_month: string;
      exp_year: string;
      cvc: string;
    };
  };
}) {
  const config = getDuffelConfig();
  const headers = getHeaders(config);

  // 1. We need to fetch the offer again or use the saved one to get passenger IDs? 
  // Actually, Duffel requires us to map our passengers to the offer's passenger IDs.
  // But usually, we just pass the passengers array with the order creation, 
  // matching the `type` from the offer.
  // For simplicity, we'll assume the offer has "adult" passengers and we map sequentially.
  
  // First, retrieve the offer to get passenger IDs
  const offerResponse = await fetch(`${DUFFEL_API_BASE}/air/offers/${params.offerId}`, {
    headers,
  });
  
  if (!offerResponse.ok) {
    throw new Error("Offer expired or invalid");
  }
  
  const offerData = await offerResponse.json();
  const offerPassengers = offerData.data.passengers;

  if (offerPassengers.length !== params.passengers.length) {
    throw new Error(`Passenger count mismatch. Offer expects ${offerPassengers.length}, got ${params.passengers.length}`);
  }

  // Map passengers
  const passengers = params.passengers.map((p, index) => ({
    id: offerPassengers[index].id, // Use the ID from the offer
    title: p.title,
    given_name: p.given_name,
    family_name: p.family_name,
    born_on: p.born_on,
    gender: p.gender,
    email: p.email,
    phone_number: p.phone_number,
  }));

  const payload: any = {
    data: {
      type: "instant",
      selected_offers: [params.offerId],
      passengers,
      payments: params.payment ? [
        {
          type: "balance", // For sandbox/demo. In prod with card, use "card" and token.
          amount: params.payment.amount,
          currency: params.payment.currency,
        }
      ] : [],
    },
  };

  // If card details are provided (and we are in a secure env/PCI compliant scope), we would use them.
  // For this demo/sandbox, we default to 'balance' to ensure it works without real cards.
  // To support cards, we'd change type to "card" and add card details.
  
  try {
    const response = await fetch(`${DUFFEL_API_BASE}/air/orders`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`Duffel Order Error: ${response.status} \`${errorData}\``);
      throw new Error(`Order creation failed: ${errorData}`);
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("Duffel Order Error:", error);
    throw error;
  }
}

export function transformOfferToFlightOption(offer: any) {
  const slices = offer.slices || [];
  const outbound = slices[0];
  const return_slice = slices[1];

  return {
    id: offer.id,
    pricePerPerson: Math.round(parseInt(offer.total_amount || "0") / 100), // Convert cents to euros
    currency: offer.total_currency || "EUR",
    outbound: {
      airline: outbound?.segments?.[0]?.operating_carrier?.iata_code || "Unknown",
      departure: outbound?.departure_time || "",
      arrival: outbound?.arrival_time || "",
      duration: outbound?.duration || "",
      stops: (outbound?.segments?.length || 1) - 1,
    },
    return: {
      airline: return_slice?.segments?.[0]?.operating_carrier?.iata_code || "Unknown",
      departure: return_slice?.departure_time || "",
      arrival: return_slice?.arrival_time || "",
      duration: return_slice?.duration || "",
      stops: (return_slice?.segments?.length || 1) - 1,
    },
    luggage: "1 checked bag included",
    checkedBaggageIncluded: true,
    checkedBaggagePrice: 0,
    arrivalAirport: return_slice?.origin_airport_iata_code || "",
    bookingUrl: offer.owner?.website_url || "",
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
