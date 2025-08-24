import { fetchQuery } from "convex/nextjs";
import type { Route } from "./+types/index";
import { api } from "../../../convex/_generated/api";
import { getServerAuth } from "~/contexts/auth";
import { redirect } from "react-router";
import ForwarderOnboarding from "~/components/forwarder/ForwarderOnboarding";
import OrderVolumeChart from "~/components/analytics/OrderVolumeChart";
import CreateTestOrders from "~/components/debug/CreateTestOrders";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getServerAuth(args.request);
  
  if (!userId) {
    return redirect("/sign-in");
  }

  try {
    // Get forwarder profile
    const forwarder = await fetchQuery(api.forwarders.getForwarderByUserId, { userId });
    
    if (!forwarder) {
      // No forwarder profile exists - they need to set up their account
      return { 
        hasForwarderProfile: false,
        userId,
        stats: { pendingOrders: 0, readyToShip: 0, capacityUsed: 0 },
        recentOrders: [],
        firstWarehouse: null
      };
    }

    // Get real stats, orders, warehouses, and staff
    const [stats, recentOrders, warehouses, staff, warehouseData] = await Promise.all([
      fetchQuery(api.orders.getForwarderStats, { forwarderId: forwarder._id }),
      fetchQuery(api.orders.getRecentOrders, { forwarderId: forwarder._id, limit: 5 }),
      fetchQuery(api.warehouses.getForwarderWarehouses, { forwarderId: forwarder._id }),
      fetchQuery(api.staff.getForwarderStaff, { forwarderId: forwarder._id }),
      fetchQuery(api.warehouseServiceAreas.getForwarderServiceAreas, {})
    ]);

    return {
      hasForwarderProfile: true,
      forwarder,
      stats,
      recentOrders,
      warehouses,
      staff,
      warehouseData,
      firstWarehouse: warehouses[0] || null
    };
  } catch (error) {
    console.error("Error loading forwarder data:", error);
    return { 
      hasForwarderProfile: false,
      userId,
      stats: { pendingOrders: 0, readyToShip: 0, capacityUsed: 0 },
      recentOrders: [],
      firstWarehouse: null
    };
  }
}

