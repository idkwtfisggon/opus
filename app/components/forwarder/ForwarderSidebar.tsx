"use client";

import { Link, useLocation } from "react-router";
import { 
  Package, 
  BarChart3, 
  Warehouse, 
  Settings, 
  Home,
  Truck,
  ClipboardList,
  TrendingUp
} from "lucide-react";
import { cn } from "~/lib/utils";

const navigation = [
  { 
    id: "overview", 
    name: "Overview", 
    href: "/forwarder", 
    icon: Home,
    description: "Dashboard overview"
  },
  { 
    id: "orders", 
    name: "Orders", 
    href: "/forwarder/orders", 
    icon: Package,
    description: "Manage incoming packages"
  },
  { 
    id: "warehouses", 
    name: "Warehouses", 
    href: "/forwarder/warehouses", 
    icon: Warehouse,
    description: "Manage locations & capacity"
  },
  { 
    id: "analytics", 
    name: "Analytics", 
    href: "/forwarder/analytics", 
    icon: BarChart3,
    description: "Performance insights"
  },
  { 
    id: "settings", 
    name: "Settings", 
    href: "/forwarder/settings", 
    icon: Settings,
    description: "Account & preferences"
  },
];

export default function ForwarderSidebar() {
  const location = useLocation();

  return (
    <div className="flex flex-col w-64 bg-white border-r border-gray-200">
      {/* Logo/Brand */}
      <div className="flex items-center h-16 px-6 border-b border-gray-200">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Truck className="h-8 w-8 text-blue-600" />
          </div>
          <div className="ml-3">
            <h2 className="text-lg font-semibold text-gray-900">Forwarder</h2>
            <p className="text-xs text-gray-500">Logistics Hub</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.id}
              to={item.href}
              className={cn(
                "group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200",
                isActive
                  ? "bg-blue-50 text-blue-700 border-l-4 border-blue-500"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              )}
            >
              <Icon 
                className={cn(
                  "mr-3 h-5 w-5 transition-colors",
                  isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-500"
                )} 
              />
              <div className="flex-1">
                <div className="text-sm font-medium">{item.name}</div>
                <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Stats/Info */}
      <div className="px-4 py-4 border-t border-gray-200">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Active Orders</span>
            <span className="font-semibold text-gray-900">24</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-gray-600">Capacity Used</span>
            <span className="font-semibold text-green-600">67%</span>
          </div>
        </div>
      </div>
    </div>
  );
}