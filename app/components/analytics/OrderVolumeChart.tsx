"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

interface OrderVolumeChartProps {
  forwarderId: string;
}

export default function OrderVolumeChart({ forwarderId }: OrderVolumeChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<"week" | "month" | "quarter">("month");
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  
  const analytics = useQuery(api.analytics.getOrderVolumeAnalytics, {
    forwarderId,
    daysBack: selectedPeriod === "week" ? 7 : selectedPeriod === "month" ? 30 : 90
  });
  
  const trends = useQuery(api.analytics.getOrderTrends, {
    forwarderId,
    period: selectedPeriod
  });

  if (!analytics || !trends) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded mb-4 w-32"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }
  
  // Debug logging
  console.log("Analytics data:", analytics);
  console.log("Daily volume array:", analytics.dailyVolume);
  console.log("Daily volume length:", analytics.dailyVolume?.length);
  console.log("Total orders:", analytics.totalOrders);
  console.log("Date range:", analytics.dateRange);

  // Safety checks
  if (!analytics.dailyVolume || analytics.dailyVolume.length === 0) {
    console.log("No daily volume data available");
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Order Volume</h2>
        <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
          <div className="text-muted-foreground mb-2">📊 No daily volume data</div>
          <div className="text-sm text-muted-foreground">Analytics returned empty dailyVolume array</div>
          <div className="text-xs text-muted-foreground mt-2">Forwarder: {forwarderId}</div>
        </div>
      </div>
    );
  }
  
  const maxCount = Math.max(...analytics.dailyVolume.map(d => d.count), 1);
  
  // Use the backend-calculated average since account creation
  const avgCount = analytics.averageDailyOrdersSinceCreation || 0;
  
  console.log("Max count:", maxCount, "Avg daily orders since creation:", avgCount);
  console.log("Account creation date:", analytics.accountCreationDate);
  console.log("Days with orders:", analytics.dailyVolume.filter(d => d.count > 0).map(d => `${d.date}: ${d.count}`));
  
  // Color coding based on volume relative to average (only considering active days)
  const getVolumeColor = (count: number) => {
    if (count === 0) return "bg-gray-200"; // No orders
    if (avgCount === 0) return "bg-blue-400"; // Fallback if no average
    
    if (count < avgCount * 0.7) return "bg-red-300"; // 30% below average
    if (count < avgCount * 0.9) return "bg-orange-300"; // 10-30% below average  
    if (count <= avgCount * 1.1) return "bg-blue-400"; // Around average
    if (count <= avgCount * 1.3) return "bg-green-400"; // 10-30% above average
    return "bg-green-600"; // 30%+ above average
  };
  
  const getVolumeColorHover = (count: number) => {
    if (count === 0) return "bg-gray-300";
    if (avgCount === 0) return "bg-blue-500"; // Fallback if no average
    
    if (count < avgCount * 0.7) return "bg-red-400";
    if (count < avgCount * 0.9) return "bg-orange-400";
    if (count <= avgCount * 1.1) return "bg-blue-500";
    if (count <= avgCount * 1.3) return "bg-green-500";
    return "bg-green-700";
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-1">Order Volume</h2>
          <p className="text-sm text-muted-foreground">
            {analytics.dateRange.start} to {analytics.dateRange.end}
          </p>
        </div>
        
        {/* Period Selector */}
        <div className="flex bg-muted rounded-lg p-1 mt-4 sm:mt-0">
          {(["week", "month", "quarter"] as const).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                selectedPeriod === period
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
{period === "week" ? "7D" : period === "month" ? "30D" : "90D"}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-background border border-border rounded-lg p-4">
          <div className="text-2xl font-bold text-foreground">{analytics.totalOrders}</div>
          <div className="text-sm text-muted-foreground">Total Orders</div>
          {analytics.monthOverMonthGrowth !== 0 && (
            <div className={`text-xs mt-1 ${
              analytics.monthOverMonthGrowth > 0 ? "text-green-600" : "text-red-600"
            }`}>
              {analytics.monthOverMonthGrowth > 0 ? "+" : ""}{analytics.monthOverMonthGrowth}% MoM
            </div>
          )}
          {analytics.totalOrders === 0 && (
            <div className="text-xs text-red-600 mt-1">No orders found</div>
          )}
        </div>
        
        <div className="bg-background border border-border rounded-lg p-4">
          <div className="text-2xl font-bold text-foreground">${analytics.totalRevenue}</div>
          <div className="text-sm text-muted-foreground">Est. Revenue</div>
          <div className="text-xs text-muted-foreground mt-1">${analytics.averageOrderValue} avg</div>
        </div>
        
        <div className="bg-background border border-border rounded-lg p-4">
          <div className="text-2xl font-bold text-foreground">{analytics.totalWeight}kg</div>
          <div className="text-sm text-muted-foreground">Total Weight</div>
          <div className="text-xs text-muted-foreground mt-1">
            {analytics.totalOrders > 0 ? (analytics.totalWeight / analytics.totalOrders).toFixed(1) : 0}kg avg
          </div>
        </div>
        
        <div className="bg-background border border-border rounded-lg p-4">
          <div className="text-2xl font-bold text-foreground">{analytics.peakDay.count}</div>
          <div className="text-sm text-muted-foreground">Peak Day</div>
          <div className="text-xs text-muted-foreground mt-1">
            {new Date(analytics.peakDay.date).toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs mb-4 p-3 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gray-200"></div>
          <span>No orders</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-300"></div>
          <span>30%+ below avg</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-orange-300"></div>
          <span>10-30% below avg</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-400"></div>
          <span>Around average</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-400"></div>
          <span>10-30% above avg</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-600"></div>
          <span>30%+ above avg</span>
        </div>
      </div>
      
      {/* Chart */}
      <div className="relative bg-background rounded-lg p-4">
        <div className="flex items-end gap-1 h-48">
          {analytics.dailyVolume.map((day, index) => {
            const heightPercentage = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
            const isHovered = hoveredDay === day.date;
            
            // Calculate pixel height (h-48 = 192px)
            const pixelHeight = day.count > 0 ? Math.max((heightPercentage / 100) * 192, 8) : 4;
            
            // Debug individual bars
            if (day.count > 0) {
              console.log(`Bar ${day.date}: count=${day.count}, maxCount=${maxCount}, heightPct=${heightPercentage}%, pixelHeight=${pixelHeight}px, color=${getVolumeColor(day.count)}`);
            }
            
            return (
              <div
                key={day.date}
                className="flex-1 relative group cursor-pointer"
                onMouseEnter={() => setHoveredDay(day.date)}
                onMouseLeave={() => setHoveredDay(null)}
              >
                <div
                  className={`w-full transition-all duration-200 ${
                    day.count > 0 ? 'rounded-t' : 'rounded'
                  } ${
                    isHovered ? getVolumeColorHover(day.count) : getVolumeColor(day.count)
                  }`}
                  style={{ 
                    height: `${pixelHeight}px`,
                  }}
                />
                  
                {/* Hover Tooltip */}
                {isHovered && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-popover border border-border rounded-lg shadow-lg p-3 text-sm whitespace-nowrap z-10">
                    <div className="font-medium text-foreground">
                      {new Date(day.date).toLocaleDateString(undefined, { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>
                    <div className="text-muted-foreground">
                      <strong>{day.count}</strong> orders
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Avg since creation: {avgCount.toFixed(1)} orders/day
                    </div>
                    {day.revenue > 0 && (
                      <div className="text-muted-foreground">
                        ${day.revenue.toFixed(0)} revenue
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Date Labels */}
        <div className="flex justify-between mt-2 px-2">
          {analytics.dailyVolume.map((day, index) => {
            const shouldShowLabel = index % Math.ceil(analytics.dailyVolume.length / 7) === 0;
            const isAccountCreationDate = analytics.accountCreationDate && day.date === analytics.accountCreationDate;
            
            if (shouldShowLabel || isAccountCreationDate) {
              return (
                <div 
                  key={`label-${day.date}`} 
                  className={`text-xs ${
                    isAccountCreationDate 
                      ? 'font-bold text-blue-600' 
                      : 'text-muted-foreground'
                  }`}
                >
                  {new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </div>
              );
            } else {
              return <div key={`spacer-${index}`} className="text-xs">&nbsp;</div>;
            }
          })}
        </div>
      </div>

      {/* Breakdowns */}
      {(analytics.courierBreakdown.length > 0 || analytics.statusBreakdown.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 pt-6 border-t border-border">
          {/* Courier Breakdown */}
          {analytics.courierBreakdown.length > 0 && (
            <div>
              <h4 className="font-medium text-foreground mb-3">By Courier</h4>
              <div className="space-y-2">
                {analytics.courierBreakdown.map((item) => (
                  <div key={item.courier} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{item.courier}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-foreground w-12 text-right">
                        {item.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Status Breakdown */}
          {analytics.statusBreakdown.length > 0 && (
            <div>
              <h4 className="font-medium text-foreground mb-3">By Status</h4>
              <div className="space-y-2">
                {analytics.statusBreakdown.map((item) => (
                  <div key={item.status} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground capitalize">
                      {item.status.replace('_', ' ')}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            item.status === 'delivered' ? 'bg-green-500' :
                            item.status === 'shipped' || item.status === 'in_transit' ? 'bg-blue-500' :
                            item.status === 'packed' || item.status === 'awaiting_pickup' ? 'bg-yellow-500' :
                            'bg-gray-500'
                          }`}
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-foreground w-12 text-right">
                        {item.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}