import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Create a new warehouse
export const createWarehouse = mutation({
  args: {
    forwarderId: v.string(),
    name: v.string(),
    address: v.string(),
    city: v.string(),
    state: v.string(),
    country: v.string(),
    postalCode: v.string(),
    maxParcels: v.number(),
    maxWeightKg: v.number(),
    maxDimensionsCm: v.string(),
    operatingHours: v.optional(v.object({
      monday: v.optional(v.object({ open: v.optional(v.string()), close: v.optional(v.string()), closed: v.optional(v.boolean()) })),
      tuesday: v.optional(v.object({ open: v.optional(v.string()), close: v.optional(v.string()), closed: v.optional(v.boolean()) })),
      wednesday: v.optional(v.object({ open: v.optional(v.string()), close: v.optional(v.string()), closed: v.optional(v.boolean()) })),
      thursday: v.optional(v.object({ open: v.optional(v.string()), close: v.optional(v.string()), closed: v.optional(v.boolean()) })),
      friday: v.optional(v.object({ open: v.optional(v.string()), close: v.optional(v.string()), closed: v.optional(v.boolean()) })),
      saturday: v.optional(v.object({ open: v.optional(v.string()), close: v.optional(v.string()), closed: v.optional(v.boolean()) })),
      sunday: v.optional(v.object({ open: v.optional(v.string()), close: v.optional(v.string()), closed: v.optional(v.boolean()) })),
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
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Set default operating hours to standard office hours if not provided
    const defaultOperatingHours = {
      monday: { open: "09:00", close: "17:00" },
      tuesday: { open: "09:00", close: "17:00" },
      wednesday: { open: "09:00", close: "17:00" },
      thursday: { open: "09:00", close: "17:00" },
      friday: { open: "09:00", close: "17:00" },
      saturday: { closed: true, open: "", close: "" },
      sunday: { closed: true, open: "", close: "" },
    };
    
    const warehouseId = await ctx.db.insert("warehouses", {
      ...args,
      operatingHours: args.operatingHours || defaultOperatingHours as any,
      currentCapacity: 0,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return warehouseId;
  },
});

// Get warehouses for a forwarder
export const getForwarderWarehouses = query({
  args: { forwarderId: v.string() },
  handler: async (ctx, { forwarderId }) => {
    const warehouses = await ctx.db
      .query("warehouses")
      .withIndex("by_forwarder", (q) => q.eq("forwarderId", forwarderId))
      .collect();

    return warehouses;
  },
});

// Update warehouse details
export const updateWarehouse = mutation({
  args: {
    warehouseId: v.string(),
    name: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    country: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    maxParcels: v.optional(v.number()),
    maxWeightKg: v.optional(v.number()),
    maxDimensionsCm: v.optional(v.string()),
    operatingHours: v.optional(v.object({
      monday: v.optional(v.object({ open: v.optional(v.string()), close: v.optional(v.string()), closed: v.optional(v.boolean()) })),
      tuesday: v.optional(v.object({ open: v.optional(v.string()), close: v.optional(v.string()), closed: v.optional(v.boolean()) })),
      wednesday: v.optional(v.object({ open: v.optional(v.string()), close: v.optional(v.string()), closed: v.optional(v.boolean()) })),
      thursday: v.optional(v.object({ open: v.optional(v.string()), close: v.optional(v.string()), closed: v.optional(v.boolean()) })),
      friday: v.optional(v.object({ open: v.optional(v.string()), close: v.optional(v.string()), closed: v.optional(v.boolean()) })),
      saturday: v.optional(v.object({ open: v.optional(v.string()), close: v.optional(v.string()), closed: v.optional(v.boolean()) })),
      sunday: v.optional(v.object({ open: v.optional(v.string()), close: v.optional(v.string()), closed: v.optional(v.boolean()) })),
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
  handler: async (ctx, args) => {
    const { warehouseId, ...updates } = args;
    
    // Filter out undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );
    
    // Add updatedAt timestamp
    cleanUpdates.updatedAt = Date.now();
    
    await ctx.db.patch(warehouseId as any, cleanUpdates);
    
    return warehouseId;
  },
});

// Update warehouse capacity
export const updateWarehouseCapacity = mutation({
  args: {
    warehouseId: v.id("warehouses"),
    newCapacity: v.number(),
  },
  handler: async (ctx, { warehouseId, newCapacity }) => {
    await ctx.db.patch(warehouseId, {
      currentCapacity: newCapacity,
      updatedAt: Date.now(),
    });
  },
});