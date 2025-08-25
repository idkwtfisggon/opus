import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Generate email address for customer
export const generateCustomerEmail = mutation({
  args: {
    customerId: v.string(),
    realEmail: v.string(),
  },
  handler: async (ctx, { customerId, realEmail }) => {
    // Check if customer already has an email address
    const existing = await ctx.db
      .query("customerEmailAddresses")
      .withIndex("by_customer", (q) => q.eq("customerId", customerId))
      .first();

    if (existing) {
      return existing;
    }

    // Get customer details to create personalized email
    const customer = await ctx.db.get(customerId as any);
    if (!customer) {
      throw new Error("Customer not found");
    }

    // Generate personalized email address using first name + last 7 digits of ID
    const fullName = (customer as any).name || "customer";
    const firstName = fullName.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
    const last7Digits = customerId.slice(-7);
    const emailAddress = `${firstName}${last7Digits}@sandbox66b2007e061f4536af04dca475932b61.mailgun.org`;

    // Create customer email record
    const emailId = await ctx.db.insert("customerEmailAddresses", {
      customerId,
      emailAddress,
      realEmail,
      isActive: true,
      createdAt: Date.now(),
      totalEmailsReceived: 0,
      totalEmailsForwarded: 0,
    });

    return await ctx.db.get(emailId);
  },
});

// Auto-generate email for new customer (called during onboarding)
export const autoGenerateCustomerEmail = mutation({
  args: {
    customerId: v.string(),
  },
  handler: async (ctx, { customerId }) => {
    // Check if customer already has an email address
    const existing = await ctx.db
      .query("customerEmailAddresses")
      .withIndex("by_customer", (q) => q.eq("customerId", customerId))
      .first();

    if (existing) {
      return existing;
    }

    // Get customer details
    const customer = await ctx.db.get(customerId as any);
    if (!customer) {
      throw new Error("Customer not found");
    }

    // Generate personalized email address using first name + last 7 digits of ID
    const fullName = (customer as any).name || "customer";
    const firstName = fullName.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
    const last7Digits = customerId.slice(-7);
    const emailAddress = `${firstName}${last7Digits}@sandbox66b2007e061f4536af04dca475932b61.mailgun.org`;

    // Use the customer's signup email as the default forwarding email
    const realEmail = (customer as any).email;

    // Create customer email record
    const emailId = await ctx.db.insert("customerEmailAddresses", {
      customerId,
      emailAddress,
      realEmail,
      isActive: true,
      createdAt: Date.now(),
      totalEmailsReceived: 0,
      totalEmailsForwarded: 0,
    });

    return await ctx.db.get(emailId);
  },
});

// Get customer's generated email address
export const getCustomerEmail = query({
  args: { customerId: v.string() },
  handler: async (ctx, { customerId }) => {
    return await ctx.db
      .query("customerEmailAddresses")
      .withIndex("by_customer", (q) => q.eq("customerId", customerId))
      .first();
  },
});

// Update customer's forwarding email address
export const updateForwardingEmail = mutation({
  args: {
    customerId: v.string(),
    newRealEmail: v.string(),
  },
  handler: async (ctx, { customerId, newRealEmail }) => {
    const customerEmail = await ctx.db
      .query("customerEmailAddresses")
      .withIndex("by_customer", (q) => q.eq("customerId", customerId))
      .first();

    if (!customerEmail) {
      throw new Error("Customer email address not found");
    }

    await ctx.db.patch(customerEmail._id, {
      realEmail: newRealEmail,
    });

    return await ctx.db.get(customerEmail._id);
  },
});

