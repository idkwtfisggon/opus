import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get orders for a forwarder with filtering and pagination
export const getForwarderOrders = query({
  args: { 
    forwarderId: v.string(),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    searchQuery: v.optional(v.string()),
    warehouseId: v.optional(v.string()),
  },
  handler: async (ctx, { forwarderId, status, limit = 20, offset = 0, searchQuery, warehouseId }) => {
    let query = ctx.db
      .query("orders")
      .withIndex("by_forwarder", (q) => q.eq("forwarderId", forwarderId));

    if (status) {
      query = ctx.db
        .query("orders")
        .withIndex("by_status", (q) => q.eq("status", status as any));
    }

    let orders = await query.collect();

    // Filter by forwarder if we used status index
    if (status) {
      orders = orders.filter(order => order.forwarderId === forwarderId);
    }

    // Filter by warehouse if specified
    if (warehouseId) {
      orders = orders.filter(order => order.warehouseId === warehouseId);
    }

    // Search functionality
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      orders = orders.filter(order => 
        order.trackingNumber.toLowerCase().includes(searchLower) ||
        order.customerName.toLowerCase().includes(searchLower) ||
        order.merchantName.toLowerCase().includes(searchLower)
      );
    }

    // Sort by creation time (newest first)
    orders.sort((a, b) => b.createdAt - a.createdAt);

    // Get warehouse details for each order
    const ordersWithWarehouses = await Promise.all(
      orders.map(async (order) => {
        const warehouse = await ctx.db.get(order.warehouseId as any);
        return {
          ...order,
          warehouse: warehouse ? {
            _id: warehouse._id,
            name: warehouse.name,
            city: warehouse.city,
            state: warehouse.state,
            country: warehouse.country,
          } : null,
        };
      })
    );

    // Apply pagination
    const total = ordersWithWarehouses.length;
    const paginatedOrders = limit === -1 ? ordersWithWarehouses : ordersWithWarehouses.slice(offset, offset + limit);

    return {
      orders: paginatedOrders,
      total,
      hasMore: limit !== -1 && (offset + limit) < total,
    };
  },
});

