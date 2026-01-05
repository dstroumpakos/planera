"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { authComponent } from "./auth";
import { api } from "./_generated/api";

export const askAssistant = action({
  args: {
    question: v.string(),
  },
  returns: v.object({
    question: v.string(),
    answer: v.string(),
    timestamp: v.number(),
  }),
  handler: async (ctx, args) => {
    // Get authenticated user
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Authentication required");
    }

    // Check user subscription - only monthly or yearly subscribers can use AI assistant
    const userPlan: any = await ctx.runQuery(api.users.getPlan);
    
    if (!userPlan.isSubscriptionActive) {
      throw new Error("AI Assistant is only available for monthly or yearly subscribers. Please upgrade your plan.");
    }

    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }

    // Call OpenAI API with system prompt for weather/general info only
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
            content: `You are a helpful travel assistant for Planera. You can only answer questions about:
1. Weather and climate information for travel destinations
2. General travel information (visa requirements, best time to visit, cultural tips, etc.)
3. General knowledge questions related to travel

Do NOT answer questions about:
- Trip planning or itinerary creation (that's what the main app does)
- Booking flights, hotels, or activities
- Personal financial advice
- Medical or legal advice

Keep responses concise and helpful. If a question is outside your scope, politely redirect the user to the main trip planning features.`,
          },
          {
            role: "user",
            content: args.question,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || "Unknown error"}`);
    }

    const data = await response.json();
    const answer = data.choices[0]?.message?.content || "I couldn't generate a response. Please try again.";

    return {
      question: args.question,
      answer,
      timestamp: Date.now(),
    };
  },
});
