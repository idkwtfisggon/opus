import { query } from "./_generated/server";
import { v } from "convex/values";

// Get order volume analytics for forwarder dashboard
export const getOrderVolumeAnalytics = query({
  args: { 
    forwarderId: v.string(),
    daysBack: v.optional(v.number()) // Optional override, defaults to account creation
  },
  handler: async (ctx, args) => {
    const { forwarderId, daysBack } = args;
    const now = Date.now();
    
    // Use daysBack parameter or default to 30 days
    const startTime = now - ((daysBack || 30) * 24 * 60 * 60 * 1000);
    
    // Get orders from the last N days
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_forwarder", (q) => q.eq("forwarderId", forwarderId))
      .filter((q) => q.gte(q.field("createdAt"), startTime))
      .collect();
      
    console.log(`Analytics debug: Found ${orders.length} orders for forwarder ${forwarderId}`);
    console.log(`Date range: ${new Date(startTime).toISOString()} to ${new Date(now).toISOString()}`);

    // Group orders by date (Singapore timezone)
    const dailyVolume: Record<string, number> = {};
    const courierBreakdown: Record<string, number> = {};
    const statusBreakdown: Record<string, number> = {};
    const revenueByDay: Record<string, number> = {};
    
    let totalRevenue = 0;
    let totalWeight = 0;
    
    orders.forEach(order => {
      // Convert to Singapore timezone (UTC+8) properly
      const utcDate = new Date(order.createdAt);
      const sgDate = new Date(utcDate.getTime() + (8 * 60 * 60 * 1000));
      const date = sgDate.toISOString().split('T')[0];
      
      console.log(`Order created: ${utcDate.toISOString()} -> SG: ${sgDate.toISOString()} -> Date: ${date}`);
      
      // Daily volume
      dailyVolume[date] = (dailyVolume[date] || 0) + 1;
      
      // Courier breakdown
      if (order.courier) {
        courierBreakdown[order.courier] = (courierBreakdown[order.courier] || 0) + 1;
      }
      
      // Status breakdown
      statusBreakdown[order.status] = (statusBreakdown[order.status] || 0) + 1;
      
      // Revenue calculation (estimated based on declared value)
      const estimatedFee = order.declaredValue * 0.05; // 5% fee estimate
      revenueByDay[date] = (revenueByDay[date] || 0) + estimatedFee;
      totalRevenue += estimatedFee;
      
      // Weight tracking
      totalWeight += order.declaredWeight;
    });

    // Fill in missing dates with 0 volume (Singapore timezone)
    const filledDailyVolume: Array<{ date: string; count: number; revenue: number }> = [];
    const totalDays = daysBack || 30;
    
    for (let i = totalDays - 1; i >= 0; i--) {
      // Generate date in Singapore timezone
      const dayStart = now - (i * 24 * 60 * 60 * 1000);
      const utcDate = new Date(dayStart);
      const sgDate = new Date(utcDate.getTime() + (8 * 60 * 60 * 1000));
      const date = sgDate.toISOString().split('T')[0];
      
      filledDailyVolume.push({
        date,
        count: dailyVolume[date] || 0,
        revenue: revenueByDay[date] || 0
      });
    }
    
    console.log(`Daily volume data:`, dailyVolume);
    console.log(`Filled daily volume:`, filledDailyVolume);

    // Current month vs last month comparison
    const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
    const lastMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).getTime();
    const lastMonthEnd = currentMonthStart - 1;
    
    const currentMonthOrders = orders.filter(o => o.createdAt >= currentMonthStart).length;
    const lastMonthOrders = orders.filter(o => o.createdAt >= lastMonthStart && o.createdAt <= lastMonthEnd).length;
    const monthOverMonthGrowth = lastMonthOrders > 0 
      ? ((currentMonthOrders - lastMonthOrders) / lastMonthOrders) * 100 
      : 0;

    return {
      // Time series data
      dailyVolume: filledDailyVolume,
      
      // Summary metrics
      totalOrders: orders.length,
      totalRevenue: Math.round(totalRevenue),
      totalWeight: Math.round(totalWeight * 10) / 10, // Round to 1 decimal
      averageOrderValue: orders.length > 0 ? Math.round((totalRevenue / orders.length) * 100) / 100 : 0,
      
      // Growth metrics
      currentMonthOrders,
      lastMonthOrders,
      monthOverMonthGrowth: Math.round(monthOverMonthGrowth * 10) / 10,
      
      
      // Breakdowns
      courierBreakdown: Object.entries(courierBreakdown)
        .map(([courier, count]) => ({ courier, count, percentage: Math.round((count / orders.length) * 100) }))
        .sort((a, b) => b.count - a.count),
        
      statusBreakdown: Object.entries(statusBreakdown)
        .map(([status, count]) => ({ status, count, percentage: Math.round((count / orders.length) * 100) }))
        .sort((a, b) => b.count - a.count),
        
      // Peak days
      peakDay: filledDailyVolume.reduce((max, day) => day.count > max.count ? day : max, { date: '', count: 0, revenue: 0 }),
      
      // Date range
      dateRange: {
        start: filledDailyVolume[0]?.date,
        end: filledDailyVolume[filledDailyVolume.length - 1]?.date
      }
    };
  },
});

