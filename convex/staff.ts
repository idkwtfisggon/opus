import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all staff for a forwarder
export const getForwarderStaff = query({
  args: { forwarderId: v.string() },
  handler: async (ctx, { forwarderId }) => {
    const staff = await ctx.db
      .query("staff")
      .withIndex("by_forwarder", (q) => q.eq("forwarderId", forwarderId))
      .collect();

    // Get warehouse names for each staff member
    const staffWithWarehouses = await Promise.all(
      staff.map(async (staffMember) => {
        const warehouses = await Promise.all(
          staffMember.assignedWarehouses.map(async (warehouseId) => {
            const warehouse = await ctx.db.get(warehouseId as any);
            return warehouse ? {
              _id: warehouse._id,
              name: warehouse.name,
              city: warehouse.city,
              state: warehouse.state
            } : null;
          })
        );

        return {
          ...staffMember,
          warehouses: warehouses.filter(Boolean)
        };
      })
    );

    return staffWithWarehouses;
  },
});

// Get staff by user ID (for authentication)
export const getStaffByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const staff = await ctx.db
      .query("staff")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!staff) return null;

    // Get assigned warehouses details
    const warehouses = await Promise.all(
      staff.assignedWarehouses.map(async (warehouseId) => {
        const warehouse = await ctx.db.get(warehouseId as any);
        return warehouse ? {
          _id: warehouse._id,
          name: warehouse.name,
          city: warehouse.city,
          state: warehouse.state,
          country: warehouse.country
        } : null;
      })
    );

    return {
      ...staff,
      warehouses: warehouses.filter(Boolean)
    };
  },
});

