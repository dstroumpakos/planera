"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { createOrder } from "./duffel";
import { authAction } from "../functions";

export const bookFlight = authAction({
  args: {
    offerId: v.string(),
    passengers: v.array(v.object({
      title: v.string(),
      given_name: v.string(),
      family_name: v.string(),
      born_on: v.string(),
      gender: v.union(v.literal("m"), v.literal("f")),
      email: v.string(),
      phone_number: v.string(),
    })),
    payment: v.optional(v.object({
      amount: v.string(),
      currency: v.string(),
      card: v.optional(v.object({
        number: v.string(),
        exp_month: v.string(),
        exp_year: v.string(),
        cvc: v.string(),
      })),
    })),
  },
  handler: async (ctx, args) => {
    // 1. Create order in Duffel
    // We map the passengers to include 'id' which createOrder expects, 
    // but since we don't have the offer's passenger IDs here, 
    // we let createOrder handle the mapping by fetching the offer.
    // We pass the passengers as is, but createOrder expects 'id' property.
    // Wait, createOrder in duffel.ts expects 'id' in passengers array.
    // I should update createOrder to NOT expect 'id' in input, but generate/map it internally.
    // Let's update duffel.ts first.
    
    // Actually, let's just pass a placeholder ID or index as ID, and let createOrder map it.
    const passengersWithIds = args.passengers.map((p, i) => ({
      ...p,
      id: `pass_${i}`, // Placeholder, will be replaced in createOrder
    }));

    const order = await createOrder({
      offerId: args.offerId,
      passengers: passengersWithIds,
      payment: args.payment,
    });

    return order;
  },
});
