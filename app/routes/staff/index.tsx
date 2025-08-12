import { getAuth } from "@clerk/react-router/ssr.server";
import { fetchQuery } from "convex/nextjs";
import type { Route } from "./+types/index";
import { api } from "../../../convex/_generated/api";
import { useQuery } from "convex/react";
import { useState } from "react";

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);
  
  if (!userId) {
    throw new Response("Unauthorized", { status: 401 });
  }

  try {
    // Get staff profile
    const staff = await fetchQuery(api.staff.getStaffByUserId, { userId });
    
    if (!staff) {
      // Check if they might be a forwarder instead
      const forwarder = await fetchQuery(api.forwarders.getForwarderByUserId, { userId }).catch(() => null);
      if (forwarder) {
        throw new Response("Redirect", { status: 302, headers: { Location: "/forwarder" } });
      }
      throw new Response("Staff not found", { status: 404 });
    }

    if (!staff.isActive) {
      throw new Response("Staff account is inactive", { status: 403 });
    }

    return { staff };
  } catch (error) {
    console.error("Error loading staff data:", error);
    throw new Response("Internal Server Error", { status: 500 });
  }
}

export default function StaffDashboard({ loaderData }: Route.ComponentProps) {
  const { staff } = loaderData;
  
  console.log("🔍 Staff dashboard - staff record:", staff);

  // Get real-time data
  const todaysOrders = useQuery(api.staff.getOrdersForStaff, { 
    staffId: staff._id, 
    limit: 10 
  });
  
  const recentActivity = useQuery(api.staff.getStaffActivity, { 
    forwarderId: staff.forwarderId,
    staffId: staff._id,
    limit: 5 
  });

  // Calculate today's stats
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const todaysActivities = recentActivity?.filter(activity => 
    activity.timestamp >= todayStart
  ) || [];

  const todaysScans = todaysActivities.filter(a => a.activityType === "scan").length;
  const todaysStatusUpdates = todaysActivities.filter(a => a.activityType === "status_update").length;
  const todaysOrdersProcessed = new Set(todaysActivities.map(a => a.orderId).filter(Boolean)).size;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'incoming': return 'bg-yellow-100 text-yellow-800';
      case 'received': return 'bg-blue-100 text-blue-800';
      case 'packed': return 'bg-green-100 text-green-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-emerald-100 text-emerald-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'manager': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'supervisor': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'warehouse_worker': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="p-4 space-y-6 pb-20"> {/* Extra padding for mobile bottom nav */}
      {/* Header */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Welcome back, {staff.name}!</h1>
            <p className="text-muted-foreground">Ready to process some orders?</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getRoleBadgeColor(staff.role)}`}>
            {staff.role.replace('_', ' ').toUpperCase()}
          </div>
        </div>
        
        {/* Warehouses */}
        <div className="text-sm text-muted-foreground">
          <span className="font-medium">Assigned to:</span> {staff.warehouses?.map(w => w.name).join(', ') || 'No warehouses'}
        </div>
      </div>

      {/* Today's Performance */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Today's Performance</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 mb-1">{todaysScans}</div>
            <div className="text-xs text-muted-foreground">Scans</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">{todaysStatusUpdates}</div>
            <div className="text-xs text-muted-foreground">Updates</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 mb-1">{todaysOrdersProcessed}</div>
            <div className="text-xs text-muted-foreground">Orders</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <a 
            href="/staff/scanner"
            className="bg-primary text-primary-foreground p-4 rounded-lg text-center hover:bg-primary/90 transition-colors"
          >
            <div className="text-2xl mb-2">📱</div>
            <div className="font-medium">Scan Orders</div>
          </a>
          <a 
            href="/staff/orders"
            className="bg-secondary text-secondary-foreground p-4 rounded-lg text-center hover:bg-secondary/80 transition-colors"
          >
            <div className="text-2xl mb-2">📦</div>
            <div className="font-medium">View Orders</div>
          </a>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Recent Orders</h2>
          <a href="/staff/orders" className="text-primary text-sm hover:text-primary/80">
            View All →
          </a>
        </div>
        
        {!todaysOrders || todaysOrders.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className="text-muted-foreground text-sm">No orders assigned yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todaysOrders.slice(0, 5).map((order) => (
              <div key={order._id} className="flex items-center justify-between p-3 bg-background border border-border rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{order.trackingNumber}</p>
                  <p className="text-sm text-muted-foreground truncate">{order.customerName}</p>
                </div>
                <div className="text-right ml-4">
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                    {order.status.replace('_', ' ')}
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      {recentActivity && recentActivity.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
            <a href="/staff/activity" className="text-primary text-sm hover:text-primary/80">
              View All →
            </a>
          </div>
          
          <div className="space-y-3">
            {recentActivity.slice(0, 3).map((activity) => (
              <div key={activity._id} className="flex items-center justify-between p-3 bg-background border border-border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-foreground">
                      {activity.activityType === 'scan' ? '📱' : 
                       activity.activityType === 'status_update' ? '📝' : '💼'} 
                      {activity.activityType.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {activity.orderId && `Order: ${activity.orderId}`}
                    {activity.details?.newStatus && ` → ${activity.details.newStatus}`}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(activity.timestamp).toLocaleTimeString('en-SG', { 
                    timeZone: 'Asia/Singapore',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Permissions Info */}
      <div className="bg-muted border border-border rounded-xl p-6">
        <h3 className="font-medium text-foreground mb-2">Your Permissions</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className={`flex items-center gap-2 ${staff.permissions?.canScanBarcodes ? 'text-green-600' : 'text-muted-foreground'}`}>
            {staff.permissions?.canScanBarcodes ? '✅' : '❌'} Scan Barcodes
          </div>
          <div className={`flex items-center gap-2 ${staff.permissions?.canUpdateOrderStatus ? 'text-green-600' : 'text-muted-foreground'}`}>
            {staff.permissions?.canUpdateOrderStatus ? '✅' : '❌'} Update Status
          </div>
          <div className={`flex items-center gap-2 ${staff.permissions?.canPrintLabels ? 'text-green-600' : 'text-muted-foreground'}`}>
            {staff.permissions?.canPrintLabels ? '✅' : '❌'} Print Labels
          </div>
          <div className={`flex items-center gap-2 ${staff.permissions?.canViewReports ? 'text-green-600' : 'text-muted-foreground'}`}>
            {staff.permissions?.canViewReports ? '✅' : '❌'} View Reports
          </div>
        </div>
      </div>
    </div>
  );
}