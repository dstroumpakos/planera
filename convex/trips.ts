import { v } from "convex/values";
import { authMutation, authQuery } from "./functions";
import { internalAction, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import OpenAI from "openai";

export const create = authMutation({
    args: {
        destination: v.string(),
        origin: v.string(), // Added origin argument
        startDate: v.number(),
        endDate: v.number(),
        budget: v.string(),
        travelers: v.number(),
        interests: v.array(v.string()),
    },
    handler: async (ctx, args) => {
        // Check user plan and limits
        const userPlan = await ctx.db
            .query("userPlans")
            .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
            .unique();

        const currentPlan = userPlan?.plan ?? "free";
        const tripsGenerated = userPlan?.tripsGenerated ?? 0;

        if (currentPlan === "free" && tripsGenerated >= 3) {
            throw new Error("Free plan limit reached. Upgrade to Premium to generate more trips.");
        }

        // Increment trip count
        if (userPlan) {
            await ctx.db.patch(userPlan._id, { tripsGenerated: tripsGenerated + 1 });
        } else {
            await ctx.db.insert("userPlans", {
                userId: ctx.user._id,
                plan: "free",
                tripsGenerated: 1,
            });
        }

        const tripId = await ctx.db.insert("trips", {
            userId: ctx.user._id,
            destination: args.destination,
            origin: args.origin, // Store origin
            startDate: args.startDate,
            endDate: args.endDate,
            budget: args.budget,
            travelers: args.travelers,
            interests: args.interests,
            status: "generating",
        });

        const prompt = `Plan a trip to ${args.destination} from ${args.origin} for ${args.travelers} people.
        Budget: ${args.budget}.
        Dates: ${new Date(args.startDate).toDateString()} to ${new Date(args.endDate).toDateString()}.
        Interests: ${args.interests.join(", ")}.`;

        // Schedule the generation action
        await ctx.scheduler.runAfter(0, internal.trips.generate, { tripId, prompt });

        return tripId;
    },
});

export const generate = internalAction({
    args: { tripId: v.id("trips"), prompt: v.string() },
    handler: async (ctx, args) => {
        const { tripId, prompt } = args;

        try {
            const openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY,
            });

            const systemPrompt = `
        You are an expert travel agent. Generate a complete holiday package based on the user's request.
        Return ONLY a valid JSON object with the following structure, and NO other text:
        {
          "flights": {
            "outbound": { "airline": "string", "flightNumber": "string", "departure": "string (time)", "arrival": "string (time)", "duration": "string" },
            "return": { "airline": "string", "flightNumber": "string", "departure": "string (time)", "arrival": "string (time)", "duration": "string" },
            "pricePerPerson": number,
            "luggage": "string"
          },
          "hotels": [
            { "name": "string", "stars": number, "address": "string", "pricePerNight": number, "description": "string" }
          ],
          "dailyPlan": [
            {
              "day": number,
              "activities": [
                { "time": "string", "title": "string", "description": "string" }
              ]
            }
          ],
          "estimatedDailyExpenses": number
        }
        Make the data realistic.
        For "flights", provide a realistic round-trip option. "pricePerPerson" should be the cost for one adult. "luggage" should specify if it's included or the cost (e.g., "20kg bag included" or "+$50 for 23kg").
        For "hotels", provide exactly 3 different options ranging from budget-friendly to luxury (if the user's budget allows), or just 3 good options.
        For "dailyPlan", provide a detailed itinerary for the duration of the trip.
        For "estimatedDailyExpenses", provide a realistic estimate per person per day for food, transport, and activities (excluding hotel and flights).
      `;

            const completion = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: prompt },
                ],
                response_format: { type: "json_object" },
            });

            const content = completion.choices[0].message.content;
            if (!content) {
                throw new Error("No content returned from OpenAI");
            }

            const itinerary = JSON.parse(content);

            await ctx.runMutation(internal.trips.updateItinerary, {
                tripId,
                itinerary,
                status: "completed",
            });
        } catch (error) {
            console.error("Error generating itinerary:", error);
            await ctx.runMutation(internal.trips.updateItinerary, {
                tripId,
                itinerary: {},
                status: "failed",
            });
        }
    },
});

export const updateItinerary = internalMutation({
    args: {
        tripId: v.id("trips"),
        itinerary: v.any(),
        status: v.union(v.literal("generating"), v.literal("completed"), v.literal("failed")),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.tripId, {
            itinerary: args.itinerary,
            status: args.status,
        });
    },
});

export const list = authQuery({
    args: {},
    handler: async (ctx) => {
        return await ctx.db
            .query("trips")
            .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
            .order("desc")
            .collect();
    },
});

export const get = authQuery({
    args: { tripId: v.id("trips") },
    handler: async (ctx, args) => {
        const trip = await ctx.db.get(args.tripId);
        if (!trip) return null;

        const userPlan = await ctx.db
            .query("userPlans")
            .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
            .unique();

        return {
            ...trip,
            userPlan: userPlan?.plan ?? "free",
        };
    },
});

export const deleteTrip = authMutation({
    args: { tripId: v.id("trips") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.tripId);
    },
});
