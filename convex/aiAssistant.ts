"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

export const chat = action({
  args: {
    message: v.string(),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }

    const systemPrompt = `You are Planera AI Assistant, a helpful travel companion. You specialize in:
- Weather forecasts and current weather conditions
- Local travel insights and recommendations
- General travel information and tips
- Cultural information about destinations

IMPORTANT: You do NOT generate travel packages, itineraries, flights, or hotels. You only provide weather information and general travel insights.

When users ask about weather:
1. If they mention a specific location, provide weather information in a friendly way
2. Include temperature, conditions, humidity, wind, and UV index when relevant
3. Provide helpful local insights based on the weather

Keep responses concise and friendly. Use emojis occasionally to make it engaging.`;

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
    return data.choices[0]?.message?.content || "I couldn't generate a response. Please try again.";
  },
});

export const getWeather = action({
  args: {
    location: v.string(),
  },
  handler: async (ctx, args) => {
    // Using Open-Meteo free weather API (no key required)
    try {
      // First, geocode the location
      const geoResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(args.location)}&count=1&language=en&format=json`
      );

      if (!geoResponse.ok) {
        throw new Error("Could not find location");
      }

      const geoData = await geoResponse.json();
      if (!geoData.results || geoData.results.length === 0) {
        throw new Error("Location not found");
      }

      const { latitude, longitude, name, country } = geoData.results[0];

      // Get weather data
      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,uv_index&timezone=auto`
      );

      if (!weatherResponse.ok) {
        throw new Error("Could not fetch weather data");
      }

      const weatherData = await weatherResponse.json();
      const current = weatherData.current;

      // Map weather codes to descriptions
      const weatherDescriptions: Record<number, string> = {
        0: "Clear sky",
        1: "Mainly clear",
        2: "Partly cloudy",
        3: "Overcast",
        45: "Foggy",
        48: "Foggy",
        51: "Light drizzle",
        53: "Moderate drizzle",
        55: "Dense drizzle",
        61: "Slight rain",
        63: "Moderate rain",
        65: "Heavy rain",
        71: "Slight snow",
        73: "Moderate snow",
        75: "Heavy snow",
        80: "Slight rain showers",
        81: "Moderate rain showers",
        82: "Violent rain showers",
        85: "Slight snow showers",
        86: "Heavy snow showers",
        95: "Thunderstorm",
        96: "Thunderstorm with hail",
        99: "Thunderstorm with hail",
      };

      return {
        location: `${name}, ${country}`,
        temperature: Math.round(current.temperature_2m),
        condition: weatherDescriptions[current.weather_code] || "Unknown",
        humidity: current.relative_humidity_2m,
        wind: Math.round(current.wind_speed_10m),
        uvIndex: current.uv_index,
      };
    } catch (error) {
      throw new Error(`Weather API error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
});
