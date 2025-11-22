import { v } from "convex/values";
import { authMutation, authQuery } from "./functions";

export const getPlan = authQuery({
    args: {},
    handler: async (ctx) => {
        const userPlan = await ctx.db
            .query("userPlans")
            .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
            .unique();

        if (!userPlan) {
            return { plan: "free", tripsGenerated: 0 };
        }

        return userPlan;
    },
});

export const upgradeToPremium = authMutation({
    args: {},
    handler: async (ctx) => {
        const userPlan = await ctx.db
            .query("userPlans")
            .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
            .unique();

        if (userPlan) {
            await ctx.db.patch(userPlan._id, { plan: "premium" });
        } else {
            await ctx.db.insert("userPlans", {
                userId: ctx.user._id,
                plan: "premium",
                tripsGenerated: 0,
            });
        }
    },
});
