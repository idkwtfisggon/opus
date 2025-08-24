import { getServerAuth } from "~/contexts/auth";
import { redirect } from "react-router";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../convex/_generated/api";
import { useMutation } from "convex/react";
import { useState } from "react";

export async function loader(args: any) {
  const { userId } = await getServerAuth(args.request);
  
  if (!userId) {
    return redirect("/sign-in");
  }

  try {
    // Get forwarder profile
    const forwarder = await fetchQuery(api.forwarders.getForwarderByUserId, { userId });
    
    return { 
      forwarder,
      userId
    };
  } catch (error) {
    console.error("Error loading data:", error);
    return { forwarder: null, userId };
  }
}

export default function SeedData({ loaderData }: any) {
  const { forwarder, userId } = loaderData;
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const seedForwarderData = useMutation(api.seedTestData.seedForwarderShippingData);
  const seedTestOrders = useMutation(api.seedTestData.seedTestOrders);
  const cleanupTestOrders = useMutation(api.seedTestData.cleanupTestOrders);

  const handleSeedAll = async () => {
    setIsLoading(true);
    setMessage("");
    
    try {
      // First, seed forwarder data (warehouses, zones, rates)
      const forwarderResult = await seedForwarderData({ forwarderUserId: userId });
      
      // Then seed test orders
      const ordersResult = await seedTestOrders({
        forwarderId: forwarderResult.forwarderId,
        warehouseId: forwarderResult.warehouseId
      });
      
      setMessage(`✅ Success! Created ${ordersResult.trackingNumbers.length} test orders: ${ordersResult.trackingNumbers.join(', ')}`);
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    }
    
    setIsLoading(false);
  };

  const handleSeedOrdersOnly = async () => {
    if (!forwarder) {
      setMessage("❌ No forwarder profile found. Run full seed first.");
      return;
    }

    setIsLoading(true);
    setMessage("");
    
    try {
      // Get first warehouse
      const warehouses = await fetch(`/api/warehouses/${forwarder._id}`).then(r => r.json());
      if (!warehouses.length) {
        throw new Error("No warehouses found. Run full seed first.");
      }

      const ordersResult = await seedTestOrders({
        forwarderId: forwarder._id,
        warehouseId: warehouses[0]._id
      });
      
      setMessage(`✅ Created ${ordersResult.trackingNumbers.length} test orders: ${ordersResult.trackingNumbers.join(', ')}`);
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    }
    
    setIsLoading(false);
  };

  const handleCleanup = async () => {
    if (!forwarder) {
      setMessage("❌ No forwarder profile found.");
      return;
    }

    setIsLoading(true);
    setMessage("");
    
    try {
      const result = await cleanupTestOrders({ forwarderId: forwarder._id });
      setMessage(`✅ ${result.message}`);
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-card border border-border rounded-xl p-6">
          <h1 className="text-2xl font-semibold text-foreground mb-6">🌱 Seed Test Data</h1>
          
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Debug Issue Found</h3>
              <p className="text-sm text-yellow-700">
                The QR scanner shows "0 total orders" because there are no orders in the database. 
                Use the buttons below to create test orders for QR code testing.
              </p>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={handleSeedAll}
                disabled={isLoading}
                className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? "Creating..." : "🚀 Seed Everything (Forwarder + Orders)"}
              </button>
              
              {forwarder && (
                <button
                  onClick={handleSeedOrdersOnly}
                  disabled={isLoading}
                  className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {isLoading ? "Creating..." : "📦 Create Test Orders Only"}
                </button>
              )}
              
              {forwarder && (
                <button
                  onClick={handleCleanup}
                  disabled={isLoading}
                  className="w-full bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {isLoading ? "Cleaning..." : "🗑️ Delete Test Orders"}
                </button>
              )}
            </div>
            
            {message && (
              <div className="mt-4 p-4 bg-background border border-border rounded-lg">
                <pre className="text-sm">{message}</pre>
              </div>
            )}
            
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2">📝 What This Creates</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Test orders: SG123456789, SG987654321, SG555666777, SG111222333</li>
                <li>• Proper warehouse assignments matching your staff</li>
                <li>• Various order statuses for testing different QR scenarios</li>
                <li>• Orders will show up in forwarder dashboard and QR generator</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}