// Create new staff member
export const createStaff = mutation({
  args: {
    forwarderId: v.string(),
    userId: v.string(),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    role: v.union(
      v.literal("warehouse_worker"),
      v.literal("supervisor"),
      v.literal("manager")
    ),
    assignedWarehouses: v.array(v.string()),
    permissions: v.object({
      canUpdateOrderStatus: v.boolean(),
      canPrintLabels: v.boolean(),
      canScanBarcodes: v.boolean(),
      canViewReports: v.boolean(),
    }),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if staff member already exists
    const existing = await ctx.db
      .query("staff")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      throw new Error("Staff member with this user ID already exists");
    }

    // Verify warehouses belong to the forwarder
    const warehouses = await Promise.all(
      args.assignedWarehouses.map(warehouseId =>
        ctx.db.get(warehouseId as any)
      )
    );

    const invalidWarehouses = warehouses.some(
      (warehouse, index) => !warehouse || warehouse.forwarderId !== args.forwarderId
    );

    if (invalidWarehouses) {
      throw new Error("One or more warehouses do not belong to this forwarder");
    }

    const staffId = await ctx.db.insert("staff", {
      ...args,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return staffId;
  },
});

// Update staff member
export const updateStaff = mutation({
  args: {
    staffId: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    role: v.optional(v.union(
      v.literal("warehouse_worker"),
      v.literal("supervisor"),
      v.literal("manager")
    )),
    assignedWarehouses: v.optional(v.array(v.string())),
    permissions: v.optional(v.object({
      canUpdateOrderStatus: v.boolean(),
      canPrintLabels: v.boolean(),
      canScanBarcodes: v.boolean(),
      canViewReports: v.boolean(),
    })),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, { staffId, ...updates }) => {
    const staff = await ctx.db.get(staffId as any);
    if (!staff) {
      throw new Error("Staff member not found");
    }

    // If updating assigned warehouses, verify they belong to the forwarder
    if (updates.assignedWarehouses) {
      const warehouses = await Promise.all(
        updates.assignedWarehouses.map(warehouseId =>
          ctx.db.get(warehouseId as any)
        )
      );

      const invalidWarehouses = warehouses.some(
        warehouse => !warehouse || warehouse.forwarderId !== staff.forwarderId
      );

      if (invalidWarehouses) {
        throw new Error("One or more warehouses do not belong to this forwarder");
      }
    }

    await ctx.db.patch(staffId as any, {
      ...updates,
      updatedAt: Date.now(),
    });

    return staffId;
  },
});

// Delete/deactivate staff member
export const deactivateStaff = mutation({
  args: { staffId: v.string() },
  handler: async (ctx, { staffId }) => {
    const staff = await ctx.db.get(staffId as any);
    if (!staff) {
      throw new Error("Staff member not found");
    }

    await ctx.db.patch(staffId as any, {
      isActive: false,
      updatedAt: Date.now(),
    });

    return staffId;
  },
});

// Get orders for staff member (filtered by assigned warehouses)
export const getOrdersForStaff = query({
  args: { 
    staffId: v.string(),
    status: v.optional(v.string()),
    limit: v.optional(v.number())
  },
  handler: async (ctx, { staffId, status, limit = 50 }) => {
    const staff = await ctx.db.get(staffId as any);
    if (!staff || !staff.isActive) {
      return [];
    }

    // Get orders from assigned warehouses only
    let ordersQuery = ctx.db
      .query("orders")
      .withIndex("by_forwarder", (q) => q.eq("forwarderId", staff.forwarderId));

    const allOrders = await ordersQuery.collect();

    // Filter by assigned warehouses and status
    let filteredOrders = allOrders.filter(order => 
      staff.assignedWarehouses.includes(order.warehouseId)
    );

    if (status) {
      filteredOrders = filteredOrders.filter(order => order.status === status);
    }

    // Sort by most recent first and limit
    filteredOrders.sort((a, b) => b.createdAt - a.createdAt);
    
    return filteredOrders.slice(0, limit);
  },
});

// Debug query to find orders by tracking number OR order ID (for troubleshooting)
export const findOrderByTrackingNumber = query({
  args: { 
    trackingNumber: v.string(),
    orderId: v.optional(v.string()),
    forwarderId: v.string()
  },
  handler: async (ctx, { trackingNumber, orderId, forwarderId }) => {
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_forwarder", (q) => q.eq("forwarderId", forwarderId))
      .collect();

    const matchingOrders = orders.filter(order => 
      order.trackingNumber === trackingNumber ||
      (orderId && order._id === orderId)
    );

    if (matchingOrders.length === 0) {
      return { 
        found: false, 
        message: "No orders with this tracking number or ID",
        totalOrdersInForwarder: orders.length,
        searchedFor: { trackingNumber, orderId }
      };
    }

    const order = matchingOrders[0];
    const warehouse = await ctx.db.get(order.warehouseId as any);

    return {
      found: true,
      order: {
        _id: order._id,
        trackingNumber: order.trackingNumber,
        customerName: order.customerName,
        status: order.status,
        forwarderId: order.forwarderId
      },
      warehouseName: warehouse?.name || "Unknown",
      warehouseId: order.warehouseId
    };
  },
});

// Find order anywhere in the system (ignore forwarder)
export const findOrderAnywhere = query({
  args: { 
    trackingNumber: v.string(),
    orderId: v.optional(v.string())
  },
  handler: async (ctx, { trackingNumber, orderId }) => {
    const orders = await ctx.db
      .query("orders")
      .collect();

    const matchingOrder = orders.find(order => 
      order.trackingNumber === trackingNumber ||
      (orderId && order._id === orderId)
    );

    if (!matchingOrder) {
      return { found: false, totalOrders: orders.length };
    }

    const warehouse = await ctx.db.get(matchingOrder.warehouseId as any);

    return {
      found: true,
      order: {
        trackingNumber: matchingOrder.trackingNumber,
        forwarderId: matchingOrder.forwarderId,
        warehouseId: matchingOrder.warehouseId
      },
      warehouseName: warehouse?.name || "Unknown"
    };
  },
});

// Direct order lookup by ID or tracking number
export const directOrderLookup = query({
  args: { 
    orderId: v.optional(v.string()),
    trackingNumber: v.optional(v.string())
  },
  handler: async (ctx, { orderId, trackingNumber }) => {
    try {
      let order = null;
      
      if (orderId) {
        order = await ctx.db.get(orderId as any);
      }
      
      if (!order && trackingNumber) {
        const orders = await ctx.db.query("orders").collect();
        order = orders.find(o => o.trackingNumber === trackingNumber);
      }
      
      if (!order) {
        const allOrders = await ctx.db.query("orders").collect();
        return { 
          found: false, 
          totalOrders: allOrders.length,
          searchedFor: { orderId, trackingNumber }
        };
      }
      
      const warehouse = await ctx.db.get(order.warehouseId as any);
      
      return {
        found: true,
        order: {
          _id: order._id,
          trackingNumber: order.trackingNumber,
          forwarderId: order.forwarderId,
          warehouseId: order.warehouseId,
          customerName: order.customerName
        },
        warehouse: {
          _id: warehouse?._id,
          name: warehouse?.name
        }
      };
    } catch (error) {
      return { error: error.message };
    }
  },
});

// Debug staff warehouse assignments vs actual orders
export const debugStaffWarehouseAssignments = query({
  args: { staffId: v.string() },
  handler: async (ctx, { staffId }) => {
    try {
      const staff = await ctx.db.get(staffId as any);
      if (!staff) return { error: "Staff not found" };

      // Get all orders for this forwarder
      const allOrders = await ctx.db
        .query("orders")
        .withIndex("by_forwarder", (q) => q.eq("forwarderId", staff.forwarderId))
        .collect();

      // Get unique warehouse IDs from orders
      const orderWarehouseIds = [...new Set(allOrders.map(o => o.warehouseId))];

      // Get warehouse names
      const warehouses = await Promise.all(
        orderWarehouseIds.map(async (id) => {
          try {
            const w = await ctx.db.get(id as any);
            return { id, name: w?.name || "Unknown" };
          } catch (e) {
            return { id, name: "Error loading" };
          }
        })
      );

      // Get staff assigned warehouse names
      const assignedWarehouses = await Promise.all(
        staff.assignedWarehouses.map(async (id) => {
          try {
            const w = await ctx.db.get(id as any);
            return { id, name: w?.name || "Unknown" };
          } catch (e) {
            return { id, name: "Error loading" };
          }
        })
      );

      return {
        staffId: staff._id,
        staffName: staff.name,
        forwarderId: staff.forwarderId,
        totalOrdersInForwarder: allOrders.length,
        assignedWarehouses,
        orderWarehouses: warehouses,
        warehouseIdMatch: staff.assignedWarehouses.some(id => 
          orderWarehouseIds.includes(id)
        ),
        rawStaffWarehouses: staff.assignedWarehouses,
        rawOrderWarehouses: orderWarehouseIds
      };
    } catch (error) {
      return { 
        error: `Debug query failed: ${error.message}`,
        staffId 
      };
    }
  },
});

// Get staff activity for a forwarder (admin view)
export const getStaffActivity = query({
  args: { 
    forwarderId: v.string(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    staffId: v.optional(v.string()),
    limit: v.optional(v.number())
  },
  handler: async (ctx, { forwarderId, startDate, endDate, staffId, limit = 100 }) => {
    const now = Date.now();
    const defaultStartDate = startDate || (now - 24 * 60 * 60 * 1000); // Last 24 hours
    const defaultEndDate = endDate || now;

    let activityQuery = ctx.db
      .query("staffActivity")
      .withIndex("by_forwarder", (q) => q.eq("forwarderId", forwarderId))
      .filter((q) => q.gte(q.field("timestamp"), defaultStartDate))
      .filter((q) => q.lte(q.field("timestamp"), defaultEndDate));

    const activities = await activityQuery.collect();

    // Filter by specific staff if requested
    let filteredActivities = activities;
    if (staffId) {
      filteredActivities = activities.filter(activity => activity.staffId === staffId);
    }

    // Sort by most recent first and limit
    filteredActivities.sort((a, b) => b.timestamp - a.timestamp);
    
    // Get staff and warehouse names for each activity
    const activitiesWithDetails = await Promise.all(
      filteredActivities.slice(0, limit).map(async (activity) => {
        const [staff, warehouse] = await Promise.all([
          ctx.db.get(activity.staffId as any),
          ctx.db.get(activity.warehouseId as any)
        ]);

        return {
          ...activity,
          staffName: staff?.name || "Unknown Staff",
          warehouseName: warehouse?.name || "Unknown Warehouse"
        };
      })
    );

    return activitiesWithDetails;
  },
});

// Get staff performance metrics
export const getStaffPerformanceMetrics = query({
  args: { 
    forwarderId: v.string(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number())
  },
  handler: async (ctx, { forwarderId, startDate, endDate }) => {
    const now = Date.now();
    const defaultStartDate = startDate || (now - 7 * 24 * 60 * 60 * 1000); // Last 7 days
    const defaultEndDate = endDate || now;

    // Get all staff for the forwarder
    const staff = await ctx.db
      .query("staff")
      .withIndex("by_forwarder", (q) => q.eq("forwarderId", forwarderId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Get activities for the period
    const activities = await ctx.db
      .query("staffActivity")
      .withIndex("by_forwarder", (q) => q.eq("forwarderId", forwarderId))
      .filter((q) => q.gte(q.field("timestamp"), defaultStartDate))
      .filter((q) => q.lte(q.field("timestamp"), defaultEndDate))
      .collect();

    // Calculate metrics per staff member
    const staffMetrics = staff.map(staffMember => {
      const staffActivities = activities.filter(a => a.staffId === staffMember._id);
      const scans = staffActivities.filter(a => a.activityType === "scan").length;
      const statusUpdates = staffActivities.filter(a => a.activityType === "status_update").length;
      const ordersProcessed = new Set(staffActivities.map(a => a.orderId).filter(Boolean)).size;

      // Calculate average processing time
      const processingTimes = staffActivities
        .map(a => a.details?.processingTimeSeconds)
        .filter(Boolean) as number[];
      
      const avgProcessingTime = processingTimes.length > 0 
        ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length 
        : 0;

      return {
        staffId: staffMember._id,
        name: staffMember.name,
        role: staffMember.role,
        scans,
        statusUpdates,
        ordersProcessed,
        avgProcessingTime: Math.round(avgProcessingTime),
        totalActivities: staffActivities.length,
        assignedWarehouses: staffMember.assignedWarehouses.length
      };
    });

    return {
      totalStaff: staff.length,
      activeStaffToday: staffMetrics.filter(s => s.totalActivities > 0).length,
      totalScans: staffMetrics.reduce((sum, s) => sum + s.scans, 0),
      totalStatusUpdates: staffMetrics.reduce((sum, s) => sum + s.statusUpdates, 0),
      staffMetrics: staffMetrics.sort((a, b) => b.totalActivities - a.totalActivities)
    };
  },
});

// Generate invite code for staff
export const generateStaffInviteCode = mutation({
  args: { 
    forwarderId: v.string(),
    warehouseId: v.string(),
    name: v.string(),
    email: v.string(),
    role: v.union(
      v.literal("warehouse_worker"),
      v.literal("supervisor"),
      v.literal("manager")
    ),
    permissions: v.object({
      canUpdateOrderStatus: v.boolean(),
      canPrintLabels: v.boolean(),
      canScanBarcodes: v.boolean(),
      canViewReports: v.boolean(),
    }),
  },
  handler: async (ctx, args) => {
    // Generate a unique invite code
    const inviteCode = `WH-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    // Store invite in database with expiration (7 days)
    const expiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000);
    
    const inviteId = await ctx.db.insert("staffInvites", {
      forwarderId: args.forwarderId,
      warehouseId: args.warehouseId,
      inviteCode,
      name: args.name,
      email: args.email,
      role: args.role,
      permissions: args.permissions,
      isUsed: false,
      expiresAt,
      createdAt: Date.now(),
    });
    
    return { inviteCode, inviteId, expiresAt };
  },
});

// Join staff with invite code
export const joinWithInviteCode = mutation({
  args: {
    inviteCode: v.string(),
    userId: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the invite
    const invite = await ctx.db
      .query("staffInvites")
      .filter((q) => q.eq(q.field("inviteCode"), args.inviteCode))
      .filter((q) => q.eq(q.field("isUsed"), false))
      .first();
    
    if (!invite) {
      throw new Error("Invalid or expired invite code");
    }
    
    if (invite.expiresAt < Date.now()) {
      throw new Error("Invite code has expired");
    }
    
    // Validate that the user's email matches the invite email
    if (args.email.toLowerCase() !== invite.email.toLowerCase()) {
      throw new Error("This invite code was created for a different email address");
    }
    
    // Check if user already exists as staff
    const existingStaff = await ctx.db
      .query("staff")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    
    if (existingStaff) {
      throw new Error("You are already registered as staff");
    }
    
    // Create staff record using name from invite and validated email
    const staffId = await ctx.db.insert("staff", {
      forwarderId: invite.forwarderId,
      userId: args.userId,
      name: invite.name, // Use name from invite
      email: invite.email, // Use email from invite (already validated)
      role: invite.role,
      assignedWarehouses: [invite.warehouseId],
      permissions: invite.permissions,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    // Mark invite as used
    await ctx.db.patch(invite._id, {
      isUsed: true,
      usedAt: Date.now(),
      usedBy: args.userId,
    });
    
    return { staffId, message: "Successfully joined warehouse team!" };
  },
});

// Status progression helper - defines valid status transitions
// Flow: incoming → arrived_at_warehouse → packed → awaiting_pickup → in_transit → delivered
const STATUS_PROGRESSION = {
  "incoming": ["arrived_at_warehouse"],
  "arrived_at_warehouse": ["packed"], // arrived in premise
  "packed": ["awaiting_pickup"],
  "awaiting_pickup": ["in_transit"], // delivery in progress  
  "in_transit": ["delivered"], // arrived at destination
  "delivered": [] // Final status
};

// Helper function to validate status transitions
function isValidStatusTransition(currentStatus: string, newStatus: string, staffRole: string): { isValid: boolean, reason?: string } {
  // Same status is always allowed (no-op)
  if (currentStatus === newStatus) {
    return { isValid: true };
  }

  // Check if the new status is in the valid progressions for current status
  const validNextStatuses = STATUS_PROGRESSION[currentStatus as keyof typeof STATUS_PROGRESSION] || [];
  
  if (validNextStatuses.includes(newStatus)) {
    return { isValid: true };
  }

  // Check if this is a backwards transition
  const allStatuses = Object.keys(STATUS_PROGRESSION);
  const currentIndex = allStatuses.indexOf(currentStatus);
  const newIndex = allStatuses.indexOf(newStatus);
  
  if (currentIndex > newIndex) {
    // This is a backwards transition - only supervisors and managers can do this
    if (staffRole === "supervisor" || staffRole === "manager") {
      return { isValid: true };
    } else {
      return { isValid: false, reason: "Only supervisors and managers can revert order status backwards" };
    }
  }

  return { isValid: false, reason: `Cannot change status from ${currentStatus} to ${newStatus}` };
}

// Update order status with staff validation
export const updateOrderStatus = mutation({
  args: {
    orderId: v.string(),
    newStatus: v.string(),
    staffId: v.string(),
    notes: v.optional(v.string()),
    scanData: v.optional(v.object({
      barcodeValue: v.string(),
      location: v.string(),
      deviceInfo: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    // Get the order
    const order = await ctx.db.get(args.orderId as any);
    if (!order) {
      throw new Error("Order not found");
    }

    // Get the staff member
    const staff = await ctx.db.get(args.staffId as any);
    if (!staff || !staff.isActive) {
      throw new Error("Staff member not found or inactive");
    }

    // Verify staff has permission to update order status
    if (!staff.permissions.canUpdateOrderStatus) {
      throw new Error("You don't have permission to update order status");
    }

    // Verify staff is assigned to this warehouse
    if (!staff.assignedWarehouses.includes(order.warehouseId)) {
      throw new Error("You are not assigned to this warehouse");
    }

    // Validate status transition
    const validation = isValidStatusTransition(order.status, args.newStatus, staff.role);
    if (!validation.isValid) {
      throw new Error(validation.reason || "Invalid status transition");
    }

    // Check if this is a forward progression or a reversal
    const statusOrder = ["incoming", "arrived_at_warehouse", "packed", "awaiting_pickup", "in_transit", "delivered"];
    const currentIndex = statusOrder.indexOf(order.status);
    const newIndex = statusOrder.indexOf(args.newStatus);
    const isForwardProgression = newIndex > currentIndex;

    // Prepare update object
    const updateData: any = {
      status: args.newStatus,
      updatedAt: Date.now(),
    };

    // Only update timestamps for forward progressions, not reversals
    if (isForwardProgression) {
      if (args.newStatus === "arrived_at_warehouse" || args.newStatus === "received") {
        updateData.receivedAt = Date.now();
      } else if (args.newStatus === "packed") {
        updateData.packedAt = Date.now();
      } else if (args.newStatus === "awaiting_pickup") {
        updateData.awaitingPickupAt = Date.now();
      } else if (args.newStatus === "shipped" || args.newStatus === "in_transit") {
        updateData.shippedAt = Date.now();
      } else if (args.newStatus === "delivered") {
        updateData.deliveredAt = Date.now();
      }
    }
    // For reversals, we preserve the original timestamps

    // Update the order status
    await ctx.db.patch(args.orderId as any, updateData);

    // Log the status change in order history
    await ctx.db.insert("orderStatusHistory", {
      orderId: args.orderId,
      previousStatus: order.status,
      newStatus: args.newStatus,
      changedBy: args.staffId,
      changedByType: "staff",
      staffName: staff.name,
      warehouseName: order.warehouseId, // Will be resolved later if needed
      notes: isForwardProgression ? args.notes : `${args.notes} (Status reversal by ${staff.role})`,
      scanData: args.scanData,
      changedAt: Date.now(),
    });

    // Log staff activity
    await ctx.db.insert("staffActivity", {
      staffId: args.staffId,
      forwarderId: staff.forwarderId,
      warehouseId: order.warehouseId,
      activityType: "status_update",
      orderId: args.orderId,
      details: {
        oldStatus: order.status,
        newStatus: args.newStatus,
        scanLocation: args.scanData?.location,
      },
      timestamp: Date.now(),
    });

    return { 
      success: true, 
      message: `Order status updated to ${args.newStatus}`,
      previousStatus: order.status,
      newStatus: args.newStatus 
    };
  },
});

// Get valid next statuses for an order (for UI)
export const getValidNextStatuses = query({
  args: { 
    orderId: v.string(), 
    staffId: v.string() 
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId as any);
    const staff = await ctx.db.get(args.staffId as any);
    
    if (!order || !staff) {
      return [];
    }

    const currentStatus = order.status;
    const staffRole = staff.role;
    const validNextStatuses = STATUS_PROGRESSION[currentStatus as keyof typeof STATUS_PROGRESSION] || [];
    
    // If supervisor/manager, they can also go backwards (show all statuses except delivered if not delivered)
    if (staffRole === "supervisor" || staffRole === "manager") {
      const allStatuses = Object.keys(STATUS_PROGRESSION);
      return allStatuses.filter(status => status !== currentStatus);
    }
    
    // Regular staff can only move forward
    return validNextStatuses;
  },
});