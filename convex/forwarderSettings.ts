import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get forwarder settings overview
export const getForwarderSettings = query({
  args: { forwarderId: v.string() },
  handler: async (ctx, args) => {
    const { forwarderId } = args;
    
    // Get shipping zones
    const zones = await ctx.db
      .query("shippingZones")
      .withIndex("by_forwarder", (q) => q.eq("forwarderId", forwarderId))
      .collect();
    
    // Get shipping rates
    const rates = await ctx.db
      .query("shippingRates")
      .withIndex("by_forwarder", (q) => q.eq("forwarderId", forwarderId))
      .collect();
    
    // Get consolidated shipping settings
    const consolidatedSettings = await ctx.db
      .query("consolidatedShippingSettings")
      .withIndex("by_forwarder", (q) => q.eq("forwarderId", forwarderId))
      .first();
    
    return {
      zones,
      rates,
      consolidatedSettings,
    };
  },
});

// Create or update shipping zone
export const upsertShippingZone = mutation({
  args: {
    forwarderId: v.string(),
    zoneId: v.optional(v.string()),
    zoneName: v.string(),
    countries: v.array(v.string()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { forwarderId, zoneId, zoneName, countries, isActive } = args;
    const now = Date.now();
    
    // Get all existing zones for this forwarder
    const existingZones = await ctx.db
      .query("shippingZones")
      .withIndex("by_forwarder", (q) => q.eq("forwarderId", forwarderId))
      .collect();
    
    // Check for duplicate zone names
    const duplicateName = existingZones.find(zone => 
      zone.zoneName.toLowerCase() === zoneName.toLowerCase() &&
      zone._id !== zoneId
    );
    
    if (duplicateName) {
      throw new Error(`A zone named "${zoneName}" already exists.`);
    }
    
    // Check for country conflicts
    const conflictingCountries: string[] = [];
    const conflictingZones: string[] = [];
    
    countries.forEach(country => {
      const existingZone = existingZones.find(zone => 
        zone.countries.includes(country) && 
        zone._id !== zoneId
      );
      
      if (existingZone) {
        if (!conflictingCountries.includes(country)) {
          conflictingCountries.push(country);
        }
        if (!conflictingZones.includes(existingZone.zoneName)) {
          conflictingZones.push(existingZone.zoneName);
        }
      }
    });
    
    if (conflictingCountries.length > 0) {
      throw new Error(
        `Country conflict detected! Countries ${conflictingCountries.join(', ')} are already assigned to zones: ${conflictingZones.join(', ')}`
      );
    }
    
    if (zoneId) {
      // Update existing zone
      await ctx.db.patch(zoneId as any, {
        zoneName,
        countries,
        isActive,
        updatedAt: now,
      });
      return zoneId;
    } else {
      // Create new zone
      const newZoneId = await ctx.db.insert("shippingZones", {
        forwarderId,
        zoneName,
        countries,
        isActive,
        createdAt: now,
        updatedAt: now,
      });
      return newZoneId;
    }
  },
});

// Create or update hierarchical shipping rate with weight slabs
export const upsertShippingRate = mutation({
  args: {
    forwarderId: v.string(),
    rateId: v.optional(v.string()),
    zoneId: v.string(),
    warehouseId: v.optional(v.string()), // null = all warehouses, specific ID = specific warehouse
    courier: v.string(),
    serviceType: v.union(v.literal("standard"), v.literal("express"), v.literal("overnight")),
    
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
      forwarderId, 
      rateId, 
      zoneId,
      warehouseId,
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
        createdAt: now,
        updatedAt: now,
      });
      return newRateId;
    }
  },
});

