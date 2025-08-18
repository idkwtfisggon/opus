import { getAuth } from "@clerk/react-router/ssr.server";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { useState, useRef, useEffect } from "react";
import BarcodeScanner from "../../components/scanner/BarcodeScanner";
import { Package, QrCode, BarChart3, Users, TrendingUp } from "lucide-react";

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

export default function ForwarderScanner({ loaderData }: any) {
  const { forwarder } = loaderData;
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [scanLocation, setScanLocation] = useState("Admin Office");
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Check for tracking number in URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const trackingParam = urlParams.get('tracking');
    if (trackingParam) {
      handleScanResult(trackingParam);
    }
  }, []);

  // Get all orders for this forwarder
  const allOrders = useQuery(api.orders.getOrdersForForwarder, { 
    forwarderId: forwarder._id,
    limit: 200
  });

  // Mutations - forwarders can update any order status (admin privilege)
  const updateOrderStatusAdmin = useMutation(api.orders.updateOrderStatus);
  const logScan = useMutation(api.orderStatusHistory.logForwarderScan);
  
  // Handle successful barcode scan
  const handleScanResult = async (scannedValue: string) => {
    setScanResult(scannedValue);
    setIsScanning(false);
    
    // Parse QR code from print label format: "orderId|trackingNumber|courier"
    let trackingNumber = scannedValue;
    let orderId = null;
    
    if (scannedValue.includes('|')) {
      const parts = scannedValue.split('|');
      orderId = parts[0];
      trackingNumber = parts[1] || scannedValue;
    }
    
    // Find order by tracking number or order ID
    const order = allOrders?.find(o => 
      o.trackingNumber === trackingNumber || 
      o._id === orderId ||
      o.trackingNumber === scannedValue || 
      o._id === scannedValue
    );

    if (order) {
      setCurrentOrder(order);
      setShowStatusModal(true);
    } else {
      // Log scan even if order not found
      try {
        const deviceInfo = `${navigator.userAgent} - ${new Date().toISOString()}`;
        await logScan({
          forwarderId: forwarder._id,
          orderId: scannedValue,
          scanData: {
            barcodeValue: scannedValue,
            location: scanLocation,
            deviceInfo
          },
          notes: "Package scanned by forwarder - order not found"
        });
      } catch (error) {
        console.error("Error logging scan:", error);
      }
      
      alert(`Package ${scannedValue} scanned but not found in your orders`);
    }
  };

  // Handle scan errors
  const handleScanError = (error: string) => {
    console.error('Barcode scan error:', error);
  };

  // Simulate barcode scanning for testing
  const simulateScan = () => {
    const mockTrackingNumbers = allOrders?.slice(0, 10).map(o => o.trackingNumber) || [];
    if (mockTrackingNumbers.length > 0) {
      const randomTracking = mockTrackingNumbers[Math.floor(Math.random() * mockTrackingNumbers.length)];
      handleScanResult(randomTracking);
    } else {
      handleScanResult("SG123456789"); // Mock tracking number
    }
  };

  const handleStatusUpdate = async () => {
    if (!currentOrder || !selectedStatus) return;

    try {
      const deviceInfo = `${navigator.userAgent} - ${new Date().toISOString()}`;
      
      await updateOrderStatusAdmin({
        orderId: currentOrder._id,
        newStatus: selectedStatus,
        notes: notes || `Updated by forwarder ${forwarder.businessName}`,
        changedBy: forwarder._id,
        changedByType: "forwarder",
        scanData: {
          barcodeValue: scanResult || currentOrder.trackingNumber,
          location: scanLocation,
          deviceInfo
        }
      });

      alert(`Order ${currentOrder.trackingNumber} updated to ${selectedStatus}`);
      setShowStatusModal(false);
      setCurrentOrder(null);
      setSelectedStatus(null);
      setNotes("");
      setScanResult(null);
    } catch (error) {
      console.error("Error updating status:", error);
      alert(`Failed to update order: ${error.message}`);
    }
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

  const getAllStatuses = () => {
    return ["incoming", "arrived_at_warehouse", "packed", "awaiting_pickup", "in_transit", "delivered"];
  };

  if (!allOrders) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-48 mb-6"></div>
          <div className="h-64 bg-muted rounded mb-6"></div>
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
          <h1 className="text-2xl font-semibold text-foreground text-center">Forwarder Scanner</h1>
          <p className="text-sm text-muted-foreground text-center mt-1">
            {forwarder.businessName} • Admin Access
          </p>
          <div className="flex justify-center mt-2">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              🔑 Admin - Can update any order status
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Scanner Section */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 12h-.01M12 12v-.01M12 12h-4.01M12 12v4.01" />
              </svg>
            </div>
            <h2 className="text-lg font-medium text-foreground">Scan Package</h2>
            <p className="text-sm text-muted-foreground">
              Scan QR codes or barcodes to quickly update order status
            </p>
            
            {/* Location Selection */}
            <div className="space-y-3">
              <select
                value={scanLocation}
                onChange={(e) => setScanLocation(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="Admin Office">Admin Office</option>
                <option value="Warehouse Floor">Warehouse Floor</option>
                <option value="Loading Dock">Loading Dock</option>
                <option value="Inspection Area">Inspection Area</option>
                <option value="Storage Area">Storage Area</option>
                <option value="Shipping Department">Shipping Department</option>
              </select>
              
              {/* Scanner Controls */}
              <div className="flex gap-2">
                <button
                  onClick={() => setIsScanning(!isScanning)}
                  className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                    isScanning 
                      ? 'bg-red-600 text-white hover:bg-red-700' 
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
                >
                  {isScanning ? 'Stop Scanning' : 'Start Scanning'}
                </button>
                <button
                  onClick={simulateScan}
                  className="px-4 py-3 bg-secondary text-secondary-foreground rounded-lg text-sm hover:bg-secondary/80 transition-colors"
                  title="Demo scan with random order"
                >
                  🧪
                </button>
              </div>
            </div>

            {/* Barcode Scanner Component */}
            <BarcodeScanner
              isActive={isScanning}
              onScan={handleScanResult}
              onError={handleScanError}
              className="mt-4"
            />

            {/* Scan Result Display */}
            {scanResult && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm font-medium text-green-800">Scan Successful</span>
                </div>
                <p className="text-sm text-green-700 font-mono">{scanResult}</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Orders Summary */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-medium text-foreground mb-4">Recent Orders ({allOrders.length} total)</h3>
          
          {allOrders.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="text-muted-foreground text-sm">No orders found in your forwarder account</p>
            </div>
          ) : (
            <div className="space-y-3">
              {allOrders.slice(0, 8).map((order) => (
                <div key={order._id} className="flex items-center justify-between p-3 bg-background border border-border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{order.trackingNumber}</p>
                    <p className="text-xs text-muted-foreground truncate">{order.customerName}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                    {order.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
              {allOrders.length > 8 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{allOrders.length - 8} more orders
                </p>
              )}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-medium text-foreground mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <a href="/forwarder/orders" className="p-3 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors text-center">
              <Package className="w-4 h-4 mr-2" />
              View All Orders
            </a>
            <a href="/forwarder/qr-generator" className="p-3 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors text-center">
              <QrCode className="w-4 h-4 mr-2" />
              Generate QR Codes
            </a>
            <a href="/forwarder/staff" className="p-3 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors text-center">
              <Users className="w-4 h-4 mr-2" />
              Manage Staff
            </a>
            <a href="/forwarder/analytics" className="p-3 bg-orange-50 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-100 transition-colors text-center">
              <BarChart3 className="w-4 h-4 mr-2" />
              View Analytics
            </a>
          </div>
        </div>
      </div>

      {/* Status Update Modal */}
      {showStatusModal && currentOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl max-w-md w-full">
            <div className="p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Update Order Status</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {currentOrder.trackingNumber} • {currentOrder.customerName}
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Current Status</label>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(currentOrder.status)}`}>
                  {currentOrder.status.replace('_', ' ')}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Update To</label>
                <select
                  value={selectedStatus || ""}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Select new status...</option>
                  {getAllStatuses().map((status) => (
                    <option key={status} value={status}>
                      {status.replace('_', ' ')}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-green-600 mt-2">
                  ✅ Admin access - you can update to any status including backwards transitions
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Location</label>
                <input
                  type="text"
                  value={scanLocation}
                  onChange={(e) => setScanLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Notes (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Add any additional notes..."
                />
              </div>
            </div>

            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowStatusModal(false);
                  setCurrentOrder(null);
                  setSelectedStatus(null);
                  setNotes("");
                }}
                className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStatusUpdate}
                disabled={!selectedStatus}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Update Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}