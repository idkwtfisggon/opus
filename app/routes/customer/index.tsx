import type { Route } from "./+types/index";
import { Package, Clock, MapPin, Truck, Bell, Heart, CreditCard, HelpCircle } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { getServerAuth } from "~/contexts/auth";
import { redirect } from "react-router";
import { fetchQuery } from "convex/nextjs";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Customer Dashboard - Opus" },
    { name: "description", content: "Track your orders and manage shipments" },
  ];
}

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getServerAuth(args.request);
  
  if (!userId) {
    return redirect("/sign-in");
  }

  try {
    // Get customer dashboard data server-side
    const dashboardData = await fetchQuery(api.customerDashboard.getCustomerDashboard, { userId });
    
    return { 
      userId,
      dashboardData: dashboardData || {
        customer: null,
        activeOrders: [],
        recentOrders: [],
        unreadNotifications: [],
        openSupportTickets: [],
        stats: { 
          totalOrders: 0, 
          pendingOrders: 0, 
          deliveredOrders: 0,
          activeOrdersCount: 0
        },
        thisMonthSpend: 0,
        upcomingDeliveries: [],
        addresses: [],
        notifications: []
      }
    };
  } catch (error) {
    console.error("Error loading customer dashboard:", error);
    return { 
      userId,
      dashboardData: {
        customer: null,
        activeOrders: [],
        recentOrders: [],
        unreadNotifications: [],
        openSupportTickets: [],
        stats: { 
          totalOrders: 0, 
          pendingOrders: 0, 
          deliveredOrders: 0,
          activeOrdersCount: 0
        },
        thisMonthSpend: 0,
        upcomingDeliveries: [],
        addresses: [],
        notifications: []
      }
    };
  }
}

export default function CustomerDashboard({ loaderData }: Route.ComponentProps) {
  const { dashboardData } = loaderData;

  if (!dashboardData) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                  <div className="h-8 bg-gray-200 rounded mb-4"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { customer, activeOrders, recentOrders, unreadNotifications, openSupportTickets, stats, thisMonthSpend, upcomingDeliveries } = dashboardData;

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

  const inTransitCount = activeOrders.filter(order => 
    order.status === "in_transit" || order.status === "shipped"
  ).length;
  
  const atWarehouseCount = activeOrders.filter(order => 
    order.status === "arrived_at_warehouse" || order.status === "received"
  ).length;

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="px-4 py-6 sm:px-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome back, {customer?.firstName && customer?.lastName 
                ? `${customer.firstName} ${customer.lastName}` 
                : customer?.firstName || customer?.name || "Customer"}!
            </h1>
            <p className="text-gray-600">Track your international shipments and manage your orders</p>
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
                <p className="text-2xl font-semibold text-gray-900">{stats.activeOrdersCount}</p>
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
                <p className="text-2xl font-semibold text-gray-900">{inTransitCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">At Warehouse</p>
                <p className="text-2xl font-semibold text-gray-900">{atWarehouseCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CreditCard className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className="text-2xl font-semibold text-gray-900">
                  ${thisMonthSpend.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-0 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
            </div>
            
            <div className="divide-y divide-gray-200">
              {recentOrders.length > 0 ? recentOrders.map((order) => (
                <div key={order._id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        {getStatusIcon(order.status)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {order.merchantName}
                        </p>
                        <p className="text-sm text-gray-600">
                          To: {order.shippingAddress.split(',')[0]}
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
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="px-6 py-8 text-center text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No recent orders</p>
                  <p className="text-sm">Your orders will appear here once you start shipping</p>
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 bg-gray-50">
              <a href="/customer/orders" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                View all orders →
              </a>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Notifications */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
                {stats.unreadNotificationsCount > 0 && (
                  <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                    {stats.unreadNotificationsCount} new
                  </span>
                )}
              </div>
            </div>
            
            <div className="divide-y divide-gray-200">
              {unreadNotifications.length > 0 ? unreadNotifications.slice(0, 3).map((notification) => (
                <div key={notification._id} className="px-6 py-3">
                  <div className="flex items-start space-x-3">
                    <Bell className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{notification.message}</p>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="px-6 py-4 text-center text-gray-500">
                  <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No new notifications</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
            </div>
            
            <div className="p-4 space-y-2">
              <a href="/customer/orders" className="flex items-center p-3 text-sm rounded-lg hover:bg-gray-50">
                <Package className="h-4 w-4 mr-3 text-blue-600" />
                Track a Package
              </a>
              <button className="flex items-center w-full p-3 text-sm rounded-lg hover:bg-gray-50">
                <HelpCircle className="h-4 w-4 mr-3 text-green-600" />
                Contact Support
              </button>
              <a href="/customer/settings" className="flex items-center p-3 text-sm rounded-lg hover:bg-gray-50">
                <MapPin className="h-4 w-4 mr-3 text-purple-600" />
                Manage Addresses
              </a>
            </div>
          </div>

          {/* Support Tickets */}
          {stats.openTicketsCount > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Open Support Tickets</h2>
              </div>
              
              <div className="divide-y divide-gray-200">
                {openSupportTickets.map((ticket) => (
                  <div key={ticket._id} className="px-6 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{ticket.subject}</p>
                        <p className="text-xs text-gray-500 mt-1">{ticket.category}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        ticket.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                        ticket.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {ticket.priority}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}