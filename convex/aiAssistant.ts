"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

export const askAssistant = action({
  args: {
    question: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }

    try {
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
              content:
                "You are a helpful travel assistant. Provide concise, practical advice about travel destinations, weather, activities, and travel tips. Keep responses friendly and informative.",
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
      const assistantMessage = data.choices[0]?.message?.content || "I couldn't generate a response. Please try again.";

      return assistantMessage;
    } catch (error) {
      console.error("AI Assistant error:", error);
      throw new Error(`Failed to get AI response: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
});
