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

  // Filter and sort states
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");
  const [statusFilter, setStatusFilter] = useState("");
  const [courierFilter, setCourierFilter] = useState("");
  const [shippingTypeFilter, setShippingTypeFilter] = useState("");
  const [dateRangeFilter, setDateRangeFilter] = useState("");
  const [quickFilter, setQuickFilter] = useState("");

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

  // Filter and sort orders
  const getFilteredAndSortedOrders = () => {
    let filtered = [...orders];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order => 
        order.customerName.toLowerCase().includes(query) ||
        order.trackingNumber.toLowerCase().includes(query) ||
        order.merchantName.toLowerCase().includes(query) ||
        order.customerEmail.toLowerCase().includes(query) ||
        order._id.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Apply courier filter
    if (courierFilter) {
      if (courierFilter === "__no_courier__") {
        filtered = filtered.filter(order => !order.courier);
      } else {
        filtered = filtered.filter(order => order.courier === courierFilter);
      }
    }

    // Apply shipping type filter
    if (shippingTypeFilter) {
      filtered = filtered.filter(order => order.shippingType === shippingTypeFilter);
    }

    // Apply date range filter
    if (dateRangeFilter) {
      const now = new Date();
      const daysAgo = parseInt(dateRangeFilter);
      const cutoffDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
      filtered = filtered.filter(order => new Date(order.createdAt) >= cutoffDate);
    }

    // Apply quick filters
    if (quickFilter === "ready-to-print") {
      filtered = filtered.filter(order => 
        order.status === "arrived_at_warehouse" && order.courier
      );
    } else if (quickFilter === "needs-attention") {
      filtered = filtered.filter(order => 
        (order.status === "arrived_at_warehouse" && !order.courier) ||
        (order.status === "incoming" && new Date(order.createdAt) < new Date(Date.now() - 2 * 24 * 60 * 60 * 1000))
      );
    } else if (quickFilter === "in-transit") {
      filtered = filtered.filter(order => 
        order.status === "in_transit" || order.status === "awaiting_pickup"
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "date-asc":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "customer-az":
          return a.customerName.localeCompare(b.customerName);
        case "customer-za":
          return b.customerName.localeCompare(a.customerName);
        case "weight-desc":
          return b.declaredWeight - a.declaredWeight;
        case "weight-asc":
          return a.declaredWeight - b.declaredWeight;
        case "status":
          const statusOrder = ["incoming", "arrived_at_warehouse", "packed", "awaiting_pickup", "in_transit", "delivered"];
          return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
        default:
          return 0;
      }
    });

    return filtered;
  };

  const filteredOrders = getFilteredAndSortedOrders();

  // Clear all filters
  const clearAllFilters = () => {
    setSearchQuery("");
    setSortBy("date-desc");
    setStatusFilter("");
    setCourierFilter("");
    setShippingTypeFilter("");
    setDateRangeFilter("");
    setQuickFilter("");
  };

  // Get unique couriers for filter dropdown
  const availableCouriers = [...new Set(orders.filter(order => order.courier).map(order => order.courier))];

  // Active filters count  
  const activeFiltersCount = [
    searchQuery,
    statusFilter,
    courierFilter,
    shippingTypeFilter,
    dateRangeFilter,
    quickFilter
  ].filter(Boolean).length + (sortBy !== "date-desc" ? 1 : 0);

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

      {/* Filters & Search */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="space-y-4">
          {/* Quick Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground">Quick Filters:</span>
            <button
              onClick={() => setQuickFilter(quickFilter === "ready-to-print" ? "" : "ready-to-print")}
              className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                quickFilter === "ready-to-print" 
                  ? "bg-green-100 text-green-800 border border-green-200" 
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Ready to Print
            </button>
            <button
              onClick={() => setQuickFilter(quickFilter === "needs-attention" ? "" : "needs-attention")}
              className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                quickFilter === "needs-attention" 
                  ? "bg-red-100 text-red-800 border border-red-200" 
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Needs Attention
            </button>
            <button
              onClick={() => setQuickFilter(quickFilter === "in-transit" ? "" : "in-transit")}
              className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                quickFilter === "in-transit" 
                  ? "bg-blue-100 text-blue-800 border border-blue-200" 
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              In Transit
            </button>
            {activeFiltersCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="px-3 py-1 text-xs rounded-full font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              >
                Clear All ({activeFiltersCount})
              </button>
            )}
          </div>

          {/* Search and Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            {/* Search */}
            <div className="xl:col-span-2">
              <input
                type="text"
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary bg-background"
              />
            </div>

            {/* Sort By */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary bg-background"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="customer-az">Customer A-Z</option>
              <option value="customer-za">Customer Z-A</option>
              <option value="weight-desc">Heaviest First</option>
              <option value="weight-asc">Lightest First</option>
              <option value="status">By Status</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary bg-background"
            >
              <option value="">All Statuses</option>
              <option value="incoming">Incoming</option>
              <option value="arrived_at_warehouse">Arrived on Premises</option>
              <option value="packed">Packed</option>
              <option value="awaiting_pickup">Awaiting Pickup</option>
              <option value="in_transit">Delivery in Progress</option>
              <option value="delivered">Arrived at Destination</option>
            </select>

            {/* Courier Filter */}
            <select
              value={courierFilter}
              onChange={(e) => setCourierFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary bg-background"
            >
              <option value="">All Couriers</option>
              {availableCouriers.map(courier => (
                <option key={courier} value={courier}>{courier}</option>
              ))}
              <option value="__no_courier__">No Courier Assigned</option>
            </select>

            {/* Shipping Type Filter */}
            <select
              value={shippingTypeFilter}
              onChange={(e) => setShippingTypeFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary bg-background"
            >
              <option value="">All Types</option>
              <option value="immediate">Immediate</option>
              <option value="consolidated">Consolidated</option>
            </select>
          </div>

          {/* Date Range Filter */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-foreground">Date Range:</span>
            <select
              value={dateRangeFilter}
              onChange={(e) => setDateRangeFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary bg-background"
            >
              <option value="">All Time</option>
              <option value="1">Last 24 Hours</option>
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-card border border-border rounded-xl">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Orders</h2>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>
                Showing: <span className="font-medium text-foreground">{filteredOrders.length}</span>
              </span>
              <span>
                Total: <span className="font-medium text-foreground">{orders.length}</span>
              </span>
            </div>
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
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center p-8 text-muted-foreground">
                    {orders.length === 0 
                      ? "No orders found. Orders will appear here once you start receiving them."
                      : "No orders match your current filters. Try adjusting your search criteria."
                    }
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order._id} className="border-t border-border hover:bg-muted/25">
                    <td className="p-4 text-sm font-medium text-foreground">
                      {order._id.slice(-8).toUpperCase()}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
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