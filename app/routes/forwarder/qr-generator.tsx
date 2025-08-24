import { getServerAuth } from "~/contexts/auth";
import { redirect } from "react-router";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import { useQuery } from "convex/react";
import { useState } from "react";
import { Package, Search, Printer, Target, Tag, Smartphone } from "lucide-react";

export async function loader(args: any) {
  const { userId } = await getServerAuth(args.request);
  
  if (!userId) {
    return redirect("/sign-in");
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

export default function ForwarderQRGenerator({ loaderData }: any) {
  const { forwarder } = loaderData;
  const [selectedTrackingNumber, setSelectedTrackingNumber] = useState("");
  const [customTrackingNumber, setCustomTrackingNumber] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  // Get all orders for this forwarder
  const orders = useQuery(api.orders.getOrdersForForwarder, { 
    forwarderId: forwarder._id,
    limit: 100
  });

  const generateQR = (trackingNumber: string) => {
    if (!trackingNumber) return;
    
    // Find the selected order to get order ID and courier
    const selectedOrder = orders?.find(o => o.trackingNumber === trackingNumber);
    
    if (selectedOrder) {
      // Create URL that opens staff scanner with the QR data embedded
      const qrData = `${selectedOrder._id}|${selectedOrder.trackingNumber}|${selectedOrder.courier || 'UNKNOWN'}`;
      const scannerUrl = `http://192.168.18.170:5173/staff/scanner?qr=${encodeURIComponent(qrData)}`;
      const url = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(scannerUrl)}`;
      setQrCodeUrl(url);
    } else {
      // Fallback for custom tracking numbers
      const qrData = `CUSTOM|${trackingNumber}|UNKNOWN`;
      const scannerUrl = `http://192.168.18.170:5173/staff/scanner?qr=${encodeURIComponent(qrData)}`;
      const url = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(scannerUrl)}`;
      setQrCodeUrl(url);
    }
  };


  if (!orders) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-48 mb-6"></div>
          <div className="h-64 bg-muted rounded mb-6"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-semibold text-foreground">QR Code Generator</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generate QR codes for package tracking and staff scanning
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        
        {/* Select Existing Order */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Generate QR from Existing Orders</h3>
          
          {orders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No orders found in your account</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Select Order ({orders.length} orders available)
                </label>
                <select
                  value={selectedTrackingNumber}
                  onChange={(e) => setSelectedTrackingNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Select an order...</option>
                  {orders.map((order) => (
                    <option key={order._id} value={order.trackingNumber}>
                      {order.trackingNumber} - {order.customerName} - {order.status.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => generateQR(selectedTrackingNumber)}
                  disabled={!selectedTrackingNumber}
                  className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Package className="w-4 h-4" />
                  Generate QR Code
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Custom Tracking Number */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Generate QR from Custom Tracking Number</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Custom Tracking Number
              </label>
              <input
                type="text"
                value={customTrackingNumber}
                onChange={(e) => setCustomTrackingNumber(e.target.value)}
                placeholder="Enter tracking number..."
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => generateQR(customTrackingNumber)}
                disabled={!customTrackingNumber}
                className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Package className="w-4 h-4" />
                Generate QR Code
              </button>
            </div>
          </div>
        </div>

        {/* QR Code Display */}
        {qrCodeUrl && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Generated QR Code</h3>
            
            <div className="text-center space-y-4">
              <img 
                src={qrCodeUrl} 
                alt="QR Code" 
                className="mx-auto border border-border rounded-lg shadow-sm"
              />
              
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Staff can scan this QR code to instantly process the package
                </p>
                
                <div className="flex justify-center gap-3">
                  <a 
                    href="/staff/scanner" 
                    target="_blank"
                    className="inline-block bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Test with Staff Scanner
                  </a>
                  <button
                    onClick={() => window.print()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Print QR Code
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-blue-800 mb-3">How QR Codes Work</h3>
          <div className="space-y-3 text-sm text-blue-700">
            <div>
              <div className="flex items-start gap-2 mb-2">
                <Package className="w-4 h-4 mt-0.5 text-blue-600" />
                <div><strong>One QR Code per Order:</strong> Same format as print labels - contains order ID, tracking number, and courier</div>
              </div>
            </div>
            <div>
              <div className="flex items-start gap-2 mb-2">
                <Tag className="w-4 h-4 mt-0.5 text-green-600" />
                <div><strong>Print Labels:</strong> QR codes generated here match exactly with shipping label QR codes</div>
              </div>
            </div>
            <div>
              <strong><Smartphone className="w-4 h-4 inline mr-1" /> Staff Scanning:</strong> Staff can scan any QR code (from labels or generated here) to update order status
            </div>
            <div>
              <div className="flex items-start gap-2">
                <Target className="w-4 h-4 mt-0.5 text-purple-600" />
                <div><strong>Mobile Testing:</strong> Use your phone to scan QR codes displayed on this screen</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}