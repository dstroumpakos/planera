"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const generate = internalAction({
  args: {
    tripId: v.id("trips"),
    prompt: v.string(),
    skipFlights: v.boolean(),
    preferredFlightTime: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      console.log("🚀 Starting trip generation for tripId:", args.tripId);

      // Call OpenAI to generate the itinerary
      const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are a travel planning expert. Generate a detailed travel itinerary in JSON format with the following structure:
{
  "itinerary": [
    {
      "day": 1,
      "title": "Day title",
      "activities": ["activity1", "activity2"],
      "meals": {
        "breakfast": "place",
        "lunch": "place",
        "dinner": "place"
      }
    }
  ],
  "hotels": [
    {
      "name": "Hotel name",
      "price": 150,
      "rating": 4.5,
      "description": "Description"
    }
  ],
  "flights": [
    {
      "airline": "Airline",
      "departure": "HH:MM",
      "arrival": "HH:MM",
      "price": 500,
      "duration": "5h 30m"
    }
  ],
  "restaurants": [
    {
      "name": "Restaurant",
      "cuisine": "Type",
      "rating": 4.5,
      "price": "€€€"
    }
  ],
  "activities": [
    {
      "name": "Activity",
      "price": 50,
      "duration": "2 hours",
      "description": "Description"
    }
  ]
}`,
            },
            {
              role: "user",
              content: args.prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 4000,
        }),
      });

      if (!openaiResponse.ok) {
        throw new Error(`OpenAI API error: ${openaiResponse.statusText}`);
      }

      const openaiData = await openaiResponse.json();
      const content = openaiData.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error("No response from OpenAI");
      }

      // Parse the JSON response
      let parsedContent;
      try {
        // Extract JSON from the response (it might be wrapped in markdown code blocks)
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        parsedContent = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
      } catch (e) {
        console.error("Failed to parse OpenAI response:", content);
        throw new Error("Failed to parse trip data from AI response");
      }

      // Update the trip with generated data
      await ctx.runMutation(internal.trips.updateItinerary, {
        tripId: args.tripId,
        itinerary: parsedContent.itinerary || [],
        status: "completed",
      });

      console.log("✅ Trip generation completed for tripId:", args.tripId);
    } catch (error) {
      console.error("❌ Error generating trip:", error);
      // Update trip status to failed
      await ctx.runMutation(internal.trips.updateItinerary, {
        tripId: args.tripId,
        itinerary: [],
        status: "failed",
      });
    }
  },
});
