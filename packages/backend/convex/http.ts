import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { authComponent, createAuth } from "./auth";

const http = httpRouter();

// Register Better Auth routes (REQUIRED - do not remove)
authComponent.registerRoutes(http, createAuth, { cors: true });

// Custom endpoint: Exchange Better Auth session token for a Convex JWT
// Native clients don't have cookies, so they need to explicitly exchange
// their session token for a JWT that Convex can validate.
http.route({
    path: "/api/auth/convex-token",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Content-Type": "application/json",
        };

        try {
            // Get session token from request body or Authorization header
            let sessionToken: string | null = null;

            const authHeader = request.headers.get("Authorization");
            if (authHeader?.startsWith("Bearer ")) {
                sessionToken = authHeader.substring(7);
            }

            if (!sessionToken) {
                try {
                    const body = await request.json();
                    sessionToken = body?.sessionToken;
                } catch {
                    // no body
                }
            }

            if (!sessionToken) {
                return new Response(
                    JSON.stringify({ error: "Missing session token" }),
                    { status: 401, headers: corsHeaders }
                );
            }

            // Use Better Auth to validate the session by calling get-session
            // with the session token as a cookie (which is how Better Auth expects it)
            const auth = createAuth(ctx);

            const siteUrl = process.env.CONVEX_SITE_URL || request.url.split("/api/")[0];
            const getSessionUrl = `${siteUrl}/api/auth/get-session`;

            const sessionRequest = new Request(getSessionUrl, {
                method: "GET",
                headers: {
                    "Cookie": `better-auth.session_token=${sessionToken}`,
                    "Authorization": `Bearer ${sessionToken}`,
                },
            });

            const sessionResponse = await auth.handler(sessionRequest);

            if (!sessionResponse.ok) {
                return new Response(
                    JSON.stringify({ error: "Invalid session" }),
                    { status: 401, headers: corsHeaders }
                );
            }

            const sessionData = await sessionResponse.json();

            if (!sessionData?.session || !sessionData?.user) {
                return new Response(
                    JSON.stringify({ error: "No valid session" }),
                    { status: 401, headers: corsHeaders }
                );
            }

            // Now try to get the Convex JWT via the cross-domain token endpoint
            // The crossDomain plugin should handle issuing a JWT
            const tokenUrl = `${siteUrl}/api/auth/cross-domain/token`;
            const tokenRequest = new Request(tokenUrl, {
                method: "GET",
                headers: {
                    "Cookie": `better-auth.session_token=${sessionToken}`,
                    "Authorization": `Bearer ${sessionToken}`,
                },
            });

            const tokenResponse = await auth.handler(tokenRequest);
            console.log("[convex-token] crossDomain /token response status:", tokenResponse.status);

            if (tokenResponse.ok) {
                const tokenText = await tokenResponse.text();
                console.log("[convex-token] crossDomain /token response:", tokenText.substring(0, 300));

                try {
                    const tokenData = JSON.parse(tokenText);
                    if (tokenData?.token) {
                        return new Response(
                            JSON.stringify({ token: tokenData.token }),
                            { status: 200, headers: corsHeaders }
                        );
                    }
                } catch {
                    // Maybe raw JWT
                    if (tokenText.includes(".") && tokenText.split(".").length === 3) {
                        return new Response(
                            JSON.stringify({ token: tokenText.trim() }),
                            { status: 200, headers: corsHeaders }
                        );
                    }
                }
            }

            // Try /api/auth/token as an alternative path
            const altTokenUrl = `${siteUrl}/api/auth/token`;
            const altTokenRequest = new Request(altTokenUrl, {
                method: "GET",
                headers: {
                    "Cookie": `better-auth.session_token=${sessionToken}`,
                    "Authorization": `Bearer ${sessionToken}`,
                },
            });

            const altTokenResponse = await auth.handler(altTokenRequest);
            console.log("[convex-token] /token response status:", altTokenResponse.status);

            if (altTokenResponse.ok) {
                const altText = await altTokenResponse.text();
                console.log("[convex-token] /token response:", altText.substring(0, 300));

                try {
                    const altData = JSON.parse(altText);
                    if (altData?.token) {
                        return new Response(
                            JSON.stringify({ token: altData.token }),
                            { status: 200, headers: corsHeaders }
                        );
                    }
                } catch {
                    if (altText.includes(".") && altText.split(".").length === 3) {
                        return new Response(
                            JSON.stringify({ token: altText.trim() }),
                            { status: 200, headers: corsHeaders }
                        );
                    }
                }
            }

            // If we can't get a JWT, return session info so client can at least know
            // the session is valid. The client can use this to show the user as logged in
            // even if mutations need a different approach.
            console.log("[convex-token] Could not get JWT, returning session info");
            return new Response(
                JSON.stringify({
                    error: "jwt_unavailable",
                    userId: sessionData.user.id,
                    sessionValid: true,
                }),
                { status: 200, headers: corsHeaders }
            );
        } catch (error) {
            console.error("[convex-token] Error:", error);
            return new Response(
                JSON.stringify({ error: "Internal server error" }),
                { status: 500, headers: corsHeaders }
            );
        }
    }),
});

