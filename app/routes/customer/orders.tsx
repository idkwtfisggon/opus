import type { Route } from "./+types/orders";
import { Package, Clock, MapPin, Truck, Eye, Search, Filter } from "lucide-react";
import React, { useState } from "react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "My Orders - Customer Portal" },
    { name: "description", content: "Track and manage all your international shipments" },
  ];
}

export default function CustomerOrders() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // TODO: Replace with real data from Convex
  const mockOrders = [
    {
      id: "ORD-001",
      status: "in_transit",
      merchant: "Amazon",
      destination: "Singapore",
      trackingNumber: "DHL123456789",
      createdAt: "2024-01-15",
      estimatedDelivery: "2024-01-20",
      weight: "2.5kg",
      value: "$89.99",
      items: ["MacBook Charger", "USB-C Hub"],
      courier: "DHL Express"
    },
    {
      id: "ORD-002", 
      status: "arrived_at_warehouse",
      merchant: "Nike Store",
      destination: "Singapore",
      trackingNumber: "UPS987654321",
      createdAt: "2024-01-18",
      estimatedDelivery: "2024-01-22",
      weight: "1.2kg",
      value: "$129.99",
      items: ["Air Max Sneakers"],
      courier: "UPS Standard"
    },
    {
      id: "ORD-003",
      status: "delivered",
      merchant: "Best Buy",
      destination: "Singapore", 
      trackingNumber: "FEDEX456789123",
      createdAt: "2024-01-10",
      estimatedDelivery: "2024-01-16",
      deliveredAt: "2024-01-16",
      weight: "0.8kg",
      value: "$45.99",
      items: ["Bluetooth Headphones"],
      courier: "FedEx Express"
    },
    {
      id: "ORD-004",
      status: "packed",
      merchant: "REI",
      destination: "Singapore",
      trackingNumber: "DHL555444333",
      createdAt: "2024-01-19",
      estimatedDelivery: "2024-01-24",
      weight: "3.1kg", 
      value: "$199.99",
      items: ["Hiking Backpack", "Water Bottle"],
      courier: "DHL Standard"
    }
  ];

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "incoming": return <Clock className="w-4 h-4" />;
      case "arrived_at_warehouse": return <Package className="w-4 h-4" />;
      case "packed": return <Package className="w-4 h-4" />;
      case "in_transit": return <Truck className="w-4 h-4" />;
      case "delivered": return <MapPin className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const filteredOrders = mockOrders.filter(order => {
    const matchesSearch = order.merchant.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">My Orders</h1>
        <p className="text-gray-600">Track and manage all your international shipments</p>
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
            {filteredOrders.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Package className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500 text-lg font-medium">No orders found</p>
                <p className="text-gray-400">Try adjusting your search or filter criteria</p>
              </div>
            ) : (
              filteredOrders.map((order) => (
                <div key={order.id} className="px-6 py-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    {/* Order Info */}
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="flex-shrink-0 mt-1">
                        {getStatusIcon(order.status)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                              {order.merchant}
                            </h3>
                            <p className="text-sm text-gray-600 mb-2">
                              Order {order.id} • {order.destination}
                            </p>
                            
                            {/* Items */}
                            <div className="mb-3">
                              <p className="text-sm text-gray-500 mb-1">Items:</p>
                              <div className="flex flex-wrap gap-1">
                                {order.items.map((item, index) => (
                                  <span key={index} className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-xs font-medium text-gray-700">
                                    {item}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Order Details */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-gray-500">Weight</p>
                                <p className="font-medium text-gray-900">{order.weight}</p>
                              </div>
                              <div>
                                <p className="text-gray-500">Value</p>
                                <p className="font-medium text-gray-900">{order.value}</p>
                              </div>
                              <div>
                                <p className="text-gray-500">Courier</p>
                                <p className="font-medium text-gray-900">{order.courier}</p>
                              </div>
                              <div>
                                <p className="text-gray-500">Created</p>
                                <p className="font-medium text-gray-900">{order.createdAt}</p>
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
                          {order.trackingNumber}
                        </p>
                        {order.status === 'delivered' ? (
                          <p className="text-sm text-green-600 font-medium">
                            Delivered {order.deliveredAt}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-500">
                            Est: {order.estimatedDelivery}
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