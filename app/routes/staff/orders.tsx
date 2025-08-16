import { getAuth } from "@clerk/react-router/ssr.server";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { useState } from "react";
import ArrivalCapture from "../../components/parcel/ArrivalCapture";
import HandoverCapture from "../../components/parcel/HandoverCapture";

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

export default function StaffOrders({ loaderData }: any) {
  const { staff } = loaderData;
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [arrivalCaptureOrderId, setArrivalCaptureOrderId] = useState<string | null>(null);
  const [handoverCaptureOrderId, setHandoverCaptureOrderId] = useState<string | null>(null);

  // Mutations
  const updateOrderStatus = useMutation(api.staff.updateOrderStatus);

  // Get orders for this staff member
  const orders = useQuery(
    api.staff.getOrdersForStaff, 
    { 
      staffId: staff._id,
      status: statusFilter === "all" ? undefined : statusFilter,
      limit: 100
    }
  );

  // Get parcel conditions for verification status checking
  const allConditions = useQuery(
    api.parcelConditions.getConditionsRequiringReview,
    { warehouseId: staff?.assignedWarehouses?.[0] }
  );

  // Helper function to check if order has arrival verification
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'incoming': return 'bg-yellow-100 text-yellow-800';
      case 'arrived_at_warehouse': return 'bg-blue-100 text-blue-800';
      case 'packed': return 'bg-green-100 text-green-800';
      case 'awaiting_pickup': return 'bg-purple-100 text-purple-800';
      case 'shipped': case 'in_transit': return 'bg-indigo-100 text-indigo-800';
      case 'delivered': return 'bg-emerald-100 text-emerald-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-SG', {
      timeZone: 'Asia/Singapore',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string, orderTrackingNumber: string) => {
    if (updatingOrderId) return; // Prevent multiple simultaneous updates
    
    setUpdatingOrderId(orderId);
    
    try {
      await updateOrderStatus({
        orderId,
        newStatus,
        staffId: staff._id,
        notes: `Updated via orders page by ${staff.name}`,
        scanData: {
          barcodeValue: orderTrackingNumber,
          location: "Orders Page",
          deviceInfo: `${navigator.userAgent} - ${new Date().toISOString()}`,
        }
      });
      
      // Success feedback could be added here (toast notification, etc.)
    } catch (error: any) {
      alert(`Failed to update order: ${error.message}`);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  if (!orders) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-48 mb-6"></div>
          <div className="space-y-4">
            <div className="h-16 bg-muted rounded"></div>
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
          <h1 className="text-2xl font-semibold text-foreground">My Orders</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Orders assigned to your warehouses
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Filters */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-medium text-foreground mb-3">Filter by Status</h3>
          <div className="flex flex-wrap gap-2">
            {["all", "incoming", "arrived_at_warehouse", "packed", "awaiting_pickup", "shipped", "delivered"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {status === "all" ? "All Orders" : status.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Orders List */}
        <div className="bg-card border border-border rounded-xl">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Orders ({orders.length})
              </h2>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                staff.role === 'manager' ? 'bg-purple-100 text-purple-800' :
                staff.role === 'supervisor' ? 'bg-blue-100 text-blue-800' :
                'bg-green-100 text-green-800'
              }`}>
                {staff.role.replace('_', ' ')}
                {staff.role === 'warehouse_worker' && ' (Forward-only)'}
              </span>
            </div>
          </div>

          {orders.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">No Orders Found</h3>
              <p className="text-muted-foreground">
                {statusFilter === "all" 
                  ? "No orders are currently assigned to your warehouses"
                  : `No orders with status "${statusFilter.replace('_', ' ')}" found`
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {orders.map((order) => (
                <div key={order._id} className="p-4 hover:bg-accent/50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-foreground">{order.trackingNumber}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {order.status.replace('_', ' ')}
                        </span>
                        
                        {/* Verification Status Indicators */}
                        {order.status === "arrived_at_warehouse" && hasArrivalVerification(order._id) && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            📷 Arrival Verified
                          </span>
                        )}
                        {order.status === "awaiting_pickup" && hasHandoverVerification(order._id) && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            📷 Handover Verified
                          </span>
                        )}
                        {(order.status === "arrived_at_warehouse" && !hasArrivalVerification(order._id)) && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            📷 Verification Needed
                          </span>
                        )}
                        {(order.status === "awaiting_pickup" && !hasHandoverVerification(order._id)) && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            📷 Handover Needed
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-foreground">
                          <strong>Customer:</strong> {order.customerName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <strong>Merchant:</strong> {order.merchantName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <strong>Weight:</strong> {order.declaredWeight}kg • 
                          <strong> Value:</strong> {order.currency} {order.declaredValue}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">
                        Created {formatDate(order.createdAt)}
                      </div>
                      {order.receivedAt && (
                        <div className="text-xs text-muted-foreground">
                          Received {formatDate(order.receivedAt)}
                        </div>
                      )}
                      {order.packedAt && (
                        <div className="text-xs text-muted-foreground">
                          Packed {formatDate(order.packedAt)}
                        </div>
                      )}
                      {order.awaitingPickupAt && (
                        <div className="text-xs text-muted-foreground">
                          Awaiting Pickup {formatDate(order.awaitingPickupAt)}
                        </div>
                      )}
                      {order.shippedAt && (
                        <div className="text-xs text-muted-foreground">
                          Shipped {formatDate(order.shippedAt)}
                        </div>
                      )}
                      {order.deliveredAt && (
                        <div className="text-xs text-muted-foreground">
                          Delivered {formatDate(order.deliveredAt)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-2 mt-3">
                    <a 
                      href={`/staff/scanner?order=${order._id}`}
                      className="bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                      📱 Scan Package
                    </a>
                    
                    {/* Arrival Capture - only for incoming/received packages */}
                    {(order.status === "incoming" || order.status === "received") && (
                      <button
                        onClick={() => setArrivalCaptureOrderId(order._id)}
                        className="bg-green-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
                      >
                        📷 Verify Arrival
                      </button>
                    )}
                    
                    {/* Handover Capture - only for packed/awaiting pickup packages */}
                    {(order.status === "packed" || order.status === "awaiting_pickup") && (
                      <button
                        onClick={() => setHandoverCaptureOrderId(order._id)}
                        className="bg-orange-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-orange-700 transition-colors"
                      >
                        🚚 Verify Handover
                      </button>
                    )}
                    
                    {/* Status Update Buttons */}
                    {order.status === "incoming" && (
                      <button 
                        onClick={() => handleStatusUpdate(order._id, "arrived_at_warehouse", order.trackingNumber)}
                        disabled={updatingOrderId === order._id}
                        className="bg-blue-100 text-blue-800 px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-200 transition-colors disabled:opacity-50"
                      >
                        {updatingOrderId === order._id ? "Updating..." : "Arrived in Premise"}
                      </button>
                    )}
                    
                    {order.status === "arrived_at_warehouse" && (
                      <div className="flex gap-2">
                        {!hasArrivalVerification(order._id) ? (
                          <button 
                            onClick={() => setArrivalCaptureOrderId(order._id)}
                            className="bg-blue-100 text-blue-800 px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-200 transition-colors"
                          >
                            📷 Verify Arrival
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <div className="bg-green-100 text-green-800 px-3 py-2 rounded-md text-sm font-medium">
                              ✅ Arrival Verified
                            </div>
                            <button 
                              onClick={() => handleStatusUpdate(order._id, "packed", order.trackingNumber)}
                              disabled={updatingOrderId === order._id}
                              className="bg-yellow-100 text-yellow-800 px-3 py-2 rounded-md text-sm font-medium hover:bg-yellow-200 transition-colors disabled:opacity-50"
                            >
                              {updatingOrderId === order._id ? "Updating..." : "Mark as Packed"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {order.status === "packed" && (
                      <button 
                        onClick={() => handleStatusUpdate(order._id, "awaiting_pickup", order.trackingNumber)}
                        disabled={updatingOrderId === order._id}
                        className="bg-purple-100 text-purple-800 px-3 py-2 rounded-md text-sm font-medium hover:bg-purple-200 transition-colors disabled:opacity-50"
                      >
                        {updatingOrderId === order._id ? "Updating..." : "Awaiting Pickup"}
                      </button>
                    )}
                    
                    {order.status === "awaiting_pickup" && (
                      <div className="flex gap-2">
                        {!hasHandoverVerification(order._id) ? (
                          <button 
                            onClick={() => setHandoverCaptureOrderId(order._id)}
                            className="bg-orange-100 text-orange-800 px-3 py-2 rounded-md text-sm font-medium hover:bg-orange-200 transition-colors"
                          >
                            📷 Handover to Courier
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <div className="bg-green-100 text-green-800 px-3 py-2 rounded-md text-sm font-medium">
                              ✅ Handover Verified
                            </div>
                            <button 
                              onClick={() => handleStatusUpdate(order._id, "in_transit", order.trackingNumber)}
                              disabled={updatingOrderId === order._id}
                              className="bg-indigo-100 text-indigo-800 px-3 py-2 rounded-md text-sm font-medium hover:bg-indigo-200 transition-colors disabled:opacity-50"
                            >
                              {updatingOrderId === order._id ? "Updating..." : "Delivery in Progress"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {order.status === "in_transit" && (
                      <button 
                        onClick={() => handleStatusUpdate(order._id, "delivered", order.trackingNumber)}
                        disabled={updatingOrderId === order._id}
                        className="bg-green-100 text-green-800 px-3 py-2 rounded-md text-sm font-medium hover:bg-green-200 transition-colors disabled:opacity-50"
                      >
                        {updatingOrderId === order._id ? "Updating..." : "Arrived at Destination"}
                      </button>
                    )}
                    
                    {staff.permissions.canPrintLabels && (
                      <button className="bg-gray-100 text-gray-800 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors">
                        🖨️ Print Label
                      </button>
                    )}
                  </div>

                  {/* Special Instructions */}
                  {order.specialInstructions && (
                    <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <span className="text-sm font-medium text-orange-800">Special Instructions</span>
                      </div>
                      <p className="text-sm text-orange-700">{order.specialInstructions}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {["incoming", "packed", "awaiting_pickup", "delivered"].map((status) => {
            const count = orders.filter(order => order.status === status).length;
            return (
              <div key={status} className="bg-card border border-border rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-foreground">{count}</div>
                <div className="text-xs text-muted-foreground capitalize">
                  {status.replace('_', ' ')}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Arrival Capture Modal */}
      {arrivalCaptureOrderId && (
        <ArrivalCapture
          orderId={arrivalCaptureOrderId}
          onComplete={() => {
            setArrivalCaptureOrderId(null);
            // Optionally refresh orders or show success message
          }}
          onCancel={() => setArrivalCaptureOrderId(null)}
        />
      )}
      
      {/* Handover Capture Modal */}
      {handoverCaptureOrderId && (
        <HandoverCapture
          orderId={handoverCaptureOrderId}
          onComplete={() => {
            setHandoverCaptureOrderId(null);
            // Optionally refresh orders or show success message
          }}
          onCancel={() => setHandoverCaptureOrderId(null)}
        />
      )}
    </div>
  );
}