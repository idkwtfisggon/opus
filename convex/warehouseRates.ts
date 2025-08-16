import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get warehouse-specific shipping rates
export const getWarehouseRates = query({
  args: { warehouseId: v.string() },
  handler: async (ctx, { warehouseId }) => {
    const rates = await ctx.db
      .query("shippingRates")
      .withIndex("by_warehouse", (q) => q.eq("warehouseId", warehouseId))
      .collect();

    return rates;
  },
});

// Get forwarder's default rates (for comparison/copying)
export const getForwarderDefaultRates = query({
  args: { forwarderId: v.string() },
  handler: async (ctx, { forwarderId }) => {
    // Get zones first
    const zones = await ctx.db
      .query("shippingZones")
      .withIndex("by_forwarder", (q) => q.eq("forwarderId", forwarderId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Get rates
    const rates = await ctx.db
      .query("shippingRates")
      .withIndex("by_forwarder", (q) => q.eq("forwarderId", forwarderId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return { zones, rates };
  },
});

// Copy forwarder default rates to warehouse (with option to modify)
export const copyDefaultRatesToWarehouse = mutation({
  args: {
    warehouseId: v.string(),
    forwarderId: v.string(),
    rateIds: v.array(v.string()), // Which specific rates to copy
  },
  handler: async (ctx, { warehouseId, forwarderId, rateIds }) => {
    const now = Date.now();
    
    // Get the specified rates
    const ratesToCopy = await Promise.all(
      rateIds.map(rateId => ctx.db.get(rateId as any))
    );

    const copiedRateIds = [];
    
    for (const rate of ratesToCopy) {
      if (!rate) continue;
      
      const newRateId = await ctx.db.insert("shippingRates", {
        forwarderId,
        zoneId: (rate as any).zoneId,
        warehouseId, // This makes it warehouse-specific
        courier: (rate as any).courier,
        courierLogo: (rate as any).courierLogo,
        serviceType: (rate as any).serviceType,
        serviceName: (rate as any).serviceName,
        serviceDescription: (rate as any).serviceDescription,
        weightSlabs: (rate as any).weightSlabs,
        handlingFee: (rate as any).handlingFee,
        insuranceFee: (rate as any).insuranceFee,
        fuelSurcharge: (rate as any).fuelSurcharge,
        estimatedDaysMin: (rate as any).estimatedDaysMin,
        estimatedDaysMax: (rate as any).estimatedDaysMax,
        maxPackagesPerShipment: (rate as any).maxPackagesPerShipment,
        currentCapacityUsed: (rate as any).currentCapacityUsed,
        maxCapacity: (rate as any).maxCapacity,
        requiresSignature: (rate as any).requiresSignature,
        trackingIncluded: (rate as any).trackingIncluded,
        insuranceIncluded: (rate as any).insuranceIncluded,
        isActive: true,
        isPublic: (rate as any).isPublic,
        displayOrder: (rate as any).displayOrder,
        createdAt: now,
        updatedAt: now,
      });
      
      copiedRateIds.push(newRateId);
    }
    
    return copiedRateIds;
  },
});

// Create or update warehouse-specific rate
export const upsertWarehouseRate = mutation({
  args: {
    rateId: v.optional(v.string()),
    warehouseId: v.string(),
    forwarderId: v.string(),
    zoneId: v.string(),
    courier: v.string(),
    serviceType: v.union(v.literal("economy"), v.literal("standard"), v.literal("express"), v.literal("overnight")),
    
    // Weight slabs array
    weightSlabs: v.array(v.object({
      minWeight: v.number(),
      maxWeight: v.optional(v.number()),
      ratePerKg: v.optional(v.number()),
      flatRate: v.optional(v.number()),
      label: v.string(),
    })),
    
    // Additional fees
    handlingFee: v.number(),
    insuranceFee: v.optional(v.number()),
    fuelSurcharge: v.optional(v.number()),
    
    // Service details
    estimatedDaysMin: v.number(),
    estimatedDaysMax: v.number(),
    requiresSignature: v.optional(v.boolean()),
    trackingIncluded: v.optional(v.boolean()),
    insuranceIncluded: v.optional(v.boolean()),
    
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { 
      rateId,
      warehouseId,
      forwarderId, 
      zoneId, 
      courier, 
      serviceType, 
      weightSlabs,
      handlingFee, 
      insuranceFee, 
      fuelSurcharge, 
      estimatedDaysMin, 
      estimatedDaysMax,
      requiresSignature,
      trackingIncluded,
      insuranceIncluded,
      isActive 
    } = args;
    const now = Date.now();
    
    // Validate weight slabs
    if (weightSlabs.length === 0) {
      throw new Error("At least one weight slab is required");
    }
    
    // Ensure weight slabs are ordered correctly
    const sortedSlabs = [...weightSlabs].sort((a, b) => a.minWeight - b.minWeight);
    
    if (rateId) {
      // Update existing rate
      await ctx.db.patch(rateId as any, {
        forwarderId,
        zoneId,
        warehouseId,
        courier,
        serviceType,
        weightSlabs: sortedSlabs,
        handlingFee,
        insuranceFee,
        fuelSurcharge,
        estimatedDaysMin,
        estimatedDaysMax,
        requiresSignature,
        trackingIncluded,
        insuranceIncluded,
        isActive,
        updatedAt: now,
      });
      return rateId;
    } else {
      // Create new rate
      const newRateId = await ctx.db.insert("shippingRates", {
        forwarderId,
        zoneId,
        warehouseId, // This makes it warehouse-specific
        courier,
        serviceType,
        weightSlabs: sortedSlabs,
        handlingFee,
        insuranceFee,
        fuelSurcharge,
        estimatedDaysMin,
        estimatedDaysMax,
        requiresSignature,
        trackingIncluded,
        insuranceIncluded,
        isActive,
        createdAt: now,
        updatedAt: now,
      });
      return newRateId;
    }
  },
});

// Delete warehouse-specific rate
export const deleteWarehouseRate = mutation({
  args: { rateId: v.string() },
  handler: async (ctx, { rateId }) => {
    await ctx.db.delete(rateId as any);
  },
});

// Toggle between using default rates vs custom rates for a warehouse
export const toggleWarehouseRateMode = mutation({
  args: { 
    warehouseId: v.string(),
    useCustomRates: v.boolean()
  },
  handler: async (ctx, { warehouseId, useCustomRates }) => {
    // Update the service area configuration
    const serviceArea = await ctx.db
      .query("warehouseServiceAreas")
      .withIndex("by_warehouse", (q) => q.eq("warehouseId", warehouseId))
      .first();
    
    if (serviceArea) {
      await ctx.db.patch(serviceArea._id, {
        useCustomRates,
        updatedAt: Date.now(),
      });
    }
    
    return useCustomRates;
  },
});