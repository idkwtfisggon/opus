import { getAuth } from "@clerk/react-router/ssr.server";
import { fetchQuery } from "convex/nextjs";
import type { Route } from "./+types/orders";
import { api } from "../../../convex/_generated/api";
import { useMutation } from "convex/react";
import { useState } from "react";

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);
  
  if (!userId) {
    throw new Response("Unauthorized", { status: 401 });
  }

  try {
    // Get forwarder profile first
    const forwarder = await fetchQuery(api.forwarders.getForwarderByUserId, { userId });
    
    if (!forwarder) {
      throw new Response("Forwarder profile not found", { status: 404 });
    }

    // Get orders for this forwarder
    const orders = await fetchQuery(api.orders.getForwarderOrders, { 
      forwarderId: forwarder._id,
      limit: 50 
    });

    // Get the first warehouse for this forwarder (needed for test orders)
    const warehouses = await fetchQuery(api.warehouses.getForwarderWarehouses, { 
      forwarderId: forwarder._id 
    });

    return {
      forwarder,
      orders,
      firstWarehouse: warehouses[0] || null
    };
  } catch (error) {
    console.error("Error loading orders:", error);
    return { 
      forwarder: null,
      orders: [],
      firstWarehouse: null
    };
  }
}

export default function ManageOrders({ loaderData }: Route.ComponentProps) {
  const { orders, forwarder, firstWarehouse } = loaderData;
  const [isCreating, setIsCreating] = useState(false);
  const createOrder = useMutation(api.orders.createOrder);
  const updateOrderStatus = useMutation(api.orders.updateOrderStatus);

  const handleCreateTestOrder = async () => {
    if (!forwarder || !firstWarehouse) {
      alert("Need forwarder profile and warehouse to create test orders");
      return;
    }

    setIsCreating(true);
    try {
      // Generate random test data
      const testCustomers = [
        { name: "John Doe", id: "john123" },
        { name: "Sarah Chen", id: "sarah456" },
        { name: "Mike Johnson", id: "mike789" },
        { name: "Emily Zhang", id: "emily321" }
      ];
      
      const testMerchants = ["Amazon", "eBay", "Shopify Store", "Etsy Shop", "Local Retailer"];
      const shippingTypes = ["immediate", "consolidated"] as const;
      const couriers = ["DHL", "UPS", "FedEx", "SF Express"];
      
      const randomCustomer = testCustomers[Math.floor(Math.random() * testCustomers.length)];
      const randomMerchant = testMerchants[Math.floor(Math.random() * testMerchants.length)];
      const randomShippingType = shippingTypes[Math.floor(Math.random() * shippingTypes.length)];
      const randomCourier = couriers[Math.floor(Math.random() * couriers.length)];
      
      await createOrder({
        customerId: randomCustomer.id,
        customerName: randomCustomer.name,
        customerEmail: `${randomCustomer.id}@example.com`,
        shippingAddress: "123 Customer Street, Singapore 123456",
        trackingNumber: `TRK${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
        merchantName: randomMerchant,
        declaredWeight: Math.floor(Math.random() * 5) + 0.5, // 0.5 to 5.5 kg
        declaredValue: Math.floor(Math.random() * 200) + 50, // $50 to $250
        currency: "USD",
        warehouseId: firstWarehouse._id,
        forwarderId: forwarder._id,
        shippingType: randomShippingType,
        // Customer pre-assigns courier during order creation
        courier: randomCourier,
      });

      // Refresh the page to show the new order
      window.location.reload();
    } catch (error) {
      console.error("Error creating test order:", error);
      alert("Failed to create test order");
    } finally {
      setIsCreating(false);
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    if (!forwarder) return;
    
    try {
      await updateOrderStatus({
        orderId: orderId as any, // Convex ID type
        newStatus: newStatus as any, // Status enum type
        updatedBy: forwarder._id,
        notes: `Status updated via dashboard`
      });
      
      // Refresh to show updated status
      window.location.reload();
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update order status");
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Manage Orders</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage all incoming orders
          </p>
        </div>
        <button 
          onClick={handleCreateTestOrder}
          disabled={isCreating || !forwarder || !firstWarehouse}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 font-medium shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isCreating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
              Creating...
            </>
          ) : (
            "+ Create Test Order"
          )}
        </button>
      </div>

      {/* Orders Table */}
      <div className="bg-card border border-border rounded-xl">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Orders</h2>
            <p className="text-sm text-muted-foreground">
              Total: <span className="font-medium">{orders.length}</span>
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Order ID</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date & Time</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Customer Name</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Customer ID</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Tracking ID</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Shipping Type</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Courier</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center p-8 text-muted-foreground">
                    No orders found. Orders will appear here once you start receiving them.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order._id} className="border-t border-border hover:bg-muted/25">
                    <td className="p-4 text-sm font-medium text-foreground">
                      {order._id.slice(-8).toUpperCase()}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {new Date(order.createdAt).toLocaleString()}
                    </td>
                    <td className="p-4 text-sm text-foreground">
                      {order.customerName}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {order.customerId}
                    </td>
                    <td className="p-4 text-sm font-mono text-foreground">
                      {order.trackingNumber}
                    </td>
                    <td className="p-4">
                      <span className={`inline-block px-2 py-1 rounded-md text-xs font-medium ${
                        order.shippingType === 'immediate' 
                          ? 'bg-orange-100 text-orange-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {order.shippingType === 'immediate' ? 'Immediate' : 'Consolidated'}
                      </span>
                    </td>
                    <td className="p-4">
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusUpdate(order._id, e.target.value)}
                        className={`px-3 py-1 rounded-md text-sm font-medium border-0 focus:ring-2 focus:ring-primary/50 transition-all ${
                          order.status === 'incoming' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'arrived_at_warehouse' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'packed' ? 'bg-green-100 text-green-800' :
                          order.status === 'awaiting_pickup' ? 'bg-orange-100 text-orange-800' :
                          order.status === 'in_transit' ? 'bg-purple-100 text-purple-800' :
                          order.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-gray-100 text-gray-800'
                        }`}
                      >
                        <option value="incoming">Incoming</option>
                        <option value="arrived_at_warehouse">Arrived on Premises</option>
                        <option value="packed">Packed</option>
                        <option value="awaiting_pickup">Awaiting Pickup</option>
                        <option value="in_transit">Delivery in Progress</option>
                        <option value="delivered">Arrived at Destination</option>
                      </select>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {order.courier || 'Not assigned'}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {/* Smart Actions based on order state - Customer pre-assigns courier */}
                        {order.status === 'arrived_at_warehouse' && order.courier ? (
                          <a
                            href={`/print-label?trackingNumber=${encodeURIComponent(
                              order.trackingNumber
                            )}&recipientName=${encodeURIComponent(
                              order.customerName
                            )}&orderId=${encodeURIComponent(
                              order._id
                            )}&courier=${encodeURIComponent(
                              order.courier
                            )}&weight=${encodeURIComponent(
                              order.declaredWeight.toString()
                            )}&createdAt=${encodeURIComponent(
                              new Date(order.createdAt).toISOString()
                            )}&merchantName=${encodeURIComponent(
                              order.merchantName
                            )}&customerEmail=${encodeURIComponent(
                              order.customerEmail
                            )}&shippingType=${encodeURIComponent(
                              order.shippingType
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-primary text-primary-foreground px-3 py-1 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors inline-block"
                          >
                            Print Label
                          </a>
                        ) : order.status === 'arrived_at_warehouse' && !order.courier ? (
                          <span className="text-sm text-red-600">
                            ⚠️ No courier assigned
                          </span>
                        ) : order.status === 'incoming' ? (
                          <button 
                            className="bg-muted text-muted-foreground px-3 py-1 rounded-md text-sm font-medium cursor-not-allowed" 
                            disabled
                            title="Package must arrive at warehouse first"
                          >
                            Print Label
                          </button>
                        ) : order.status === 'packed' || order.status === 'awaiting_pickup' ? (
                          <span className="text-sm text-muted-foreground">
                            ✓ Label printed
                          </span>
                        ) : order.status === 'in_transit' ? (
                          <span className="text-sm text-muted-foreground">
                            ✓ In transit
                          </span>
                        ) : order.status === 'delivered' ? (
                          <span className="text-sm text-muted-foreground">
                            ✓ Delivered
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            -
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}