import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get forwarder profile by user ID
export const getForwarderByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const forwarder = await ctx.db
      .query("forwarders")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    
    return forwarder;
  },
});

// Get forwarder dashboard stats
export const getForwarderStats = query({
  args: { forwarderId: v.string() },
  handler: async (ctx, { forwarderId }) => {
    // Get all orders for this forwarder
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_forwarder", (q) => q.eq("forwarderId", forwarderId))
      .collect();

    // Calculate stats
    const pendingOrders = orders.filter(o => o.status === "incoming").length;
    const readyToShip = orders.filter(o => o.status === "packed").length;
    const inTransit = orders.filter(o => o.status === "shipped").length;
    const totalOrders = orders.length;

    // Get warehouse capacity
    const warehouses = await ctx.db
      .query("warehouses")
      .withIndex("by_forwarder", (q) => q.eq("forwarderId", forwarderId))
      .collect();

    const totalCapacity = warehouses.reduce((sum, w) => sum + w.maxParcels, 0);
    const currentCapacity = warehouses.reduce((sum, w) => sum + w.currentCapacity, 0);
    const capacityUsed = totalCapacity > 0 ? Math.round((currentCapacity / totalCapacity) * 100) : 0;

    return {
      totalOrders,
      pendingOrders,
      readyToShip,
      inTransit,
      capacityUsed,
      currentCapacity,
      totalCapacity
    };
  },
});

// Get recent orders for forwarder
export const getRecentOrders = query({
  args: { forwarderId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { forwarderId, limit = 10 }) => {
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_forwarder", (q) => q.eq("forwarderId", forwarderId))
      .order("desc")
      .take(limit);

    return orders;
  },
});

// Create/update forwarder profile
export const upsertForwarder = mutation({
  args: {
    userId: v.string(),
    businessName: v.string(),
    contactEmail: v.string(),
    contactPhone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("forwarders")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    const now = Date.now();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: now,
      });
      return existing._id;
    } else {
      // Create new
      const forwarderId = await ctx.db.insert("forwarders", {
        ...args,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      return forwarderId;
    }
  },
});