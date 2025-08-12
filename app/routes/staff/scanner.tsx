import { getAuth } from "@clerk/react-router/ssr.server";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { useState, useRef, useEffect } from "react";

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

export default function StaffScanner({ loaderData }: any) {
  const { staff } = loaderData;
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [scanLocation, setScanLocation] = useState("Gate A");
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Get today's orders for this staff member
  const todaysOrders = useQuery(api.staff.getOrdersForStaff, { staffId: staff._id });

  // Mutations
  const updateOrderStatus = useMutation(api.orderStatusHistory.updateOrderStatusWithTracking);
  const logScan = useMutation(api.orderStatusHistory.logStaffScan);

  // Camera and scanning logic
  const startScanning = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsScanning(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please check permissions.');
    }
  };

  const stopScanning = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
    setScanResult(null);
  };

  // Simulate barcode scanning (in real app, would use a library like ZXing)
  const simulateScan = () => {
    // For demo purposes, simulate scanning a tracking number
    const mockTrackingNumbers = todaysOrders?.map(o => o.trackingNumber) || [];
    if (mockTrackingNumbers.length > 0) {
      const randomTracking = mockTrackingNumbers[Math.floor(Math.random() * mockTrackingNumbers.length)];
      handleScanResult(randomTracking);
    } else {
      handleScanResult("SG123456789"); // Mock tracking number
    }
  };

  const handleScanResult = async (scannedValue: string) => {
    setScanResult(scannedValue);
    
    // Find order by tracking number
    const order = todaysOrders?.find(o => 
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
          staffId: staff._id,
          orderId: scannedValue, // This might fail if order doesn't exist
          scanData: {
            barcodeValue: scannedValue,
            location: scanLocation,
            deviceInfo
          },
          notes: "Package scanned - order not found in assigned warehouse"
        });
      } catch (error) {
        console.error("Error logging scan:", error);
      }
      
      alert(`Package ${scannedValue} scanned but not found in your assigned warehouses`);
    }
    
    stopScanning();
  };

  const handleStatusUpdate = async () => {
    if (!currentOrder || !selectedStatus) return;

    try {
      const deviceInfo = `${navigator.userAgent} - ${new Date().toISOString()}`;
      
      await updateOrderStatus({
        orderId: currentOrder._id,
        newStatus: selectedStatus as any,
        changedBy: staff._id,
        changedByType: "staff",
        notes: notes || undefined,
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

  const getNextStatusOptions = (currentStatus: string) => {
    const statusFlow = {
      'incoming': ['arrived_at_warehouse'],
      'arrived_at_warehouse': ['packed'],
      'packed': ['awaiting_pickup'],
      'awaiting_pickup': ['shipped', 'in_transit'],
      'shipped': ['in_transit', 'delivered'],
      'in_transit': ['delivered']
    };
    return statusFlow[currentStatus as keyof typeof statusFlow] || [];
  };

  if (!todaysOrders) {
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
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-semibold text-foreground text-center">Scanner</h1>
          <p className="text-sm text-muted-foreground text-center mt-1">
            {staff.name} • {staff.warehouses.map(w => w.name).join(', ')}
          </p>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Scanner Section */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="text-center space-y-4">
            {!isScanning ? (
              <>
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 12h-.01M12 12v-.01M12 12h-4.01M12 12v4.01" />
                  </svg>
                </div>
                <h2 className="text-lg font-medium text-foreground">Scan Package</h2>
                <p className="text-sm text-muted-foreground">
                  Point your camera at the barcode or QR code on the package
                </p>
                <div className="space-y-3">
                  <select
                    value={scanLocation}
                    onChange={(e) => setScanLocation(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="Gate A">Gate A</option>
                    <option value="Gate B">Gate B</option>
                    <option value="Station 1">Packing Station 1</option>
                    <option value="Station 2">Packing Station 2</option>
                    <option value="Station 3">Packing Station 3</option>
                    <option value="Loading Bay">Loading Bay</option>
                    <option value="Storage Area">Storage Area</option>
                  </select>
                  <button
                    onClick={startScanning}
                    className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
                  >
                    Start Scanning
                  </button>
                  <button
                    onClick={simulateScan}
                    className="w-full bg-secondary text-secondary-foreground py-2 rounded-lg text-sm hover:bg-secondary/80 transition-colors"
                  >
                    🧪 Demo Scan (Random Order)
                  </button>
                </div>
              </>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full aspect-video bg-black rounded-lg"
                />
                <canvas ref={canvasRef} className="hidden" />
                <p className="text-sm text-muted-foreground">
                  Position the barcode within the camera view
                </p>
                <button
                  onClick={stopScanning}
                  className="w-full bg-red-600 text-white py-2 rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                  Stop Scanning
                </button>
              </>
            )}
          </div>
        </div>

        {/* Today's Orders Summary */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-medium text-foreground mb-4">Today's Orders ({todaysOrders.length})</h3>
          
          {todaysOrders.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="text-muted-foreground text-sm">No orders assigned to your warehouses today</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todaysOrders.slice(0, 5).map((order) => (
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
              {todaysOrders.length > 5 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{todaysOrders.length - 5} more orders
                </p>
              )}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-medium text-foreground mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <button className="p-3 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors">
              View All Orders
            </button>
            <button className="p-3 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors">
              Print Labels
            </button>
            <button className="p-3 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors">
              Scan History
            </button>
            <button className="p-3 bg-orange-50 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-100 transition-colors">
              Report Issue
            </button>
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
                  {getNextStatusOptions(currentOrder.status).map((status) => (
                    <option key={status} value={status}>
                      {status.replace('_', ' ')}
                    </option>
                  ))}
                </select>
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