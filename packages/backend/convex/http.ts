import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { authComponent, createAuth } from "./auth";

const http = httpRouter();

// Register Better Auth routes (REQUIRED - do not remove)
authComponent.registerRoutes(http, createAuth, { cors: true });

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json",
};

// Helper: validate a session token via Better Auth and return the userId
async function validateSessionToken(
    ctx: any,
    sessionToken: string,
    requestUrl: string
): Promise<{ userId: string; userName?: string } | null> {
    try {
        const auth = createAuth(ctx);
        const siteUrl = process.env.CONVEX_SITE_URL || requestUrl.split("/api/")[0];
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
            console.log("[auth] Session validation failed, status:", sessionResponse.status);
            return null;
        }

        const sessionData = await sessionResponse.json();

        if (!sessionData?.user?.id) {
            console.log("[auth] No user in session data");
            return null;
        }

        return {
            userId: sessionData.user.id,
            userName: sessionData.user.name,
        };
    } catch (error) {
        console.error("[auth] Session validation error:", error);
        return null;
    }
}

// Helper: extract session token from request
function getSessionTokenFromRequest(request: Request): string | null {
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
        return authHeader.substring(7);
    }
    return null;
}

// POST /api/travelers/create - Create traveler with session-based auth
// This endpoint validates the session token server-side and calls the internal mutation.
// Used as a fallback when the Convex JWT isn't available (native auth race condition).
http.route({
    path: "/api/travelers/create",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        try {
            const sessionToken = getSessionTokenFromRequest(request);
            if (!sessionToken) {
                return new Response(
                    JSON.stringify({ error: "Missing session token" }),
                    { status: 401, headers: corsHeaders }
                );
            }

            const validatedUser = await validateSessionToken(ctx, sessionToken, request.url);
            if (!validatedUser) {
                return new Response(
                    JSON.stringify({ error: "Invalid or expired session" }),
                    { status: 401, headers: corsHeaders }
                );
            }

            const body = await request.json();

            console.log("[travelers/create] Creating traveler for user:", validatedUser.userId);

            const travelerId = await ctx.runMutation(internal.travelers.createForUser, {
                userId: validatedUser.userId,
                firstName: body.firstName || "",
                lastName: body.lastName || "",
                dateOfBirth: body.dateOfBirth || "",
                gender: body.gender || "male",
                passportNumber: body.passportNumber || "",
                passportIssuingCountry: body.passportIssuingCountry || "",
                passportExpiryDate: body.passportExpiryDate || "",
                email: body.email || undefined,
                phoneCountryCode: body.phoneCountryCode || undefined,
                phoneNumber: body.phoneNumber || undefined,
                isDefault: body.isDefault ?? false,
            });

            console.log("[travelers/create] Success, travelerId:", travelerId);

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

        if (!token) {
            return new Response(
                JSON.stringify({ error: "Missing token parameter" }),
                {
                    status: 400,
                    headers: corsHeaders,
                }
            );
        }

        const result = await ctx.runQuery(internal.bookingLinks.getBookingByToken, { token });

        if (!result.success) {
            return new Response(
                JSON.stringify({ error: result.error }),
                {
                    status: 404,
                    headers: corsHeaders,
                }
            );
        }

        return new Response(
            JSON.stringify(result.booking),
            {
                status: 200,
                headers: corsHeaders,
            }
        );
    }),
});

export default http;