// Process incoming email (called by webhook)
// Classify email type based on subject and content
function classifyEmailType(subject: string, body: string, from: string): string {
  const subjectLower = subject.toLowerCase();
  const bodyLower = body.toLowerCase();
  
  // Order confirmation patterns
  const confirmationPatterns = [
    'order confirmation', 'purchase confirmation', 'receipt', 'thank you for your order',
    'order placed', 'payment received', 'order received', 'your order is confirmed'
  ];
  
  // Shipping notification patterns
  const shippingPatterns = [
    'shipped', 'on its way', 'dispatched', 'sent out', 'your order has been shipped',
    'item shipped', 'package shipped', 'shipment notification', 'has shipped'
  ];
  
  // Tracking update patterns
  const trackingPatterns = [
    'tracking update', 'package update', 'shipment update', 'delivery update',
    'in transit', 'out for delivery', 'arrived at facility'
  ];
  
  // Delivery confirmation patterns
  const deliveryPatterns = [
    'delivered', 'package delivered', 'delivery confirmation', 'successfully delivered',
    'arrived', 'completed delivery'
  ];
  
  // Check for delivery first (most specific)
  if (deliveryPatterns.some(pattern => subjectLower.includes(pattern) || bodyLower.includes(pattern))) {
    return "delivery_confirmation";
  }
  
  // Check for shipping notification
  if (shippingPatterns.some(pattern => subjectLower.includes(pattern))) {
    return "shipping_notification";
  }
  
  // Check for tracking updates
  if (trackingPatterns.some(pattern => subjectLower.includes(pattern))) {
    return "tracking_update";
  }
  
  // Check for order confirmation
  if (confirmationPatterns.some(pattern => subjectLower.includes(pattern))) {
    return "order_confirmation";
  }
  
  // If it has tracking numbers but unclear type, assume shipping notification
  if (bodyLower.includes('tracking') && (bodyLower.includes('number') || bodyLower.includes('track'))) {
    return "shipping_notification";
  }
  
  return "unknown";
}

export const processIncomingEmail = mutation({
  args: {
    from: v.string(),
    to: v.string(),
    subject: v.string(),
    body: v.string(),
    attachments: v.array(v.object({
      filename: v.string(),
      contentType: v.string(),
      storageId: v.string(),
      size: v.number(),
    })),
    extractedData: v.object({
      trackingNumbers: v.array(v.string()),
      orderNumbers: v.array(v.string()),
      shopName: v.optional(v.string()),
      estimatedValue: v.optional(v.number()),
      currency: v.optional(v.string()),
      weight: v.optional(v.number()),
    }),
    isShippingEmail: v.boolean(),
    emailType: v.union(
      v.literal("order_confirmation"), 
      v.literal("shipping_notification"), 
      v.literal("tracking_update"),
      v.literal("delivery_confirmation"),
      v.literal("spam"),
      v.literal("unknown")
    ),
    confidence: v.number(),
    spamScore: v.number(),
    spamReasons: v.array(v.string()),
    mailgunEventId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find customer by email address directly (supports both old and new formats)
    const customerEmail = await ctx.db
      .query("customerEmailAddresses")
      .withIndex("by_email_address", (q) => q.eq("emailAddress", args.to))
      .first();

    if (!customerEmail) {
      throw new Error("Customer email address not found");
    }

    const customerId = customerEmail.customerId;

    // Classify email type
    const emailType = classifyEmailType(args.subject, args.body, args.from);

    // Create email message record
    const emailId = await ctx.db.insert("emailMessages", {
      customerId,
      customerEmail: args.to,
      from: args.from,
      to: args.to,
      subject: args.subject,
      body: args.body,
      attachments: args.attachments,
      isShippingEmail: args.isShippingEmail,
      emailType: emailType,
      confidence: args.confidence,
      extractedData: args.extractedData,
      isProcessed: true,
      isForwarded: false,
      spamScore: args.spamScore,
      spamReasons: args.spamReasons,
      receivedAt: Date.now(),
      processedAt: Date.now(),
      mailgunEventId: args.mailgunEventId,
    });

    // Update customer email stats
    await ctx.db.patch(customerEmail._id, {
      lastUsedAt: Date.now(),
      totalEmailsReceived: customerEmail.totalEmailsReceived + 1,
    });

    // Handle email based on its type
    if (args.isShippingEmail) {
      await handleShippingEmail(ctx, emailId, customerId, args);
    }

    return emailId;
  },
});

// Smart email classification and handling
async function handleShippingEmail(ctx: any, emailId: any, customerId: string, emailData: any) {
  const { emailType, extractedData } = emailData;
  
  switch (emailType) {
    case "order_confirmation":
      // Only create order if none exists for this shop/order number
      await handleOrderConfirmation(ctx, emailId, customerId, extractedData, emailData);
      break;
      
    case "shipping_notification":
      // Update existing order or create if missing
      await handleShippingNotification(ctx, emailId, customerId, extractedData, emailData);
      break;
      
    case "tracking_update":
      // Just update existing order with tracking info
      await handleTrackingUpdate(ctx, emailId, customerId, extractedData);
      break;
      
    case "delivery_confirmation":
      // Update order status to delivered
      await handleDeliveryConfirmation(ctx, emailId, customerId, extractedData);
      break;
      
    default:
      // Unknown shipping email - try basic matching
      const matched = await matchEmailToOrder(ctx, emailId, customerId, extractedData);
      if (!matched && extractedData.shopName && extractedData.trackingNumbers.length > 0) {
        await createOrderFromEmail(ctx, emailId, customerId, extractedData, emailData);
      }
  }
}

