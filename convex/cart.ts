import { v } from "convex/values";
import { authQuery, authMutation } from "./functions";

// Get cart for a specific trip
export const getCart = authQuery({
    args: { tripId: v.id("trips") },
    returns: v.any(),
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
        let cart = await ctx.db
            .query("cart")
            .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
            .filter((q) => q.eq(q.field("userId"), ctx.user._id))
            .first();
        
        const now = Date.now();
        
        if (cart) {
            // Check if item already exists (by name and type and day)
            const existingIndex = cart.items.findIndex(
                (i: any) => i.name === args.item.name && i.type === args.item.type && i.day === args.item.day
            );
            
            let newItems;
            if (existingIndex >= 0) {
                // Update quantity
                newItems = [...cart.items];
                newItems[existingIndex] = {
                    ...newItems[existingIndex],
                    quantity: newItems[existingIndex].quantity + args.item.quantity,
                };
            } else {
                // Add new item
                newItems = [...cart.items, args.item];
            }
            
            const newTotal = newItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
            
            await ctx.db.patch(cart._id, {
                items: newItems,
                totalAmount: newTotal,
                updatedAt: now,
            });
            
            return cart._id;
        } else {
            // Create new cart
            const cartId = await ctx.db.insert("cart", {
                userId: ctx.user._id,
                tripId: args.tripId,
                items: [args.item],
                totalAmount: args.item.price * args.item.quantity,
                currency: args.item.currency,
                status: "pending",
                createdAt: now,
                updatedAt: now,
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
        itemType: v.string(),
        day: v.optional(v.number()),
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
            (i: any) => !(i.name === args.itemName && i.type === args.itemType && i.day === args.day)
        );
        
        const newTotal = newItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
        
        await ctx.db.patch(cart._id, {
            items: newItems,
            totalAmount: newTotal,
            updatedAt: Date.now(),
        });
        
        return null;
    },
});

// Update item quantity in cart
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
        
        const newItems = cart.items.map((item: any) => {
            if (item.name === args.itemName && item.type === args.itemType && item.day === args.day) {
                return { ...item, quantity: args.quantity };
            }
            return item;
        }).filter((item: any) => item.quantity > 0);
        
        const newTotal = newItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
        
        await ctx.db.patch(cart._id, {
            items: newItems,
            totalAmount: newTotal,
            updatedAt: Date.now(),
        });
        
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

// Proceed to checkout - this would integrate with payment providers
export const checkout = authMutation({
    args: { tripId: v.id("trips") },
    returns: v.object({
        success: v.boolean(),
        checkoutUrl: v.optional(v.string()),
        message: v.string(),
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
        
        // In a real implementation, this would:
        // 1. Create booking records with suppliers (Viator, Booking.com, etc.)
        // 2. Generate a payment link (Stripe, PayPal, etc.)
        // 3. Return the checkout URL
        
        // For now, we'll return a simulated checkout URL
        // In production, you would integrate with actual payment providers
        
        return {
            success: true,
            checkoutUrl: `https://checkout.voyagebuddy.com/cart/${cart._id}`,
            message: `Ready to checkout ${cart.items.length} items for €${cart.totalAmount.toFixed(2)}`,
        };
    },
});
