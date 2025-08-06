"use client";

import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState } from "react";

interface CreateTestOrdersProps {
  forwarderId: string;
  warehouseId: string;
}

export default function CreateTestOrders({ forwarderId, warehouseId }: CreateTestOrdersProps) {
  const [loading, setLoading] = useState(false);
  const createOrder = useMutation(api.orders.createOrder);

  const createSampleOrders = async () => {
    setLoading(true);
    try {
      const now = Date.now();
      const ordersToCreate = [
        // Today
        {
          customerId: "test-customer-1",
          customerName: "John Smith",
          customerEmail: "john@example.com",
          shippingAddress: "123 Main St, Singapore",
          trackingNumber: `TRK${Date.now()}-1`,
          merchantName: "Amazon",
          declaredWeight: 2.5,
          declaredValue: 50,
          currency: "USD",
          warehouseId,
          forwarderId,
          shippingType: "immediate" as const,
          courier: "DHL",
          createdAt: now
        },
        // Yesterday  
        {
          customerId: "test-customer-2", 
          customerName: "Jane Doe",
          customerEmail: "jane@example.com",
          shippingAddress: "456 River Road, Singapore",
          trackingNumber: `TRK${Date.now()}-2`,
          merchantName: "Shopee",
          declaredWeight: 1.2,
          declaredValue: 25,
          currency: "USD",
          warehouseId,
          forwarderId,
          shippingType: "consolidated" as const,
          courier: "UPS",
          createdAt: now - (24 * 60 * 60 * 1000)
        },
        // 2 days ago
        {
          customerId: "test-customer-3",
          customerName: "Bob Johnson", 
          customerEmail: "bob@example.com",
          shippingAddress: "789 Park Ave, Singapore",
          trackingNumber: `TRK${Date.now()}-3`,
          merchantName: "Lazada",
          declaredWeight: 3.8,
          declaredValue: 75,
          currency: "USD",
          warehouseId,
          forwarderId,
          shippingType: "immediate" as const,
          courier: "FedEx",
          createdAt: now - (2 * 24 * 60 * 60 * 1000)
        },
        // 3 days ago
        {
          customerId: "test-customer-4",
          customerName: "Alice Wong",
          customerEmail: "alice@example.com", 
          shippingAddress: "321 Ocean Drive, Singapore",
          trackingNumber: `TRK${Date.now()}-4`,
          merchantName: "Taobao",
          declaredWeight: 0.8,
          declaredValue: 15,
          currency: "USD",
          warehouseId,
          forwarderId,
          shippingType: "consolidated" as const,
          courier: "DHL",
          createdAt: now - (3 * 24 * 60 * 60 * 1000)
        },
        // 5 days ago (higher volume day)
        {
          customerId: "test-customer-5",
          customerName: "Charlie Brown",
          customerEmail: "charlie@example.com",
          shippingAddress: "654 Hill Street, Singapore", 
          trackingNumber: `TRK${Date.now()}-5`,
          merchantName: "eBay",
          declaredWeight: 4.2,
          declaredValue: 90,
          currency: "USD",
          warehouseId,
          forwarderId,
          shippingType: "immediate" as const,
          courier: "UPS",
          createdAt: now - (5 * 24 * 60 * 60 * 1000)
        },
        {
          customerId: "test-customer-6",
          customerName: "Diana Prince",
          customerEmail: "diana@example.com",
          shippingAddress: "987 Wonder Lane, Singapore",
          trackingNumber: `TRK${Date.now()}-6`, 
          merchantName: "Amazon",
          declaredWeight: 2.1,
          declaredValue: 45,
          currency: "USD",
          warehouseId,
          forwarderId,
          shippingType: "consolidated" as const,
          courier: "FedEx",
          createdAt: now - (5 * 24 * 60 * 60 * 1000)
        }
      ];

      for (const orderData of ordersToCreate) {
        await createOrder(orderData);
      }

      alert(`Created ${ordersToCreate.length} test orders successfully!`);
      window.location.reload(); // Refresh to see new data
    } catch (error) {
      console.error("Error creating test orders:", error);
      alert("Failed to create test orders: " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-yellow-800">Debug: No Order Data</h3>
          <p className="text-xs text-yellow-700 mt-1">
            Create some test orders to see the analytics charts working
          </p>
        </div>
        <button
          onClick={createSampleOrders}
          disabled={loading}
          className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 text-sm font-medium"
        >
          {loading ? "Creating..." : "Create Test Orders"}
        </button>
      </div>
    </div>
  );
}