// Get weekly/monthly trends
export const getOrderTrends = query({
  args: { 
    forwarderId: v.string(),
    period: v.union(v.literal("week"), v.literal("month"), v.literal("quarter"))
  },
  handler: async (ctx, args) => {
    const { forwarderId, period } = args;
    const now = Date.now();
    
    let daysBack: number;
    let groupBy: 'day' | 'week' | 'month';
    
    switch (period) {
      case 'week':
        daysBack = 7;
        groupBy = 'day';
        break;
      case 'month':
        daysBack = 30;
        groupBy = 'day';
        break;
      case 'quarter':
        daysBack = 90;
        groupBy = 'week';
        break;
    }
    
    const startTime = now - (daysBack * 24 * 60 * 60 * 1000);
    
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_forwarder", (q) => q.eq("forwarderId", forwarderId))
      .filter((q) => q.gte(q.field("createdAt"), startTime))
      .collect();

    // Group by time period
    const trends: Record<string, { orders: number; revenue: number; weight: number }> = {};
    
    orders.forEach(order => {
      let groupKey: string;
      const orderDate = new Date(order.createdAt);
      
      if (groupBy === 'day') {
        groupKey = orderDate.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        const weekStart = new Date(orderDate);
        weekStart.setDate(orderDate.getDate() - orderDate.getDay());
        groupKey = weekStart.toISOString().split('T')[0];
      } else {
        groupKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
      }
      
      if (!trends[groupKey]) {
        trends[groupKey] = { orders: 0, revenue: 0, weight: 0 };
      }
      
      trends[groupKey].orders += 1;
      trends[groupKey].revenue += order.declaredValue * 0.05; // 5% fee estimate
      trends[groupKey].weight += order.declaredWeight;
    });

    return {
      period,
      data: Object.entries(trends)
        .map(([date, metrics]) => ({
          date,
          ...metrics,
          revenue: Math.round(metrics.revenue),
          weight: Math.round(metrics.weight * 10) / 10
        }))
        .sort((a, b) => a.date.localeCompare(b.date))
    };
  },
});

// Get performance metrics
export const getPerformanceMetrics = query({
  args: { forwarderId: v.string() },
  handler: async (ctx, args) => {
    const { forwarderId } = args;
    const now = Date.now();
    const last30Days = now - (30 * 24 * 60 * 60 * 1000);
    
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_forwarder", (q) => q.eq("forwarderId", forwarderId))
      .filter((q) => q.gte(q.field("createdAt"), last30Days))
      .collect();

    // Calculate processing times
    const processingTimes: number[] = [];
    const shippingTimes: number[] = [];
    
    orders.forEach(order => {
      // Time from received to packed
      if (order.receivedAt && order.packedAt) {
        processingTimes.push((order.packedAt - order.receivedAt) / (1000 * 60 * 60)); // hours
      }
      
      // Time from packed to shipped
      if (order.packedAt && order.shippedAt) {
        shippingTimes.push((order.shippedAt - order.packedAt) / (1000 * 60 * 60)); // hours
      }
    });

    const avgProcessingTime = processingTimes.length > 0 
      ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length 
      : 0;
      
    const avgShippingTime = shippingTimes.length > 0 
      ? shippingTimes.reduce((a, b) => a + b, 0) / shippingTimes.length 
      : 0;

    return {
      averageProcessingTime: Math.round(avgProcessingTime * 10) / 10,
      averageShippingTime: Math.round(avgShippingTime * 10) / 10,
      totalOrdersProcessed: orders.length,
      onTimeDeliveryRate: 95, // Placeholder - would need delivery tracking
      customerSatisfactionScore: 4.8, // Placeholder - would need review system
    };
  },
});