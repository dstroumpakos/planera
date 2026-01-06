import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const submitFeedback = mutation({
    args: {
        type: v.string(),
        title: v.string(),
        message: v.string(),
        email: v.optional(v.string()),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        await ctx.db.insert("feedback", {
            type: args.type,
            title: args.title,
            message: args.message,
            email: args.email,
            createdAt: Date.now(),
        });
    },
});
