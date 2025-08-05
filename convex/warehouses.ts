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
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const warehouseId = await ctx.db.insert("warehouses", {
      ...args,
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