"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import OpenAI from "openai";
import { createStyleBasedPromptInstruction, generateStyleContext, TravelStyle, TRAVEL_STYLES } from "./travelStyles";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export const generate = internalAction({
    args: {
        tripId: v.id("trips"),
        prompt: v.string(),
        skipFlights: v.optional(v.boolean()),
        skipHotel: v.optional(v.boolean()),
        preferredFlightTime: v.optional(v.string()),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        try {
            console.log("🎯 Starting trip generation for tripId:", args.tripId);

            // Get trip details to access interests/travel styles
            const trip = await ctx.runQuery(internal.trips.getTripDetails, {
                tripId: args.tripId,
            });

            if (!trip) {
                throw new Error("Trip not found");
            }

            console.log("📍 Trip details:", {
                destination: trip.destination,
                interests: trip.interests,
                travelers: trip.travelers,
                budget: trip.budget,
            });

            // Convert interests to travel styles (they should match the TRAVEL_STYLES keys)
            const travelStyles = trip.interests.filter((interest) =>
                ["shopping", "nightlife", "culture", "nature", "food", "adventure", "relaxation"].includes(
                    interest.toLowerCase()
                )
            ) as TravelStyle[];

            console.log("🎨 Travel styles detected:", travelStyles);

            // Build enhanced prompt with travel style context
            let enhancedPrompt = args.prompt;

            if (travelStyles.length > 0) {
                const styleContext = generateStyleContext(travelStyles);
                const styleInstruction = createStyleBasedPromptInstruction(travelStyles);
                enhancedPrompt = `${args.prompt}${styleInstruction}\n\n${styleContext}`;
            }

            console.log("📝 Enhanced prompt length:", enhancedPrompt.length);

            // Call OpenAI to generate the itinerary
            const completion = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    {
                        role: "system",
                        content: `You are an expert travel planner. Create detailed, personalized itineraries that match the user's preferences and travel styles. 
                        
For each day, provide:
- Morning, afternoon, and evening activities
- Specific restaurant recommendations with cuisine type
- Transportation details
- Estimated costs
- Booking links where applicable

Format the response as a JSON object with this structure:
{
  "overview": "Brief overview of the trip",
  "flights": { "outbound": {...}, "return": {...} },
  "hotels": [{ "name": "...", "nights": [...], "price": "...", "bookingUrl": "..." }],
  "itinerary": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "activities": [
        { "time": "09:00", "title": "...", "description": "...", "type": "activity|restaurant|transport", "price": "...", "bookingUrl": "..." }
      ]
    }
  ],
  "styleBasedHighlights": [
    { "style": "shopping|nightlife|culture|nature|food|adventure|relaxation", "recommendations": ["...", "..."] }
  ],
  "totalEstimatedCost": "...",
  "tips": ["...", "..."]
}`,
                        },
                    {
                        role: "user",
                        content: enhancedPrompt,
                    },
                ],
                temperature: 0.7,
                max_tokens: 4000,
            });

            const responseText = completion.choices[0]?.message?.content;
            if (!responseText) {
                throw new Error("No response from OpenAI");
            }

            console.log("✅ OpenAI response received, length:", responseText.length);

            // Parse the JSON response
            let itinerary;
            try {
                // Extract JSON from the response (in case there's extra text)
                const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                if (!jsonMatch) {
                    throw new Error("No JSON found in response");
                }
                itinerary = JSON.parse(jsonMatch[0]);
            } catch (parseError) {
                console.error("❌ Failed to parse OpenAI response:", parseError);
                throw new Error(`Failed to parse trip itinerary: ${parseError}`);
            }

            console.log("📋 Itinerary parsed successfully");

            // Extract and enhance style-based highlights
            if (travelStyles.length > 0 && itinerary) {
                console.log("🎨 Processing style-based highlights...");
                
                // If OpenAI didn't include styleBasedHighlights, generate them from activities
                if (!itinerary.styleBasedHighlights || itinerary.styleBasedHighlights.length === 0) {
                    const allActivities = itinerary.itinerary?.flatMap((day: any) => day.activities || []) || [];
                    const styleHighlights: any[] = [];
                    
                    travelStyles.forEach((style) => {
                        const styleConfig = TRAVEL_STYLES[style];
                        if (!styleConfig) {
                            console.warn(`Unknown travel style: ${style}`);
                            return;
                        }
                        
                        const keywords = styleConfig.keywords.map((k: string) => k.toLowerCase());
                        
                        const matchingActivities = allActivities.filter((activity: any) => {
                            const combined = `${(activity.title || "").toLowerCase()} ${(activity.description || "").toLowerCase()}`;
                            return keywords.some((keyword: string) => combined.includes(keyword));
                        });
                        
                        if (matchingActivities.length > 0) {
                            styleHighlights.push({
                                style,
                                label: styleConfig.label,
                                recommendations: matchingActivities.slice(0, 3).map((a: any) => a.title),
                                count: matchingActivities.length,
                            });
                        }
                    });
                    
                    itinerary.styleBasedHighlights = styleHighlights;
                    console.log("✨ Generated style-based highlights:", styleHighlights.length);
                }
            }

            // Update the trip with the generated itinerary
            await ctx.runMutation(internal.trips.updateItinerary, {
                tripId: args.tripId,
                itinerary,
                status: "completed",
            });

            console.log("✨ Trip generation completed successfully");
        } catch (error) {
            console.error("❌ Trip generation failed:", error);

            // Update trip status to failed
            try {
                await ctx.runMutation(internal.trips.updateItinerary, {
                    tripId: args.tripId,
                    itinerary: null,
                    status: "failed",
                });
            } catch (updateError) {
                console.error("Failed to update trip status:", updateError);
            }

            throw error;
        }
    },
});
