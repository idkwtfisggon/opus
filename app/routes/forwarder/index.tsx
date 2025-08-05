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
      fetchQuery(api.forwarders.getForwarderStats, { forwarderId: forwarder._id }),
      fetchQuery(api.forwarders.getRecentOrders, { forwarderId: forwarder._id, limit: 5 })
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

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Forwarder Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium">Pending Orders</h3>
          <p className="text-3xl font-bold text-blue-600">{stats.pendingOrders}</p>
          <p className="text-sm text-gray-500">Incoming packages</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium">Ready to Ship</h3>
          <p className="text-3xl font-bold text-green-600">{stats.readyToShip}</p>
          <p className="text-sm text-gray-500">Packed & ready</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium">Capacity Used</h3>
          <p className="text-3xl font-bold text-purple-600">{stats.capacityUsed}%</p>
          <p className="text-sm text-gray-500">{stats.currentCapacity} of {stats.totalCapacity} slots</p>
        </div>
      </div>

      {/* Recent Orders */}
      {recentOrders.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Recent Orders</h3>
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <div key={order._id} className="flex justify-between items-center p-3 border rounded">
                <div>
                  <p className="font-medium">{order.trackingNumber}</p>
                  <p className="text-sm text-gray-600">{order.customerName}</p>
                </div>
                <span className={`px-2 py-1 rounded text-sm ${
                  order.status === 'incoming' ? 'bg-yellow-100 text-yellow-800' :
                  order.status === 'received' ? 'bg-blue-100 text-blue-800' :
                  order.status === 'packed' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {order.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-4">
          <button className="p-4 border rounded-lg hover:bg-gray-50">
            Print Labels ({stats.readyToShip})
          </button>
          <button className="p-4 border rounded-lg hover:bg-gray-50">
            Bulk Assign ({stats.pendingOrders})
          </button>
        </div>
      </div>
    </div>
  );
}