import type { Route } from "./+types/index";
import { Package, Clock, MapPin, Truck } from "lucide-react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Customer Dashboard - Opus" },
    { name: "description", content: "Track your orders and manage shipments" },
  ];
}

export default function CustomerDashboard() {
  // TODO: Replace with real data from Convex
  const mockOrders = [
    {
      id: "ORD-001",
      status: "in_transit",
      merchant: "Amazon",
      destination: "Singapore",
      trackingNumber: "DHL123456789",
      createdAt: "2024-01-15",
      estimatedDelivery: "2024-01-20"
    },
    {
      id: "ORD-002", 
      status: "arrived_at_warehouse",
      merchant: "Nike Store",
      destination: "Singapore",
      trackingNumber: "UPS987654321",
      createdAt: "2024-01-18",
      estimatedDelivery: "2024-01-22"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "incoming": return "bg-yellow-100 text-yellow-800";
      case "arrived_at_warehouse": return "bg-blue-100 text-blue-800";
      case "packed": return "bg-purple-100 text-purple-800";
      case "in_transit": return "bg-green-100 text-green-800";
      case "delivered": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
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

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome back!</h1>
        <p className="text-gray-600">Track your international shipments and manage your orders</p>
      </div>

      {/* Stats Overview */}
      <div className="px-4 py-6 sm:px-0">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Package className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Orders</p>
                <p className="text-2xl font-semibold text-gray-900">2</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Truck className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">In Transit</p>
                <p className="text-2xl font-semibold text-gray-900">1</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex-shrink-0">
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">At Warehouse</p>
              <p className="text-2xl font-semibold text-gray-900">1</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <MapPin className="h-8 w-8 text-gray-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Delivered</p>
                <p className="text-2xl font-semibold text-gray-900">12</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="px-4 sm:px-0">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {mockOrders.map((order) => (
              <div key={order.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {getStatusIcon(order.status)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {order.merchant}
                      </p>
                      <p className="text-sm text-gray-600">
                        Order {order.id} • {order.destination}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {order.status.replace('_', ' ')}
                    </span>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {order.trackingNumber}
                      </p>
                      <p className="text-sm text-gray-500">
                        Est: {order.estimatedDelivery}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="px-6 py-4 bg-gray-50">
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View all orders →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}