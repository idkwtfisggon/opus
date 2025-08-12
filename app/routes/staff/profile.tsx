import { getAuth } from "@clerk/react-router/ssr.server";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import { useQuery } from "convex/react";
import { useState } from "react";

export async function loader(args: any) {
  const { userId } = await getAuth(args);
  
  if (!userId) {
    throw new Response("Unauthorized", { status: 401 });
  }

  try {
    // Get staff profile
    const staff = await fetchQuery(api.staff.getStaffByUserId, { userId });
    
    if (!staff) {
      throw new Response("Staff profile not found", { status: 404 });
    }

    return { 
      staff,
      userId
    };
  } catch (error) {
    console.error("Error loading staff data:", error);
    throw new Response("Internal Server Error", { status: 500 });
  }
}

export default function StaffProfile({ loaderData }: any) {
  const { staff } = loaderData;

  // Get staff performance metrics
  const performanceMetrics = useQuery(
    api.staff.getStaffPerformanceMetrics,
    { forwarderId: staff.forwarderId }
  );

  // Find current staff metrics
  const currentStaffMetrics = performanceMetrics?.staffMetrics.find(s => s.staffId === staff._id);

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'manager': return 'bg-purple-100 text-purple-800';
      case 'supervisor': return 'bg-blue-100 text-blue-800';
      case 'warehouse_worker': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-SG', {
      timeZone: 'Asia/Singapore',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-semibold text-foreground">My Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your account information and permissions
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Profile Information */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">{staff.name}</h2>
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(staff.role)}`}>
                  {staff.role.replace('_', ' ')}
                </span>
                {staff.isActive ? (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                    Inactive
                  </span>
                )}
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div><strong>Email:</strong> {staff.email}</div>
                {staff.phone && <div><strong>Phone:</strong> {staff.phone}</div>}
                <div><strong>Joined:</strong> {formatDate(staff.createdAt)}</div>
              </div>
            </div>
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>

          {/* Assigned Warehouses */}
          <div className="border-t border-border pt-6">
            <h3 className="font-semibold text-foreground mb-3">Assigned Warehouses</h3>
            {staff.warehouses && staff.warehouses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {staff.warehouses.map((warehouse) => (
                  <div key={warehouse._id} className="bg-background border border-border rounded-lg p-4">
                    <h4 className="font-medium text-foreground">{warehouse.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {warehouse.city}, {warehouse.state}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {warehouse.country}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No warehouses assigned</p>
            )}
          </div>
        </div>

        {/* Permissions */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Permissions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-background border border-border rounded-lg">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 12h-.01M12 12v-.01M12 12h-4.01M12 12v4.01" />
                </svg>
                <span className="text-sm font-medium text-foreground">Scan Barcodes</span>
              </div>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                staff.permissions.canScanBarcodes ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
              }`}>
                {staff.permissions.canScanBarcodes ? '✓' : '✕'}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-background border border-border rounded-lg">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-foreground">Update Order Status</span>
              </div>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                staff.permissions.canUpdateOrderStatus ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
              }`}>
                {staff.permissions.canUpdateOrderStatus ? '✓' : '✕'}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-background border border-border rounded-lg">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span className="text-sm font-medium text-foreground">Print Labels</span>
              </div>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                staff.permissions.canPrintLabels ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
              }`}>
                {staff.permissions.canPrintLabels ? '✓' : '✕'}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-background border border-border rounded-lg">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="text-sm font-medium text-foreground">View Reports</span>
              </div>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                staff.permissions.canViewReports ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
              }`}>
                {staff.permissions.canViewReports ? '✓' : '✕'}
              </div>
            </div>
          </div>
        </div>

        {/* Performance Stats */}
        {currentStaffMetrics && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Performance Overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-background border border-border rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{currentStaffMetrics.scans}</div>
                <div className="text-sm text-muted-foreground">Total Scans</div>
              </div>
              <div className="text-center p-4 bg-background border border-border rounded-lg">
                <div className="text-2xl font-bold text-green-600">{currentStaffMetrics.statusUpdates}</div>
                <div className="text-sm text-muted-foreground">Status Updates</div>
              </div>
              <div className="text-center p-4 bg-background border border-border rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{currentStaffMetrics.ordersProcessed}</div>
                <div className="text-sm text-muted-foreground">Orders Processed</div>
              </div>
              <div className="text-center p-4 bg-background border border-border rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{currentStaffMetrics.avgProcessingTime}s</div>
                <div className="text-sm text-muted-foreground">Avg Processing</div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <a 
              href="/staff/scanner"
              className="flex items-center gap-3 p-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 12h-.01M12 12v-.01M12 12h-4.01M12 12v4.01" />
              </svg>
              <span className="font-medium">Start Scanning</span>
            </a>
            <a 
              href="/staff/orders"
              className="flex items-center gap-3 p-4 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <span className="font-medium">View My Orders</span>
            </a>
            <a 
              href="/staff/activity"
              className="flex items-center gap-3 p-4 border border-border bg-background text-foreground rounded-lg hover:bg-accent transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="font-medium">My Activity</span>
            </a>
            <button className="flex items-center gap-3 p-4 border border-border bg-background text-foreground rounded-lg hover:bg-accent transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">Help & Support</span>
            </button>
          </div>
        </div>

        {/* Device & Session Info */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Session Information</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Browser:</span>
              <span className="text-foreground">{navigator.userAgent.split(' ')[0] || 'Unknown'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Platform:</span>
              <span className="text-foreground">{navigator.platform || 'Unknown'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Language:</span>
              <span className="text-foreground">{navigator.language || 'Unknown'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Updated:</span>
              <span className="text-foreground">{formatDate(staff.updatedAt || staff.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}