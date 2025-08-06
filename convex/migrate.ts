import { mutation } from "./_generated/server";

// Migration to update old status values to new ones
export const migrateOrderStatuses = mutation({
  handler: async (ctx) => {
    const orders = await ctx.db.query("orders").collect();
    
    for (const order of orders) {
      let newStatus = order.status;
      
      // Map old status values to new ones
      if (order.status === "received") {
        newStatus = "arrived_at_warehouse";
      } else if (order.status === "shipped") {
        newStatus = "in_transit";
      }
      
      // Update if status changed
      if (newStatus !== order.status) {
        await ctx.db.patch(order._id, { status: newStatus });
        console.log(`Migrated order ${order._id}: ${order.status} -> ${newStatus}`);
      }
    }
    
    return `Migration completed for ${orders.length} orders`;
  },
});