// Handle order confirmation emails (receipt, purchase confirmation)
async function handleOrderConfirmation(ctx: any, emailId: any, customerId: string, extractedData: any, emailData: any) {
  // Check if order already exists for this shop + order number combination
  const existingOrder = await findExistingOrder(ctx, customerId, extractedData);
  
  if (!existingOrder) {
    // Create new order in "confirmed" status
    const orderId = await createOrderFromEmail(ctx, emailId, customerId, extractedData, emailData, "confirmed");
    console.log(`Created order ${orderId} from order confirmation email`);
  } else {
    // Just link the confirmation email to existing order
    await ctx.db.patch(emailId, { matchedOrderId: existingOrder._id });
    console.log(`Linked confirmation email to existing order ${existingOrder._id}`);
  }
}

// Handle shipping notification emails (item has shipped)
async function handleShippingNotification(ctx: any, emailId: any, customerId: string, extractedData: any, emailData: any) {
  const existingOrder = await findExistingOrder(ctx, customerId, extractedData);
  
  if (existingOrder) {
    // Update existing order with shipping info
    await ctx.db.patch(existingOrder._id, {
      status: "shipped",
      shippedAt: Date.now(),
      courierTrackingNumber: extractedData.trackingNumbers[0] || existingOrder.courierTrackingNumber,
      updatedAt: Date.now(),
    });
    
    await ctx.db.patch(emailId, { matchedOrderId: existingOrder._id });
    console.log(`Updated order ${existingOrder._id} to shipped status`);
  } else {
    // Create new order if somehow missing
    const orderId = await createOrderFromEmail(ctx, emailId, customerId, extractedData, emailData, "shipped");
    console.log(`Created missing order ${orderId} from shipping notification`);
  }
}

// Handle tracking update emails
async function handleTrackingUpdate(ctx: any, emailId: any, customerId: string, extractedData: any) {
  const existingOrder = await findExistingOrder(ctx, customerId, extractedData);
  
  if (existingOrder) {
    await ctx.db.patch(existingOrder._id, {
      courierTrackingNumber: extractedData.trackingNumbers[0] || existingOrder.courierTrackingNumber,
      updatedAt: Date.now(),
    });
    
    await ctx.db.patch(emailId, { matchedOrderId: existingOrder._id });
    console.log(`Updated tracking for order ${existingOrder._id}`);
  }
}

