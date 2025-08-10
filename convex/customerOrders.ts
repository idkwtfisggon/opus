import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all available countries from shipping zones
export const getAvailableCountries = query({
  handler: async (ctx) => {
    // Get all active shipping zones
    const zones = await ctx.db
      .query("shippingZones")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Extract unique countries
    const countriesSet = new Set<string>();
    zones.forEach(zone => {
      zone.countries.forEach(country => countriesSet.add(country));
    });

    return Array.from(countriesSet).sort();
  },
});

// Search for available shipping options based on route and package details
export const searchShippingOptions = query({
  args: {
    fromCountry: v.string(),
    toCountry: v.string(),
    weight: v.number(),
    declaredValue: v.number(),
  },
  handler: async (ctx, args) => {
    // Find zones that include the fromCountry
    const availableZones = await ctx.db
      .query("shippingZones")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect()
      .then(zones => zones.filter(zone => zone.countries.includes(args.fromCountry)));

    // Get shipping rates for these zones that are public and active
    const shippingOptions = [];
    
    for (const zone of availableZones) {
      const rates = await ctx.db
        .query("shippingRates")
        .withIndex("by_zone", (q) => q.eq("zoneId", zone._id))
        .filter((q) => q.and(
          q.eq(q.field("isActive"), true),
          q.eq(q.field("isPublic"), true)
        ))
        .collect();

      for (const rate of rates) {
        // Calculate price for this weight
        const applicableSlab = rate.weightSlabs.find(slab => 
          args.weight >= slab.minWeight && 
          (slab.maxWeight === undefined || args.weight <= slab.maxWeight)
        );

        if (!applicableSlab) continue;

        let basePrice = 0;
        if (applicableSlab.flatRate) {
          basePrice = applicableSlab.flatRate;
        } else if (applicableSlab.ratePerKg) {
          basePrice = applicableSlab.ratePerKg * args.weight;
        }

        const totalPrice = basePrice + 
          rate.handlingFee + 
          (rate.insuranceFee || 0) + 
          (rate.fuelSurcharge || 0);

        // Get forwarder details
        const forwarder = await ctx.db.get(rate.forwarderId);
        if (!forwarder || !("businessName" in forwarder)) continue;

        // Calculate availability percentage
        const availabilityPercentage = Math.max(0, 100 - rate.currentCapacityUsed);

        shippingOptions.push({
          rateId: rate._id,
          forwarder: {
            id: forwarder._id,
            name: forwarder.businessName,
            contactEmail: forwarder.contactEmail,
          },
          service: {
            name: rate.serviceName,
            description: rate.serviceDescription,
            type: rate.serviceType,
          },
          courier: {
            name: rate.courier,
            logo: rate.courierLogo,
          },
          pricing: {
            basePrice,
            handlingFee: rate.handlingFee,
            insuranceFee: rate.insuranceFee || 0,
            fuelSurcharge: rate.fuelSurcharge || 0,
            totalPrice,
            currency: "USD", // TODO: Make this configurable
          },
          delivery: {
            estimatedDaysMin: rate.estimatedDaysMin,
            estimatedDaysMax: rate.estimatedDaysMax,
          },
          features: {
            trackingIncluded: rate.trackingIncluded || false,
            insuranceIncluded: rate.insuranceIncluded || false,
            requiresSignature: rate.requiresSignature || false,
          },
          availability: {
            percentage: availabilityPercentage,
            status: availabilityPercentage > 80 ? "high" : 
                   availabilityPercentage > 50 ? "medium" : "low",
          },
          displayOrder: rate.displayOrder,
        });
      }
    }

    // Sort by display order, then by price
    return shippingOptions.sort((a, b) => 
      a.displayOrder - b.displayOrder || 
      a.pricing.totalPrice - b.pricing.totalPrice
    );
  },
});

