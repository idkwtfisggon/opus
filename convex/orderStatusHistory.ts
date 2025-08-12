import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get complete status history for an order
export const getOrderStatusHistory = query({
  args: { orderId: v.string() },
  handler: async (ctx, { orderId }) => {
    const history = await ctx.db
      .query("orderStatusHistory")
      .withIndex("by_order", (q) => q.eq("orderId", orderId))
      .collect();

    // Sort by timestamp (oldest first for timeline view)
    return history.sort((a, b) => a.changedAt - b.changedAt);
  },
});

// Get recent status updates for a forwarder (admin feed)
export const getRecentStatusUpdates = query({
  args: { 
    forwarderId: v.string(),
    limit: v.optional(v.number()),
    warehouseId: v.optional(v.string()),
    staffId: v.optional(v.string())
  },
  handler: async (ctx, { forwarderId, limit = 50, warehouseId, staffId }) => {
    // Get all orders for the forwarder
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_forwarder", (q) => q.eq("forwarderId", forwarderId))
      .collect();

    const orderIds = orders.map(o => o._id);

    // Get recent status history for these orders
    let historyQuery = ctx.db
      .query("orderStatusHistory")
      .withIndex("by_timestamp", (q) => q.gte("changedAt", Date.now() - 7 * 24 * 60 * 60 * 1000)); // Last 7 days

    let allHistory = await historyQuery.collect();

    // Filter by orders belonging to this forwarder
    let filteredHistory = allHistory.filter(h => orderIds.includes(h.orderId as any));

    // Filter by warehouse if specified
    if (warehouseId) {
      const warehouseOrders = orders.filter(o => o.warehouseId === warehouseId);
      const warehouseOrderIds = warehouseOrders.map(o => o._id);
      filteredHistory = filteredHistory.filter(h => warehouseOrderIds.includes(h.orderId as any));
    }

    // Filter by staff if specified
    if (staffId) {
      filteredHistory = filteredHistory.filter(h => h.changedBy === staffId);
    }

    // Sort by most recent first and limit
    filteredHistory.sort((a, b) => b.changedAt - a.changedAt);

    // Get order details for each history entry
    const historyWithOrderDetails = await Promise.all(
      filteredHistory.slice(0, limit).map(async (historyEntry) => {
        const order = orders.find(o => o._id === historyEntry.orderId);
        
        return {
          ...historyEntry,
          order: order ? {
            _id: order._id,
            trackingNumber: order.trackingNumber,
            customerName: order.customerName,
            merchantName: order.merchantName
          } : null
        };
      })
    );

    return historyWithOrderDetails;
  },
});