// Split order to different warehouse
export const splitOrderToWarehouse = mutation({
  args: {
    orderId: v.string(),
    targetWarehouseId: v.string(),
    items: v.array(v.object({
      description: v.string(),
      quantity: v.number(),
      weight: v.number(),
      value: v.number(),
    })),
    updatedBy: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { orderId, targetWarehouseId, items, updatedBy, notes }) => {
    const originalOrder = await ctx.db.get(orderId as any);
    if (!originalOrder) {
      throw new Error("Order not found");
    }

    // Verify target warehouse exists
    const targetWarehouse = await ctx.db.get(targetWarehouseId as any);
    if (!targetWarehouse) {
      throw new Error("Target warehouse not found");
    }

    // Calculate totals for split items
    const splitWeight = items.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
    const splitValue = items.reduce((sum, item) => sum + (item.value * item.quantity), 0);

    // Create new order for split items
    const newOrderId = await ctx.db.insert("orders", {
      customerId: originalOrder.customerId,
      customerName: originalOrder.customerName,
      customerEmail: originalOrder.customerEmail,
      customerPhone: originalOrder.customerPhone,
      shippingAddress: originalOrder.shippingAddress,
      trackingNumber: `${originalOrder.trackingNumber}-SPLIT-${Date.now()}`,
      merchantName: originalOrder.merchantName,
      merchantOrderId: originalOrder.merchantOrderId,
      declaredWeight: splitWeight,
      declaredValue: splitValue,
      currency: originalOrder.currency,
      packageDescription: items.map(item => `${item.quantity}x ${item.description}`).join(', '),
      specialInstructions: notes || `Split from ${originalOrder.trackingNumber}`,
      warehouseId: targetWarehouseId,
      forwarderId: originalOrder.forwarderId,
      status: "incoming",
      shippingType: originalOrder.shippingType,
      courier: originalOrder.courier,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Update original order to reflect the split
    await ctx.db.patch(originalOrder._id, {
      declaredWeight: Math.max(0, originalOrder.declaredWeight - splitWeight),
      declaredValue: Math.max(0, originalOrder.declaredValue - splitValue),
      specialInstructions: (originalOrder.specialInstructions || "") + 
        ` | Split: ${items.length} item(s) moved to ${targetWarehouse.name}`,
      updatedAt: Date.now(),
    });

    return { newOrderId, splitWeight, splitValue };
  },
});

// Get dashboard stats for forwarder
export const getForwarderStats = query({
  args: { forwarderId: v.string() },
  handler: async (ctx, { forwarderId }) => {
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_forwarder", (q) => q.eq("forwarderId", forwarderId))
      .collect();

    // Calculate stats based on Shibubu logic
    const pendingOrders = orders.filter(o => o.status === "incoming").length;
    const readyToShip = orders.filter(o => o.status === "awaiting_pickup").length;
    
    // Pending labels: orders that are packed/ready but haven't had labels printed
    const pendingLabels = orders.filter(o => 
      ["packed", "awaiting_pickup"].includes(o.status) && !o.labelPrinted
    ).length;
    
    // Get stale orders (>48h old and not progressing)
    const twoDaysAgo = Date.now() - (2 * 24 * 60 * 60 * 1000);
    const staleOrders = orders.filter(o => 
      ["incoming", "arrived_at_warehouse"].includes(o.status) && 
      o.createdAt < twoDaysAgo
    ).length;

    // Get forwarder profile for parcel limits
    const forwarder = await ctx.db.get(forwarderId as any);
    
    // Calculate monthly parcel usage
    const currentMonth = new Date();
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const ordersThisMonth = orders.filter(o => o.createdAt >= monthStart.getTime()).length;

    // Get warehouse capacity
    const warehouses = await ctx.db
      .query("warehouses")
      .withIndex("by_forwarder", (q) => q.eq("forwarderId", forwarderId))
      .collect();

    const totalCapacity = warehouses.reduce((sum, w) => sum + w.maxParcels, 0);
    const currentCapacity = warehouses.reduce((sum, w) => sum + w.currentCapacity, 0);
    const capacityUsed = totalCapacity > 0 ? Math.round((currentCapacity / totalCapacity) * 100) : 0;

    // Monthly parcel limit usage (use default values for now)
    const maxParcelsPerMonth = 500; // Default fallback
    const parcelLimitUsage = Math.round((ordersThisMonth / maxParcelsPerMonth) * 100);

    return {
      totalOrders: orders.length,
      pendingOrders,
      readyToShip,
      pendingLabels,
      staleOrders,
      capacityUsed,
      currentCapacity,
      totalCapacity,
      // Monthly parcel limits
      ordersThisMonth,
      maxParcelsPerMonth,
      parcelLimitUsage,
      maxParcelWeight: 50 // Default fallback
    };
  },
});

// Get recent orders for dashboard
export const getRecentOrders = query({
  args: { forwarderId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { forwarderId, limit = 5 }) => {
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_forwarder", (q) => q.eq("forwarderId", forwarderId))
      .order("desc")
      .take(limit);

    return orders;
  },
});

// Create a new order (manual entry or from API)
export const createOrder = mutation({
  args: {
    // Customer info
    customerId: v.string(),
    customerName: v.string(),
    customerEmail: v.string(),
    customerPhone: v.optional(v.string()),
    shippingAddress: v.string(),
    
    // Order details
    trackingNumber: v.string(),
    merchantName: v.string(),
    merchantOrderId: v.optional(v.string()),
    
    // Package details
    declaredWeight: v.number(),
    declaredValue: v.number(),
    currency: v.string(),
    dimensions: v.optional(v.string()),
    packageDescription: v.optional(v.string()),
    
    // Assignment
    warehouseId: v.string(),
    forwarderId: v.string(),
    shippingType: v.union(v.literal("immediate"), v.literal("consolidated")),
    
    // Courier (customer pre-assigned)
    courier: v.optional(v.string()),
    
    // Optional override for testing
    createdAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = args.createdAt || Date.now();
    
    const orderId = await ctx.db.insert("orders", {
      ...args,
      status: "incoming",
      labelPrinted: false,
      createdAt: now,
      updatedAt: now,
    });

    // Create history entry
    await ctx.db.insert("orderHistory", {
      orderId,
      newStatus: "incoming",
      updatedBy: args.customerId, // Could be the customer or forwarder
      notes: "Order created",
      timestamp: now,
    });

    return orderId;
  },
});

// Update order status
export const updateOrderStatus = mutation({
  args: {
    orderId: v.id("orders"),
    newStatus: v.union(
      v.literal("incoming"),
      v.literal("arrived_at_warehouse"),
      v.literal("packed"),
      v.literal("awaiting_pickup"),
      v.literal("in_transit"),
      v.literal("delivered")
    ),
    updatedBy: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { orderId, newStatus, updatedBy, notes }) => {
    const order = await ctx.db.get(orderId);
    if (!order) throw new Error("Order not found");

    const now = Date.now();
    const previousStatus = order.status;

    // Update the order
    const updateData: any = {
      status: newStatus,
      updatedAt: now,
    };

    // Set specific timestamps based on status
    if (newStatus === "arrived_at_warehouse" && !order.receivedAt) {
      updateData.receivedAt = now;
    } else if (newStatus === "packed" && !order.packedAt) {
      updateData.packedAt = now;
    } else if (newStatus === "in_transit" && !order.shippedAt) {
      updateData.shippedAt = now;
    } else if (newStatus === "delivered" && !order.deliveredAt) {
      updateData.deliveredAt = now;
    }

    await ctx.db.patch(orderId, updateData);

    // Create history entry
    await ctx.db.insert("orderHistory", {
      orderId,
      previousStatus,
      newStatus,
      updatedBy,
      notes,
      timestamp: now,
    });

    return orderId;
  },
});

// Assign courier to order
export const assignCourier = mutation({
  args: {
    orderId: v.id("orders"),
    courier: v.string(),
    courierTrackingNumber: v.optional(v.string()),
    updatedBy: v.string(),
  },
  handler: async (ctx, { orderId, courier, courierTrackingNumber, updatedBy }) => {
    const order = await ctx.db.get(orderId);
    if (!order) throw new Error("Order not found");

    await ctx.db.patch(orderId, {
      courier,
      courierTrackingNumber,
      updatedAt: Date.now(),
    });

    // Create history entry
    await ctx.db.insert("orderHistory", {
      orderId,
      previousStatus: order.status,
      newStatus: order.status,
      updatedBy,
      notes: `Courier assigned: ${courier}${courierTrackingNumber ? ` (${courierTrackingNumber})` : ''}`,
      timestamp: Date.now(),
    });

    return orderId;
  },
});

// Bulk assign courier
export const bulkAssignCourier = mutation({
  args: {
    orderIds: v.array(v.id("orders")),
    courier: v.string(),
    updatedBy: v.string(),
  },
  handler: async (ctx, { orderIds, courier, updatedBy }) => {
    const now = Date.now();
    
    for (const orderId of orderIds) {
      const order = await ctx.db.get(orderId);
      if (order) {
        await ctx.db.patch(orderId, {
          courier,
          updatedAt: now,
        });

        // Create history entry
        await ctx.db.insert("orderHistory", {
          orderId,
          previousStatus: order.status,
          newStatus: order.status,
          updatedBy,
          notes: `Bulk courier assigned: ${courier}`,
          timestamp: now,
        });
      }
    }

    return orderIds.length;
  },
});

// Mark label as printed
export const markLabelPrinted = mutation({
  args: {
    orderId: v.id("orders"),
    updatedBy: v.string(),
  },
  handler: async (ctx, { orderId, updatedBy }) => {
    const order = await ctx.db.get(orderId);
    if (!order) throw new Error("Order not found");

    await ctx.db.patch(orderId, {
      labelPrinted: true,
      updatedAt: Date.now(),
    });

    // Create history entry
    await ctx.db.insert("orderHistory", {
      orderId,
      previousStatus: order.status,
      newStatus: order.status,
      updatedBy,
      notes: "Label printed",
      timestamp: Date.now(),
    });

    return orderId;
  },
});

// Get order volume data for calendar view
export const getOrderVolume = query({
  args: { 
    forwarderId: v.string(),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, { forwarderId, startDate, endDate }) => {
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_forwarder", (q) => q.eq("forwarderId", forwarderId))
      .filter((q) => 
        q.and(
          q.gte(q.field("createdAt"), startDate),
          q.lte(q.field("createdAt"), endDate)
        )
      )
      .collect();

    // Group by date
    const volumeByDate: Record<string, number> = {};
    orders.forEach(order => {
      const dateKey = new Date(order.createdAt).toISOString().split('T')[0];
      volumeByDate[dateKey] = (volumeByDate[dateKey] || 0) + 1;
    });

    return volumeByDate;
  },
});