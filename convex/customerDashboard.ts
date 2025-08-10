import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get customer dashboard overview data
export const getCustomerDashboard = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    // Get customer user record
    const customer = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!customer || customer.role !== "customer") return null;

    const customerId = customer._id;

    // Get active orders (in progress)
    const activeOrders = await ctx.db
      .query("orders")
      .withIndex("by_customer", (q) => q.eq("customerId", customerId))
      .filter((q) => 
        q.or(
          q.eq(q.field("status"), "incoming"),
          q.eq(q.field("status"), "received"),
          q.eq(q.field("status"), "arrived_at_warehouse"),
          q.eq(q.field("status"), "packed"),
          q.eq(q.field("status"), "awaiting_pickup"),
          q.eq(q.field("status"), "shipped"),
          q.eq(q.field("status"), "in_transit")
        )
      )
      .order("desc")
      .take(10);

    // Get recent orders (last 30 days)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const recentOrders = await ctx.db
      .query("orders")
      .withIndex("by_customer", (q) => q.eq("customerId", customerId))
      .filter((q) => q.gte(q.field("createdAt"), thirtyDaysAgo))
      .order("desc")
      .take(5);

    // Get unread notifications
    const unreadNotifications = await ctx.db
      .query("customerNotifications")
      .withIndex("by_customer_unread", (q) => 
        q.eq("customerId", customerId).eq("isRead", false)
      )
      .order("desc")
      .take(5);

    // Get open support tickets
    const openSupportTickets = await ctx.db
      .query("supportTickets")
      .withIndex("by_customer", (q) => q.eq("customerId", customerId))
      .filter((q) => 
        q.or(
          q.eq(q.field("status"), "open"),
          q.eq(q.field("status"), "in_progress"),
          q.eq(q.field("status"), "waiting_customer")
        )
      )
      .order("desc")
      .take(3);

    // Get pending consolidation requests
    const pendingConsolidations = await ctx.db
      .query("consolidationRequests")
      .withIndex("by_customer", (q) => q.eq("customerId", customerId))
      .filter((q) => 
        q.or(
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("status"), "processing")
        )
      )
      .order("desc")
      .take(3);

    // Get favorite forwarders
    const favoriteForwarders = await ctx.db
      .query("customerFavoriteForwarders")
      .withIndex("by_customer", (q) => q.eq("customerId", customerId))
      .order("desc")
      .take(5);

    // Get default shipping address
    const defaultAddress = await ctx.db
      .query("customerAddresses")
      .withIndex("by_customer_default", (q) => 
        q.eq("customerId", customerId).eq("isDefault", true)
      )
      .unique();

    // Calculate this month's shipping cost
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);
    
    const thisMonthOrders = await ctx.db
      .query("orders")
      .withIndex("by_customer", (q) => q.eq("customerId", customerId))
      .filter((q) => q.gte(q.field("createdAt"), thisMonthStart.getTime()))
      .collect();

    const thisMonthSpend = thisMonthOrders.reduce((total, order) => {
      return total + order.declaredValue;
    }, 0);

    // Get upcoming deliveries (orders that are in transit)
    const upcomingDeliveries = await ctx.db
      .query("orders")
      .withIndex("by_customer", (q) => q.eq("customerId", customerId))
      .filter((q) => 
        q.or(
          q.eq(q.field("status"), "in_transit"),
          q.eq(q.field("status"), "shipped")
        )
      )
      .order("desc")
      .take(5);

    return {
      customer,
      activeOrders,
      recentOrders,
      unreadNotifications,
      openSupportTickets,
      pendingConsolidations,
      favoriteForwarders,
      defaultAddress,
      thisMonthSpend,
      upcomingDeliveries,
      stats: {
        activeOrdersCount: activeOrders.length,
        unreadNotificationsCount: unreadNotifications.length,
        openTicketsCount: openSupportTickets.length,
        pendingConsolidationsCount: pendingConsolidations.length,
      }
    };
  },
});

// Get customer's address book
export const getCustomerAddresses = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const customer = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!customer || customer.role !== "customer") return null;

    return await ctx.db
      .query("customerAddresses")
      .withIndex("by_customer_active", (q) => 
        q.eq("customerId", customer._id).eq("isActive", true)
      )
      .order("desc")
      .collect();
  },
});

// Add new shipping address
export const addCustomerAddress = mutation({
  args: {
    label: v.string(),
    recipientName: v.string(),
    address: v.string(),
    city: v.string(),
    state: v.optional(v.string()),
    country: v.string(),
    postalCode: v.string(),
    phoneNumber: v.optional(v.string()),
    isDefault: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const customer = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!customer || customer.role !== "customer") {
      throw new Error("Customer not found");
    }

    // If this is set as default, unset other defaults
    if (args.isDefault) {
      const existingAddresses = await ctx.db
        .query("customerAddresses")
        .withIndex("by_customer_default", (q) => 
          q.eq("customerId", customer._id).eq("isDefault", true)
        )
        .collect();

      for (const addr of existingAddresses) {
        await ctx.db.patch(addr._id, { isDefault: false });
      }
    }

    return await ctx.db.insert("customerAddresses", {
      customerId: customer._id,
      ...args,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Mark notification as read
export const markNotificationRead = mutation({
  args: { notificationId: v.id("customerNotifications") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) throw new Error("Notification not found");

    // Verify this notification belongs to the authenticated customer
    const customer = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!customer || notification.customerId !== customer._id) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.notificationId, {
      isRead: true,
      readAt: Date.now(),
    });
  },
});

// Create support ticket
export const createSupportTicket = mutation({
  args: {
    subject: v.string(),
    description: v.string(),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("urgent")),
    category: v.union(
      v.literal("tracking"),
      v.literal("billing"), 
      v.literal("damage_claim"),
      v.literal("general"),
      v.literal("technical")
    ),
    orderId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const customer = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!customer || customer.role !== "customer") {
      throw new Error("Customer not found");
    }

    return await ctx.db.insert("supportTickets", {
      customerId: customer._id,
      ...args,
      status: "open",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Add forwarder to favorites
export const addFavoriteForwarder = mutation({
  args: {
    forwarderId: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const customer = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!customer || customer.role !== "customer") {
      throw new Error("Customer not found");
    }

    // Check if already exists
    const existing = await ctx.db
      .query("customerFavoriteForwarders")
      .withIndex("by_customer", (q) => q.eq("customerId", customer._id))
      .filter((q) => q.eq(q.field("forwarderId"), args.forwarderId))
      .unique();

    if (existing) {
      throw new Error("Forwarder already in favorites");
    }

    return await ctx.db.insert("customerFavoriteForwarders", {
      customerId: customer._id,
      ...args,
      createdAt: Date.now(),
    });
  },
});