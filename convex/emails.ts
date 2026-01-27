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
  // Use GMAIL-specific credentials (separate from Google Sign-In OAuth)
  // Falls back to GOOGLE_ prefixed vars for backward compatibility
  const clientId = process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN || process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Missing Gmail OAuth credentials. Required: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN " +
      "(or legacy: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN)"
    );
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

  // Helper for flight segment card
  const renderFlightSegment = (title: string, flight: typeof booking.outboundFlight) => `
    <div style="background-color: #1F2937; border-radius: 16px; padding: 24px; margin-bottom: 16px; border: 1px solid #374151;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #374151;">
        <span style="font-size: 12px; color: #9CA3AF; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">${title}</span>
        <span style="font-size: 13px; color: #D1D5DB; font-weight: 500;">${formatEmailDate(flight.departureDate)}</span>
      </div>
      
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
        <tr>
          <td width="35%" align="left" valign="top">
            <div style="font-size: 24px; font-weight: 700; color: #F9FAFB; margin-bottom: 4px;">${flight.departure}</div>
            <div style="font-size: 14px; color: #9CA3AF; font-weight: 500;">${flight.origin}</div>
            ${flight.departureAirport ? `<div style="font-size: 11px; color: #6B7280; margin-top: 2px;">${flight.departureAirport}</div>` : ""}
          </td>
          
          <td width="30%" align="center" valign="middle" style="padding: 0 10px;">
            <div style="font-size: 11px; color: #6B7280; margin-bottom: 6px; font-weight: 500;">${flight.duration || "Direct"}</div>
            <div style="position: relative; height: 1px; background-color: #4B5563; width: 100%;">
              <div style="position: absolute; top: -8px; left: 50%; transform: translateX(-50%); background-color: #1F2937; padding: 0 6px;">
                <span style="font-size: 14px; color: #9CA3AF;">✈️</span>
              </div>
            </div>
            <div style="font-size: 11px; color: #9CA3AF; margin-top: 8px;">${flight.airline}</div>
            <div style="font-size: 11px; color: #6B7280;">${flight.flightNumber}</div>
          </td>
          
          <td width="35%" align="right" valign="top">
            <div style="font-size: 24px; font-weight: 700; color: #F9FAFB; margin-bottom: 4px;">${flight.arrival}</div>
            <div style="font-size: 14px; color: #9CA3AF; font-weight: 500;">${flight.destination}</div>
            ${flight.arrivalAirport ? `<div style="font-size: 11px; color: #6B7280; margin-top: 2px;">${flight.arrivalAirport}</div>` : ""}
          </td>
        </tr>
      </table>
      
      ${flight.cabinClass ? `
        <div style="margin-top: 16px; padding-top: 12px; border-top: 1px dashed #374151; text-align: center;">
          <span style="font-size: 12px; color: #9CA3AF; background-color: #374151; padding: 4px 10px; border-radius: 12px;">${flight.cabinClass} Class</span>
        </div>
      ` : ""}
    </div>
  `;

  const outboundSegmentHtml = renderFlightSegment("Outbound Flight", booking.outboundFlight);
  const returnSegmentHtml = booking.returnFlight ? renderFlightSegment("Return Flight", booking.returnFlight) : "";

  // Passengers HTML
  const passengersHtml = booking.passengers.map(p => 
    `<div style="display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid #374151;">
      <span style="font-size: 16px; margin-right: 12px;">👤</span>
      <span style="font-size: 15px; font-weight: 500; color: #F9FAFB;">${p.givenName} ${p.familyName}</span>
    </div>`
  ).join("");

  // Baggage HTML
  const baggageHtml = booking.includedBaggage && booking.includedBaggage.length > 0 ? `
    <div style="margin-top: 32px;">
      <h3 style="font-size: 14px; font-weight: 600; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px;">Included Baggage</h3>
      <div style="background-color: #1F2937; border-radius: 12px; padding: 20px; border: 1px solid #374151;">
        ${booking.includedBaggage.map(bag => `
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px; last-child: margin-bottom: 0;">
            ${bag.passengerName ? `<span style="font-size: 13px; color: #D1D5DB; width: 120px;">${bag.passengerName}</span>` : ""}
            <div style="display: flex; gap: 8px;">
              ${bag.cabinBags && bag.cabinBags > 0 ? `<span style="background: rgba(16, 185, 129, 0.1); color: #34D399; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 500;">${bag.cabinBags} Cabin Bag${bag.cabinBags > 1 ? "s" : ""}</span>` : ""}
              ${bag.checkedBags && bag.checkedBags > 0 ? `<span style="background: rgba(16, 185, 129, 0.1); color: #34D399; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 500;">${bag.checkedBags} Checked Bag${bag.checkedBags > 1 ? "s" : ""}</span>` : ""}
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  ` : "";

  // Policies HTML
  const policiesHtml = booking.policies ? `
    <div style="margin-top: 24px; padding: 20px; background: rgba(245, 158, 11, 0.1); border-radius: 12px; border: 1px solid rgba(245, 158, 11, 0.2);">
      <h3 style="font-size: 14px; font-weight: 600; color: #FBBF24; margin-bottom: 12px; margin-top: 0;">Change & Cancellation Policy</h3>
      <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 8px;">
        <span style="font-size: 16px;">${booking.policies.canChange ? "✅" : "❌"}</span>
        <span style="font-size: 13px; color: #FDE68A;">Changes: ${booking.policies.changePolicy}</span>
      </div>
      <div style="display: flex; gap: 12px; align-items: center;">
        <span style="font-size: 16px;">${booking.policies.canRefund ? "✅" : "❌"}</span>
        <span style="font-size: 13px; color: #FDE68A;">Refunds: ${booking.policies.refundPolicy}</span>
      </div>
    </div>
  ` : "";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Flight Booking Confirmed</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #111827; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #F9FAFB;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #111827;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <div style="max-width: 600px; width: 100%; text-align: left;">
          
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 40px;">
            <div style="display: inline-block; background-color: rgba(16, 185, 129, 0.1); border-radius: 50%; padding: 20px; margin-bottom: 20px;">
              <span style="font-size: 32px; line-height: 1; display: block;">✈️</span>
            </div>
            <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: #F9FAFB; letter-spacing: -0.5px;">Booking Confirmed</h1>
            <p style="margin: 12px 0 0; font-size: 16px; color: #9CA3AF;">Your flight has been successfully booked</p>
          </div>

          <!-- PNR Card -->
          <div style="background-color: #1F2937; border-radius: 20px; padding: 32px; margin-bottom: 24px; text-align: center; border: 1px solid #374151; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);">
            <div style="font-size: 12px; color: #9CA3AF; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600; margin-bottom: 12px;">Airline Booking Reference</div>
            <div style="font-size: 42px; font-weight: 800; color: #F59E0B; letter-spacing: 6px; font-family: monospace; margin-bottom: 12px; line-height: 1;">${booking.bookingReference}</div>
            <div style="font-size: 15px; color: #D1D5DB; font-weight: 500;">${airlineName}</div>
          </div>

          <!-- Check-in Info -->
          <div style="background-color: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 16px; padding: 20px; margin-bottom: 40px;">
            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td width="32" valign="top" style="padding-right: 16px;">
                  <span style="font-size: 24px;">ℹ️</span>
                </td>
                <td>
                  <div style="font-size: 15px; font-weight: 600; color: #60A5FA; margin-bottom: 6px;">Check-in Required</div>
                  <div style="font-size: 14px; color: #BFDBFE; line-height: 1.6;">
                    Check-in is completed on the <strong>${airlineName}</strong> website or mobile app using your booking reference (PNR) and last name.
                  </div>
                </td>
              </tr>
            </table>
          </div>

          <!-- Itinerary -->
          <h2 style="font-size: 18px; font-weight: 700; color: #F9FAFB; margin-bottom: 20px; padding-left: 4px;">
            ${isRoundTrip ? "Round Trip" : "One Way"} Flight Itinerary
          </h2>
          
          ${outboundSegmentHtml}
          ${returnSegmentHtml}

          <!-- Passengers -->
          <div style="margin-top: 40px;">
            <h3 style="font-size: 14px; font-weight: 600; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px;">Passengers</h3>
            <div style="background-color: #1F2937; border-radius: 16px; padding: 8px 24px; border: 1px solid #374151;">
              ${passengersHtml}
            </div>
          </div>

          ${baggageHtml}
          ${policiesHtml}

          <!-- Total -->
          <div style="margin-top: 40px; padding-top: 32px; border-top: 1px solid #374151;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 16px; font-weight: 600; color: #D1D5DB;">Total Paid</span>
              <span style="font-size: 32px; font-weight: 800; color: #10B981;">${formatCurrency(booking.totalAmount, booking.currency)}</span>
            </div>
          </div>

          <!-- Actions -->
          <div style="margin-top: 40px; text-align: center;">
            <a href="https://planera.app" style="display: inline-block; background-color: #F59E0B; color: #111827; font-weight: 700; font-size: 16px; padding: 16px 32px; border-radius: 12px; text-decoration: none; margin-bottom: 16px;">View Booking in App</a>
            <div style="font-size: 14px; color: #6B7280;">
              <a href="#" style="color: #9CA3AF; text-decoration: none; margin: 0 10px;">Download PDF</a> • 
              <a href="#" style="color: #9CA3AF; text-decoration: none; margin: 0 10px;">Add to Calendar</a>
            </div>
          </div>

          <!-- Footer -->
          <div style="text-align: center; margin-top: 60px; padding-top: 32px; border-top: 1px solid #374151;">
            <p style="font-size: 14px; color: #6B7280; margin-bottom: 16px; line-height: 1.6;">
              Questions about your booking?<br>
              Contact us at <a href="mailto:support@planeraai.app" style="color: #F59E0B; text-decoration: none;">support@planeraai.app</a>
            </p>
            <p style="font-size: 12px; color: #4B5563;">
              © ${new Date().getFullYear()} Planera. All rights reserved.
            </p>
          </div>

        </div>
      </td>
    </tr>
  </table>
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
    messageId: v.optional(v.string()),
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
