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
    
    // Account settings
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    country: v.optional(v.string()),
    timezone: v.optional(v.string()),
    language: v.optional(v.string()), // "en", "es", "fr", etc.
    avatar: v.optional(v.string()), // URL to profile picture
    bio: v.optional(v.string()),
    company: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    website: v.optional(v.string()),
    
    // Customer-specific shipping information
    shippingAddress: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    preferredCurrency: v.optional(v.string()),
    
    // Privacy settings
    profileVisibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
    allowMarketing: v.optional(v.boolean()),
    dataProcessingConsent: v.optional(v.boolean()),
    
    // Notification preferences
    notificationSettings: v.optional(v.object({
      emailNotifications: v.optional(v.boolean()),
      orderStatusUpdates: v.optional(v.boolean()),
      marketingEmails: v.optional(v.boolean()),
      securityAlerts: v.optional(v.boolean()),
    })),
    
    // Account status
    isVerified: v.optional(v.boolean()),
    twoFactorEnabled: v.optional(v.boolean()),
    lastLoginAt: v.optional(v.number()),
    
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  }).index("by_token", ["tokenIdentifier"])
    .index("by_role", ["role"])
    .index("by_email", ["email"]),

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
    }))),
    
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
    
    // Operating hours (if not set, inherit from forwarder or assume regular office hours)
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
    }))),
    
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
    warehouseId: v.optional(v.string()), // null = applies to all warehouses, specific ID = applies to that warehouse only
    
    // Courier and branding
    courier: v.string(), // "DHL", "UPS", "FedEx", "Local Courier", etc.
    courierLogo: v.optional(v.string()), // URL to courier logo
    
    // Service details
    serviceType: v.union(
      v.literal("economy"), 
      v.literal("standard"), 
      v.literal("express"), 
      v.literal("overnight")
    ),
    serviceName: v.optional(v.string()), // Custom name: "Economy Saver", "Express Plus", etc.
    serviceDescription: v.optional(v.string()), // "Best value for non-urgent items"
    
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
    
    // Capacity and availability
    maxPackagesPerShipment: v.optional(v.number()),
    currentCapacityUsed: v.optional(v.number()), // Percentage 0-100
    maxCapacity: v.optional(v.number()), // Total packages this service can handle
    
    // Service-specific settings
    requiresSignature: v.optional(v.boolean()),
    trackingIncluded: v.optional(v.boolean()),
    insuranceIncluded: v.optional(v.boolean()),
    
    // Customer visibility
    isActive: v.boolean(),
    isPublic: v.optional(v.boolean()), // Whether customers can see this option
    displayOrder: v.optional(v.number()), // Order to show in customer interface
    
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_forwarder", ["forwarderId"])
    .index("by_zone", ["zoneId"])
    .index("by_courier", ["courier"])
    .index("by_service", ["serviceType"])
    .index("by_zone_courier", ["zoneId", "courier"])
    .index("by_zone_service", ["zoneId", "serviceType"])
    .index("by_active", ["forwarderId", "isActive"])
    .index("by_public", ["isPublic"])
    .index("by_forwarder_public", ["forwarderId", "isPublic"])
    .index("by_warehouse", ["warehouseId"])
    .index("by_forwarder_warehouse", ["forwarderId", "warehouseId"]),

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

  // Customer address book for multiple shipping addresses
  customerAddresses: defineTable({
    customerId: v.string(), // Links to users table
    label: v.string(), // "Home", "Office", "Parents", etc.
    recipientName: v.string(),
    address: v.string(),
    city: v.string(),
    state: v.optional(v.string()),
    country: v.string(),
    postalCode: v.string(),
    phoneNumber: v.optional(v.string()),
    isDefault: v.boolean(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_customer", ["customerId"])
    .index("by_customer_default", ["customerId", "isDefault"])
    .index("by_customer_active", ["customerId", "isActive"]),

  // Customer favorite forwarders
  customerFavoriteForwarders: defineTable({
    customerId: v.string(),
    forwarderId: v.string(),
    notes: v.optional(v.string()), // Why they like this forwarder
    createdAt: v.number(),
  }).index("by_customer", ["customerId"])
    .index("by_forwarder", ["forwarderId"]),

  // Customer notifications and alerts
  customerNotifications: defineTable({
    customerId: v.string(),
    type: v.union(
      v.literal("order_status_update"),
      v.literal("delivery_scheduled"),
      v.literal("package_arrived"),
      v.literal("consolidation_ready"),
      v.literal("general_announcement")
    ),
    title: v.string(),
    message: v.string(),
    orderId: v.optional(v.string()), // If related to specific order
    isRead: v.boolean(),
    createdAt: v.number(),
    readAt: v.optional(v.number()),
  }).index("by_customer", ["customerId"])
    .index("by_customer_unread", ["customerId", "isRead"])
    .index("by_order", ["orderId"]),

  // Customer support tickets
  supportTickets: defineTable({
    customerId: v.string(),
    subject: v.string(),
    description: v.string(),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("urgent")),
    status: v.union(
      v.literal("open"),
      v.literal("in_progress"), 
      v.literal("waiting_customer"),
      v.literal("resolved"),
      v.literal("closed")
    ),
    category: v.union(
      v.literal("tracking"),
      v.literal("billing"),
      v.literal("damage_claim"),
      v.literal("general"),
      v.literal("technical")
    ),
    orderId: v.optional(v.string()), // If related to specific order
    assignedTo: v.optional(v.string()), // Support agent user ID
    resolution: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    resolvedAt: v.optional(v.number()),
  }).index("by_customer", ["customerId"])
    .index("by_status", ["status"])
    .index("by_priority", ["priority"])
    .index("by_assigned", ["assignedTo"])
    .index("by_order", ["orderId"]),

  // Customer package consolidation requests
  consolidationRequests: defineTable({
    customerId: v.string(),
    forwarderId: v.string(),
    orderIds: v.array(v.string()), // Array of order IDs to consolidate
    requestedShippingAddress: v.string(),
    specialInstructions: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("ready"),
      v.literal("shipped"),
      v.literal("cancelled")
    ),
    estimatedCost: v.optional(v.number()),
    finalCost: v.optional(v.number()),
    consolidatedOrderId: v.optional(v.string()), // Created consolidated order
    createdAt: v.number(),
    updatedAt: v.number(),
    processedAt: v.optional(v.number()),
  }).index("by_customer", ["customerId"])
    .index("by_forwarder", ["forwarderId"])
    .index("by_status", ["status"]),

  // Warehouse service areas - defines which geographic areas each warehouse can serve
  warehouseServiceAreas: defineTable({
    warehouseId: v.string(), // Links to warehouses table
    
    // Geographic coverage definition
    coverage: v.array(v.object({
      country: v.string(), // "France", "Spain", etc.
      countryCode: v.string(), // "FR", "ES", etc.
      states: v.optional(v.array(v.string())), // ["Provence-Alpes-Côte d'Azur", "Catalonia"]
      stateCodes: v.optional(v.array(v.string())), // ["PACA", "CAT"] for easier matching
      isFullCountry: v.boolean(), // true = serves entire country, false = specific states only
      priority: v.number(), // 1=primary service area, 2=secondary (affects sorting)
    })),
    
    // Service parameters for this coverage
    handlingTimeHours: v.number(), // How long to process packages from this area
    additionalFees: v.optional(v.number()), // Extra cost for this service area
    specialInstructions: v.optional(v.string()), // "Packages from rural areas may take longer"
    
    // Rate configuration
    useCustomRates: v.optional(v.boolean()), // false = use forwarder default rates, true = use warehouse-specific rates
    
    // Operational settings
    isActive: v.boolean(),
    maxPackagesPerDay: v.optional(v.number()), // Capacity limits for this area
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_warehouse", ["warehouseId"])
    .index("by_active", ["isActive"]),

  // Geographic reference data for consistent country/state naming
  geographicRegions: defineTable({
    country: v.string(), // "France"
    countryCode: v.string(), // "FR"
    states: v.array(v.object({
      name: v.string(), // "Provence-Alpes-Côte d'Azur"
      code: v.string(), // "PACA"
      majorCities: v.array(v.string()), // ["Marseille", "Nice", "Cannes"]
    })),
    isActive: v.boolean(), // Whether we support shipping to/from this country
    continent: v.string(), // "Europe", "Asia", etc.
    createdAt: v.number(),
  }).index("by_country_code", ["countryCode"])
    .index("by_continent", ["continent"])
    .index("by_active", ["isActive"]),

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