// Update consolidated shipping settings
export const updateConsolidatedShippingSettings = mutation({
  args: {
    forwarderId: v.string(),
    isEnabled: v.boolean(),
    holdingPeriodDays: v.number(),
    discountPercentage: v.optional(v.number()),
    minimumPackages: v.optional(v.number()),
    maximumPackages: v.optional(v.number()),
    consolidationFrequency: v.optional(v.union(
      v.literal("weekly"),
      v.literal("biweekly"),
      v.literal("monthly"),
      v.literal("custom")
    )),
  },
  handler: async (ctx, args) => {
    const { forwarderId, isEnabled, holdingPeriodDays, discountPercentage, minimumPackages, maximumPackages, consolidationFrequency } = args;
    const now = Date.now();
    
    // Validate holding period
    if (holdingPeriodDays < 7) {
      throw new Error("Holding period must be at least 7 days");
    }
    
    // Check if settings already exist
    const existingSettings = await ctx.db
      .query("consolidatedShippingSettings")
      .withIndex("by_forwarder", (q) => q.eq("forwarderId", forwarderId))
      .first();
    
    if (existingSettings) {
      // Update existing settings
      await ctx.db.patch(existingSettings._id, {
        isEnabled,
        holdingPeriodDays,
        discountPercentage,
        minimumPackages,
        maximumPackages,
        consolidationFrequency,
        updatedAt: now,
      });
      return existingSettings._id;
    } else {
      // Create new settings
      const newSettingsId = await ctx.db.insert("consolidatedShippingSettings", {
        forwarderId,
        isEnabled,
        holdingPeriodDays,
        discountPercentage,
        minimumPackages,
        maximumPackages,
        consolidationFrequency,
        createdAt: now,
        updatedAt: now,
      });
      return newSettingsId;
    }
  },
});

// Delete shipping zone
export const deleteShippingZone = mutation({
  args: { zoneId: v.string() },
  handler: async (ctx, args) => {
    const { zoneId } = args;
    
    // First, deactivate any rates using this zone
    const relatedRates = await ctx.db
      .query("shippingRates")
      .withIndex("by_zone", (q) => q.eq("zoneId", zoneId))
      .collect();
    
    for (const rate of relatedRates) {
      await ctx.db.patch(rate._id, { isActive: false, updatedAt: Date.now() });
    }
    
    // Delete the zone
    await ctx.db.delete(zoneId as any);
  },
});

// Delete shipping rate
export const deleteShippingRate = mutation({
  args: { rateId: v.string() },
  handler: async (ctx, args) => {
    const { rateId } = args;
    await ctx.db.delete(rateId as any);
  },
});

// Get rates organized hierarchically by zone
export const getRatesByZone = query({
  args: { zoneId: v.string() },
  handler: async (ctx, args) => {
    const { zoneId } = args;
    
    const rates = await ctx.db
      .query("shippingRates")
      .withIndex("by_zone", (q) => q.eq("zoneId", zoneId))
      .collect();
    
    // Organize rates hierarchically: Courier → Service → Rate data
    const hierarchicalRates: Record<string, Record<string, any>> = {};
    
    rates.forEach(rate => {
      if (!hierarchicalRates[rate.courier]) {
        hierarchicalRates[rate.courier] = {};
      }
      hierarchicalRates[rate.courier][rate.serviceType] = rate;
    });
    
    return {
      rates,
      hierarchical: hierarchicalRates
    };
  },
});

// Get all rates for a forwarder organized by zone → courier → service
export const getHierarchicalRates = query({
  args: { forwarderId: v.string() },
  handler: async (ctx, args) => {
    const { forwarderId } = args;
    
    const zones = await ctx.db
      .query("shippingZones")
      .withIndex("by_forwarder", (q) => q.eq("forwarderId", forwarderId))
      .collect();
    
    const rates = await ctx.db
      .query("shippingRates")
      .withIndex("by_forwarder", (q) => q.eq("forwarderId", forwarderId))
      .collect();
    
    // Organize: Zone → Courier → Service → Rate
    const organized: Record<string, Record<string, Record<string, any>>> = {};
    
    // Initialize zone structure
    zones.forEach(zone => {
      organized[zone._id] = {};
    });
    
    // Fill in rates
    rates.forEach(rate => {
      if (!organized[rate.zoneId]) {
        organized[rate.zoneId] = {};
      }
      if (!organized[rate.zoneId][rate.courier]) {
        organized[rate.zoneId][rate.courier] = {};
      }
      organized[rate.zoneId][rate.courier][rate.serviceType] = rate;
    });
    
    return {
      zones,
      rates,
      hierarchical: organized
    };
  },
});

