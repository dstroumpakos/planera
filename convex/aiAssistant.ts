"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

export const chat = action({
  args: {
    message: v.string(),
    location: v.optional(v.string()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }

    const systemPrompt = args.location
      ? `You are a helpful travel assistant. The user is currently in or planning to visit ${args.location}. Provide helpful travel tips, weather information, and local recommendations.`
      : "You are a helpful travel assistant. Provide helpful travel tips, weather information, and local recommendations.";

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: args.message,
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
    return data.choices[0]?.message?.content || "No response generated";
  },
});

export const getWeather = action({
  args: {
    location: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a weather assistant. Provide current weather information and forecasts for the requested location. Be concise.",
          },
          {
            role: "user",
            content: `What is the current weather in ${args.location}?`,
          },
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || "Unknown error"}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "Unable to fetch weather information";
  },
});
