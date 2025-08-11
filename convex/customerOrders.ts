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

    // Extract unique countries as-is
    const countriesSet = new Set<string>();
    zones.forEach(zone => {
      zone.countries.forEach(country => {
        countriesSet.add(country);
      });
    });

    return Array.from(countriesSet).sort();
  },
});

// Search for available shipping options based on route and package details with service area filtering
export const searchShippingOptions = query({
  args: {
    fromCountry: v.string(),
    fromCountryCode: v.string(),
    fromState: v.optional(v.string()),
    toCountry: v.string(),
    weight: v.number(),
    declaredValue: v.number(),
    sortBy: v.optional(v.union(v.literal("distance"), v.literal("price"), v.literal("speed"))),
  },
  handler: async (ctx, args) => {
    // STEP 1: Find warehouses that can serve the origin location using service areas
    const warehouseServiceAreas = await ctx.db
      .query("warehouseServiceAreas")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Filter warehouses that can handle packages from the origin location
    const eligibleWarehouses = [];
    
    for (const serviceArea of warehouseServiceAreas) {
      const canServeOrigin = serviceArea.coverage.some(coverage => {
        // Match country code
        if (coverage.countryCode === args.fromCountryCode) {
          // If serves full country, it's eligible
          if (coverage.isFullCountry) return true;
          
          // If specific states and we have origin state, check for match
          if (args.fromState && coverage.states) {
            return coverage.states.includes(args.fromState);
          }
          
          // If no origin state but warehouse has state restrictions, still eligible
          return true;
        }
        return false;
      });

      if (canServeOrigin) {
        const warehouse = await ctx.db.get(serviceArea.warehouseId as any);
        if (warehouse) {
          const matchingCoverage = serviceArea.coverage.find(c => c.countryCode === args.fromCountryCode);
          eligibleWarehouses.push({
            warehouse,
            serviceArea,
            priority: matchingCoverage?.priority || 999,
          });
        }
      }
    }

    // STEP 2: For each eligible warehouse, find shipping zones that include the destination country
    const shippingOptions = [];
    
    for (const warehouseData of eligibleWarehouses) {
      const { warehouse, serviceArea } = warehouseData;
      
      // Get forwarder details  
      const forwarder = await ctx.db.get((warehouse as any).forwarderId);
      if (!forwarder) continue;

      // STEP 2.1: Get forwarder's shipping zones and rates from settings
      const zones = await ctx.db
        .query("shippingZones")
        .withIndex("by_forwarder", (q) => q.eq("forwarderId", forwarder._id))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();

      const availableZones = zones.filter(zone => zone.countries.includes(args.toCountry));

      // STEP 2.2: Get shipping rates for eligible zones
      for (const zone of availableZones) {
        let rates;
        
        // Check if service area uses custom rates or default rates
        if (serviceArea.useCustomRates) {
          // Use warehouse-specific rates
          rates = await ctx.db
            .query("shippingRates")
            .withIndex("by_warehouse", (q) => q.eq("warehouseId", warehouse._id))
            .filter((q) => q.eq(q.field("isActive"), true))
            .collect();
        } else {
          // Use forwarder default rates
          rates = await ctx.db
            .query("shippingRates")
            .withIndex("by_forwarder", (q) => q.eq("forwarderId", forwarder._id))
            .filter((q) => q.eq(q.field("isActive"), true))
            .collect();
        }

        // Filter rates that belong to this zone
        const zoneRates = rates.filter(rate => {
          // Check if this rate applies to the destination zone
          const rateZone = zones.find(z => z._id === rate.zoneId);
          return rateZone && rateZone.countries.includes(args.toCountry);
        });

        for (const rate of zoneRates) {
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

          // Add service area additional fees
          const serviceAreaFee = serviceArea.additionalFees || 0;
          const totalPrice = basePrice + 
            rate.handlingFee + 
            (rate.insuranceFee || 0) + 
            (rate.fuelSurcharge || 0) + 
            serviceAreaFee;

          // Calculate availability percentage  
          const availabilityPercentage = Math.max(0, 100 - (rate.currentCapacityUsed || 0));

          // Calculate total estimated delivery time (handling + shipping)
          const totalEstimatedDaysMin = Math.ceil(serviceArea.handlingTimeHours / 24) + rate.estimatedDaysMin;
          const totalEstimatedDaysMax = Math.ceil(serviceArea.handlingTimeHours / 24) + rate.estimatedDaysMax;

          shippingOptions.push({
            rateId: rate._id,
            warehouseId: warehouse._id,
            forwarder: {
              id: forwarder._id,
              name: (forwarder as any).businessName || "Forwarder",
              contactEmail: (forwarder as any).contactEmail || "",
            },
            warehouse: {
              id: warehouse._id,
              name: (warehouse as any).name || "Warehouse",
              city: (warehouse as any).city || "",
              state: (warehouse as any).state || "",
              country: (warehouse as any).country || "",
            },
            service: {
              name: rate.serviceName || `${rate.courier} ${rate.serviceType}`,
              description: rate.serviceDescription || `${rate.serviceType} shipping via ${rate.courier}`,
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
              serviceAreaFee,
              totalPrice,
              currency: "USD", // TODO: Make this configurable
            },
            delivery: {
              handlingTimeHours: serviceArea.handlingTimeHours,
              shippingDaysMin: rate.estimatedDaysMin,
              shippingDaysMax: rate.estimatedDaysMax,
              estimatedDaysMin: totalEstimatedDaysMin,
              estimatedDaysMax: totalEstimatedDaysMax,
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
            serviceAreaPriority: warehouseData.priority,
            displayOrder: rate.displayOrder || 999,
            specialInstructions: serviceArea.specialInstructions,
          });
        }
      }
    }

    // STEP 4: Sort results based on criteria
    if (args.sortBy === "price") {
      shippingOptions.sort((a, b) => a.pricing.totalPrice - b.pricing.totalPrice);
    } else if (args.sortBy === "speed") {
      shippingOptions.sort((a, b) => a.delivery.estimatedDaysMin - b.delivery.estimatedDaysMin);
    } else {
      // Default: Sort by service area priority (1=primary first), then price
      shippingOptions.sort((a, b) => {
        if (a.serviceAreaPriority !== b.serviceAreaPriority) {
          return a.serviceAreaPriority - b.serviceAreaPriority;
        }
        return a.pricing.totalPrice - b.pricing.totalPrice;
      });
    }

    return shippingOptions;
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