export default function ForwarderDashboard({ loaderData }: Route.ComponentProps) {
  const { hasForwarderProfile, userId, stats, recentOrders, forwarder, warehouses, staff, warehouseData } = loaderData;
  const [showOnboarding, setShowOnboarding] = useState(!hasForwarderProfile);
  
  // Use server data instead of client queries
  const currentOrders = recentOrders; // Use the orders from server
  const staffMetrics = staff ? { totalStaff: staff.length } : null;
  
  // Timezone fix mutation - use the existing upsertForwarder instead
  const updateForwarder = useMutation(api.forwarders.upsertForwarder);
  const [fixingTimezone, setFixingTimezone] = useState(false);
  
  const handleFixTimezone = async () => {
    if (!forwarder) return;
    setFixingTimezone(true);
    try {
      await updateForwarder({
        userId: forwarder.userId,
        businessName: forwarder.businessName,
        contactEmail: forwarder.contactEmail,
        contactPhone: forwarder.contactPhone,
        timezone: "Asia/Singapore",
        maxParcelsPerMonth: forwarder.maxParcelsPerMonth,
        maxParcelWeight: forwarder.maxParcelWeight
      });
      alert("Timezone updated to Singapore! Refreshing page...");
      window.location.reload();
    } catch (error) {
      console.error("Failed to update timezone:", error);
      alert(`Failed to update timezone: ${error.message || error}`);
    } finally {
      setFixingTimezone(false);
    }
  };
  
  // Calculate warehouse capacity usage
  const getWarehouseCapacities = () => {
    if (!warehouses || !currentOrders) return [];
    
    return warehouses.map(warehouse => {
      // Count active orders (not delivered) for this warehouse
      const activeOrders = currentOrders.filter(order => 
        order.warehouseId === warehouse._id && 
        order.status !== 'delivered'
      ).length;
      
      const maxCapacity = warehouse.maxParcels || 1000;
      const usagePercentage = maxCapacity > 0 ? Math.round((activeOrders / maxCapacity) * 100) : 0;
      
      return {
        id: warehouse._id,
        name: warehouse.name,
        city: warehouse.city,
        state: warehouse.state,
        current: activeOrders,
        max: maxCapacity,
        percentage: usagePercentage,
        status: usagePercentage > 90 ? 'critical' : usagePercentage > 70 ? 'warning' : 'good'
      };
    });
  };
  
  const warehouseCapacities = getWarehouseCapacities();

  if (showOnboarding) {
    return (
      <ForwarderOnboarding 
        userId={userId}
        onComplete={() => {
          setShowOnboarding(false);
          // Refresh the page to load new data
          window.location.reload();
        }} 
      />
    );
  }

  // Smart color coding like Shibubu
  const getAlertColor = (count: number) => {
    if (count > 5) return "border-red-300 bg-red-50 hover:bg-red-100";
    if (count > 0) return "border-yellow-300 bg-yellow-50 hover:bg-yellow-100";
    return "border-green-300 bg-green-50 hover:bg-green-100";
  };

  const getTextColor = (count: number) => {
    if (count > 5) return "text-red-800";
    if (count > 0) return "text-yellow-800";
    return "text-green-800";
  };

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Dashboard</h1>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Welcome back to your logistics hub
          </div>
          {forwarder?.timezone !== "Asia/Singapore" && (
            <button
              onClick={handleFixTimezone}
              disabled={fixingTimezone}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
              title="Your timezone is not set to Singapore. Click to fix."
            >
              {fixingTimezone ? "Fixing..." : "Fix Timezone"}
            </button>
          )}
        </div>
      </div>
      
      {/* Smart Alert Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <a href="/forwarder/orders?status=packed&labelPrinted=false" 
           className={`group block bg-card border border-border rounded-xl p-6 hover:shadow-md cursor-pointer transition-all duration-200 ${getAlertColor(stats.pendingLabels || 0)}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={`font-semibold text-lg ${getTextColor(stats.pendingLabels || 0)}`}>
              Pending Labels
            </h3>
            <div className="w-2 h-2 rounded-full bg-current opacity-60"></div>
          </div>
          <p className={`text-3xl font-bold mb-2 ${getTextColor(stats.pendingLabels || 0)}`}>
            {stats.pendingLabels || 0}
          </p>
          <p className="text-sm text-muted-foreground">Need labels printed</p>
        </a>

        <a href="/forwarder/orders?status=incoming&daysOld=2" 
           className={`group block bg-card border border-border rounded-xl p-6 hover:shadow-md cursor-pointer transition-all duration-200 ${getAlertColor(stats.staleOrders || 0)}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={`font-semibold text-lg ${getTextColor(stats.staleOrders || 0)}`}>
              Stale Orders
            </h3>
            <div className="w-2 h-2 rounded-full bg-current opacity-60"></div>
          </div>
          <p className={`text-3xl font-bold mb-2 ${getTextColor(stats.staleOrders || 0)}`}>
            {stats.staleOrders || 0}
          </p>
          <p className="text-sm text-muted-foreground">&gt;48h old, no progress</p>
        </a>


        {stats.maxParcelWeight && (
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-lg text-foreground">
                Weight Limit
              </h3>
              <div className="w-2 h-2 rounded-full bg-orange-500 opacity-60"></div>
            </div>
            <p className="text-3xl font-bold text-orange-600 mb-2">
              {stats.maxParcelWeight}kg
            </p>
            <p className="text-sm text-muted-foreground">
              Maximum parcel weight
            </p>
          </div>
        )}
      </div>

      {/* Warehouse Capacity */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-lg text-foreground">
            Warehouse Capacity
          </h3>
          <div className="w-2 h-2 rounded-full bg-blue-500 opacity-60"></div>
        </div>
        
        {warehouseCapacities.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-muted-foreground text-sm mb-2">
              No warehouses configured
            </div>
            <a 
              href="/forwarder/service-areas"
              className="text-blue-600 hover:text-blue-700 text-sm underline"
            >
              Set up your first warehouse →
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {warehouseCapacities.map((warehouse) => (
              <div key={warehouse.id} className="text-center">
                {/* Circular Progress */}
                <div className="relative w-20 h-20 mx-auto mb-3">
                  <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                    {/* Background circle */}
                    <path
                      className="text-muted stroke-current"
                      fill="none"
                      strokeWidth="3"
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    {/* Progress circle */}
                    <path
                      className={`stroke-current ${
                        warehouse.status === 'critical' ? 'text-red-500' :
                        warehouse.status === 'warning' ? 'text-yellow-500' :
                        'text-green-500'
                      }`}
                      fill="none"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={`${warehouse.percentage}, 100`}
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  {/* Percentage in center */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-sm font-bold ${
                      warehouse.status === 'critical' ? 'text-red-600' :
                      warehouse.status === 'warning' ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {warehouse.percentage}%
                    </span>
                  </div>
                </div>
                
                {/* Warehouse info */}
                <div>
                  <div className="font-medium text-foreground text-sm mb-1 truncate">
                    {warehouse.name}
                  </div>
                  <div className="text-xs text-muted-foreground mb-1">
                    {warehouse.city}, {warehouse.state}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {warehouse.current}/{warehouse.max} slots
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Staff Activity Feed */}
      {staffActivity && staffActivity.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground">Recent Staff Activity</h3>
            <a href="/forwarder/staff" 
               className="text-primary hover:text-primary/80 font-medium text-sm transition-colors">
              Manage Staff →
            </a>
          </div>
          
          <div className="space-y-3">
            {staffActivity.map((activity) => (
              <div key={activity._id} className="flex items-center justify-between p-3 bg-background border border-border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-foreground text-sm">
                      {activity.staffName || "Unknown Staff"}
                    </span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">
                      {activity.warehouseName || "Unknown Warehouse"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {activity.order?.trackingNumber || "Unknown Order"}
                    </span>
                    <span className="text-xs text-muted-foreground">→</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      activity.newStatus === 'delivered' ? 'bg-green-100 text-green-800' :
                      activity.newStatus === 'shipped' || activity.newStatus === 'in_transit' ? 'bg-blue-100 text-blue-800' :
                      activity.newStatus === 'packed' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {activity.newStatus.replace('_', ' ')}
                    </span>
                    {activity.scanData && (
                      <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        📱 {activity.scanData.location}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(activity.changedAt).toLocaleTimeString('en-SG', { 
                    timeZone: 'Asia/Singapore',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            ))}
          </div>
          
          {/* Staff Metrics Summary */}
          {staffMetrics && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-lg font-semibold text-foreground">{staffMetrics.totalStaff}</div>
                  <div className="text-xs text-muted-foreground">Total Staff</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-green-600">{staffMetrics.activeStaffToday}</div>
                  <div className="text-xs text-muted-foreground">Active Today</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-blue-600">{staffMetrics.totalScans}</div>
                  <div className="text-xs text-muted-foreground">Total Scans</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-purple-600">{staffMetrics.totalStatusUpdates}</div>
                  <div className="text-xs text-muted-foreground">Status Updates</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-semibold text-lg mb-4 text-foreground">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button className="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 font-medium shadow-sm transition-all duration-200">
            + Add Manual Order
          </button>
          <a href="/forwarder/orders?status=arrived_at_warehouse" 
             className="bg-secondary text-secondary-foreground px-6 py-3 rounded-lg hover:bg-secondary/80 font-medium shadow-sm transition-all duration-200 inline-block">
            View Arrived Orders ({stats.readyToShip})
          </a>
          <a href="/forwarder/orders" 
             className="border border-border bg-background text-foreground px-6 py-3 rounded-lg hover:bg-accent hover:text-accent-foreground font-medium shadow-sm transition-all duration-200 inline-block">
            View All Orders ({stats.totalOrders})
          </a>
          <a href="/forwarder/staff" 
             className="border border-border bg-background text-foreground px-6 py-3 rounded-lg hover:bg-accent hover:text-accent-foreground font-medium shadow-sm transition-all duration-200 inline-block">
            Manage Staff ({staffMetrics?.totalStaff || 0})
          </a>
        </div>
      </div>

      {/* Debug Component */}
      {forwarder && stats.totalOrders === 0 && loaderData.firstWarehouse && (
        <CreateTestOrders forwarderId={forwarder._id} warehouseId={loaderData.firstWarehouse._id} />
      )}
      
      {/* Order Volume Analytics */}
      {forwarder && <OrderVolumeChart forwarderId={forwarder._id} />}
      
      {/* Performance Metrics */}
      {performanceMetrics && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-foreground mb-6">Performance Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary mb-1">
                {performanceMetrics.averageProcessingTime.toFixed(1)}h
              </div>
              <div className="text-sm text-muted-foreground">Avg Processing Time</div>
              <div className="text-xs text-muted-foreground mt-1">Received → Packed</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {performanceMetrics.averageShippingTime.toFixed(1)}h
              </div>
              <div className="text-sm text-muted-foreground">Avg Shipping Time</div>
              <div className="text-xs text-muted-foreground mt-1">Packed → Shipped</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {performanceMetrics.onTimeDeliveryRate}%
              </div>
              <div className="text-sm text-muted-foreground">On-Time Delivery</div>
              <div className="text-xs text-muted-foreground mt-1">Last 30 days</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600 mb-1">
                {performanceMetrics.customerSatisfactionScore}
              </div>
              <div className="text-sm text-muted-foreground">Customer Rating</div>
              <div className="text-xs text-muted-foreground mt-1">Out of 5.0</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        {recentOrders.length > 0 ? (
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">Recent Orders</h3>
              <a href="/forwarder/orders" 
                 className="text-primary hover:text-primary/80 font-medium text-sm transition-colors">
                View all →
              </a>
            </div>
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div key={order._id} className="flex justify-between items-center p-4 bg-background border border-border rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{order.trackingNumber}</p>
                    <p className="text-sm text-muted-foreground truncate">{order.customerName}</p>
                    <p className="text-xs text-muted-foreground truncate">{order.merchantName}</p>
                  </div>
                  <div className="text-right ml-4">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      order.status === 'incoming' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'received' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'packed' ? 'bg-green-100 text-green-800' :
                      order.status === 'shipped' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status}
                    </span>
                    {order.courier && (
                      <p className="text-xs text-muted-foreground mt-1">{order.courier}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No Orders Yet</h3>
              <p className="text-muted-foreground mb-4">Start by adding your first order to see activity here.</p>
              <button className="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 font-medium shadow-sm transition-all">
                + Add Your First Order
              </button>
            </div>
          </div>
        )}

        {/* Recent Activity Feed */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-foreground mb-6">Recent Activity</h3>
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p className="text-muted-foreground mb-2">Activity feed coming soon</p>
            <p className="text-sm text-muted-foreground">Order status changes, courier assignments, and more</p>
          </div>
        </div>
      </div>
    </div>
  );
}