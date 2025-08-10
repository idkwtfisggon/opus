import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get forwarder's shipping zones and rates
export const getForwarderShippingOptions = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const forwarder = await ctx.db
      .query("forwarders")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .unique();

    if (!forwarder) return null;

    // Get shipping zones
    const zones = await ctx.db
      .query("shippingZones")
      .withIndex("by_forwarder", (q) => q.eq("forwarderId", forwarder._id))
      .collect();

    // Get shipping rates for each zone
    const zonesWithRates = await Promise.all(
      zones.map(async (zone) => {
        const rates = await ctx.db
          .query("shippingRates")
          .withIndex("by_zone", (q) => q.eq("zoneId", zone._id))
          .collect();

        return {
          ...zone,
          rates
        };
      })
    );

    return {
      forwarder,
      zones: zonesWithRates
    };
  },
});

// Create new shipping zone
export const createShippingZone = mutation({
  args: {
    zoneName: v.string(),
    countries: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const forwarder = await ctx.db
      .query("forwarders")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .unique();

    if (!forwarder) throw new Error("Forwarder not found");

    return await ctx.db.insert("shippingZones", {
      forwarderId: forwarder._id,
      ...args,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Create new shipping rate
export const createShippingRate = mutation({
  args: {
    zoneId: v.string(),
    courier: v.string(),
    courierLogo: v.optional(v.string()),
    serviceType: v.union(
      v.literal("economy"), 
      v.literal("standard"), 
      v.literal("express"), 
      v.literal("overnight")
    ),
    serviceName: v.string(),
    serviceDescription: v.optional(v.string()),
    weightSlabs: v.array(v.object({
      minWeight: v.number(),
      maxWeight: v.optional(v.number()),
      ratePerKg: v.optional(v.number()),
      flatRate: v.optional(v.number()),
      label: v.string(),
    })),
    handlingFee: v.number(),
    insuranceFee: v.optional(v.number()),
    fuelSurcharge: v.optional(v.number()),
    estimatedDaysMin: v.number(),
    estimatedDaysMax: v.number(),
    maxCapacity: v.number(),
    requiresSignature: v.optional(v.boolean()),
    trackingIncluded: v.optional(v.boolean()),
    insuranceIncluded: v.optional(v.boolean()),
    isPublic: v.boolean(),
    displayOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const forwarder = await ctx.db
      .query("forwarders")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .unique();

    if (!forwarder) throw new Error("Forwarder not found");

    // Verify zone belongs to this forwarder
    const zone = await ctx.db.get(args.zoneId);
    if (!zone || zone.forwarderId !== forwarder._id) {
      throw new Error("Zone not found or unauthorized");
    }

    return await ctx.db.insert("shippingRates", {
      forwarderId: forwarder._id,
      ...args,
      currentCapacityUsed: 0,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Update shipping rate
export const updateShippingRate = mutation({
  args: {
    rateId: v.string(),
    serviceName: v.optional(v.string()),
    serviceDescription: v.optional(v.string()),
    weightSlabs: v.optional(v.array(v.object({
      minWeight: v.number(),
      maxWeight: v.optional(v.number()),
      ratePerKg: v.optional(v.number()),
      flatRate: v.optional(v.number()),
      label: v.string(),
    }))),
    handlingFee: v.optional(v.number()),
    insuranceFee: v.optional(v.number()),
    fuelSurcharge: v.optional(v.number()),
    estimatedDaysMin: v.optional(v.number()),
    estimatedDaysMax: v.optional(v.number()),
    maxCapacity: v.optional(v.number()),
    isPublic: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
    displayOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const forwarder = await ctx.db
      .query("forwarders")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .unique();

    if (!forwarder) throw new Error("Forwarder not found");

    const rate = await ctx.db.get(args.rateId);
    if (!rate || rate.forwarderId !== forwarder._id) {
      throw new Error("Rate not found or unauthorized");
    }

    const { rateId, ...updateData } = args;
    await ctx.db.patch(args.rateId, {
      ...updateData,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.rateId);
  },
});

// Delete shipping rate
export const deleteShippingRate = mutation({
  args: { rateId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const forwarder = await ctx.db
      .query("forwarders")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .unique();

    if (!forwarder) throw new Error("Forwarder not found");

    const rate = await ctx.db.get(args.rateId);
    if (!rate || rate.forwarderId !== forwarder._id) {
      throw new Error("Rate not found or unauthorized");
    }

    await ctx.db.delete(args.rateId);
  },
});