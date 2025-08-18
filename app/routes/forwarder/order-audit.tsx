import { getAuth } from "@clerk/react-router/ssr.server";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import { useQuery } from "convex/react";
import { useState } from "react";
import { User, Building, Settings, HelpCircle } from "lucide-react";

export async function loader(args: any) {
  const { userId } = await getAuth(args);
  
  if (!userId) {
    throw new Response("Unauthorized", { status: 401 });
  }

  try {
    // Get forwarder profile
    const forwarder = await fetchQuery(api.forwarders.getForwarderByUserId, { userId });
    
    if (!forwarder) {
      throw new Response("Forwarder profile not found", { status: 404 });
    }

    return { 
      forwarder,
      userId
    };
  } catch (error) {
    console.error("Error loading forwarder data:", error);
    throw new Response("Internal Server Error", { status: 500 });
  }
}

export default function OrderAuditPage({ loaderData }: any) {
  const { forwarder } = loaderData;
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Get recent orders for search
  const recentOrders = useQuery(
    api.orders.getRecentOrders,
    { forwarderId: forwarder._id, limit: 100 }
  );

  // Get order history for selected order
  const orderHistory = useQuery(
    api.orderStatusHistory.getOrderStatusHistory,
    selectedOrder ? { orderId: selectedOrder } : "skip"
  );

  // Filter orders by search query
  const filteredOrders = recentOrders?.filter(order =>
    order.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.merchantName.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

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

  const getChangeTypeIcon = (type: string) => {
    switch (type) {
      case 'staff': return <User className="w-4 h-4" />;
      case 'forwarder': return <Building className="w-4 h-4" />;
      case 'system': return <Settings className="w-4 h-4" />;
      default: return <HelpCircle className="w-4 h-4" />;
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-SG', {
      timeZone: 'Asia/Singapore',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (!recentOrders) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-48 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-muted rounded"></div>
            <div className="h-96 bg-muted rounded"></div>
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
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Order Audit Trail</h1>
          <p className="text-muted-foreground">Track detailed order history and staff activity</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Search and List */}
        <div className="bg-card border border-border rounded-xl">
          <div className="p-6 border-b border-border">
            <h2 className="text-xl font-semibold text-foreground mb-4">Select Order</h2>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by tracking number, customer, or merchant..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 pl-10 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <svg className="absolute left-3 top-2.5 w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {filteredOrders.length === 0 ? (
              <div className="p-6 text-center">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <p className="text-muted-foreground">
                  {searchQuery ? 'No orders found matching your search.' : 'No orders found.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredOrders.map((order) => (
                  <button
                    key={order._id}
                    onClick={() => setSelectedOrder(order._id)}
                    className={`w-full p-4 text-left hover:bg-accent/50 transition-colors ${
                      selectedOrder === order._id ? 'bg-accent' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-foreground">{order.trackingNumber}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <div>{order.customerName}</div>
                      <div className="text-xs">{order.merchantName}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Order History Timeline */}
        <div className="bg-card border border-border rounded-xl">
          <div className="p-6 border-b border-border">
            <h2 className="text-xl font-semibold text-foreground">Audit Trail</h2>
            {selectedOrder && (
              <p className="text-sm text-muted-foreground mt-1">
                Complete history for selected order
              </p>
            )}
          </div>

          <div className="p-6">
            {!selectedOrder ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">Select an Order</h3>
                <p className="text-muted-foreground">Choose an order from the list to view its complete audit trail.</p>
              </div>
            ) : !orderHistory ? (
              <div className="animate-pulse space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-muted rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-muted rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded w-2/3 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/3"></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {orderHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No history found for this order.</p>
                  </div>
                ) : (
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border"></div>
                    
                    {orderHistory.map((entry, index) => (
                      <div key={entry._id} className="relative flex items-start space-x-4">
                        {/* Timeline dot */}
                        <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 bg-background ${
                          entry.newStatus === 'delivered' ? 'border-green-500' :
                          entry.newStatus === 'shipped' || entry.newStatus === 'in_transit' ? 'border-blue-500' :
                          entry.newStatus === 'packed' ? 'border-yellow-500' :
                          'border-gray-400'
                        }`}>
                          <span className="text-sm">
                            {getChangeTypeIcon(entry.changedByType)}
                          </span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 pb-8">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {entry.previousStatus && (
                                <>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(entry.previousStatus)}`}>
                                    {entry.previousStatus.replace('_', ' ')}
                                  </span>
                                  <span className="text-xs text-muted-foreground">→</span>
                                </>
                              )}
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(entry.newStatus)}`}>
                                {entry.newStatus.replace('_', ' ')}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatTimestamp(entry.changedAt)}
                            </span>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium text-foreground">
                                {entry.changedByType === 'staff' ? entry.staffName :
                                 entry.changedByType === 'forwarder' ? 'Forwarder' :
                                 'System'}
                              </span>
                              {entry.warehouseName && (
                                <>
                                  <span className="text-muted-foreground">•</span>
                                  <span className="text-muted-foreground">{entry.warehouseName}</span>
                                </>
                              )}
                            </div>

                            {entry.scanData && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 12h-.01M12 12v-.01M12 12h-4.01M12 12v4.01" />
                                  </svg>
                                  <span className="text-sm font-medium text-blue-800">Barcode Scan</span>
                                </div>
                                <div className="text-xs text-blue-700 space-y-1">
                                  <div><strong>Location:</strong> {entry.scanData.location}</div>
                                  <div><strong>Barcode:</strong> {entry.scanData.barcodeValue}</div>
                                </div>
                              </div>
                            )}

                            {entry.notes && (
                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                <div className="text-sm text-gray-700">
                                  <strong>Notes:</strong> {entry.notes}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}