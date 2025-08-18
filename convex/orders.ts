import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get a single order by ID
export const getOrder = query({
  args: { orderId: v.string() },
  handler: async (ctx, { orderId }) => {
    return await ctx.db.get(orderId as any);
  },
});

// Get orders for a customer with email matching data
export const getCustomerOrders = query({
  args: { 
    customerId: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, { customerId, limit = 50, offset = 0 }) => {
    // Get authenticated user if no customerId provided
    if (!customerId) {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) return { orders: [], total: 0, hasMore: false };
      
      const customer = await ctx.db
        .query("users")
        .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
        .unique();
      
      if (!customer || customer.role !== "customer") {
        return { orders: [], total: 0, hasMore: false };
      }
      
      customerId = customer._id;
    }

    // Get orders for this customer
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_customer", (q) => q.eq("customerId", customerId))
      .order("desc")
      .collect();

    // Get email messages for tracking number/merchant matching
    const emailMessages = await ctx.db
      .query("emailMessages")
      .withIndex("by_customer", (q) => q.eq("customerId", customerId))
      .collect();

    // Enhance orders with email data and proper categorization
    const enhancedOrders = await Promise.all(
      orders.map(async (order) => {
        // Find matching email for this order
        const matchingEmail = emailMessages.find(email => 
          email.matchedOrderId === order._id ||
          email.extractedData.trackingNumbers.some(tn => tn === order.trackingNumber)
        );

        // Determine item category from email or set to "-"
        let itemCategory = "-";
        if (matchingEmail && matchingEmail.extractedData) {
          // Simple category inference based on shop name and extracted data
          const shopName = matchingEmail.extractedData.shopName?.toLowerCase() || "";
          if (shopName.includes("amazon") || shopName.includes("electronics")) {
            itemCategory = "Electronics";
          } else if (shopName.includes("nike") || shopName.includes("adidas") || shopName.includes("fashion")) {
            itemCategory = "Clothing & Accessories";
          } else if (shopName.includes("book")) {
            itemCategory = "Books & Media";
          } else if (matchingEmail.extractedData.shopName) {
            itemCategory = "General Merchandise";
          }
        }

        // Get warehouse details
        const warehouse = await ctx.db.get(order.warehouseId as any);
        const forwarder = await ctx.db.get(order.forwarderId as any);

        // Determine courier tracking number vs internal order ID
        const hasShipped = order.status === "in_transit" || order.status === "delivered";
        const courierTrackingNumber = hasShipped ? (order as any).courierTrackingNumber || "-" : "-";

        return {
          // Order identification
          _id: order._id,
          orderNumber: order._id, // Internal order ID
          trackingNumber: order.trackingNumber, // Internal tracking until shipped
          courierTrackingNumber, // Actual courier tracking (only when shipped)
          
          // Basic info
          merchantName: order.merchantName,
          status: order.status,
          
          // Package details from email or manual input
          itemCategory,
          declaredWeight: order.declaredWeight || null,
          declaredValue: order.declaredValue || null,
          currency: order.currency || "USD",
          
          // Enhanced with email data
          emailData: matchingEmail ? {
            shopName: matchingEmail.extractedData.shopName,
            estimatedValue: matchingEmail.extractedData.estimatedValue,
            currency: matchingEmail.extractedData.currency,
            weight: matchingEmail.extractedData.weight,
          } : null,
          
          // Location and service
          warehouse: warehouse ? {
            name: (warehouse as any).name,
            city: (warehouse as any).city,
            country: (warehouse as any).country,
          } : null,
          forwarder: forwarder ? {
            businessName: (forwarder as any).businessName,
          } : null,
          
          // Courier info
          courier: order.courier || "-",
          shippingType: order.shippingType,
          
          // Timestamps
          createdAt: order.createdAt,
          receivedAt: (order as any).receivedAt,
          shippedAt: (order as any).shippedAt,
          deliveredAt: (order as any).deliveredAt,
          
          // Destination
          shippingAddress: order.shippingAddress,
        };
      })
    );

    // Sort by creation time (newest first)
    enhancedOrders.sort((a, b) => b.createdAt - a.createdAt);

    // Apply pagination
    const total = enhancedOrders.length;
    const paginatedOrders = enhancedOrders.slice(offset, offset + limit);

    return {
      orders: paginatedOrders,
      total,
      hasMore: (offset + limit) < total,
    };
  },
});

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
      orders = orders.filter(order => (order as any).forwarderId === forwarderId);
    }

    // Filter by warehouse if specified
    if (warehouseId) {
      orders = orders.filter(order => (order as any).warehouseId === warehouseId);
    }

    // Search functionality
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      orders = orders.filter(order => 
        (order as any).trackingNumber.toLowerCase().includes(searchLower) ||
        (order as any).customerName.toLowerCase().includes(searchLower) ||
        (order as any).merchantName.toLowerCase().includes(searchLower)
      );
    }

    // Sort by creation time (newest first)
    orders.sort((a, b) => (b as any).createdAt - (a as any).createdAt);

    // Get warehouse details for each order
    const ordersWithWarehouses = await Promise.all(
      orders.map(async (order) => {
        const warehouse = await ctx.db.get((order as any).warehouseId as any);
        return {
          ...order,
          warehouse: warehouse ? {
            _id: warehouse._id,
            name: (warehouse as any).name,
            city: (warehouse as any).city,
            state: (warehouse as any).state,
            country: (warehouse as any).country,
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
      customerId: (originalOrder as any).customerId,
      customerName: (originalOrder as any).customerName,
      customerEmail: (originalOrder as any).customerEmail,
      customerPhone: (originalOrder as any).customerPhone,
      shippingAddress: (originalOrder as any).shippingAddress,
      trackingNumber: `${(originalOrder as any).trackingNumber}-SPLIT-${Date.now()}`,
      merchantName: (originalOrder as any).merchantName,
      merchantOrderId: (originalOrder as any).merchantOrderId,
      declaredWeight: splitWeight,
      declaredValue: splitValue,
      currency: (originalOrder as any).currency,
      packageDescription: items.map(item => `${item.quantity}x ${item.description}`).join(', '),
      specialInstructions: notes || `Split from ${(originalOrder as any).trackingNumber}`,
      warehouseId: targetWarehouseId,
      forwarderId: (originalOrder as any).forwarderId,
      status: "incoming",
      shippingType: (originalOrder as any).shippingType,
      courier: (originalOrder as any).courier,
      labelPrinted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Update original order to reflect the split
    await ctx.db.patch(originalOrder._id, {
      declaredWeight: Math.max(0, (originalOrder as any).declaredWeight - splitWeight),
      declaredValue: Math.max(0, (originalOrder as any).declaredValue - splitValue),
      specialInstructions: ((originalOrder as any).specialInstructions || "") + 
        ` | Split: ${items.length} item(s) moved to ${(targetWarehouse as any).name}`,
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
    const pendingOrders = orders.filter(o => (o as any).status === "incoming").length;
    const readyToShip = orders.filter(o => (o as any).status === "awaiting_pickup").length;
    
    // Pending labels: orders that are packed/ready but haven't had labels printed
    const pendingLabels = orders.filter(o => 
      ["packed", "awaiting_pickup"].includes((o as any).status) && !(o as any).labelPrinted
    ).length;
    
    // Get stale orders (>48h old and not progressing)
    const twoDaysAgo = Date.now() - (2 * 24 * 60 * 60 * 1000);
    const staleOrders = orders.filter(o => 
      ["incoming", "arrived_at_warehouse"].includes((o as any).status) && 
      (o as any).createdAt < twoDaysAgo
    ).length;

    // Get forwarder profile for parcel limits
    const forwarder = await ctx.db.get(forwarderId as any);
    
    // Calculate monthly parcel usage
    const currentMonth = new Date();
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const ordersThisMonth = orders.filter(o => (o as any).createdAt >= monthStart.getTime()).length;

    // Get warehouse capacity
    const warehouses = await ctx.db
      .query("warehouses")
      .withIndex("by_forwarder", (q) => q.eq("forwarderId", forwarderId))
      .collect();

    const totalCapacity = warehouses.reduce((sum, w) => sum + (w as any).maxParcels, 0);
    const currentCapacity = warehouses.reduce((sum, w) => sum + (w as any).currentCapacity, 0);
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
    await ctx.db.insert("orderStatusHistory", {
      orderId,
      previousStatus: "",
      newStatus: "incoming",
      changedBy: args.customerId, // Could be the customer or forwarder
      changedByType: "system" as "forwarder" | "staff" | "system",
      notes: "Order created",
      changedAt: now,
    });

    return orderId;
  },
});

// Update order status (admin version with more parameters)
export const updateOrderStatus = mutation({
  args: {
    orderId: v.string(),
    newStatus: v.string(),
    notes: v.optional(v.string()),
    changedBy: v.string(),
    changedByType: v.union(v.literal("forwarder"), v.literal("staff"), v.literal("system")),
    scanData: v.optional(v.object({
      barcodeValue: v.string(),
      location: v.string(),
      deviceInfo: v.string(),
    })),
  },
  handler: async (ctx, { orderId, newStatus, notes, changedBy, changedByType, scanData }) => {
    const order = await ctx.db.get(orderId as any);
    if (!order) throw new Error("Order not found");

    const now = Date.now();
    const previousStatus = (order as any).status;

    // Update the order
    const updateData: any = {
      status: newStatus,
      updatedAt: now,
    };

    // Set specific timestamps based on status
    if (newStatus === "arrived_at_warehouse" && !(order as any).receivedAt) {
      updateData.receivedAt = now;
    } else if (newStatus === "packed" && !(order as any).packedAt) {
      updateData.packedAt = now;
    } else if (newStatus === "awaiting_pickup" && !(order as any).awaitingPickupAt) {
      updateData.awaitingPickupAt = now;
    } else if (newStatus === "in_transit" && !(order as any).shippedAt) {
      updateData.shippedAt = now;
    } else if (newStatus === "delivered" && !(order as any).deliveredAt) {
      updateData.deliveredAt = now;
    }

    await ctx.db.patch(orderId as any, updateData);

    // Create history entry
    await ctx.db.insert("orderStatusHistory", {
      orderId,
      previousStatus,
      newStatus,
      changedBy,
      changedByType,
      notes: notes || `Status updated by ${changedByType}`,
      scanData,
      changedAt: now,
    });

    return { success: true, previousStatus, newStatus };
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
    await ctx.db.insert("orderStatusHistory", {
      orderId,
      previousStatus: (order as any).status,
      newStatus: (order as any).status,
      changedBy: updatedBy,
      changedByType: "staff",
      notes: `Courier assigned: ${courier}${courierTrackingNumber ? ` (${courierTrackingNumber})` : ''}`,
      changedAt: Date.now(),
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
        await ctx.db.insert("orderStatusHistory", {
          orderId,
          previousStatus: (order as any).status,
          newStatus: (order as any).status,
          changedBy: updatedBy,
          changedByType: "staff",
          notes: `Bulk courier assigned: ${courier}`,
          changedAt: now,
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
    await ctx.db.insert("orderStatusHistory", {
      orderId,
      previousStatus: (order as any).status,
      newStatus: (order as any).status,
      changedBy: updatedBy,
      changedByType: "staff",
      notes: "Label printed",
      changedAt: Date.now(),
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
      const dateKey = new Date((order as any).createdAt).toISOString().split('T')[0];
      volumeByDate[dateKey] = (volumeByDate[dateKey] || 0) + 1;
    });

    return volumeByDate;
  },
});

// Simple function to get all orders for a forwarder (for dropdowns, QR generator, etc.)
export const getOrdersForForwarder = query({
  args: { 
    forwarderId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { forwarderId, limit = 100 }) => {
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_forwarder", (q) => q.eq("forwarderId", forwarderId))
      .order("desc")
      .take(limit);

    return orders;
  },
});

// Delete an order and its related data
export const deleteOrder = mutation({
  args: { 
    orderId: v.string(),
    forwarderId: v.string(), // For permission check
  },
  handler: async (ctx, { orderId, forwarderId }) => {
    // First, get the order to verify ownership
    const order = await ctx.db.get(orderId as any);
    
    if (!order) {
      throw new Error("Order not found");
    }
    
    if ((order as any).forwarderId !== forwarderId) {
      throw new Error("Unauthorized: Order does not belong to this forwarder");
    }
    
    // Delete related parcel conditions
    const parcelConditions = await ctx.db
      .query("parcelConditions")
      .filter((q) => q.eq(q.field("orderId"), orderId))
      .collect();
    
    for (const condition of parcelConditions) {
      await ctx.db.delete(condition._id);
    }
    
    // Delete order history
    const orderHistory = await ctx.db
      .query("orderStatusHistory")
      .filter((q) => q.eq(q.field("orderId"), orderId))
      .collect();
    
    for (const history of orderHistory) {
      await ctx.db.delete(history._id);
    }
    
    // Finally, delete the order itself
    await ctx.db.delete(orderId as any);
    
    return { success: true };
  },
});