http.route({
    path: "/api/auth/convex-token",
    method: "OPTIONS",
    handler: httpAction(async () => {
        return new Response(null, {
            status: 204,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
            },
        });
    }),
});

// POST /api/travelers/create - Create traveler with session-based auth
// This endpoint validates the session token server-side and calls the internal mutation
http.route({
    path: "/api/travelers/create",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Content-Type": "application/json",
        };

        try {
            // Get session token from Authorization header
            const authHeader = request.headers.get("Authorization");
            let sessionToken: string | null = null;
            if (authHeader?.startsWith("Bearer ")) {
                sessionToken = authHeader.substring(7);
            }

            if (!sessionToken) {
                return new Response(
                    JSON.stringify({ error: "Missing session token" }),
                    { status: 401, headers: corsHeaders }
                );
            }

            // Validate the session by calling Better Auth's get-session
            const auth = createAuth(ctx);
            const siteUrl = process.env.CONVEX_SITE_URL || request.url.split("/api/")[0];
            const getSessionUrl = `${siteUrl}/api/auth/get-session`;

            const sessionRequest = new Request(getSessionUrl, {
                method: "GET",
                headers: {
                    "Cookie": `better-auth.session_token=${sessionToken}`,
                    "Authorization": `Bearer ${sessionToken}`,
                },
            });

            const sessionResponse = await auth.handler(sessionRequest);

            if (!sessionResponse.ok) {
                return new Response(
                    JSON.stringify({ error: "Invalid session" }),
                    { status: 401, headers: corsHeaders }
                );
            }

            const sessionData = await sessionResponse.json();

            if (!sessionData?.user?.id) {
                return new Response(
                    JSON.stringify({ error: "No valid session" }),
                    { status: 401, headers: corsHeaders }
                );
            }

            const userId = sessionData.user.id;

            // Parse the traveler data from request body
            const body = await request.json();

            // Call the internal mutation with the verified userId
            const travelerId = await ctx.runMutation(internal.travelers.createForUser, {
                userId,
                firstName: body.firstName,
                lastName: body.lastName,
                dateOfBirth: body.dateOfBirth,
                gender: body.gender,
                passportNumber: body.passportNumber,
                passportIssuingCountry: body.passportIssuingCountry,
                passportExpiryDate: body.passportExpiryDate,
                email: body.email || undefined,
                phoneCountryCode: body.phoneCountryCode || undefined,
                phoneNumber: body.phoneNumber || undefined,
                isDefault: body.isDefault ?? false,
            });

            return new Response(
                JSON.stringify({ success: true, travelerId }),
                { status: 200, headers: corsHeaders }
            );
        } catch (error: any) {
            console.error("[travelers/create] Error:", error);
            return new Response(
                JSON.stringify({ error: error.message || "Internal server error" }),
                { status: 500, headers: corsHeaders }
            );
        }
    }),
});

http.route({
    path: "/api/travelers/create",
    method: "OPTIONS",
    handler: httpAction(async () => {
        return new Response(null, {
            status: 204,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
            },
        });
    }),
});

// CORS headers for booking endpoint
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
};

// OPTIONS /booking - CORS preflight
http.route({
    path: "/booking",
    method: "OPTIONS",
    handler: httpAction(async () => {
        return new Response(null, {
            status: 204,
            headers: corsHeaders,
        });
    }),
});

// GET /booking?token=... - Fetch booking details by token
http.route({
    path: "/booking",
    method: "GET",
    handler: httpAction(async (ctx, request) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("token");

        // Check if token is provided
        if (!token) {
            return new Response(
                JSON.stringify({ error: "Missing token parameter" }),
                {
                    status: 400,
                    headers: {
                        "Content-Type": "application/json",
                        ...corsHeaders,
                    },
                }
            );
        }

        // Call the internal query to get booking details
        const result = await ctx.runQuery(internal.bookingLinks.getBookingByToken, { token });

        if (!result.success) {
            return new Response(
                JSON.stringify({ error: result.error }),
                {
                    status: 404,
                    headers: {
                        "Content-Type": "application/json",
                        ...corsHeaders,
                    },
                }
            );
        }

        // Return the booking data
        return new Response(
            JSON.stringify(result.booking),
            {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                    ...corsHeaders,
                },
            }
        );
    }),
});

export default http;
