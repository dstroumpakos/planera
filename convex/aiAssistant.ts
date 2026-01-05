"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { authComponent } from "./auth";

export const askAssistant = action({
  args: {
    question: v.string(),
  },
  returns: v.object({
    answer: v.string(),
  }),
  handler: async (ctx, args) => {
    // Get authenticated user
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Authentication required");
    }

    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }

    // Call OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-5-turbo",
        messages: [
          {
            role: "system",
            content: `You are a helpful travel assistant. Answer questions about weather, visa requirements, cultural tips, and general travel information. Keep responses concise and helpful.`,
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
      answer,
    };
  },
});
