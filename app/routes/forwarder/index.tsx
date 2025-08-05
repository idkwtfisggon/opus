import { getAuth } from "@clerk/react-router/ssr.server";
import { fetchQuery } from "convex/nextjs";
import type { Route } from "./+types/index";
import { api } from "../../../convex/_generated/api";
import ForwarderOnboarding from "~/components/forwarder/ForwarderOnboarding";
import { useState } from "react";

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);
  
  if (!userId) {
    throw new Response("Unauthorized", { status: 401 });
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
        recentOrders: []
      };
    }

    // Get real stats and orders
    const [stats, recentOrders] = await Promise.all([
      fetchQuery(api.orders.getForwarderStats, { forwarderId: forwarder._id }),
      fetchQuery(api.orders.getRecentOrders, { forwarderId: forwarder._id, limit: 5 })
    ]);

    return {
      hasForwarderProfile: true,
      forwarder,
      stats,
      recentOrders
    };
  } catch (error) {
    console.error("Error loading forwarder data:", error);
    return { 
      hasForwarderProfile: false,
      userId,
      stats: { pendingOrders: 0, readyToShip: 0, capacityUsed: 0 },
      recentOrders: []
    };
  }
}

export default function ForwarderDashboard({ loaderData }: Route.ComponentProps) {
  const { hasForwarderProfile, userId, stats, recentOrders } = loaderData;
  const [showOnboarding, setShowOnboarding] = useState(!hasForwarderProfile);

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
        <div className="text-sm text-muted-foreground">
          Welcome back to your logistics hub
        </div>
      </div>
      
      {/* Smart Alert Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <a href="/forwarder/orders?filter=unassigned" 
           className={`group block bg-card border border-border rounded-xl p-6 hover:shadow-md cursor-pointer transition-all duration-200 ${getAlertColor(stats.unassignedCouriers || 0)}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={`font-semibold text-lg ${getTextColor(stats.unassignedCouriers || 0)}`}>
              Unassigned Couriers
            </h3>
            <div className="w-2 h-2 rounded-full bg-current opacity-60"></div>
          </div>
          <p className={`text-3xl font-bold mb-2 ${getTextColor(stats.unassignedCouriers || 0)}`}>
            {stats.unassignedCouriers || 0}
          </p>
          <p className="text-sm text-muted-foreground">Need courier assignment</p>
        </a>

        <a href="/forwarder/orders?filter=labels" 
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
          <p className="text-sm text-muted-foreground">Ready to print</p>
        </a>

        <a href="/forwarder/orders?filter=stale" 
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
          <p className="text-sm text-muted-foreground">&gt;48h old</p>
        </a>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-lg text-foreground">
              Capacity Used
            </h3>
            <div className="w-2 h-2 rounded-full bg-primary opacity-60"></div>
          </div>
          <p className="text-3xl font-bold text-primary mb-2">
            {stats.capacityUsed}%
          </p>
          <p className="text-sm text-muted-foreground">
            {stats.currentCapacity} of {stats.totalCapacity} slots
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-semibold text-lg mb-4 text-foreground">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button className="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 font-medium shadow-sm transition-all duration-200">
            + Add Manual Order
          </button>
          <a href="/forwarder/orders?filter=received" 
             className="bg-secondary text-secondary-foreground px-6 py-3 rounded-lg hover:bg-secondary/80 font-medium shadow-sm transition-all duration-200 inline-block">
            View Arrived Orders ({stats.readyToShip})
          </a>
          <a href="/forwarder/orders?filter=bulk" 
             className="border border-border bg-background text-foreground px-6 py-3 rounded-lg hover:bg-accent hover:text-accent-foreground font-medium shadow-sm transition-all duration-200 inline-block">
            Bulk Assign Courier ({stats.unassignedCouriers || 0})
          </a>
        </div>
      </div>

      {/* Order Volume Calendar */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-foreground">Order Volume</h2>
          <div className="text-sm text-muted-foreground">
            Click any day to view orders
          </div>
        </div>
        <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
          <div className="max-w-sm mx-auto">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-muted-foreground mb-2">Order volume calendar coming soon</p>
            <p className="text-sm text-muted-foreground">Interactive calendar view with daily order counts</p>
          </div>
        </div>
      </div>

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