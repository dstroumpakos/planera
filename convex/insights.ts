import { v } from "convex/values";
import { authMutation, authQuery } from "./functions";
import { paginationOptsValidator } from "convex/server";

// Traveler insights functions
export const list = authQuery({
    args: {
        destination: v.optional(v.string()),
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        if (args.destination) {
            return await ctx.db
                .query("insights")
                .withIndex("by_destination", (q) => q.eq("destination", args.destination!))
                .order("desc")
                .paginate(args.paginationOpts);
        } else {
            return await ctx.db
                .query("insights")
                .order("desc")
                .paginate(args.paginationOpts);
        }
    },
});

export const create = authMutation({
    args: {
        destination: v.string(),
        content: v.string(),
        category: v.union(
            v.literal("food"),
            v.literal("transport"),
            v.literal("neighborhoods"),
            v.literal("timing"),
            v.literal("hidden_gem"),
            v.literal("avoid"),
            v.literal("other")
        ),
        verified: v.boolean(),
    },
    handler: async (ctx, args) => {
        if (!ctx.user) {
            throw new Error("Unauthorized");
        }

        const insightId = await ctx.db.insert("insights", {
            userId: ctx.user._id,
            destination: args.destination,
            content: args.content,
            category: args.category,
            verified: args.verified,
            likes: 0,
            createdAt: Date.now(),
        });

        return insightId;
    },
});

export const like = authMutation({
    args: {
        insightId: v.id("insights"),
    },
    handler: async (ctx, args) => {
        const insight = await ctx.db.get(args.insightId);
        if (!insight) {
            throw new Error("Insight not found");
        }

        await ctx.db.patch(args.insightId, {
            likes: insight.likes + 1,
        });
    },
});
