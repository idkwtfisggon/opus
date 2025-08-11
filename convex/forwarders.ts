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

// Get forwarder dashboard stats (delegated to orders.ts)
export const getForwarderStats = query({
  args: { forwarderId: v.string() },
  handler: async (ctx, { forwarderId }) => {
    // This will be replaced by orders.getForwarderStats in the dashboard
    const warehouses = await ctx.db
      .query("warehouses")
      .withIndex("by_forwarder", (q) => q.eq("forwarderId", forwarderId))
      .collect();

    const totalCapacity = warehouses.reduce((sum, w) => sum + w.maxParcels, 0);
    const currentCapacity = warehouses.reduce((sum, w) => sum + w.currentCapacity, 0);
    const capacityUsed = totalCapacity > 0 ? Math.round((currentCapacity / totalCapacity) * 100) : 0;

    return {
      totalOrders: 0,
      pendingOrders: 0,
      readyToShip: 0,
      capacityUsed,
      currentCapacity,
      totalCapacity
    };
  },
});

// Get recent orders for forwarder (delegated to orders.ts)
export const getRecentOrders = query({
  args: { forwarderId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { forwarderId, limit = 10 }) => {
    // This will be replaced by orders.getRecentOrders in the dashboard
    return [];
  },
});

// Create/update forwarder profile
export const upsertForwarder = mutation({
  args: {
    userId: v.string(),
    businessName: v.string(),
    contactEmail: v.string(),
    contactPhone: v.optional(v.string()),
    timezone: v.optional(v.string()),
    maxParcelsPerMonth: v.optional(v.number()),
    maxParcelWeight: v.optional(v.number()),
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

// Update parcel limits for existing forwarder
export const updateParcelLimits = mutation({
  args: {
    forwarderId: v.string(),
    maxParcelsPerMonth: v.number(),
    maxParcelWeight: v.number(),
  },
  handler: async (ctx, { forwarderId, maxParcelsPerMonth, maxParcelWeight }) => {
    const forwarder = await ctx.db.get(forwarderId as any);
    if (!forwarder) throw new Error("Forwarder not found");

    await ctx.db.patch(forwarderId as any, {
      maxParcelsPerMonth,
      maxParcelWeight,
      updatedAt: Date.now(),
    });

    return forwarderId;
  },
});

// Update operating hours for existing forwarder
export const updateOperatingHours = mutation({
  args: {
    forwarderId: v.string(),
    operatingHours: v.optional(v.object({
      monday: v.optional(v.object({ open: v.string(), close: v.string(), closed: v.optional(v.boolean()) })),
      tuesday: v.optional(v.object({ open: v.string(), close: v.string(), closed: v.optional(v.boolean()) })),
      wednesday: v.optional(v.object({ open: v.string(), close: v.string(), closed: v.optional(v.boolean()) })),
      thursday: v.optional(v.object({ open: v.string(), close: v.string(), closed: v.optional(v.boolean()) })),
      friday: v.optional(v.object({ open: v.string(), close: v.string(), closed: v.optional(v.boolean()) })),
      saturday: v.optional(v.object({ open: v.string(), close: v.string(), closed: v.optional(v.boolean()) })),
      sunday: v.optional(v.object({ open: v.string(), close: v.string(), closed: v.optional(v.boolean()) })),
    })),
    holidaySchedule: v.optional(v.array(v.object({
      name: v.string(),
      startDate: v.string(),
      endDate: v.optional(v.string()),
      type: v.union(v.literal("closed"), v.literal("modified_hours")),
      modifiedHours: v.optional(v.object({
        open: v.string(),
        close: v.string(),
      })),
    }))),
  },
  handler: async (ctx, { forwarderId, operatingHours, holidaySchedule }) => {
    const forwarder = await ctx.db.get(forwarderId as any);
    if (!forwarder) throw new Error("Forwarder not found");

    await ctx.db.patch(forwarderId as any, {
      operatingHours,
      holidaySchedule,
      updatedAt: Date.now(),
    });

    return forwarderId;
  },
});

// Update package restrictions for existing forwarder
export const updatePackageRestrictions = mutation({
  args: {
    forwarderId: v.string(),
    maxDimensions: v.optional(v.string()),
    prohibitedItems: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { forwarderId, maxDimensions, prohibitedItems }) => {
    const forwarder = await ctx.db.get(forwarderId as any);
    if (!forwarder) throw new Error("Forwarder not found");

    await ctx.db.patch(forwarderId as any, {
      maxDimensions,
      prohibitedItems,
      updatedAt: Date.now(),
    });

    return forwarderId;
  },
});

// Update timezone for forwarder
export const updateTimezone = mutation({
  args: {
    forwarderId: v.string(),
    timezone: v.string(),
  },
  handler: async (ctx, { forwarderId, timezone }) => {
    const forwarder = await ctx.db.get(forwarderId as any);
    if (!forwarder) throw new Error("Forwarder not found");

    await ctx.db.patch(forwarderId as any, {
      timezone,
      updatedAt: Date.now(),
    });

    return forwarderId;
  },
});