// Handle delivery confirmation emails
async function handleDeliveryConfirmation(ctx: any, emailId: any, customerId: string, extractedData: any) {
  const existingOrder = await findExistingOrder(ctx, customerId, extractedData);
  
  if (existingOrder) {
    await ctx.db.patch(existingOrder._id, {
      status: "delivered",
      deliveredAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    await ctx.db.patch(emailId, { matchedOrderId: existingOrder._id });
    console.log(`Marked order ${existingOrder._id} as delivered`);
  }
}

// Find existing order by multiple criteria
async function findExistingOrder(ctx: any, customerId: string, extractedData: any) {
  const customerOrders = await ctx.db
    .query("orders")
    .filter((q: any) => q.eq(q.field("customerId"), customerId))
    .collect();

  // Try matching by order number first (most reliable)
  if (extractedData.orderNumbers && extractedData.orderNumbers.length > 0) {
    for (const orderNum of extractedData.orderNumbers) {
      const orderMatch = customerOrders.find((order: any) => 
        order.merchantOrderId === orderNum || 
        order.trackingNumber === orderNum ||
        order.orderNumber?.includes(orderNum)
      );
      if (orderMatch) return orderMatch;
    }
  }

  // Try matching by tracking number
  if (extractedData.trackingNumbers && extractedData.trackingNumbers.length > 0) {
    for (const trackingNum of extractedData.trackingNumbers) {
      const trackingMatch = customerOrders.find((order: any) => 
        order.trackingNumber === trackingNum ||
        order.courierTrackingNumber === trackingNum
      );
      if (trackingMatch) return trackingMatch;
    }
  }

  // Try matching by shop name + recent orders (last 30 days)
  if (extractedData.shopName) {
    const recentOrders = customerOrders.filter((order: any) => 
      order.merchantName?.toLowerCase().includes(extractedData.shopName.toLowerCase()) &&
      (Date.now() - order.createdAt) < (30 * 24 * 60 * 60 * 1000) // 30 days
    );
    
    if (recentOrders.length === 1) {
      return recentOrders[0];
    }
  }

  return null;
}

// Helper function to match email to existing orders
async function matchEmailToOrder(ctx: any, emailId: any, customerId: string, extractedData: any): Promise<boolean> {
  // Get customer's pending orders
  const customerOrders = await ctx.db
    .query("orders")
    .filter((q: any) => q.eq(q.field("customerId"), customerId))
    .filter((q: any) => 
      q.or(
        q.eq(q.field("status"), "incoming"),
        q.eq(q.field("status"), "arrived_at_warehouse")
      )
    )
    .collect();

  // Try to match by tracking number first
  for (const trackingNumber of extractedData.trackingNumbers) {
    const matchingOrder = customerOrders.find((order: any) => 
      order.trackingNumber === trackingNumber
    );

    if (matchingOrder) {
      await ctx.db.patch(emailId, {
        matchedOrderId: matchingOrder._id,
      });
      
      // Update order with shipping confirmation data
      await ctx.db.patch(matchingOrder._id, {
        shippingConfirmed: true,
        shippingConfirmedAt: Date.now(),
        courierTrackingNumber: trackingNumber,
      });
      
      return true;
    }
  }

  // If no tracking match, try to match by shop name and approximate value/weight
  if (extractedData.shopName) {
    const similarOrders = customerOrders.filter((order: any) => {
      const shopMatch = order.merchantName?.toLowerCase().includes(extractedData.shopName.toLowerCase()) ||
                      extractedData.shopName.toLowerCase().includes(order.merchantName?.toLowerCase());
      
      const valueMatch = !extractedData.estimatedValue || 
                        Math.abs(order.declaredValue - extractedData.estimatedValue) < (order.declaredValue * 0.2);
      
      const weightMatch = !extractedData.weight ||
                         Math.abs(order.declaredWeight - extractedData.weight) < (order.declaredWeight * 0.3);

      return shopMatch && valueMatch && weightMatch;
    });

    if (similarOrders.length === 1) {
      // Single match found, link them
      await ctx.db.patch(emailId, {
        matchedOrderId: similarOrders[0]._id,
      });
      return true;
    }
  }
  
  return false;
}

// Helper function to create order from email data
async function createOrderFromEmail(ctx: any, emailId: any, customerId: string, extractedData: any, emailData: any, orderStatus: string = "incoming") {
  // Get customer info for shipping address
  const customer = await ctx.db
    .query("users")
    .filter((q: any) => q.eq(q.field("tokenIdentifier"), customerId))
    .first();
    
  if (!customer) {
    console.error("Customer not found for order creation");
    return;
  }

  // Get customer's preferred forwarder (or use default)
  const forwarder = await ctx.db
    .query("forwarders")
    .first(); // For now, use first available forwarder
    
  if (!forwarder) {
    console.error("No forwarder available for order creation");
    return;
  }

  // Get forwarder's warehouse
  const warehouse = await ctx.db
    .query("warehouses")
    .filter((q: any) => q.eq(q.field("forwarderId"), forwarder._id))
    .first();

  // Get customer's email address for the order
  const customerEmailRecord = await ctx.db
    .query("customerEmailAddresses")
    .filter((q: any) => q.eq(q.field("customerId"), customerId))
    .first();

  // Create order from email data
  const orderId = await ctx.db.insert("orders", {
    customerId: customerId,
    forwarderId: forwarder._id,
    warehouseId: warehouse?._id || forwarder._id,
    
    // Required customer info
    customerName: customer.name || `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || "Customer",
    customerEmail: customerEmailRecord?.emailAddress || customer.email || "",
    customerPhone: customer.phoneNumber,
    
    // Order details from email
    merchantName: extractedData.shopName,
    trackingNumber: extractedData.trackingNumbers[0],
    courierTrackingNumber: extractedData.trackingNumbers[0],
    
    // Estimated values from email (if available)
    declaredValue: extractedData.estimatedValue || 50, // Default value
    declaredWeight: extractedData.weight || 1, // Default weight
    currency: extractedData.currency || "USD",
    
    // Shipping info
    shippingAddress: customer.shippingAddress || "",
    
    // Status
    status: orderStatus,
    shippingType: "immediate",
    courier: "Email Auto-Created",
    
    // Required fields
    labelPrinted: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  // Link the email to the new order
  await ctx.db.patch(emailId, {
    matchedOrderId: orderId,
  });

  console.log(`Auto-created order ${orderId} from email for customer ${customerId}`);
  return orderId;
}

// Forward email to customer's real email
export const forwardEmailToCustomer = mutation({
  args: {
    emailId: v.id("emailMessages"),
  },
  handler: async (ctx, { emailId }) => {
    const email = await ctx.db.get(emailId);
    if (!email) {
      throw new Error("Email not found");
    }

    const customerEmail = await ctx.db
      .query("customerEmailAddresses")
      .withIndex("by_customer", (q) => q.eq("customerId", email.customerId))
      .first();

    if (!customerEmail) {
      throw new Error("Customer email address not found");
    }

    // Mark as forwarded (actual forwarding would be done via Mailgun API in the webhook)
    await ctx.db.patch(emailId, {
      isForwarded: true,
      forwardedAt: Date.now(),
    });

    // Update stats
    await ctx.db.patch(customerEmail._id, {
      totalEmailsForwarded: customerEmail.totalEmailsForwarded + 1,
    });

    return {
      success: true,
      forwardToEmail: customerEmail.realEmail,
    };
  },
});

// Get emails for customer dashboard
export const getCustomerEmails = query({
  args: {
    customerId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { customerId, limit = 20 }) => {
    const emails = await ctx.db
      .query("emailMessages")
      .withIndex("by_customer", (q) => q.eq("customerId", customerId))
      .order("desc")
      .take(limit);

    return emails;
  },
});

// Get shipping emails (only confirmed shipping emails)
export const getShippingEmails = query({
  args: {
    customerId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { customerId, limit = 10 }) => {
    const emails = await ctx.db
      .query("emailMessages")
      .withIndex("by_customer", (q) => q.eq("customerId", customerId))
      .filter((q) => q.eq(q.field("isShippingEmail"), true))
      .order("desc")
      .take(limit);

    return emails;
  },
});

// Get email by tracking number
export const getEmailByTrackingNumber = query({
  args: {
    trackingNumber: v.string(),
  },
  handler: async (ctx, { trackingNumber }) => {
    // This is a simplified search - in production you might need a more sophisticated index
    const emails = await ctx.db
      .query("emailMessages")
      .filter((q) => q.eq(q.field("isShippingEmail"), true))
      .collect();

    return emails.find(email => 
      email.extractedData.trackingNumbers.includes(trackingNumber)
    );
  },
});

// Mark email as spam (for learning)
export const markEmailAsSpam = mutation({
  args: {
    emailId: v.id("emailMessages"),
    isSpam: v.boolean(),
  },
  handler: async (ctx, { emailId, isSpam }) => {
    await ctx.db.patch(emailId, {
      isShippingEmail: !isSpam,
      spamScore: isSpam ? 1 : 0,
    });

    return { success: true };
  },
});

// Get email statistics for customer
export const getEmailStats = query({
  args: { customerId: v.string() },
  handler: async (ctx, { customerId }) => {
    const customerEmail = await ctx.db
      .query("customerEmailAddresses")
      .withIndex("by_customer", (q) => q.eq("customerId", customerId))
      .first();

    if (!customerEmail) {
      return null;
    }

    const emails = await ctx.db
      .query("emailMessages")
      .withIndex("by_customer", (q) => q.eq("customerId", customerId))
      .collect();

    const shippingEmails = emails.filter(e => e.isShippingEmail);
    const spamEmails = emails.filter(e => !e.isShippingEmail);
    const matchedEmails = emails.filter(e => e.matchedOrderId);

    return {
      emailAddress: customerEmail.emailAddress,
      totalEmails: emails.length,
      shippingEmails: shippingEmails.length,
      spamEmails: spamEmails.length,
      matchedEmails: matchedEmails.length,
      totalReceived: customerEmail.totalEmailsReceived,
      totalForwarded: customerEmail.totalEmailsForwarded,
    };
  },
});

// Retroactively create orders from existing emails that don't have matched orders
export const createOrdersFromUnmatchedEmails = mutation({
  args: { customerId: v.string() },
  handler: async (ctx, { customerId }) => {
    // Get all shipping emails without matched orders
    const unmatchedEmails = await ctx.db
      .query("emailMessages")
      .filter((q) => q.eq(q.field("customerId"), customerId))
      .filter((q) => q.eq(q.field("isShippingEmail"), true))
      .filter((q) => q.eq(q.field("matchedOrderId"), undefined))
      .collect();

    const createdOrders = [];

    for (const email of unmatchedEmails) {
      if (email.extractedData.shopName && email.extractedData.trackingNumbers.length > 0) {
        const orderId = await createOrderFromEmail(ctx, email._id, customerId, email.extractedData, email);
        if (orderId) {
          createdOrders.push(orderId);
        }
      }
    }

    return { 
      createdCount: createdOrders.length,
      orderIds: createdOrders
    };
  },
});