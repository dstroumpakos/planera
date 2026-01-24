"use node";

/**
 * Email Service using Gmail API
 * Sends transactional emails from support@planeraai.app
 */

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { makeFunctionReference } from "convex/server";

// Create typed function references to avoid circular dependency issues
const getBookingForEmailRef = makeFunctionReference<
  "query",
  { bookingId: Id<"flightBookings"> },
  any
>("emailHelpers:getBookingForEmail");

const markConfirmationEmailSentRef = makeFunctionReference<
  "mutation",
  { bookingId: Id<"flightBookings"> },
  null
>("emailHelpers:markConfirmationEmailSent");

const sendEmailRef = makeFunctionReference<
  "action",
  { to: string; subject: string; html: string; text?: string },
  { success: boolean; messageId?: string; error?: string }
>("emails:sendEmail");

// Gmail API constants
const GMAIL_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

/**
 * Refresh Gmail access token using refresh token
 */
async function getAccessToken(): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing Gmail OAuth credentials. Required: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN");
  }

  const response = await fetch(GMAIL_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Create RFC 2822 formatted email message
 */
function createMimeMessage({
  to,
  from,
  subject,
  html,
  text,
}: {
  to: string;
  from: string;
  subject: string;
  html: string;
  text?: string;
}): string {
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const plainText = text || html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

  const message = [
    `From: Planera <${from}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: quoted-printable`,
    ``,
    plainText,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: quoted-printable`,
    ``,
    html,
    ``,
    `--${boundary}--`,
  ].join("\r\n");

  return message;
}

/**
 * Base64url encode (Gmail API requirement)
 */
function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Send email via Gmail API
 */
export const sendEmail = internalAction({
  args: {
    to: v.string(),
    subject: v.string(),
    html: v.string(),
    text: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    messageId: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    try {
      const senderEmail = process.env.GOOGLE_SENDER_EMAIL || "support@planeraai.app";
      
      // Get fresh access token
      const accessToken = await getAccessToken();

      // Create MIME message
      const mimeMessage = createMimeMessage({
        to: args.to,
        from: senderEmail,
        subject: args.subject,
        html: args.html,
        text: args.text,
      });

      // Base64url encode
      const encodedMessage = base64UrlEncode(mimeMessage);

      // Send via Gmail API
      const response = await fetch(GMAIL_SEND_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          raw: encodedMessage,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("Gmail API error:", error);
        return {
          success: false,
          error: `Gmail API error: ${response.status} - ${error}`,
        };
      }

      const result = await response.json();
      console.log(`✉️ Email sent successfully to ${args.to}, messageId: ${result.id}`);

      return {
        success: true,
        messageId: result.id,
      };
    } catch (error) {
      console.error("Send email error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error sending email",
      };
    }
  },
});

/**
 * Format date for display in email
 */
function formatEmailDate(dateString: string): string {
  if (!dateString) return "";
  const [year, month, day] = dateString.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(amount);
}

/**
 * Generate flight confirmation email HTML
 */
function generateFlightConfirmationEmail(booking: {
  bookingReference: string;
  passengerName: string;
  outboundFlight: {
    airline: string;
    flightNumber: string;
    departure: string;
    arrival: string;
    departureDate: string;
    departureAirport?: string;
    arrivalAirport?: string;
    origin: string;
    destination: string;
    duration?: string;
    cabinClass?: string;
  };
  returnFlight?: {
    airline: string;
    flightNumber: string;
    departure: string;
    arrival: string;
    departureDate: string;
    departureAirport?: string;
    arrivalAirport?: string;
    origin: string;
    destination: string;
    duration?: string;
    cabinClass?: string;
  };
  passengers: Array<{ givenName: string; familyName: string }>;
  totalAmount: number;
  currency: string;
  policies?: {
    canChange: boolean;
    canRefund: boolean;
    changePolicy: string;
    refundPolicy: string;
  };
  includedBaggage?: Array<{
    passengerName?: string;
    cabinBags?: number;
    checkedBags?: number;
  }>;
}): { html: string; text: string } {
  const airlineName = booking.outboundFlight.airline;
  const isRoundTrip = !!booking.returnFlight;

  // Build flight segments HTML
  const outboundSegmentHtml = `
    <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <span style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600;">Outbound Flight</span>
        <span style="font-size: 12px; color: #6b7280;">${formatEmailDate(booking.outboundFlight.departureDate)}</span>
      </div>
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div style="text-align: center;">
          <div style="font-size: 28px; font-weight: 700; color: #111827;">${booking.outboundFlight.origin}</div>
          <div style="font-size: 14px; color: #6b7280;">${booking.outboundFlight.departure}</div>
          ${booking.outboundFlight.departureAirport ? `<div style="font-size: 11px; color: #9ca3af;">${booking.outboundFlight.departureAirport}</div>` : ""}
        </div>
        <div style="flex: 1; text-align: center; padding: 0 20px;">
          <div style="font-size: 11px; color: #9ca3af; margin-bottom: 4px;">${booking.outboundFlight.duration || "Direct"}</div>
          <div style="height: 2px; background: linear-gradient(to right, #d1d5db 0%, #6b7280 50%, #d1d5db 100%); position: relative;">
            <span style="position: absolute; top: -8px; left: 50%; transform: translateX(-50%); font-size: 16px;">✈️</span>
          </div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 8px;">${airlineName} • ${booking.outboundFlight.flightNumber}</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 28px; font-weight: 700; color: #111827;">${booking.outboundFlight.destination}</div>
          <div style="font-size: 14px; color: #6b7280;">${booking.outboundFlight.arrival}</div>
          ${booking.outboundFlight.arrivalAirport ? `<div style="font-size: 11px; color: #9ca3af;">${booking.outboundFlight.arrivalAirport}</div>` : ""}
        </div>
      </div>
      ${booking.outboundFlight.cabinClass ? `<div style="margin-top: 12px; font-size: 12px; color: #6b7280;">Class: ${booking.outboundFlight.cabinClass}</div>` : ""}
    </div>
  `;

  const returnSegmentHtml = booking.returnFlight ? `
    <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <span style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600;">Return Flight</span>
        <span style="font-size: 12px; color: #6b7280;">${formatEmailDate(booking.returnFlight.departureDate)}</span>
      </div>
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div style="text-align: center;">
          <div style="font-size: 28px; font-weight: 700; color: #111827;">${booking.returnFlight.origin}</div>
          <div style="font-size: 14px; color: #6b7280;">${booking.returnFlight.departure}</div>
          ${booking.returnFlight.departureAirport ? `<div style="font-size: 11px; color: #9ca3af;">${booking.returnFlight.departureAirport}</div>` : ""}
        </div>
        <div style="flex: 1; text-align: center; padding: 0 20px;">
          <div style="font-size: 11px; color: #9ca3af; margin-bottom: 4px;">${booking.returnFlight.duration || "Direct"}</div>
          <div style="height: 2px; background: linear-gradient(to right, #d1d5db 0%, #6b7280 50%, #d1d5db 100%); position: relative;">
            <span style="position: absolute; top: -8px; left: 50%; transform: translateX(-50%); font-size: 16px;">✈️</span>
          </div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 8px;">${airlineName} • ${booking.returnFlight.flightNumber}</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 28px; font-weight: 700; color: #111827;">${booking.returnFlight.destination}</div>
          <div style="font-size: 14px; color: #6b7280;">${booking.returnFlight.arrival}</div>
          ${booking.returnFlight.arrivalAirport ? `<div style="font-size: 11px; color: #9ca3af;">${booking.returnFlight.arrivalAirport}</div>` : ""}
        </div>
      </div>
      ${booking.returnFlight.cabinClass ? `<div style="margin-top: 12px; font-size: 12px; color: #6b7280;">Class: ${booking.returnFlight.cabinClass}</div>` : ""}
    </div>
  ` : "";

  // Passengers HTML
  const passengersHtml = booking.passengers.map(p => 
    `<div style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
      <span style="font-weight: 500; color: #111827;">${p.givenName} ${p.familyName}</span>
    </div>`
  ).join("");

  // Baggage HTML
  const baggageHtml = booking.includedBaggage && booking.includedBaggage.length > 0 ? `
    <div style="margin-top: 24px;">
      <h3 style="font-size: 14px; font-weight: 600; color: #111827; margin-bottom: 12px;">Included Baggage</h3>
      ${booking.includedBaggage.map(bag => `
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          ${bag.passengerName ? `<span style="font-size: 13px; color: #6b7280;">${bag.passengerName}:</span>` : ""}
          ${bag.cabinBags && bag.cabinBags > 0 ? `<span style="background: #ecfdf5; color: #059669; padding: 4px 8px; border-radius: 6px; font-size: 12px;">${bag.cabinBags} cabin bag${bag.cabinBags > 1 ? "s" : ""}</span>` : ""}
          ${bag.checkedBags && bag.checkedBags > 0 ? `<span style="background: #ecfdf5; color: #059669; padding: 4px 8px; border-radius: 6px; font-size: 12px;">${bag.checkedBags} checked bag${bag.checkedBags > 1 ? "s" : ""}</span>` : ""}
        </div>
      `).join("")}
    </div>
  ` : "";

  // Policies HTML
  const policiesHtml = booking.policies ? `
    <div style="margin-top: 24px; padding: 16px; background: #fffbeb; border-radius: 12px; border: 1px solid #fbbf24;">
      <h3 style="font-size: 14px; font-weight: 600; color: #92400e; margin-bottom: 12px;">Change & Cancellation Policy</h3>
      <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px;">
        <span style="font-size: 16px;">${booking.policies.canChange ? "✅" : "❌"}</span>
        <span style="font-size: 13px; color: #78350f;">Changes: ${booking.policies.changePolicy}</span>
      </div>
      <div style="display: flex; gap: 8px; align-items: center;">
        <span style="font-size: 16px;">${booking.policies.canRefund ? "✅" : "❌"}</span>
        <span style="font-size: 13px; color: #78350f;">Refunds: ${booking.policies.refundPolicy}</span>
      </div>
    </div>
  ` : "";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Flight Booking Confirmation</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="font-size: 32px; margin-bottom: 8px;">✈️</div>
      <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #111827;">Booking Confirmed!</h1>
      <p style="margin: 8px 0 0; font-size: 14px; color: #6b7280;">Your flight has been successfully booked</p>
    </div>

    <!-- Main Card -->
    <div style="background: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
      
      <!-- Booking Reference -->
      <div style="text-align: center; padding: 24px; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); border-radius: 12px; margin-bottom: 24px;">
        <div style="font-size: 12px; color: #92400e; text-transform: uppercase; font-weight: 600; margin-bottom: 8px;">Airline Booking Reference (PNR)</div>
        <div style="font-size: 32px; font-weight: 800; color: #111827; letter-spacing: 4px;">${booking.bookingReference}</div>
        <div style="margin-top: 8px; font-size: 13px; color: #92400e;">
          ${airlineName}
        </div>
      </div>

      <!-- Important Check-in Notice -->
      <div style="background: #eff6ff; border: 1px solid #3b82f6; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
        <div style="display: flex; align-items: flex-start; gap: 12px;">
          <span style="font-size: 20px;">ℹ️</span>
          <div>
            <div style="font-weight: 600; color: #1e40af; margin-bottom: 4px;">Check-in Required</div>
            <div style="font-size: 13px; color: #1e3a8a; line-height: 1.5;">
              Check-in is completed on <strong>${airlineName}'s website or mobile app</strong> using your booking reference (PNR) <strong>${booking.bookingReference}</strong> and your last name.
            </div>
          </div>
        </div>
      </div>

      <!-- Flight Itinerary -->
      <h2 style="font-size: 16px; font-weight: 700; color: #111827; margin-bottom: 16px;">
        ${isRoundTrip ? "Round Trip" : "One Way"} Flight Itinerary
      </h2>
      
      ${outboundSegmentHtml}
      ${returnSegmentHtml}

      <!-- Passengers -->
      <div style="margin-top: 24px;">
        <h3 style="font-size: 14px; font-weight: 600; color: #111827; margin-bottom: 12px;">Passengers</h3>
        ${passengersHtml}
      </div>

      ${baggageHtml}
      ${policiesHtml}

      <!-- Total -->
      <div style="margin-top: 24px; padding-top: 24px; border-top: 2px solid #e5e7eb;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 16px; font-weight: 600; color: #111827;">Total Paid</span>
          <span style="font-size: 24px; font-weight: 700; color: #059669;">${formatCurrency(booking.totalAmount, booking.currency)}</span>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 32px; padding: 0 20px;">
      <p style="font-size: 13px; color: #6b7280; margin-bottom: 16px;">
        Questions about your booking? Contact us at <a href="mailto:support@planeraai.app" style="color: #f59e0b;">support@planeraai.app</a>
      </p>
      <p style="font-size: 12px; color: #9ca3af;">
        © ${new Date().getFullYear()} Planera. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `;

  // Plain text version
  const text = `
FLIGHT BOOKING CONFIRMED

Hi ${booking.passengerName},

Your flight has been successfully booked!

BOOKING REFERENCE (PNR): ${booking.bookingReference}
Airline: ${airlineName}

IMPORTANT: Check-in is completed on ${airlineName}'s website or mobile app using your booking reference (${booking.bookingReference}) and your last name.

FLIGHT ITINERARY
================

OUTBOUND FLIGHT - ${formatEmailDate(booking.outboundFlight.departureDate)}
${booking.outboundFlight.origin} → ${booking.outboundFlight.destination}
Departure: ${booking.outboundFlight.departure}
Arrival: ${booking.outboundFlight.arrival}
Flight: ${airlineName} ${booking.outboundFlight.flightNumber}

${booking.returnFlight ? `
RETURN FLIGHT - ${formatEmailDate(booking.returnFlight.departureDate)}
${booking.returnFlight.origin} → ${booking.returnFlight.destination}
Departure: ${booking.returnFlight.departure}
Arrival: ${booking.returnFlight.arrival}
Flight: ${airlineName} ${booking.returnFlight.flightNumber}
` : ""}

PASSENGERS
==========
${booking.passengers.map(p => `• ${p.givenName} ${p.familyName}`).join("\n")}

${booking.policies ? `
CHANGE & CANCELLATION POLICY
============================
Changes: ${booking.policies.changePolicy}
Refunds: ${booking.policies.refundPolicy}
` : ""}

TOTAL PAID: ${formatCurrency(booking.totalAmount, booking.currency)}

Questions? Contact support@planeraai.app

© ${new Date().getFullYear()} Planera
  `.trim();

  return { html, text };
}

/**
 * Send flight booking confirmation email
 * Includes idempotency check - won't send duplicate emails
 */
export const sendFlightConfirmationEmail = internalAction({
  args: {
    bookingId: v.id("flightBookings"),
  },
  returns: v.object({
    success: v.boolean(),
    alreadySent: v.optional(v.boolean()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    console.log(`📧 [EMAIL] Starting confirmation email for booking: ${args.bookingId}`);
    
    try {
      // Get the booking
      console.log(`📧 [EMAIL] Fetching booking data...`);
      const booking = await ctx.runQuery(getBookingForEmailRef, {
        bookingId: args.bookingId,
      });

      if (!booking) {
        console.error(`📧 [EMAIL] ❌ Booking not found: ${args.bookingId}`);
        return { success: false, error: "Booking not found" };
      }
      
      console.log(`📧 [EMAIL] Booking found - Reference: ${booking.bookingReference}, Passengers: ${booking.passengers?.length || 0}`);

      // Idempotency check - don't send if already sent
      if (booking.confirmationEmailSentAt) {
        console.log(`📧 [EMAIL] ⚠️ Email already sent at ${new Date(booking.confirmationEmailSentAt).toISOString()} - skipping`);
        return { success: true, alreadySent: true };
      }

      // Find the primary passenger email (first passenger with email)
      const primaryPassenger = booking.passengers.find((p: { email?: string }) => p.email);
      if (!primaryPassenger || !primaryPassenger.email) {
        console.error(`📧 [EMAIL] ❌ No passenger email found for booking ${args.bookingId}`);
        return { success: false, error: "No passenger email found" };
      }
      
      console.log(`📧 [EMAIL] Primary passenger: ${primaryPassenger.givenName} ${primaryPassenger.familyName} <${primaryPassenger.email}>`);

      // Generate email content
      console.log(`📧 [EMAIL] Generating email content...`);
      const { html, text } = generateFlightConfirmationEmail({
        bookingReference: booking.bookingReference || "PENDING",
        passengerName: `${primaryPassenger.givenName} ${primaryPassenger.familyName}`,
        outboundFlight: booking.outboundFlight,
        returnFlight: booking.returnFlight,
        passengers: booking.passengers,
        totalAmount: booking.totalAmount,
        currency: booking.currency,
        policies: booking.policies,
        includedBaggage: booking.includedBaggage?.map((b: { passengerName?: string; cabinBags?: bigint; checkedBags?: bigint }) => ({
          passengerName: b.passengerName,
          cabinBags: b.cabinBags !== undefined ? Number(b.cabinBags) : undefined,
          checkedBags: b.checkedBags !== undefined ? Number(b.checkedBags) : undefined,
        })),
      });

      const emailSubject = `Flight Confirmation - ${booking.outboundFlight.origin} to ${booking.outboundFlight.destination} | ${booking.bookingReference || "Planera"}`;
      console.log(`📧 [EMAIL] Sending email with subject: "${emailSubject}"`);
      
      // Send the email
      const result = await ctx.runAction(sendEmailRef, {
        to: primaryPassenger.email,
        subject: emailSubject,
        html,
        text,
      });

      console.log(`📧 [EMAIL] Send result:`, JSON.stringify(result));

      if (result.success) {
        // Mark email as sent (idempotency)
        await ctx.runMutation(markConfirmationEmailSentRef, {
          bookingId: args.bookingId,
        });
        console.log(`📧 [EMAIL] ✅ Confirmation email sent successfully to ${primaryPassenger.email}`);
      } else {
        console.error(`📧 [EMAIL] ❌ Failed to send email: ${result.error}`);
      }

      return result;
    } catch (error) {
      console.error("📧 [EMAIL] ❌ Exception in sendFlightConfirmationEmail:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});
