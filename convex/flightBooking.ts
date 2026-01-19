"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { getOffer, createPaymentIntent } from "./flights/duffel";

// Get flight offer details to verify it's still valid
export const getFlightOffer = action({
  args: {
    offerId: v.string(),
  },
  returns: v.union(
    v.object({
      valid: v.literal(true),
      offer: v.any(),
      pricePerPerson: v.number(),
      totalPrice: v.number(),
      currency: v.string(),
      expiresAt: v.optional(v.string()),
    }),
    v.object({
      valid: v.literal(false),
      error: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    try {
      const offer = await getOffer(args.offerId);
      
      if (!offer) {
        return {
          valid: false as const,
          error: "Flight offer not found or has expired. Please search for new flights.",
        };
      }

      const totalAmount = parseFloat(offer.total_amount || "0");
      const numPassengers = offer.passengers?.length || 1;

      return {
        valid: true as const,
        offer,
        pricePerPerson: Math.round(totalAmount / numPassengers),
        totalPrice: Math.round(totalAmount),
        currency: offer.total_currency || "EUR",
        expiresAt: offer.expires_at,
      };
    } catch (error) {
      console.error("Get offer error:", error);
      return {
        valid: false as const,
        error: "Failed to verify flight offer. Please try again.",
      };
    }
  },
});

// Create a booking/payment session for the flight
export const createFlightBooking = action({
  args: {
    offerId: v.string(),
    tripId: v.id("trips"),
    passengers: v.array(
      v.object({
        id: v.string(),
        givenName: v.string(),
        familyName: v.string(),
        dateOfBirth: v.string(), // YYYY-MM-DD
        gender: v.union(v.literal("male"), v.literal("female")),
        email: v.string(),
        phoneNumber: v.string(),
        title: v.union(
          v.literal("mr"),
          v.literal("ms"),
          v.literal("mrs"),
          v.literal("miss"),
          v.literal("dr")
        ),
      })
    ),
  },
  returns: v.union(
    v.object({
      success: v.literal(true),
      bookingType: v.string(),
      bookingUrl: v.string(),
      sessionId: v.optional(v.string()),
    }),
    v.object({
      success: v.literal(false),
      error: v.string(),
      fallbackUrl: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    try {
      // Transform passengers to Duffel format
      const duffelPassengers = args.passengers.map((p, index) => ({
        id: `pas_${index}`,
        given_name: p.givenName,
        family_name: p.familyName,
        born_on: p.dateOfBirth,
        gender: p.gender === "male" ? "m" as const : "f" as const,
        email: p.email,
        phone_number: p.phoneNumber,
        title: p.title,
      }));

      // Get the site URL for redirect
      const siteUrl = process.env.SITE_URL || "https://planera.app";
      const successUrl = `${siteUrl}/booking-success?tripId=${args.tripId}`;
      const cancelUrl = `${siteUrl}/trip/${args.tripId}?booking=cancelled`;

      const result = await createPaymentIntent({
        offerId: args.offerId,
        passengers: duffelPassengers,
        successUrl,
        cancelUrl,
      });

      if (result.type === "duffel_links") {
        return {
          success: true as const,
          bookingType: "duffel_links",
          bookingUrl: result.url,
          sessionId: result.sessionId,
        };
      } else {
        // Redirect type - airline or Skyscanner
        return {
          success: true as const,
          bookingType: "redirect",
          bookingUrl: result.url,
        };
      }
    } catch (error) {
      console.error("Create booking error:", error);
      
      // Try to provide a fallback URL
      try {
        const offer = await getOffer(args.offerId);
        if (offer?.owner?.website_url) {
          return {
            success: false as const,
            error: "Could not create direct booking. You can book on the airline website.",
            fallbackUrl: offer.owner.website_url,
          };
        }
      } catch {
        // Ignore fallback errors
      }

      return {
        success: false as const,
        error: error instanceof Error ? error.message : "Failed to create booking",
      };
    }
  },
});
