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

  // Render flight card
  const renderFlightCard = (label: string, flight: typeof booking.outboundFlight) => `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #1a1a1a; border-radius: 16px; margin-bottom: 12px; border: 1px solid #2a2a2a;">
      <tr>
        <td style="padding: 20px;">
          <!-- Flight Label & Date -->
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 16px;">
            <tr>
              <td>
                <span style="font-size: 11px; font-weight: 600; color: #666666; text-transform: uppercase; letter-spacing: 1px;">${label}</span>
              </td>
              <td align="right">
                <span style="font-size: 13px; color: #888888;">${formatEmailDate(flight.departureDate)}</span>
              </td>
            </tr>
          </table>
          
          <!-- Flight Times Row -->
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <!-- Departure -->
              <td width="35%" valign="top">
                <div style="font-size: 26px; font-weight: 700; color: #ffffff; line-height: 1.1;">${flight.departure}</div>
                <div style="font-size: 20px; font-weight: 600; color: #ffffff; margin-top: 4px;">${flight.origin}</div>
                ${flight.departureAirport ? `<div style="font-size: 12px; color: #666666; margin-top: 2px;">${flight.departureAirport}</div>` : ''}
              </td>
              
              <!-- Arrow/Plane -->
              <td width="30%" align="center" valign="middle" style="padding: 0 8px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%;">
                  <tr>
                    <td align="center">
                      <div style="width: 100%; height: 1px; background: linear-gradient(90deg, transparent 0%, #444444 20%, #444444 80%, transparent 100%); position: relative;">
                      </div>
                      <div style="margin-top: -6px;">
                        <span style="font-size: 12px; color: #666666;">→</span>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
              
              <!-- Arrival -->
              <td width="35%" align="right" valign="top">
                <div style="font-size: 26px; font-weight: 700; color: #ffffff; line-height: 1.1;">${flight.arrival}</div>
                <div style="font-size: 20px; font-weight: 600; color: #ffffff; margin-top: 4px;">${flight.destination}</div>
                ${flight.arrivalAirport ? `<div style="font-size: 12px; color: #666666; margin-top: 2px;">${flight.arrivalAirport}</div>` : ''}
              </td>
            </tr>
          </table>
          
          <!-- Flight Info Badges -->
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top: 16px;">
            <tr>
              <td>
                <span style="display: inline-block; background-color: #262626; color: #888888; font-size: 11px; font-weight: 500; padding: 6px 10px; border-radius: 6px; margin-right: 8px;">Direct</span>
                <span style="display: inline-block; background-color: #262626; color: #888888; font-size: 11px; font-weight: 500; padding: 6px 10px; border-radius: 6px; margin-right: 8px;">${flight.airline}</span>
                <span style="display: inline-block; background-color: #262626; color: #888888; font-size: 11px; font-weight: 500; padding: 6px 10px; border-radius: 6px;">${flight.flightNumber}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  const outboundHtml = renderFlightCard("Outbound", booking.outboundFlight);
  const returnHtml = booking.returnFlight ? renderFlightCard("Return", booking.returnFlight) : "";

  // Passengers HTML
  const passengersHtml = booking.passengers.map(p => 
    `<tr>
      <td style="padding: 14px 0; border-bottom: 1px solid #2a2a2a;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="padding-right: 12px;">
              <span style="font-size: 16px; color: #666666;">👤</span>
            </td>
            <td>
              <span style="font-size: 15px; font-weight: 500; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px;">${p.givenName} ${p.familyName}</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>`
  ).join("");

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Booking Confirmed</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  
  <!-- Wrapper -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0a0a0a;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        
        <!-- Container -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 480px;">
          
          <!-- 1. Header (Success State) -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <div style="width: 56px; height: 56px; background-color: rgba(34, 197, 94, 0.1); border-radius: 50%; display: inline-block; line-height: 56px; text-align: center;">
                      <span style="font-size: 24px; line-height: 56px;">✓</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px;">Booking Confirmed</h1>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 8px;">
                    <p style="margin: 0; font-size: 15px; color: #666666;">Your flight has been successfully booked</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- 2. Booking Reference Card -->
          <tr>
            <td style="padding-bottom: 16px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #1a1a1a; border-radius: 20px; border: 1px solid #2a2a2a;">
                <tr>
                  <td style="padding: 28px 24px;" align="center">
                    <div style="font-size: 11px; font-weight: 600; color: #666666; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px;">Airline Booking Reference</div>
                    <div style="font-size: 36px; font-weight: 700; color: #ffffff; letter-spacing: 6px; font-family: 'SF Mono', Monaco, 'Courier New', monospace; margin-bottom: 12px;">${booking.bookingReference}</div>
                    <div style="font-size: 14px; color: #888888; font-weight: 500;">${airlineName}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- 3. Check-in Info Callout -->
          <tr>
            <td style="padding-bottom: 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: rgba(59, 130, 246, 0.08); border-radius: 14px; border: 1px solid rgba(59, 130, 246, 0.15);">
                <tr>
                  <td style="padding: 18px 20px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td valign="top" style="padding-right: 14px; padding-top: 2px;">
                          <span style="font-size: 18px; color: #3b82f6;">ℹ️</span>
                        </td>
                        <td>
                          <div style="font-size: 14px; font-weight: 600; color: #60a5fa; margin-bottom: 6px;">Check-in Required</div>
                          <div style="font-size: 13px; color: #93c5fd; line-height: 1.5;">Check-in is completed on the <strong style="color: #bfdbfe;">${airlineName}</strong> website or mobile app using your booking reference (PNR) and last name.</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- 4. Flight Itinerary Section -->
          <tr>
            <td style="padding-bottom: 24px;">
              <div style="font-size: 13px; font-weight: 600; color: #888888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px; padding-left: 4px;">${isRoundTrip ? "Round Trip" : "One Way"} Flight Itinerary</div>
              ${outboundHtml}
              ${returnHtml}
            </td>
          </tr>
          
          <!-- 5. Passengers Card -->
          <tr>
            <td style="padding-bottom: 24px;">
              <div style="font-size: 13px; font-weight: 600; color: #888888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px; padding-left: 4px;">Passengers</div>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #1a1a1a; border-radius: 16px; border: 1px solid #2a2a2a;">
                <tr>
                  <td style="padding: 6px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      ${passengersHtml}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- 6. Payment Summary Card -->
          <tr>
            <td style="padding-bottom: 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #1a1a1a; border-radius: 16px; border: 1px solid #2a2a2a;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td>
                          <span style="font-size: 14px; color: #888888; font-weight: 500;">Total Paid</span>
                        </td>
                        <td align="right">
                          <span style="font-size: 24px; font-weight: 700; color: #22c55e;">${formatCurrency(booking.totalAmount, booking.currency)}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- 7. Actions Section -->
          <tr>
            <td align="center" style="padding-bottom: 16px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%;">
                <tr>
                  <td align="center">
                    <a href="https://planera.app" style="display: inline-block; background-color: #ffffff; color: #000000; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 12px; width: 100%; max-width: 280px; text-align: center; box-sizing: border-box;">View Booking in App</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 48px;">
              <span style="font-size: 13px; color: #666666;">
                <a href="#" style="color: #888888; text-decoration: none;">Download PDF</a>
                <span style="color: #444444; padding: 0 12px;">•</span>
                <a href="#" style="color: #888888; text-decoration: none;">Add to Calendar</a>
              </span>
            </td>
          </tr>
          
          <!-- 8. Footer -->
          <tr>
            <td style="border-top: 1px solid #1a1a1a; padding-top: 32px;" align="center">
              <p style="margin: 0 0 8px; font-size: 14px; color: #666666;">Questions about your booking?</p>
              <p style="margin: 0 0 24px;">
                <a href="mailto:support@planeraai.app" style="color: #888888; text-decoration: none; font-size: 14px;">support@planeraai.app</a>
              </p>
              <p style="margin: 0; font-size: 12px; color: #444444;">© ${new Date().getFullYear()} Planera. All rights reserved.</p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
  
</body>
</html>
  `;

  // Plain text version
  const text = `
BOOKING CONFIRMED

Your flight has been successfully booked.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

AIRLINE BOOKING REFERENCE
${booking.bookingReference}
${airlineName}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CHECK-IN REQUIRED
Check-in is completed on the ${airlineName} website or mobile app using your booking reference (PNR) and last name.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${isRoundTrip ? "ROUND TRIP" : "ONE WAY"} FLIGHT ITINERARY

OUTBOUND
${formatEmailDate(booking.outboundFlight.departureDate)}
${booking.outboundFlight.departure} ${booking.outboundFlight.origin}  →  ${booking.outboundFlight.arrival} ${booking.outboundFlight.destination}
${booking.outboundFlight.airline} ${booking.outboundFlight.flightNumber} • Direct

${booking.returnFlight ? `RETURN
${formatEmailDate(booking.returnFlight.departureDate)}
${booking.returnFlight.departure} ${booking.returnFlight.origin}  →  ${booking.returnFlight.arrival} ${booking.returnFlight.destination}
${booking.returnFlight.airline} ${booking.returnFlight.flightNumber} • Direct
` : ""}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PASSENGERS
${booking.passengers.map(p => `• ${p.givenName} ${p.familyName}`).join("\n")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TOTAL PAID: ${formatCurrency(booking.totalAmount, booking.currency)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Questions about your booking?
support@planeraai.app

© ${new Date().getFullYear()} Planera. All rights reserved.
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
