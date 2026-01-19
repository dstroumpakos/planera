import { v } from "convex/values";
import { authMutation, authQuery } from "./functions";

export const createBooking = authMutation({
  args: {
    tripId: v.optional(v.id("trips")),
    duffelOrderId: v.string(),
    duffelBookingReference: v.string(),
    status: v.string(),
    amount: v.number(),
    currency: v.string(),
    flightDetails: v.object({
      origin: v.string(),
      destination: v.string(),
      airline: v.string(),
      departureTime: v.string(),
      arrivalTime: v.string(),
      flightNumber: v.string(),
    }),
    passengerNames: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const bookingId = await ctx.db.insert("flight_bookings", {
      userId: ctx.user._id,
      tripId: args.tripId,
      duffelOrderId: args.duffelOrderId,
      duffelBookingReference: args.duffelBookingReference,
      status: args.status,
      amount: args.amount,
      currency: args.currency,
      flightDetails: args.flightDetails,
      passengerNames: args.passengerNames,
      bookedAt: Date.now(),
    });
    return bookingId;
  },
});

export const getMyFlightBookings = authQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("flight_bookings")
      .withIndex("by_user_id", (q) => q.eq("userId", ctx.user._id))
      .order("desc")
      .collect();
  },
});
