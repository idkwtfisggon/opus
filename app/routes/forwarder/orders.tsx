import { getAuth } from "@clerk/react-router/ssr.server";
import { fetchQuery } from "convex/nextjs";
import type { Route } from "./+types/orders";
import { api } from "../../../convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Truck, Trash2 } from "lucide-react";
import ShippingRatesModal from "../../components/courier/ShippingRatesModal";

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);
  
  if (!userId) {
    throw new Response("Unauthorized", { status: 401 });
  }

  return { userId };
}

export default function ManageOrders({ loaderData }: Route.ComponentProps) {
  const { userId } = loaderData;
  
  // Get forwarder data with warehouses and service areas
  const forwarderData = useQuery(api.warehouseServiceAreas.getForwarderServiceAreas);
  
  const [isCreating, setIsCreating] = useState(false);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const createOrder = useMutation(api.orders.createOrder);
  const updateOrderStatus = useMutation(api.orders.updateOrderStatus);
  const deleteOrder = useMutation(api.orders.deleteOrder);
  
  const forwarder = forwarderData?.forwarder;
  const warehouses = forwarderData?.warehouses || [];
  const firstWarehouse = warehouses[0] || null;

  // Get ALL orders for this forwarder using the same query as dashboard
  const allOrders = useQuery(
    api.orders.getRecentOrders,
    forwarderData?.forwarder ? { 
      forwarderId: forwarderData.forwarder._id,
      limit: 1000 // Get all orders
    } : "skip"
  );

  // Get parcel conditions for verification status checking
  const allConditions = useQuery(
    api.parcelConditions.getConditionsRequiringReview,
    { warehouseId: firstWarehouse?._id }
  );

  // Helper functions to check verification status
  const hasArrivalVerification = (orderId: string) => {
    return allConditions?.some(condition => 
      condition.orderId === orderId && condition.eventType === "arrival"
    );
  };

  const hasHandoverVerification = (orderId: string) => {
    return allConditions?.some(condition => 
      condition.orderId === orderId && condition.eventType === "handover"
    );
  };
  
  // Convert to expected format and add warehouse details
  const orderData = allOrders ? {
    orders: allOrders.map(order => {
      const warehouse = warehouses.find(w => w._id === order.warehouseId);
      return {
        ...order,
        warehouse: warehouse ? {
          _id: warehouse._id,
          name: warehouse.name,
          city: warehouse.city,
          state: warehouse.state,
          country: warehouse.country,
        } : null,
      };
    }),
    total: allOrders.length,
    hasMore: false
  } : null;
  
  // Debug logging
  console.log("DEBUG - forwarderData:", forwarderData);
  console.log("DEBUG - orderData:", orderData);

  // Filter and sort states
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");
  const [statusFilter, setStatusFilter] = useState("");
  const [courierFilter, setCourierFilter] = useState("");
  const [shippingTypeFilter, setShippingTypeFilter] = useState("");
  const [dateRangeFilter, setDateRangeFilter] = useState("");
  const [quickFilter, setQuickFilter] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [viewAll, setViewAll] = useState(false);
  
  // Split order states
  
  // Shipping modal states
  const [shippingModalOpen, setShippingModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const handleCreateTestOrder = async () => {
    console.log("Debug - forwarder:", forwarder);
    console.log("Debug - warehouses:", warehouses);
    
    if (warehouses.length === 0) {
      console.error("No warehouses available");
      alert("No warehouses available for test order creation");
      return;
    }
    
    // Pick a random warehouse from available warehouses
    const randomWarehouse = warehouses[Math.floor(Math.random() * warehouses.length)];
    console.log("Debug - randomWarehouse:", randomWarehouse);

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
        warehouseId: randomWarehouse._id,
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
        orderId: orderId,
        newStatus: newStatus,
        changedBy: forwarder._id,
        changedByType: "forwarder",
        notes: `Status updated via dashboard by ${forwarder.businessName}`,
        scanData: {
          barcodeValue: orderId,
          location: "Forwarder Dashboard",
          deviceInfo: `${navigator.userAgent} - ${new Date().toISOString()}`,
        }
      });
      
      // Refresh to show updated status
      window.location.reload();
    } catch (error) {
      console.error("Error updating status:", error);
      alert(`Failed to update order status: ${error.message}`);
    }
  };

  const handleLabelCreated = (result: any) => {
    console.log("Label created:", result);
    alert(`Shipping label created! Tracking: ${result.trackingNumber}`);
    // Refresh orders list
    window.location.reload();
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!forwarder) return;
    
    // Confirm deletion
    const confirmed = window.confirm(
      "Are you sure you want to delete this order? This action cannot be undone and will remove all related data including photos and history."
    );
    
    if (!confirmed) return;
    
    setDeletingOrderId(orderId);
    
    try {
      await deleteOrder({
        orderId: orderId,
        forwarderId: forwarder._id,
      });
      
      // Refresh to show updated list
      window.location.reload();
    } catch (error) {
      console.error("Error deleting order:", error);
      alert(`Failed to delete order: ${error.message}`);
    } finally {
      setDeletingOrderId(null);
    }
  };

  // Filter and sort orders
  const getFilteredAndSortedOrders = () => {
    if (!orderData?.orders) return [];
    let filtered = [...orderData.orders];

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

    // Apply warehouse filter
    if (warehouseFilter) {
      filtered = filtered.filter(order => order.warehouseId === warehouseFilter);
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
  
  // Implement pagination on filtered orders
  const totalFilteredOrders = filteredOrders.length;
  const startIndex = viewAll ? 0 : (currentPage - 1) * itemsPerPage;
  const endIndex = viewAll ? totalFilteredOrders : startIndex + itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);
  const totalPages = Math.ceil(totalFilteredOrders / itemsPerPage);

  // Clear all filters
  const clearAllFilters = () => {
    setSearchQuery("");
    setSortBy("date-desc");
    setStatusFilter("");
    setCourierFilter("");
    setShippingTypeFilter("");
    setDateRangeFilter("");
    setQuickFilter("");
    setWarehouseFilter("");
  };

  // Handle split order

  // Get unique couriers for filter dropdown
  const availableCouriers = [...new Set(orderData?.orders?.filter(order => order.courier).map(order => order.courier) || [])];

  // Active filters count  
  const activeFiltersCount = [
    searchQuery,
    statusFilter,
    courierFilter,
    shippingTypeFilter,
    dateRangeFilter,
    quickFilter,
    warehouseFilter
  ].filter(Boolean).length + (sortBy !== "date-desc" ? 1 : 0);

  // Show loading state while data is being fetched
  if (!forwarderData) {
    return (
      <div className="space-y-6 p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="h-8 bg-gray-200 rounded mb-4"></div>
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

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
          disabled={isCreating}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-3">
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

            {/* Warehouse Filter */}
            <select
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary bg-background"
            >
              <option value="">All Warehouses</option>
              {warehouses.map(warehouse => (
                <option key={warehouse._id} value={warehouse._id}>
                  {warehouse.name} ({warehouse.city})
                </option>
              ))}
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
            <div>
              <h2 className="text-lg font-semibold text-foreground">Orders</h2>
              <p className="text-sm text-muted-foreground mt-1">
                📷 Photo verification is performed by warehouse staff on arrival and handover
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>
                Showing: <span className="font-medium text-foreground">{paginatedOrders.length}</span>
              </span>
              <span>
                Total: <span className="font-medium text-foreground">{totalFilteredOrders}</span>
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
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Warehouse</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Shipping Type</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Verification</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Courier</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center p-8 text-muted-foreground">
                    {!orderData?.orders || orderData.orders.length === 0 
                      ? "No orders found. Orders will appear here once you start receiving them."
                      : "No orders match your current filters. Try adjusting your search criteria."
                    }
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => (
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
                    <td className="p-4 text-sm text-muted-foreground">
                      {order.warehouse ? (
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{order.warehouse.name}</span>
                          <span className="text-xs">{order.warehouse.city}, {order.warehouse.state}</span>
                        </div>
                      ) : (
                        <span className="text-red-600">No warehouse assigned</span>
                      )}
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
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        {/* Show verification status based on order status */}
                        {order.status === "arrived_at_warehouse" && (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            hasArrivalVerification(order._id) 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {hasArrivalVerification(order._id) ? '✅ Arrival Verified' : '📷 Arrival Needed'}
                          </span>
                        )}
                        {order.status === "awaiting_pickup" && (
                          <div className="flex flex-col gap-1">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              ✅ Arrival Verified
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              hasHandoverVerification(order._id) 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-orange-100 text-orange-800'
                            }`}>
                              {hasHandoverVerification(order._id) ? '✅ Handover Verified' : '📷 Handover Needed'}
                            </span>
                          </div>
                        )}
                        {["packed", "in_transit", "delivered"].includes(order.status) && (
                          <div className="flex flex-col gap-1">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              ✅ All Verified
                            </span>
                          </div>
                        )}
                        {order.status === "incoming" && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            - Awaiting Arrival
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {order.courier || 'Not assigned'}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {/* Delete Order Button */}
                        <button
                          onClick={() => handleDeleteOrder(order._id)}
                          disabled={deletingOrderId === order._id}
                          className="bg-red-100 text-red-800 px-3 py-1 rounded-md text-sm font-medium hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete this order permanently"
                        >
                          {deletingOrderId === order._id ? "..." : <Trash2 className="w-4 h-4" />}
                        </button>
                        
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
                          <button
                            onClick={() => {
                              setSelectedOrderId(order._id);
                              setShippingModalOpen(true);
                            }}
                            className="bg-primary text-primary-foreground px-3 py-1 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                          >
                            <Truck className="w-4 h-4 mr-2" />
                            Create Label
                          </button>
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
        
        {/* Pagination Controls */}
        <div className="p-6 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Showing {viewAll ? totalFilteredOrders : `${startIndex + 1}-${Math.min(endIndex, totalFilteredOrders)}`} of {totalFilteredOrders} orders
            </span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="px-3 py-1 text-sm border border-border rounded focus:ring-2 focus:ring-primary/50 focus:border-primary bg-background"
            >
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
            <button
              onClick={() => setViewAll(!viewAll)}
              className="px-3 py-1 text-sm border border-border rounded hover:bg-muted transition-colors"
            >
              {viewAll ? "Show Paginated" : "View All (Single Scroll)"}
            </button>
          </div>
          
          {!viewAll && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-border rounded hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="px-3 py-1 text-sm border border-border rounded hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>


      {/* Shipping Rates Modal */}
      {shippingModalOpen && selectedOrderId && forwarder && (
        <ShippingRatesModal
          orderId={selectedOrderId}
          forwarderId={forwarder._id}
          onClose={() => {
            setShippingModalOpen(false);
            setSelectedOrderId(null);
          }}
          onLabelCreated={handleLabelCreated}
        />
      )}
    </div>
  );
}