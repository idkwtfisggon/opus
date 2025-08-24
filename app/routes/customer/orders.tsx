import type { Route } from "./+types/orders";
import { Package, Search, Filter, Eye } from "lucide-react";
import React, { useState } from "react";
import { getServerAuth } from "~/contexts/auth";
import { redirect } from "react-router";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "My Orders - Customer Portal" },
    { name: "description", content: "Track and manage all your international shipments" },
  ];
}

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getServerAuth(args.request);
  
  if (!userId) {
    return redirect("/sign-in");
  }

  return { userId };
}

export default function CustomerOrders({ loaderData }: Route.ComponentProps) {
  const { userId } = loaderData;
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Get real orders from Convex (authentication handled in Convex function)
  const ordersData = useQuery(api.orders.getCustomerOrders, {
    limit: 50,
    offset: 0
  });
  const orders = ordersData?.orders || [];
  const isLoading = ordersData === undefined;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "incoming": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "arrived_at_warehouse": return "bg-blue-100 text-blue-800 border-blue-200";
      case "packed": return "bg-purple-100 text-purple-800 border-purple-200";
      case "in_transit": return "bg-green-100 text-green-800 border-green-200";
      case "delivered": return "bg-gray-100 text-gray-800 border-gray-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.merchantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (order.courierTrackingNumber !== "-" && order.courierTrackingNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const formatWeight = (weight: number | null) => {
    return weight ? `${weight}kg` : "-";
  };

  const formatValue = (value: number | null, currency?: string) => {
    if (!value) return "-";
    return `${currency || "USD"} ${value.toFixed(2)}`;
  };

  const getDisplayTrackingNumber = (order: any) => {
    // Show courier tracking number if shipped, otherwise show internal tracking
    if (order.status === "in_transit" || order.status === "delivered") {
      return order.courierTrackingNumber !== "-" ? order.courierTrackingNumber : order.trackingNumber;
    }
    return order.trackingNumber;
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="px-4 py-6 sm:px-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">My Orders</h1>
            <p className="text-gray-600">Track and manage all your international shipments</p>
          </div>
          <a 
            href="/customer/create-order"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Package className="h-5 w-5" />
            Create New Order
          </a>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="px-4 sm:px-0 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by merchant, tracking number, or order ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="sm:w-48">
              <div className="relative">
                <Filter className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                >
                  <option value="all">All Status</option>
                  <option value="incoming">Incoming</option>
                  <option value="arrived_at_warehouse">At Warehouse</option>
                  <option value="packed">Packed</option>
                  <option value="in_transit">In Transit</option>
                  <option value="delivered">Delivered</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="px-4 sm:px-0">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {filteredOrders.length} {filteredOrders.length === 1 ? 'Order' : 'Orders'}
            </h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {isLoading ? (
              <div className="px-6 py-12 text-center">
                <div className="animate-pulse">
                  <Package className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-400">Loading your orders...</p>
                </div>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Package className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500 text-lg font-medium">
                  {orders.length === 0 ? "No orders yet" : "No orders found"}
                </p>
                <p className="text-gray-400 mb-6">
                  {orders.length === 0 ? "Create your first order to get started" : "Try adjusting your search or filter criteria"}
                </p>
                {orders.length === 0 && (
                  <a 
                    href="/customer/create-order"
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    <Package className="h-5 w-5" />
                    Create Your First Order
                  </a>
                )}
              </div>
            ) : (
              filteredOrders.map((order) => (
                <div key={order._id} className="px-6 py-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    {/* Order Info */}
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                              {order.merchantName}
                            </h3>
                            <p className="text-sm text-gray-600 mb-2">
                              Order {order.orderNumber.slice(-8)} • {order.warehouse?.country || "Processing"}
                            </p>
                            
                            {/* Item Category */}
                            <div className="mb-3">
                              <p className="text-sm text-gray-500 mb-1">Category:</p>
                              <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 text-xs font-medium text-blue-700">
                                {order.itemCategory}
                              </span>
                            </div>

                            {/* Order Details */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-gray-500">Weight</p>
                                <p className="font-medium text-gray-900">{formatWeight(order.declaredWeight)}</p>
                              </div>
                              <div>
                                <p className="text-gray-500">Value</p>
                                <p className="font-medium text-gray-900">{formatValue(order.declaredValue, order.currency)}</p>
                              </div>
                              <div>
                                <p className="text-gray-500">Courier</p>
                                <p className="font-medium text-gray-900">{order.courier}</p>
                              </div>
                              <div>
                                <p className="text-gray-500">Created</p>
                                <p className="font-medium text-gray-900">{formatDate(order.createdAt)}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Status and Tracking */}
                    <div className="flex flex-col items-end space-y-3 ml-6">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(order.status)}`}>
                        {formatStatus(order.status)}
                      </span>
                      
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900 mb-1">
                          {getDisplayTrackingNumber(order)}
                        </p>
                        <p className="text-xs text-gray-400 mb-1">
                          {order.status === "in_transit" || order.status === "delivered" ? "Courier Tracking" : "Internal Tracking"}
                        </p>
                        {order.status === 'delivered' && order.deliveredAt ? (
                          <p className="text-sm text-green-600 font-medium">
                            Delivered {formatDate(order.deliveredAt)}
                          </p>
                        ) : order.shippedAt ? (
                          <p className="text-sm text-blue-600 font-medium">
                            Shipped {formatDate(order.shippedAt)}
                          </p>
                        ) : order.receivedAt ? (
                          <p className="text-sm text-purple-600 font-medium">
                            At warehouse since {formatDate(order.receivedAt)}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-500">
                            Processing...
                          </p>
                        )}
                      </div>
                      
                      <button className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
                        <Eye className="w-4 h-4 mr-1" />
                        Track Order
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}