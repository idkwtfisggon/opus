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

    // Try to match with existing orders if this is a shipping email
    if (args.isShippingEmail && args.extractedData.trackingNumbers.length > 0) {
      await matchEmailToOrder(ctx, emailId, customerId, args.extractedData);
    }

    return emailId;
  },
});

// Helper function to match email to existing orders
async function matchEmailToOrder(ctx: any, emailId: any, customerId: string, extractedData: any) {
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
      
      return;
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
    }
  }
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