// Calculate shipping cost using weight slabs
export const calculateShippingCost = query({
  args: {
    forwarderId: v.string(),
    destinationCountry: v.string(),
    courier: v.string(),
    serviceType: v.union(v.literal("standard"), v.literal("express"), v.literal("overnight")),
    weight: v.number(),
    isConsolidated: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { forwarderId, destinationCountry, courier, serviceType, weight, isConsolidated } = args;
    
    // Find the appropriate zone for destination country
    const zones = await ctx.db
      .query("shippingZones")
      .withIndex("by_forwarder", (q) => q.eq("forwarderId", forwarderId))
      .collect();
    
    const targetZone = zones.find(zone => 
      zone.isActive && zone.countries.includes(destinationCountry)
    );
    
    if (!targetZone) {
      throw new Error(`No shipping zone configured for ${destinationCountry}`);
    }
    
    // Find the rate for this zone, courier, and service type
    const rate = await ctx.db
      .query("shippingRates")
      .withIndex("by_zone", (q) => q.eq("zoneId", targetZone._id))
      .filter((q) => q.and(
        q.eq(q.field("courier"), courier),
        q.eq(q.field("serviceType"), serviceType),
        q.eq(q.field("isActive"), true)
      ))
      .first();
    
    if (!rate) {
      throw new Error(`No rate found for ${courier} ${serviceType} service to ${targetZone.zoneName}`);
    }
    
    // Find the appropriate weight slab
    const weightSlab = rate.weightSlabs.find(slab => {
      const isAboveMin = weight >= slab.minWeight;
      const isBelowMax = slab.maxWeight ? weight <= slab.maxWeight : true;
      return isAboveMin && isBelowMax;
    });
    
    if (!weightSlab) {
      throw new Error(`No weight slab configured for ${weight}kg`);
    }
    
    // Calculate base cost using weight slab
    let baseCost: number;
    if (weightSlab.flatRate) {
      // Use flat rate for this weight range
      baseCost = weightSlab.flatRate;
    } else if (weightSlab.ratePerKg) {
      // Use per-kg rate for this weight range
      baseCost = weight * weightSlab.ratePerKg;
    } else {
      throw new Error(`Invalid weight slab configuration for ${weightSlab.label}`);
    }
    
    // Add fees
    let totalCost = baseCost + rate.handlingFee;
    if (rate.insuranceFee) totalCost += rate.insuranceFee;
    if (rate.fuelSurcharge) totalCost += rate.fuelSurcharge;
    
    // Get consolidated settings for discount calculation
    const consolidatedSettings = await ctx.db
      .query("consolidatedShippingSettings")
      .withIndex("by_forwarder", (q) => q.eq("forwarderId", forwarderId))
      .first();

    // Apply consolidated shipping discount if applicable
    if (isConsolidated && consolidatedSettings?.isEnabled && consolidatedSettings.discountPercentage) {
      totalCost *= (1 - consolidatedSettings.discountPercentage / 100);
    }
    
    return {
      zone: targetZone.zoneName,
      baseCost,
      totalCost,
      weightSlab: weightSlab.label,
      estimatedDays: `${rate.estimatedDaysMin}-${rate.estimatedDaysMax}`,
      serviceFeatures: {
        requiresSignature: rate.requiresSignature || false,
        trackingIncluded: rate.trackingIncluded !== false, // Default true
        insuranceIncluded: rate.insuranceIncluded || false,
      },
      breakdown: {
        weightCharge: baseCost,
        handlingFee: rate.handlingFee,
        insuranceFee: rate.insuranceFee || 0,
        fuelSurcharge: rate.fuelSurcharge || 0,
        consolidatedDiscount: isConsolidated ? (consolidatedSettings?.discountPercentage || 0) : 0,
      }
    };
  },
});