// Create a new order (when customer selects a shipping option)
export const createCustomerOrder = mutation({
  args: {
    rateId: v.string(),
    merchantName: v.string(),
    merchantOrderId: v.optional(v.string()),
    declaredWeight: v.number(),
    declaredValue: v.number(),
    currency: v.string(),
    dimensions: v.optional(v.string()),
    packageDescription: v.optional(v.string()),
    specialInstructions: v.optional(v.string()),
    shippingAddressId: v.optional(v.string()), // Customer's address book
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Get customer
    const customer = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!customer || customer.role !== "customer") {
      throw new Error("Customer not found");
    }

    // Get shipping rate details
    const rate = await ctx.db.get(args.rateId);
    if (!rate || !rate.isActive || !rate.isPublic) {
      throw new Error("Shipping option not available");
    }

    // Get forwarder and warehouse details
    const forwarder = await ctx.db.get(rate.forwarderId);
    if (!forwarder) throw new Error("Forwarder not found");

    // Get primary warehouse for this forwarder
    const warehouse = await ctx.db
      .query("warehouses")
      .withIndex("by_forwarder", (q) => q.eq("forwarderId", forwarder._id))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (!warehouse) throw new Error("No active warehouse found");

    // Get shipping address
    let shippingAddress = customer.shippingAddress || "";
    if (args.shippingAddressId) {
      const addressRecord = await ctx.db.get(args.shippingAddressId);
      if (addressRecord && addressRecord.customerId === customer._id) {
        shippingAddress = `${addressRecord.recipientName}\n${addressRecord.address}\n${addressRecord.city}, ${addressRecord.state} ${addressRecord.postalCode}\n${addressRecord.country}`;
      }
    }

    // Generate tracking number
    const trackingNumber = `TRK-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Create the order
    const orderId = await ctx.db.insert("orders", {
      // Customer info
      customerId: customer._id,
      customerName: customer.name || `${customer.firstName || ""} ${customer.lastName || ""}`.trim(),
      customerEmail: customer.email || "",
      customerPhone: customer.phoneNumber,
      shippingAddress,

      // Order details
      trackingNumber,
      merchantName: args.merchantName,
      merchantOrderId: args.merchantOrderId,

      // Package details
      declaredWeight: args.declaredWeight,
      declaredValue: args.declaredValue,
      currency: args.currency,
      dimensions: args.dimensions,
      packageDescription: args.packageDescription,
      specialInstructions: args.specialInstructions,

      // Warehouse assignment
      warehouseId: warehouse._id,
      forwarderId: forwarder._id,

      // Status tracking
      status: "incoming",

      // Shipping details
      courier: rate.courier,
      shippingType: "immediate", // vs consolidated

      // Operations
      labelPrinted: false,
      notes: `Selected service: ${rate.serviceName} (${rate.serviceType})`,

      // Timestamps
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create notification for customer
    await ctx.db.insert("customerNotifications", {
      customerId: customer._id,
      type: "order_status_update",
      title: "Order Created Successfully",
      message: `Your order ${trackingNumber} has been created. Please ship your package to the provided address.`,
      orderId,
      isRead: false,
      createdAt: Date.now(),
    });

    return orderId;
  },
});

// Generate shipping address for customer to use
export const generateShippingAddress = query({
  args: { orderId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const customer = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!customer) return null;

    const order = await ctx.db.get(args.orderId);
    if (!order || order.customerId !== customer._id) {
      throw new Error("Order not found");
    }

    // Get warehouse details
    const warehouse = await ctx.db.get(order.warehouseId);
    const forwarder = await ctx.db.get(order.forwarderId);

    if (!warehouse || !forwarder) {
      throw new Error("Warehouse or forwarder not found");
    }

    // Generate customer ID for package identification
    const customerId = `CUST-${customer._id.slice(-8).toUpperCase()}`;

    return {
      recipientName: customer.name || "Package Recipient",
      customerId,
      companyName: forwarder.businessName,
      address: warehouse.address,
      city: warehouse.city,
      state: warehouse.state,
      country: warehouse.country,
      postalCode: warehouse.postalCode,
      specialInstructions: `Customer ID: ${customerId} | Order: ${order.trackingNumber}`,
      formattedAddress: `${customer.name || "Package Recipient"}
${forwarder.businessName}
${warehouse.address}
${warehouse.city}, ${warehouse.state} ${warehouse.postalCode}
${warehouse.country}

IMPORTANT: Include Customer ID: ${customerId}`,
    };
  },
});