// Update order status with staff tracking and scan data
export const updateOrderStatusWithTracking = mutation({
  args: {
    orderId: v.string(),
    newStatus: v.union(
      v.literal("incoming"),
      v.literal("received"),
      v.literal("arrived_at_warehouse"),
      v.literal("packed"),
      v.literal("awaiting_pickup"),
      v.literal("shipped"),
      v.literal("in_transit"),
      v.literal("delivered")
    ),
    changedBy: v.string(), // Staff ID, forwarder ID, or "system"
    changedByType: v.union(
      v.literal("staff"),
      v.literal("forwarder"),
      v.literal("system")
    ),
    notes: v.optional(v.string()),
    scanData: v.optional(v.object({
      barcodeValue: v.string(),
      location: v.string(),
      deviceInfo: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const { orderId, newStatus, changedBy, changedByType, notes, scanData } = args;
    const now = Date.now();

    // Get current order
    const order = await ctx.db.get(orderId as any);
    if (!order) {
      throw new Error("Order not found");
    }

    const previousStatus = order.status;

    // Get staff and warehouse names for caching
    let staffName: string | undefined;
    let warehouseName: string | undefined;

    if (changedByType === "staff") {
      const staff = await ctx.db.get(changedBy as any);
      staffName = staff?.name;
    }

    const warehouse = await ctx.db.get(order.warehouseId as any);
    warehouseName = warehouse?.name;

    // Update order status
    await ctx.db.patch(orderId as any, {
      status: newStatus,
      updatedAt: now,
      // Update specific timestamps based on status
      ...(newStatus === "arrived_at_warehouse" && { receivedAt: now }),
      ...(newStatus === "packed" && { packedAt: now }),
      ...(newStatus === "shipped" || newStatus === "in_transit" && { shippedAt: now }),
      ...(newStatus === "delivered" && { deliveredAt: now }),
    });

    // Create status history entry
    const historyId = await ctx.db.insert("orderStatusHistory", {
      orderId,
      previousStatus,
      newStatus,
      changedBy,
      changedByType,
      staffName,
      warehouseName,
      notes,
      scanData,
      changedAt: now,
    });

    // Log staff activity if changed by staff
    if (changedByType === "staff") {
      await ctx.db.insert("staffActivity", {
        staffId: changedBy,
        forwarderId: order.forwarderId,
        warehouseId: order.warehouseId,
        activityType: scanData ? "scan" : "status_update",
        orderId,
        details: {
          oldStatus: previousStatus,
          newStatus,
          scanLocation: scanData?.location,
        },
        timestamp: now,
      });
    }

    return { historyId, orderId };
  },
});

// Log staff scan without status change (for tracking scans that don't update status)
export const logStaffScan = mutation({
  args: {
    staffId: v.string(),
    orderId: v.string(),
    scanData: v.object({
      barcodeValue: v.string(),
      location: v.string(),
      deviceInfo: v.string(),
    }),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { staffId, orderId, scanData, notes }) => {
    const now = Date.now();

    // Get order and staff details
    const [order, staff] = await Promise.all([
      ctx.db.get(orderId as any),
      ctx.db.get(staffId as any)
    ]);

    if (!order || !staff) {
      throw new Error("Order or staff not found");
    }

    // Verify staff has access to this warehouse
    if (!staff.assignedWarehouses.includes(order.warehouseId)) {
      throw new Error("Staff member does not have access to this warehouse");
    }

    // Log the scan activity
    const activityId = await ctx.db.insert("staffActivity", {
      staffId,
      forwarderId: order.forwarderId,
      warehouseId: order.warehouseId,
      activityType: "scan",
      orderId,
      details: {
        scanLocation: scanData.location,
      },
      timestamp: now,
    });

    // Optionally create a history entry for the scan (without status change)
    const historyId = await ctx.db.insert("orderStatusHistory", {
      orderId,
      previousStatus: order.status,
      newStatus: order.status, // Same status
      changedBy: staffId,
      changedByType: "staff",
      staffName: staff.name,
      warehouseName: (await ctx.db.get(order.warehouseId as any))?.name,
      notes: notes || "Package scanned",
      scanData,
      changedAt: now,
    });

    return { activityId, historyId };
  },
});

// Get status update statistics for admin dashboard
export const getStatusUpdateStats = query({
  args: { 
    forwarderId: v.string(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number())
  },
  handler: async (ctx, { forwarderId, startDate, endDate }) => {
    const now = Date.now();
    const defaultStartDate = startDate || (now - 24 * 60 * 60 * 1000); // Last 24 hours
    const defaultEndDate = endDate || now;

    // Get all orders for the forwarder
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_forwarder", (q) => q.eq("forwarderId", forwarderId))
      .collect();

    const orderIds = orders.map(o => o._id);

    // Get status history for the time period
    const history = await ctx.db
      .query("orderStatusHistory")
      .withIndex("by_timestamp", (q) => q.gte("changedAt", defaultStartDate))
      .filter((q) => q.lte(q.field("changedAt"), defaultEndDate))
      .collect();

    const filteredHistory = history.filter(h => orderIds.includes(h.orderId as any));

    // Calculate statistics
    const totalUpdates = filteredHistory.length;
    const staffUpdates = filteredHistory.filter(h => h.changedByType === "staff").length;
    const systemUpdates = filteredHistory.filter(h => h.changedByType === "system").length;
    const scansWithData = filteredHistory.filter(h => h.scanData).length;

    // Status breakdown
    const statusBreakdown: Record<string, number> = {};
    filteredHistory.forEach(h => {
      statusBreakdown[h.newStatus] = (statusBreakdown[h.newStatus] || 0) + 1;
    });

    // Staff activity breakdown
    const staffBreakdown: Record<string, number> = {};
    filteredHistory.forEach(h => {
      if (h.changedByType === "staff" && h.staffName) {
        staffBreakdown[h.staffName] = (staffBreakdown[h.staffName] || 0) + 1;
      }
    });

    return {
      totalUpdates,
      staffUpdates,
      systemUpdates,
      scansWithData,
      statusBreakdown: Object.entries(statusBreakdown)
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count),
      staffBreakdown: Object.entries(staffBreakdown)
        .map(([staffName, count]) => ({ staffName, count }))
        .sort((a, b) => b.count - a.count),
    };
  },
});