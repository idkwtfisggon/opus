import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all courier integrations for a forwarder
export const getForwarderCourierIntegrations = query({
  args: { forwarderId: v.string() },
  handler: async (ctx, { forwarderId }) => {
    const integrations = await ctx.db
      .query("courierIntegrations")
      .withIndex("by_forwarder", (q) => q.eq("forwarderId", forwarderId))
      .collect();

    // Don't return sensitive credentials in queries
    return integrations.map(integration => ({
      ...integration,
      apiCredentials: integration.apiCredentials ? {
        accountNumber: integration.apiCredentials.accountNumber ? "••••••••" : undefined,
        apiKey: integration.apiCredentials.apiKey ? "••••••••" : undefined,
        environment: integration.apiCredentials.environment,
        hasCredentials: true
      } : { hasCredentials: false }
    }));
  },
});

// Create or update courier integration
export const upsertCourierIntegration = mutation({
  args: {
    forwarderId: v.string(),
    courierName: v.string(),
    mode: v.union(v.literal("api"), v.literal("manual")),
    apiCredentials: v.optional(v.object({
      accountNumber: v.optional(v.string()),
      apiKey: v.optional(v.string()),
      apiSecret: v.optional(v.string()),
      environment: v.union(v.literal("sandbox"), v.literal("production")),
      siteId: v.optional(v.string()),
      password: v.optional(v.string()),
      meterNumber: v.optional(v.string()),
    })),
    settings: v.object({
      defaultService: v.optional(v.string()),
      enableEtd: v.optional(v.boolean()),
      autoTracking: v.optional(v.boolean()),
      trackingFrequency: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if integration already exists
    const existing = await ctx.db
      .query("courierIntegrations")
      .withIndex("by_forwarder", (q) => q.eq("forwarderId", args.forwarderId))
      .filter((q) => q.eq(q.field("courierName"), args.courierName))
      .first();

    if (existing) {
      // Update existing integration
      await ctx.db.patch(existing._id, {
        mode: args.mode,
        apiCredentials: args.apiCredentials,
        settings: args.settings,
        status: args.mode === "api" ? "not_configured" : "ready",
        updatedAt: now,
      });
      return existing._id;
    } else {
      // Create new integration
      const integrationId = await ctx.db.insert("courierIntegrations", {
        forwarderId: args.forwarderId,
        courierName: args.courierName,
        mode: args.mode,
        apiCredentials: args.apiCredentials,
        settings: args.settings,
        status: args.mode === "api" ? "not_configured" : "ready",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      return integrationId;
    }
  },
});

// Test API credentials (mock implementation)
export const testCourierApi = mutation({
  args: {
    integrationId: v.string(),
  },
  handler: async (ctx, { integrationId }) => {
    const integration = await ctx.db.get(integrationId as any);
    if (!integration) {
      throw new Error("Integration not found");
    }

    // Update status to testing
    await ctx.db.patch(integrationId as any, {
      status: "testing",
      updatedAt: Date.now(),
    });

    try {
      // Mock API test - in real implementation, this would call actual carrier APIs
      const rateTestResult = await mockRateTest(integration);
      const labelTestResult = await mockLabelTest(integration);

      const success = rateTestResult.success && labelTestResult.success;
      const testResult = {
        timestamp: Date.now(),
        success,
        error: success ? undefined : (rateTestResult.error || labelTestResult.error),
        rateTest: rateTestResult.success,
        labelTest: labelTestResult.success,
      };

      // Update integration with test results
      await ctx.db.patch(integrationId as any, {
        status: success ? "ready" : "error",
        lastTestResult: testResult,
        updatedAt: Date.now(),
      });

      return testResult;
    } catch (error) {
      const testResult = {
        timestamp: Date.now(),
        success: false,
        error: error.message,
        rateTest: false,
        labelTest: false,
      };

      await ctx.db.patch(integrationId as any, {
        status: "error",
        lastTestResult: testResult,
        updatedAt: Date.now(),
      });

      return testResult;
    }
  },
});

// Mock functions for API testing (replace with real carrier API calls)
async function mockRateTest(integration: any) {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock test based on courier
  if (integration.courierName === "DHL") {
    return {
      success: integration.apiCredentials?.apiKey && integration.apiCredentials?.accountNumber,
      error: !integration.apiCredentials?.apiKey ? "Invalid API key" : undefined
    };
  }
  
  if (integration.courierName === "UPS") {
    return {
      success: integration.apiCredentials?.apiKey && integration.apiCredentials?.password,
      error: !integration.apiCredentials?.password ? "Invalid password" : undefined
    };
  }
  
  if (integration.courierName === "FedEx") {
    return {
      success: integration.apiCredentials?.apiKey && integration.apiCredentials?.meterNumber,
      error: !integration.apiCredentials?.meterNumber ? "Invalid meter number" : undefined
    };
  }
  
  return { success: true };
}

async function mockLabelTest(integration: any) {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Mock success for now
  return { success: true };
}

// Get available shipping rates for an order (mock implementation)
export const getShippingRates = query({
  args: {
    orderId: v.string(),
    forwarderId: v.string(),
  },
  handler: async (ctx, { orderId, forwarderId }) => {
    const order = await ctx.db.get(orderId as any);
    if (!order) {
      throw new Error("Order not found");
    }

    // Get active API integrations
    const integrations = await ctx.db
      .query("courierIntegrations")
      .withIndex("by_forwarder", (q) => q.eq("forwarderId", forwarderId))
      .filter((q) => q.eq(q.field("status"), "ready"))
      .filter((q) => q.eq(q.field("mode"), "api"))
      .collect();

    // Mock rates for each available courier
    const rates = [];
    for (const integration of integrations) {
      const mockRates = generateMockRates(integration.courierName, order);
      rates.push(...mockRates);
    }

    return rates;
  },
});

// Generate mock shipping rates
function generateMockRates(courierName: string, order: any) {
  const basePrice = order.declaredWeight * 15; // $15 per kg base rate
  
  switch (courierName) {
    case "DHL":
      return [
        {
          courierName: "DHL",
          serviceName: "DHL Express Worldwide",
          serviceCode: "P",
          price: basePrice * 1.3,
          currency: "USD",
          transitDays: "1-3",
          description: "Fast worldwide express delivery"
        },
        {
          courierName: "DHL",
          serviceName: "DHL Economy Select",
          serviceCode: "W",
          price: basePrice * 0.8,
          currency: "USD",
          transitDays: "4-6",
          description: "Economical international delivery"
        }
      ];
      
    case "UPS":
      return [
        {
          courierName: "UPS",
          serviceName: "UPS Express",
          serviceCode: "01",
          price: basePrice * 1.25,
          currency: "USD",
          transitDays: "1-3",
          description: "Next day international delivery"
        },
        {
          courierName: "UPS",
          serviceName: "UPS Standard",
          serviceCode: "11",
          price: basePrice * 0.9,
          currency: "USD",
          transitDays: "3-5",
          description: "Standard international delivery"
        }
      ];
      
    case "FedEx":
      return [
        {
          courierName: "FedEx",
          serviceName: "FedEx International Priority",
          serviceCode: "INTERNATIONAL_PRIORITY",
          price: basePrice * 1.4,
          currency: "USD",
          transitDays: "1-3",
          description: "Fastest international delivery"
        },
        {
          courierName: "FedEx",
          serviceName: "FedEx International Economy",
          serviceCode: "INTERNATIONAL_ECONOMY",
          price: basePrice * 0.75,
          currency: "USD",
          transitDays: "4-7",
          description: "Cost-effective international delivery"
        }
      ];
      
    default:
      return [];
  }
}

// Create shipping label (mock implementation)
export const createShippingLabel = mutation({
  args: {
    orderId: v.string(),
    courierName: v.string(),
    serviceName: v.string(),
    serviceCode: v.string(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId as any);
    if (!order) {
      throw new Error("Order not found");
    }

    // Get courier integration
    const integration = await ctx.db
      .query("courierIntegrations")
      .withIndex("by_forwarder", (q) => q.eq("forwarderId", order.forwarderId))
      .filter((q) => q.eq(q.field("courierName"), args.courierName))
      .first();

    if (!integration) {
      throw new Error(`${args.courierName} integration not found`);
    }

    if (integration.status !== "ready") {
      throw new Error(`${args.courierName} integration is not ready`);
    }

    // Generate mock tracking number
    const trackingNumber = generateTrackingNumber(args.courierName);
    
    // Create shipping label record
    const labelId = await ctx.db.insert("shippingLabels", {
      orderId: args.orderId,
      forwarderId: order.forwarderId,
      courierIntegrationId: integration._id,
      courierName: args.courierName,
      serviceName: args.serviceName,
      trackingNumber,
      
      // Mock addresses (in real app, get from warehouse and customer)
      fromAddress: {
        name: "Test Warehouse",
        address: "123 Warehouse St",
        city: "Los Angeles",
        state: "CA",
        postalCode: "90210",
        country: "US",
        phone: "+1-555-0123"
      },
      toAddress: {
        name: order.customerName,
        address: order.shippingAddress || "Customer Address",
        city: "Singapore",
        postalCode: "123456",
        country: "SG"
      },
      
      weight: order.declaredWeight,
      declaredValue: order.declaredValue,
      currency: order.currency,
      
      status: "created",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Update order with tracking number
    await ctx.db.patch(args.orderId as any, {
      courier: args.courierName,
      status: "shipped",
      shippedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return {
      labelId,
      trackingNumber,
      labelPdfUrl: `https://mock-labels.com/${trackingNumber}.pdf`, // Mock PDF URL
    };
  },
});

// Generate mock tracking number
function generateTrackingNumber(courierName: string): string {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  
  switch (courierName) {
    case "DHL":
      return `DHL${timestamp}${random}`;
    case "UPS":
      return `1Z${random}${timestamp}`;
    case "FedEx":
      return `FX${timestamp}${random}`;
    default:
      return `TRK${timestamp}${random}`;
  }
}

// Manual tracking number update
export const updateTrackingNumber = mutation({
  args: {
    orderId: v.string(),
    trackingNumber: v.string(),
    courierName: v.string(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId as any);
    if (!order) {
      throw new Error("Order not found");
    }

    // Create a manual shipping label record
    const labelId = await ctx.db.insert("shippingLabels", {
      orderId: args.orderId,
      forwarderId: order.forwarderId,
      courierIntegrationId: "manual", // Special ID for manual entries
      courierName: args.courierName,
      serviceName: "Manual Entry",
      trackingNumber: args.trackingNumber,
      
      // Basic addresses
      fromAddress: {
        name: "Warehouse",
        address: "Warehouse Address",
        city: "City",
        postalCode: "12345",
        country: "US"
      },
      toAddress: {
        name: order.customerName,
        address: order.shippingAddress || "Customer Address",
        city: "Customer City",
        postalCode: "12345",
        country: "SG"
      },
      
      weight: order.declaredWeight,
      declaredValue: order.declaredValue,
      currency: order.currency,
      
      status: "printed",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Update order
    await ctx.db.patch(args.orderId as any, {
      courier: args.courierName,
      status: "shipped",
      shippedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { labelId, trackingNumber: args.trackingNumber };
  },
});