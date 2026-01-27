import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

/**
 * Get booking details by token (for public HTTP endpoint)
 */
export const getBookingByToken = internalQuery({
    args: { token: v.string() },
    returns: v.union(
        v.object({
            success: v.literal(true),
            booking: v.object({
                status: v.string(),
                route: v.string(),
                pnr: v.string(),
                passengers: v.array(v.object({
                    firstName: v.string(),
                    lastName: v.string(),
                })),
                supportEmail: v.string(),
                // Additional booking details
                airline: v.optional(v.string()),
                departureDate: v.optional(v.string()),
                totalAmount: v.optional(v.string()),
            }),
        }),
        v.object({
            success: v.literal(false),
            error: v.string(),
        })
    ),
    handler: async (ctx, args) => {
        // Find the booking link by token
        const bookingLink = await ctx.db
            .query("bookingLinks")
            .withIndex("by_token", (q) => q.eq("token", args.token))
            .unique();

        if (!bookingLink) {
            return { success: false as const, error: "Invalid token" };
        }

        // Check if token has expired
        if (bookingLink.expiresAt < Date.now()) {
            return { success: false as const, error: "Token expired" };
        }

        // Get the actual flight booking
        const flightBooking = await ctx.db.get(bookingLink.bookingId);

        if (!flightBooking) {
            return { success: false as const, error: "Booking not found" };
        }

        // Format the response
        const route = `${flightBooking.outboundFlight.origin} → ${flightBooking.outboundFlight.destination}`;
        const pnr = flightBooking.bookingReference || flightBooking.duffelOrderId.slice(-6).toUpperCase();

        return {
            success: true as const,
            booking: {
                status: flightBooking.status,
                route,
                pnr,
                passengers: flightBooking.passengers.map((p) => ({
                    firstName: p.givenName,
                    lastName: p.familyName,
                })),
                supportEmail: "support@planeraai.app",
                airline: flightBooking.outboundFlight.airline,
                departureDate: flightBooking.outboundFlight.departureDate,
                totalAmount: `${flightBooking.currency} ${flightBooking.totalAmount.toFixed(2)}`,
            },
        };
    },
});

/**
 * Create a booking link (for generating shareable links)
 */
export const createBookingLink = mutation({
    args: {
        bookingId: v.id("flightBookings"),
        expiresInDays: v.optional(v.number()),
    },
    returns: v.object({
        token: v.string(),
        expiresAt: v.float64(),
    }),
    handler: async (ctx, args) => {
        // Generate a secure random token
        const token = generateSecureToken();

        // Default to 30 days expiration
        const expiresInMs = (args.expiresInDays || 30) * 24 * 60 * 60 * 1000;
        const expiresAt = Date.now() + expiresInMs;

        await ctx.db.insert("bookingLinks", {
            token,
            bookingId: args.bookingId,
            expiresAt,
            createdAt: Date.now(),
        });

        return { token, expiresAt };
    },
});

/**
 * Generate a secure random token
 */
function generateSecureToken(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let token = "";
    for (let i = 0; i < 32; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
}
