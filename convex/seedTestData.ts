import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Seed test data for shipping options (run this once to set up test data)
export const seedForwarderShippingData = mutation({
  args: { 
    forwarderUserId: v.string() // The user ID of the forwarder account
  },
  handler: async (ctx, args) => {
    // Get or create forwarder profile
    const existingForwarder = await ctx.db
      .query("forwarders")
      .withIndex("by_user", (q) => q.eq("userId", args.forwarderUserId))
      .unique();

    let forwarderId;
    if (existingForwarder) {
      forwarderId = existingForwarder._id;
    } else {
      // Create forwarder profile
      forwarderId = await ctx.db.insert("forwarders", {
        userId: args.forwarderUserId,
        businessName: "Test Logistics Co.",
        contactEmail: "test@testlogistics.com",
        contactPhone: "+1-555-0123",
        timezone: "America/Los_Angeles",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Create warehouse
    const warehouseId = await ctx.db.insert("warehouses", {
      forwarderId,
      name: "Main Warehouse",
      address: "1234 Commerce Blvd, Suite 100",
      city: "Los Angeles",
      state: "CA",
      country: "United States",
      postalCode: "90210",
      maxParcels: 1000,
      maxWeightKg: 500,
      maxDimensionsCm: "100 x 100 x 100",
      currentCapacity: 45,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create shipping zones
    const usaZoneId = await ctx.db.insert("shippingZones", {
      forwarderId,
      zoneName: "USA Domestic",
      countries: ["US"],
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const asiaZoneId = await ctx.db.insert("shippingZones", {
      forwarderId,
      zoneName: "Southeast Asia",
      countries: ["SG", "MY", "TH", "ID", "PH", "VN"],
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const europeZoneId = await ctx.db.insert("shippingZones", {
      forwarderId,
      zoneName: "Europe",
      countries: ["GB", "DE", "FR", "IT", "ES", "NL"],
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create shipping rates for USA -> Asia
    const rateData = [
      {
        zoneId: asiaZoneId,
        courier: "DHL Express",
        courierLogo: "https://logos-world.net/wp-content/uploads/2020/06/DHL-Logo.png",
        serviceType: "express" as const,
        serviceName: "DHL Express Worldwide",
        serviceDescription: "Fast and reliable worldwide express delivery",
        weightSlabs: [
          { minWeight: 0, maxWeight: 1, flatRate: 35, label: "0-1kg" },
          { minWeight: 1, maxWeight: 5, ratePerKg: 25, label: "1-5kg" },
          { minWeight: 5, maxWeight: null, ratePerKg: 22, label: "5kg+" },
        ],
        handlingFee: 5,
        insuranceFee: 3,
        fuelSurcharge: 2,
        estimatedDaysMin: 2,
        estimatedDaysMax: 4,
        maxCapacity: 50,
        trackingIncluded: true,
        insuranceIncluded: true,
        requiresSignature: true,
        isPublic: true,
        displayOrder: 1,
      },
      {
        zoneId: asiaZoneId,
        courier: "UPS",
        courierLogo: "https://logos-world.net/wp-content/uploads/2020/06/UPS-Logo.png",
        serviceType: "standard" as const,
        serviceName: "UPS Worldwide Saver",
        serviceDescription: "Reliable international shipping with great value",
        weightSlabs: [
          { minWeight: 0, maxWeight: 1, flatRate: 28, label: "0-1kg" },
          { minWeight: 1, maxWeight: 5, ratePerKg: 20, label: "1-5kg" },
          { minWeight: 5, maxWeight: null, ratePerKg: 18, label: "5kg+" },
        ],
        handlingFee: 4,
        insuranceFee: 2,
        fuelSurcharge: 1.5,
        estimatedDaysMin: 5,
        estimatedDaysMax: 8,
        maxCapacity: 100,
        trackingIncluded: true,
        insuranceIncluded: false,
        requiresSignature: false,
        isPublic: true,
        displayOrder: 2,
      },
      {
        zoneId: asiaZoneId,
        courier: "FedEx",
        courierLogo: "https://logos-world.net/wp-content/uploads/2020/06/FedEx-Logo.png",
        serviceType: "economy" as const,
        serviceName: "FedEx Economy",
        serviceDescription: "Budget-friendly option for non-urgent shipments",
        weightSlabs: [
          { minWeight: 0, maxWeight: 1, flatRate: 22, label: "0-1kg" },
          { minWeight: 1, maxWeight: 5, ratePerKg: 16, label: "1-5kg" },
          { minWeight: 5, maxWeight: null, ratePerKg: 14, label: "5kg+" },
        ],
        handlingFee: 3,
        insuranceFee: 1,
        fuelSurcharge: 1,
        estimatedDaysMin: 7,
        estimatedDaysMax: 12,
        maxCapacity: 150,
        trackingIncluded: true,
        insuranceIncluded: false,
        requiresSignature: false,
        isPublic: true,
        displayOrder: 3,
      },
    ];

    const createdRates = [];
    for (const rate of rateData) {
      const rateId = await ctx.db.insert("shippingRates", {
        forwarderId,
        ...(rate as any),
        currentCapacityUsed: Math.floor(Math.random() * 80), // Random capacity usage
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      createdRates.push(rateId);
    }

    // Create similar rates for Europe (different pricing)
    const europeRates = rateData.map(rate => ({
      ...rate,
      zoneId: europeZoneId,
      weightSlabs: rate.weightSlabs.map(slab => ({
        ...slab,
        flatRate: slab.flatRate ? slab.flatRate * 0.9 : undefined, // 10% cheaper to Europe
        ratePerKg: slab.ratePerKg ? slab.ratePerKg * 0.9 : undefined,
      })),
    }));

    for (const rate of europeRates) {
      const rateId = await ctx.db.insert("shippingRates", {
        forwarderId,
        ...(rate as any),
        currentCapacityUsed: Math.floor(Math.random() * 60),
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      createdRates.push(rateId);
    }

    return {
      forwarderId,
      warehouseId,
      zones: [usaZoneId, asiaZoneId, europeZoneId],
      rates: createdRates,
      message: "Test data seeded successfully! You can now test the customer order flow."
    };
  },
});

// Helper function to clear test data (optional)
export const clearTestData = mutation({
  args: { forwarderUserId: v.string() },
  handler: async (ctx, args) => {
    const forwarder = await ctx.db
      .query("forwarders")
      .withIndex("by_user", (q) => q.eq("userId", args.forwarderUserId))
      .unique();

    if (!forwarder) return { message: "No forwarder found" };

    // Delete shipping rates
    const rates = await ctx.db
      .query("shippingRates")
      .withIndex("by_forwarder", (q) => q.eq("forwarderId", forwarder._id))
      .collect();
    
    for (const rate of rates) {
      await ctx.db.delete(rate._id);
    }

    // Delete zones
    const zones = await ctx.db
      .query("shippingZones")
      .withIndex("by_forwarder", (q) => q.eq("forwarderId", forwarder._id))
      .collect();
    
    for (const zone of zones) {
      await ctx.db.delete(zone._id);
    }

    // Delete warehouses
    const warehouses = await ctx.db
      .query("warehouses")
      .withIndex("by_forwarder", (q) => q.eq("forwarderId", forwarder._id))
      .collect();
    
    for (const warehouse of warehouses) {
      await ctx.db.delete(warehouse._id);
    }

    // Delete forwarder
    await ctx.db.delete(forwarder._id);

    return { message: "Test data cleared successfully" };
  },
});

// Seed test orders for QR code testing
export const seedTestOrders = mutation({
  args: {
    forwarderId: v.string(),
    warehouseId: v.string(),
  },
  handler: async (ctx, { forwarderId, warehouseId }) => {
    const now = Date.now();
    
    // Sample tracking numbers that match QR generator defaults
    const testOrders = [
      {
        trackingNumber: "SG123456789",
        customerName: "John Doe",
        merchantName: "Test Store",
        status: "incoming",
        declaredWeight: 2.5,
        declaredValue: 150,
        currency: "SGD",
      },
      {
        trackingNumber: "SG987654321", 
        customerName: "Jane Smith",
        merchantName: "Demo Shop",
        status: "arrived_at_warehouse",
        declaredWeight: 1.2,
        declaredValue: 89.99,
        currency: "SGD",
      },
      {
        trackingNumber: "SG555666777",
        customerName: "Bob Wilson", 
        merchantName: "Sample Store",
        status: "packed",
        declaredWeight: 3.1,
        declaredValue: 299.50,
        currency: "SGD",
      },
      {
        trackingNumber: "SG111222333",
        customerName: "Alice Johnson",
        merchantName: "Test Merchant",
        status: "awaiting_pickup", 
        declaredWeight: 0.8,
        declaredValue: 45.00,
        currency: "SGD",
      }
    ];

    const orderIds = [];

    for (const orderData of testOrders) {
      const orderId = await ctx.db.insert("orders", {
        ...orderData,
        status: orderData.status as "incoming" | "received" | "arrived_at_warehouse" | "packed" | "awaiting_pickup" | "shipped" | "in_transit" | "delivered",
        customerId: `customer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        forwarderId,
        warehouseId,
        customerEmail: `${orderData.customerName.toLowerCase().replace(' ', '.')}@test.com`,
        shippingAddress: "123 Test Street, Singapore 123456",
        dimensions: "20cm x 15cm x 10cm",
        specialInstructions: orderData.status === "awaiting_pickup" ? "Handle with care - fragile items" : undefined,
        shippingType: "immediate" as "immediate" | "consolidated",
        labelPrinted: false,
        createdAt: now - (Math.random() * 24 * 60 * 60 * 1000), // Random time in last 24h
        updatedAt: now,
        // Add timestamps based on status
        receivedAt: orderData.status !== "incoming" ? now - (Math.random() * 12 * 60 * 60 * 1000) : undefined,
        packedAt: ["packed", "awaiting_pickup"].includes(orderData.status) ? now - (Math.random() * 6 * 60 * 60 * 1000) : undefined,
        awaitingPickupAt: orderData.status === "awaiting_pickup" ? now - (Math.random() * 2 * 60 * 60 * 1000) : undefined,
      });
      
      orderIds.push(orderId);
    }

    return {
      success: true,
      message: `Created ${testOrders.length} test orders`,
      orderIds,
      trackingNumbers: testOrders.map(o => o.trackingNumber)
    };
  },
});

// Clean up test orders
export const cleanupTestOrders = mutation({
  args: {
    forwarderId: v.string(),
  },
  handler: async (ctx, { forwarderId }) => {
    const testTrackingNumbers = ["SG123456789", "SG987654321", "SG555666777", "SG111222333"];
    
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_forwarder", (q) => q.eq("forwarderId", forwarderId))
      .collect();

    const testOrders = orders.filter(order => 
      testTrackingNumbers.includes(order.trackingNumber)
    );

    for (const order of testOrders) {
      await ctx.db.delete(order._id);
    }

    return {
      success: true,
      message: `Deleted ${testOrders.length} test orders`,
      deletedTrackingNumbers: testOrders.map(o => o.trackingNumber)
    };
  },
});

// Create a test order for current customer
export const createTestOrder = mutation({
  args: {
    userId: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    console.log("createTestOrder: Starting...");
    
    let userId: string;
    
    if (args.userId) {
      // Use provided userId
      userId = args.userId;
      console.log("createTestOrder: Using provided userId:", userId);
    } else {
      // Try to get from auth context
      const identity = await ctx.auth.getUserIdentity();
      console.log("createTestOrder: Got identity:", !!identity, identity?.tokenIdentifier);
      
      if (!identity) {
        throw new Error("Not authenticated - no identity found and no userId provided");
      }
      userId = identity.tokenIdentifier;
    }
    
    // Find the user
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", userId))
      .unique();

    if (!user) {
      throw new Error(`User not found with tokenIdentifier: ${userId}`);
    }

    // Find a forwarder to assign this order to (use benongyr@gmail.com's forwarder)
    const forwarderUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), "benongyr@gmail.com"))
      .first();
    
    if (!forwarderUser) {
      throw new Error("Forwarder user not found");
    }

    const forwarder = await ctx.db
      .query("forwarders")
      .withIndex("by_user", (q) => q.eq("userId", forwarderUser.tokenIdentifier))
      .first();

    if (!forwarder) {
      throw new Error("Forwarder not found");
    }

    // Get a warehouse for this forwarder
    const warehouse = await ctx.db
      .query("warehouses")
      .withIndex("by_forwarder", (q) => q.eq("forwarderId", forwarder._id))
      .first();

    if (!warehouse) {
      throw new Error("No warehouse found for forwarder");
    }

    const now = Date.now();
    
    // Generate a realistic test order
    const merchants = ["Amazon", "eBay Store", "Shopify Shop", "AliExpress", "Etsy Shop"];
    const categories = ["Electronics", "Clothing", "Books", "Home & Garden", "Sports"];
    const randomMerchant = merchants[Math.floor(Math.random() * merchants.length)];
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    
    const trackingNumber = `TEST${Date.now().toString().slice(-8)}`;
    const orderNumber = `ORD${Date.now().toString().slice(-6)}`;
    
    const orderId = await ctx.db.insert("orders", {
      trackingNumber,
      customerId: userId,
      customerName: user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : user.name || user.email || "Test Customer",
      customerEmail: user.email || "test@example.com",
      shippingAddress: user.shippingAddress || "123 Test Street, Test City, Test Country",
      merchantName: randomMerchant,
      merchantOrderId: `${randomMerchant.toUpperCase()}-${Math.random().toString(36).substr(2, 8)}`,
      declaredWeight: Math.round((Math.random() * 5 + 0.5) * 100) / 100, // 0.5-5.5kg
      declaredValue: Math.round((Math.random() * 500 + 20) * 100) / 100, // $20-520
      currency: user.preferredCurrency || "USD",
      dimensions: `${Math.floor(Math.random() * 30 + 10)}cm x ${Math.floor(Math.random() * 20 + 10)}cm x ${Math.floor(Math.random() * 15 + 5)}cm`,
      warehouseId: warehouse._id,
      forwarderId: forwarder._id,
      status: "incoming" as const,
      courier: "Standard Shipping",
      courierTrackingNumber: "-",
      shippingType: "immediate" as const,
      labelPrinted: false,
      specialInstructions: Math.random() > 0.7 ? "Handle with care - fragile items" : undefined,
      packageDescription: `Test ${randomCategory} item from ${randomMerchant}`,
      createdAt: now,
      updatedAt: now,
    });

    return {
      success: true,
      message: "Test order created successfully",
      orderId,
      trackingNumber,
      merchantName: randomMerchant,
      forwarderName: forwarder.businessName
    };
  },
});

// Delete a test order (only allows deleting orders with TEST tracking numbers)
export const deleteTestOrder = mutation({
  args: {
    orderId: v.string(),
    userId: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    let userId: string;
    
    if (args.userId) {
      userId = args.userId;
    } else {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        throw new Error("Not authenticated");
      }
      userId = identity.tokenIdentifier;
    }
    
    // Get the order
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }
    
    // Only allow deleting test orders (tracking numbers that start with TEST)
    if (!order.trackingNumber.startsWith("TEST")) {
      throw new Error("Can only delete test orders");
    }
    
    // Only allow the customer who created the order or the forwarder to delete it
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", userId))
      .unique();
    
    if (!user) {
      throw new Error("User not found");
    }
    
    const canDelete = (
      order.customerId === userId || // Customer who created the order
      (user.role === "forwarder" && user.email === "benongyr@gmail.com") // The test forwarder
    );
    
    if (!canDelete) {
      throw new Error("Not authorized to delete this order");
    }
    
    // Delete the order
    await ctx.db.delete(args.orderId);
    
    // Also delete any related records (status history, etc.)
    const statusHistory = await ctx.db
      .query("orderStatusHistory")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .collect();
    
    for (const record of statusHistory) {
      await ctx.db.delete(record._id);
    }
    
    return {
      success: true,
      message: `Test order ${order.trackingNumber} deleted successfully`,
      deletedTrackingNumber: order.trackingNumber
    };
  },
});