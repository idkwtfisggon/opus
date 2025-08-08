import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Keep existing tables for now
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    image: v.optional(v.string()),
    tokenIdentifier: v.string(),
    role: v.union(v.literal("customer"), v.literal("forwarder"), v.literal("admin")),
    createdAt: v.number(),
  }).index("by_token", ["tokenIdentifier"])
    .index("by_role", ["role"]),

  // Forwarder profile and warehouse management
  forwarders: defineTable({
    userId: v.string(), // Links to users table
    businessName: v.string(),
    contactEmail: v.string(),
    contactPhone: v.optional(v.string()),
    timezone: v.optional(v.string()), // User's timezone (e.g., "Asia/Singapore")
    
    // Parcel capacity limits
    maxParcelsPerMonth: v.optional(v.number()), // Monthly parcel limit
    maxParcelWeight: v.optional(v.number()), // Max weight per parcel (kg)
    
    // Package restrictions
    maxDimensions: v.optional(v.string()), // Max dimensions "L x W x H" in cm
    prohibitedItems: v.optional(v.array(v.string())), // List of prohibited item categories
    
    // Operating hours (if not set, assume fully operational 24/7)
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
      startDate: v.string(), // YYYY-MM-DD format
      endDate: v.optional(v.string()), // YYYY-MM-DD format (for multi-day periods)
      type: v.union(v.literal("closed"), v.literal("modified_hours")), // closed or modified hours
      modifiedHours: v.optional(v.object({
        open: v.string(), // HH:MM format
        close: v.string(), // HH:MM format
      })),
    })),
    
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  warehouses: defineTable({
    forwarderId: v.string(), // Links to forwarders table
    name: v.string(),
    address: v.string(),
    city: v.string(),
    state: v.string(),
    country: v.string(),
    postalCode: v.string(),
    // Capacity settings
    maxParcels: v.number(),
    maxWeightKg: v.number(),
    maxDimensionsCm: v.string(), // JSON string "L x W x H"
    currentCapacity: v.number(), // Current number of parcels
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_forwarder", ["forwarderId"])
    .index("by_active", ["isActive"]),

  // Orders (based on your Shibubu ParcelOrder)
  orders: defineTable({
    // Customer info
    customerId: v.string(),
    customerName: v.string(),
    customerEmail: v.string(),
    customerPhone: v.optional(v.string()),
    shippingAddress: v.string(),
    
    // Order details
    trackingNumber: v.string(),
    merchantName: v.string(), // The shop they ordered from
    merchantOrderId: v.optional(v.string()),
    
    // Package details
    declaredWeight: v.number(),
    declaredValue: v.number(),
    currency: v.string(),
    dimensions: v.optional(v.string()), // JSON string "L x W x H"
    packageDescription: v.optional(v.string()),
    specialInstructions: v.optional(v.string()), // fragile, perishable, etc.
    packagePhotos: v.optional(v.array(v.string())), // Array of image URLs
    
    // Warehouse assignment
    warehouseId: v.string(),
    forwarderId: v.string(),
    
    // Status tracking (includes old values for migration)
    status: v.union(
      v.literal("incoming"), // Just created, heading to warehouse
      v.literal("received"), // OLD: Arrived at warehouse (will migrate to arrived_at_warehouse)
      v.literal("arrived_at_warehouse"), // Arrived at warehouse/premises
      v.literal("packed"), // Ready for shipping
      v.literal("awaiting_pickup"), // Ready for courier collection
      v.literal("shipped"), // OLD: In transit (will migrate to in_transit)
      v.literal("in_transit"), // Courier collected, delivery in progress
      v.literal("delivered") // Arrived at destination
    ),
    
    // Shipping details
    courier: v.optional(v.string()), // DHL, UPS, FedEx, etc.
    courierTrackingNumber: v.optional(v.string()),
    shippingType: v.union(v.literal("immediate"), v.literal("consolidated")),
    
    // Operations
    labelPrinted: v.boolean(),
    notes: v.optional(v.string()),
    deliveryConfirmation: v.optional(v.string()), // Signature, photo, etc.
    proofOfDelivery: v.optional(v.string()), // Image URL
    
    // Timestamps
    createdAt: v.number(),
    receivedAt: v.optional(v.number()),
    packedAt: v.optional(v.number()),
    shippedAt: v.optional(v.number()),
    deliveredAt: v.optional(v.number()),
    updatedAt: v.number(),
  }).index("by_customer", ["customerId"])
    .index("by_forwarder", ["forwarderId"])
    .index("by_warehouse", ["warehouseId"])
    .index("by_status", ["status"])
    .index("by_tracking", ["trackingNumber"])
    .index("by_created", ["createdAt"]),

  // Order status history for audit trail
  orderHistory: defineTable({
    orderId: v.string(),
    previousStatus: v.optional(v.string()),
    newStatus: v.string(),
    updatedBy: v.string(), // User ID who made the change
    notes: v.optional(v.string()),
    timestamp: v.number(),
  }).index("by_order", ["orderId"]),

  // Forwarder shipping zones and rates
  shippingZones: defineTable({
    forwarderId: v.string(),
    zoneName: v.string(), // "Domestic", "Regional", "International", etc.
    countries: v.array(v.string()), // Array of country codes ["US", "CA", "MX"]
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_forwarder", ["forwarderId"])
    .index("by_active", ["forwarderId", "isActive"]),

  // Hierarchical shipping rates: Zone → Courier → Service → Weight Slabs
  shippingRates: defineTable({
    forwarderId: v.string(),
    zoneId: v.string(), // Links to shippingZones
    courier: v.string(), // "DHL", "UPS", "FedEx", etc.
    
    // Service types
    serviceType: v.union(
      v.literal("standard"), 
      v.literal("express"), 
      v.literal("overnight")
    ),
    
    // Weight-based pricing slabs (array of weight ranges)
    weightSlabs: v.array(v.object({
      minWeight: v.number(), // kg (e.g., 0)
      maxWeight: v.optional(v.number()), // kg (e.g., 1), null for unlimited
      ratePerKg: v.optional(v.number()), // Rate per kg for this range
      flatRate: v.optional(v.number()), // Flat rate (overrides per kg)
      label: v.string(), // Human readable: "0-1kg", "1-5kg", "5kg+"
    })),
    
    // Additional fees (applied to all weight slabs)
    handlingFee: v.number(),
    insuranceFee: v.optional(v.number()),
    fuelSurcharge: v.optional(v.number()),
    
    // Delivery timeframe
    estimatedDaysMin: v.number(),
    estimatedDaysMax: v.number(),
    
    // Service-specific settings
    requiresSignature: v.optional(v.boolean()),
    trackingIncluded: v.optional(v.boolean()),
    insuranceIncluded: v.optional(v.boolean()),
    
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_forwarder", ["forwarderId"])
    .index("by_zone", ["zoneId"])
    .index("by_courier", ["courier"])
    .index("by_service", ["serviceType"])
    .index("by_zone_courier", ["zoneId", "courier"])
    .index("by_zone_service", ["zoneId", "serviceType"])
    .index("by_active", ["forwarderId", "isActive"]),

  // Consolidated shipping settings
  consolidatedShippingSettings: defineTable({
    forwarderId: v.string(),
    
    // Enable/disable consolidated shipping
    isEnabled: v.boolean(),
    
    // Holding period settings
    holdingPeriodDays: v.number(), // Must be >= 7
    
    // Consolidated shipping rates (usually discounted)
    discountPercentage: v.optional(v.number()), // Discount from standard rates
    minimumPackages: v.optional(v.number()), // Min packages to consolidate
    maximumPackages: v.optional(v.number()), // Max packages per consolidated shipment
    
    // Consolidation schedule
    consolidationFrequency: v.optional(v.union(
      v.literal("weekly"),
      v.literal("biweekly"), 
      v.literal("monthly"),
      v.literal("custom")
    )),
    
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_forwarder", ["forwarderId"])
    .index("by_enabled", ["forwarderId", "isEnabled"]),

  // Keep existing tables (commented for now)
  subscriptions: defineTable({
    userId: v.optional(v.string()),
    polarId: v.optional(v.string()),
    polarPriceId: v.optional(v.string()),
    currency: v.optional(v.string()),
    interval: v.optional(v.string()),
    status: v.optional(v.string()),
    currentPeriodStart: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    amount: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
    canceledAt: v.optional(v.number()),
    customerCancellationReason: v.optional(v.string()),
    customerCancellationComment: v.optional(v.string()),
    metadata: v.optional(v.any()),
    customFieldData: v.optional(v.any()),
    customerId: v.optional(v.string()),
  })
    .index("userId", ["userId"])
    .index("polarId", ["polarId"]),
  webhookEvents: defineTable({
    type: v.string(),
    polarEventId: v.string(),
    createdAt: v.string(),
    modifiedAt: v.string(),
    data: v.any(),
  })
    .index("type", ["type"])
    .index("polarEventId", ["polarEventId"]),
});
