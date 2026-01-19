import { internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";

// Internal mutation to save booking to database
export const saveBooking = internalMutation({
  args: {
    tripId: v.id("trips"),
    duffelOrderId: v.string(),
    bookingReference: v.optional(v.string()),
    paymentIntentId: v.optional(v.string()),
    totalAmount: v.number(),
    currency: v.string(),
    outboundFlight: v.object({
      airline: v.string(),
      flightNumber: v.string(),
      departure: v.string(),
      arrival: v.string(),
      departureDate: v.string(),
      origin: v.string(),
      destination: v.string(),
    }),
    returnFlight: v.optional(v.object({
      airline: v.string(),
      flightNumber: v.string(),
      departure: v.string(),
      arrival: v.string(),
      departureDate: v.string(),
      origin: v.string(),
      destination: v.string(),
    })),
    passengers: v.array(v.object({
      givenName: v.string(),
      familyName: v.string(),
      email: v.string(),
    })),
    status: v.union(
      v.literal("pending_payment"),
      v.literal("confirmed"),
      v.literal("cancelled"),
      v.literal("failed")
    ),
  },
  returns: v.id("flightBookings"),
  handler: async (ctx, args) => {
    // Get the trip to find the userId
    const trip = await ctx.db.get(args.tripId);
    if (!trip) {
      throw new Error("Trip not found");
    }

    const bookingId = await ctx.db.insert("flightBookings", {
      userId: trip.userId,
      tripId: args.tripId,
      duffelOrderId: args.duffelOrderId,
      bookingReference: args.bookingReference,
      paymentIntentId: args.paymentIntentId,
      totalAmount: args.totalAmount,
      currency: args.currency,
      outboundFlight: args.outboundFlight,
      returnFlight: args.returnFlight,
      passengers: args.passengers,
      status: args.status,
      createdAt: Date.now(),
      confirmedAt: args.status === "confirmed" ? Date.now() : undefined,
    });

    return bookingId;
  },
});

// Public query to get bookings for a trip
export const getBookingsForTrip = query({
  args: {
    tripId: v.id("trips"),
  },
  returns: v.array(v.object({
    _id: v.id("flightBookings"),
    bookingReference: v.optional(v.string()),
    totalAmount: v.float64(),
    currency: v.string(),
    status: v.string(),
    outboundFlight: v.object({
      airline: v.string(),
      flightNumber: v.string(),
      departure: v.string(),
      arrival: v.string(),
      departureDate: v.string(),
      origin: v.string(),
      destination: v.string(),
    }),
    returnFlight: v.optional(v.object({
      airline: v.string(),
      flightNumber: v.string(),
      departure: v.string(),
      arrival: v.string(),
      departureDate: v.string(),
      origin: v.string(),
      destination: v.string(),
    })),
    passengers: v.array(v.object({
      givenName: v.string(),
      familyName: v.string(),
      email: v.string(),
    })),
    createdAt: v.float64(),
  })),
  handler: async (ctx, args) => {
    const bookings = await ctx.db
      .query("flightBookings")
      .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
      .collect();
    
    return bookings.map(b => ({
      _id: b._id,
      bookingReference: b.bookingReference,
      totalAmount: b.totalAmount,
      currency: b.currency,
      status: b.status,
      outboundFlight: b.outboundFlight,
      returnFlight: b.returnFlight,
      passengers: b.passengers,
      createdAt: b.createdAt,
    }));
  },
});
