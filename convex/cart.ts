import { v } from "convex/values";
import { authQuery, authMutation } from "./functions";
import { Id } from "./_generated/dataModel";

// Get cart for a specific trip
export const getCart = authQuery({
    args: { tripId: v.id("trips") },
    returns: v.union(
        v.object({
            _id: v.id("cart"),
            _creationTime: v.number(),
            userId: v.string(),
            tripId: v.id("trips"),
            items: v.array(v.object({
                type: v.string(),
                name: v.string(),
                price: v.number(),
                currency: v.string(),
                quantity: v.number(),
                day: v.optional(v.number()),
                bookingUrl: v.optional(v.string()),
                productCode: v.optional(v.string()),
                skipTheLine: v.optional(v.boolean()),
                image: v.optional(v.string()),
                details: v.optional(v.any()),
            })),
            totalAmount: v.number(),
            currency: v.string(),
            status: v.union(v.literal("pending"), v.literal("checkout"), v.literal("completed")),
            createdAt: v.number(),
            updatedAt: v.number(),
        }),
        v.null()
    ),
    handler: async (ctx, args) => {
        const cart = await ctx.db
            .query("cart")
            .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
            .filter((q) => q.eq(q.field("userId"), ctx.user._id))
            .first();
        return cart;
    },
});

// Add item to cart
export const addToCart = authMutation({
    args: {
        tripId: v.id("trips"),
        item: v.object({
            type: v.string(),
            name: v.string(),
            price: v.number(),
            currency: v.string(),
            quantity: v.number(),
            day: v.optional(v.number()),
            bookingUrl: v.optional(v.string()),
            productCode: v.optional(v.string()),
            skipTheLine: v.optional(v.boolean()),
            image: v.optional(v.string()),
            details: v.optional(v.any()),
        }),
    },
    returns: v.id("cart"),
    handler: async (ctx, args) => {
        // Check if cart exists for this trip
        const existingCart = await ctx.db
            .query("cart")
            .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
            .filter((q) => q.eq(q.field("userId"), ctx.user._id))
            .first();

        if (existingCart) {
            // Check if item already exists in cart (by name and day)
            const existingItemIndex = existingCart.items.findIndex(
                (i) => i.name === args.item.name && i.day === args.item.day && i.skipTheLine === args.item.skipTheLine
            );

            let newItems;
            if (existingItemIndex >= 0) {
                // Update quantity of existing item
                newItems = [...existingCart.items];
                newItems[existingItemIndex] = {
                    ...newItems[existingItemIndex],
                    quantity: newItems[existingItemIndex].quantity + args.item.quantity,
                };
            } else {
                // Add new item
                newItems = [...existingCart.items, args.item];
            }

            // Calculate new total
            const newTotal = newItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

            await ctx.db.patch(existingCart._id, {
                items: newItems,
                totalAmount: newTotal,
                updatedAt: Date.now(),
            });

            return existingCart._id;
        } else {
            // Create new cart
            const cartId = await ctx.db.insert("cart", {
                userId: ctx.user._id,
                tripId: args.tripId,
                items: [args.item],
                totalAmount: args.item.price * args.item.quantity,
                currency: args.item.currency,
                status: "pending",
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });

            return cartId;
        }
    },
});

// Remove item from cart
export const removeFromCart = authMutation({
    args: {
        tripId: v.id("trips"),
        itemName: v.string(),
        itemType: v.optional(v.string()),
        day: v.optional(v.number()),
        skipTheLine: v.optional(v.boolean()),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const cart = await ctx.db
            .query("cart")
            .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
            .filter((q) => q.eq(q.field("userId"), ctx.user._id))
            .first();

        if (!cart) return null;

        const newItems = cart.items.filter(
            (i) => !(i.name === args.itemName && i.day === args.day && i.skipTheLine === args.skipTheLine)
        );

        if (newItems.length === 0) {
            // Delete cart if empty
            await ctx.db.delete(cart._id);
        } else {
            const newTotal = newItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
            await ctx.db.patch(cart._id, {
                items: newItems,
                totalAmount: newTotal,
                updatedAt: Date.now(),
            });
        }

        return null;
    },
});

// Clear cart
export const clearCart = authMutation({
    args: { tripId: v.id("trips") },
    returns: v.null(),
    handler: async (ctx, args) => {
        const cart = await ctx.db
            .query("cart")
            .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
            .filter((q) => q.eq(q.field("userId"), ctx.user._id))
            .first();

        if (cart) {
            await ctx.db.delete(cart._id);
        }

        return null;
    },
});

// Get cart item count
export const getCartItemCount = authQuery({
    args: { tripId: v.id("trips") },
    returns: v.number(),
    handler: async (ctx, args) => {
        const cart = await ctx.db
            .query("cart")
            .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
            .filter((q) => q.eq(q.field("userId"), ctx.user._id))
            .first();

        if (!cart) return 0;
        return cart.items.reduce((sum, item) => sum + item.quantity, 0);
    },
});

// Update cart item quantity
export const updateCartItemQuantity = authMutation({
    args: {
        tripId: v.id("trips"),
        itemName: v.string(),
        itemType: v.string(),
        day: v.optional(v.number()),
        quantity: v.number(),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const cart = await ctx.db
            .query("cart")
            .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
            .filter((q) => q.eq(q.field("userId"), ctx.user._id))
            .first();

        if (!cart) return null;

        const newItems = cart.items.map((item) => {
            if (item.name === args.itemName && item.type === args.itemType && item.day === args.day) {
                return { ...item, quantity: args.quantity };
            }
            return item;
        }).filter((item) => item.quantity > 0);

        if (newItems.length === 0) {
            await ctx.db.delete(cart._id);
        } else {
            const newTotal = newItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
            await ctx.db.patch(cart._id, {
                items: newItems,
                totalAmount: newTotal,
                updatedAt: Date.now(),
            });
        }

        return null;
    },
});

// Checkout cart
export const checkout = authMutation({
    args: { tripId: v.id("trips") },
    returns: v.object({
        success: v.boolean(),
        message: v.string(),
        bookingIds: v.optional(v.array(v.string())),
    }),
    handler: async (ctx, args) => {
        const cart = await ctx.db
            .query("cart")
            .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
            .filter((q) => q.eq(q.field("userId"), ctx.user._id))
            .first();

        if (!cart || cart.items.length === 0) {
            return {
                success: false,
                message: "Your cart is empty",
            };
        }

        // Update cart status to checkout
        await ctx.db.patch(cart._id, {
            status: "checkout",
            updatedAt: Date.now(),
        });

        // In a real app, this would:
        // 1. Process payment
        // 2. Create bookings with suppliers via their APIs
        // 3. Send confirmation emails
        // For now, we'll just return success

        const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
        const total = cart.totalAmount;

        return {
            success: true,
            message: `Ready to book ${itemCount} item${itemCount > 1 ? 's' : ''} for €${total.toFixed(2)}`,
            bookingIds: cart.items.map((_, i) => `booking-${Date.now()}-${i}`),
        };
    },
});
