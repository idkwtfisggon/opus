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
    
    // Status tracking
    status: v.union(
      v.literal("incoming"), // Just created, heading to warehouse
      v.literal("received"), // Arrived at warehouse
      v.literal("packed"), // Ready for shipping
      v.literal("shipped"), // Sent to customer
      v.literal("delivered") // Final delivery
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
