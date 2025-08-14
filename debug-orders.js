// Simple debug script to test order creation
// Run this in browser console on forwarder orders page

async function debugOrderCreation() {
  console.log("🔍 DEBUG: Testing order creation...");
  
  // Check if forwarderData exists
  console.log("forwarderData:", window.forwarderData || "NOT FOUND");
  
  // Try to create a simple test order
  try {
    const result = await window.createOrderMutation({
      customerId: "debug-customer-123",
      customerName: "Debug Customer", 
      customerEmail: "debug@test.com",
      shippingAddress: "Debug Address, Singapore 123456",
      trackingNumber: `DEBUG-${Date.now()}`,
      merchantName: "Debug Store",
      declaredWeight: 1.0,
      declaredValue: 50.0,
      currency: "USD",
      warehouseId: "debug-warehouse-id",
      forwarderId: "debug-forwarder-id", 
      shippingType: "immediate",
      courier: "DHL"
    });
    
    console.log("✅ Order creation SUCCESS:", result);
  } catch (error) {
    console.error("❌ Order creation FAILED:", error);
    console.error("Error details:", error.message);
  }
}

// Auto-run
debugOrderCreation();