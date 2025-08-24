import { getServerAuth } from "~/contexts/auth";
import { redirect } from "react-router";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import { useQuery } from "convex/react";
import { useState } from "react";

export async function loader(args: any) {
  const { userId } = await getServerAuth(args.request);
  
  if (!userId) {
    return redirect("/sign-in");
  }

  try {
    // Get staff profile
    const staff = await fetchQuery(api.staff.getStaffByUserId, { userId });
    
    if (!staff) {
      throw new Response("Staff profile not found", { status: 404 });
    }

    if (!staff.isActive) {
      throw new Response("Staff account is inactive", { status: 403 });
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

export default function StaffActivity({ loaderData }: any) {
  const { staff } = loaderData;
  const [selectedPeriod, setSelectedPeriod] = useState<"today" | "week" | "month">("today");

  // Calculate date range based on selected period
  const getDateRange = () => {
    const now = Date.now();
    switch (selectedPeriod) {
      case "today":
        return { startDate: now - 24 * 60 * 60 * 1000, endDate: now };
      case "week":
        return { startDate: now - 7 * 24 * 60 * 60 * 1000, endDate: now };
      case "month":
        return { startDate: now - 30 * 24 * 60 * 60 * 1000, endDate: now };
    }
  };

  const { startDate, endDate } = getDateRange();

  // Get staff activity data
  const staffActivity = useQuery(
    api.staff.getStaffActivity,
    {
      forwarderId: staff.forwarderId,
      startDate,
      endDate,
      staffId: staff._id,
      limit: 50
    }
  );

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-SG', {
      timeZone: 'Asia/Singapore',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'scan':
        return '📱';
      case 'status_update':
        return '📝';
      case 'login':
        return '🔑';
      case 'logout':
        return '🚪';
      default:
        return '📋';
    }
  };

  const getActivityColor = (activityType: string) => {
    switch (activityType) {
      case 'scan':
        return 'bg-blue-100 text-blue-800';
      case 'status_update':
        return 'bg-green-100 text-green-800';
      case 'login':
        return 'bg-purple-100 text-purple-800';
      case 'logout':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  // Calculate statistics
  const stats = staffActivity ? {
    totalActivities: staffActivity.length,
    scans: staffActivity.filter(a => a.activityType === 'scan').length,
    statusUpdates: staffActivity.filter(a => a.activityType === 'status_update').length,
    ordersProcessed: new Set(staffActivity.map(a => a.orderId).filter(Boolean)).size,
  } : { totalActivities: 0, scans: 0, statusUpdates: 0, ordersProcessed: 0 };

  if (!staffActivity) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-48 mb-6"></div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="h-20 bg-muted rounded"></div>
            <div className="h-20 bg-muted rounded"></div>
          </div>
          <div className="space-y-4">
            <div className="h-16 bg-muted rounded"></div>
            <div className="h-16 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-semibold text-foreground">My Activity</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your work history and performance
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Period Selector */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-medium text-foreground mb-3">Time Period</h3>
          <div className="flex gap-2">
            {(["today", "week", "month"] as const).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedPeriod === period
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {period === "today" ? "Today" : 
                 period === "week" ? "Last 7 Days" : 
                 "Last 30 Days"}
              </button>
            ))}
          </div>
        </div>

        {/* Activity Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-foreground">{stats.totalActivities}</div>
            <div className="text-sm text-muted-foreground">Total Activities</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.scans}</div>
            <div className="text-sm text-muted-foreground">Package Scans</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.statusUpdates}</div>
            <div className="text-sm text-muted-foreground">Status Updates</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.ordersProcessed}</div>
            <div className="text-sm text-muted-foreground">Orders Processed</div>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-card border border-border rounded-xl">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">
              Recent Activity ({staffActivity.length})
            </h2>
          </div>

          {staffActivity.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">No Activity Found</h3>
              <p className="text-muted-foreground">
                No activities recorded for the selected time period.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {staffActivity.map((activity) => (
                <div key={activity._id} className="p-4 hover:bg-accent/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="flex-shrink-0">
                        <span className="text-2xl" role="img">
                          {getActivityIcon(activity.activityType)}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActivityColor(activity.activityType)}`}>
                            {activity.activityType.replace('_', ' ')}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {activity.warehouseName}
                          </span>
                        </div>

                        {activity.orderId && (
                          <div className="text-sm text-foreground mb-2">
                            <strong>Order:</strong> {activity.orderId}
                          </div>
                        )}

                        {activity.details && (
                          <div className="space-y-1">
                            {activity.details.oldStatus && activity.details.newStatus && (
                              <div className="text-sm text-muted-foreground">
                                Status: {activity.details.oldStatus} → {activity.details.newStatus}
                              </div>
                            )}
                            {activity.details.scanLocation && (
                              <div className="text-sm text-muted-foreground">
                                Location: {activity.details.scanLocation}
                              </div>
                            )}
                            {activity.details.processingTimeSeconds && (
                              <div className="text-sm text-muted-foreground">
                                Processing time: {activity.details.processingTimeSeconds}s
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDateTime(activity.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Performance Summary */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Performance Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-foreground mb-3">Activity Breakdown</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Package Scans</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: stats.totalActivities > 0 ? `${(stats.scans / stats.totalActivities) * 100}%` : '0%' }}
                      />
                    </div>
                    <span className="text-sm font-medium text-foreground">{stats.scans}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Status Updates</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: stats.totalActivities > 0 ? `${(stats.statusUpdates / stats.totalActivities) * 100}%` : '0%' }}
                      />
                    </div>
                    <span className="text-sm font-medium text-foreground">{stats.statusUpdates}</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-foreground mb-3">Productivity</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Orders Processed</span>
                  <span className="text-sm font-medium text-foreground">{stats.ordersProcessed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Avg. Activities per Day</span>
                  <span className="text-sm font-medium text-foreground">
                    {selectedPeriod === "today" ? stats.totalActivities :
                     selectedPeriod === "week" ? Math.round(stats.totalActivities / 7) :
                     Math.round(stats.totalActivities / 30)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Efficiency Rating</span>
                  <span className="text-sm font-medium text-green-600">
                    {stats.totalActivities > 10 ? "High" : 
                     stats.totalActivities > 5 ? "Medium" : 
                     "Getting Started"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}