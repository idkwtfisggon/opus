import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

interface ShippingRatesModalProps {
  orderId: string;
  forwarderId: string;
  onClose: () => void;
  onLabelCreated: (result: any) => void;
}

export default function ShippingRatesModal({ 
  orderId, 
  forwarderId, 
  onClose, 
  onLabelCreated 
}: ShippingRatesModalProps) {
  const [selectedRate, setSelectedRate] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualTracking, setManualTracking] = useState("");
  const [manualCourier, setManualCourier] = useState("");

  // Get available rates
  const rates = useQuery(api.courierIntegrations.getShippingRates, {
    orderId,
    forwarderId
  });

  // Get courier integrations
  const integrations = useQuery(api.courierIntegrations.getForwarderCourierIntegrations, {
    forwarderId
  });

  // Mutations
  const createLabel = useMutation(api.courierIntegrations.createShippingLabel);
  const updateTracking = useMutation(api.courierIntegrations.updateTrackingNumber);

  const handleCreateLabel = async () => {
    if (!selectedRate) return;

    setIsCreating(true);
    try {
      const result = await createLabel({
        orderId,
        courierName: selectedRate.courierName,
        serviceName: selectedRate.serviceName,
        serviceCode: selectedRate.serviceCode,
      });

      onLabelCreated(result);
      onClose();
    } catch (error) {
      console.error("Error creating label:", error);
      alert("Failed to create shipping label");
    } finally {
      setIsCreating(false);
    }
  };

  const handleManualUpdate = async () => {
    if (!manualTracking.trim() || !manualCourier) return;

    setIsCreating(true);
    try {
      const result = await updateTracking({
        orderId,
        trackingNumber: manualTracking.trim(),
        courierName: manualCourier,
      });

      onLabelCreated(result);
      onClose();
    } catch (error) {
      console.error("Error updating tracking:", error);
      alert("Failed to update tracking number");
    } finally {
      setIsCreating(false);
    }
  };

  const apiIntegrations = integrations?.filter(i => i.mode === "api" && i.status === "ready") || [];
  const hasApiIntegrations = apiIntegrations.length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Create Shipping Label</h2>
          <p className="text-sm text-gray-600 mt-1">
            Choose a shipping service or enter tracking manually
          </p>
        </div>

        <div className="p-6">
          {/* Mode Selection */}
          <div className="mb-6">
            <div className="flex gap-3">
              <button
                onClick={() => setManualMode(false)}
                className={`flex-1 p-4 border rounded-lg text-left transition-colors ${
                  !manualMode 
                    ? "border-blue-500 bg-blue-50 text-blue-700" 
                    : "border-gray-200 hover:border-gray-300"
                }`}
                disabled={!hasApiIntegrations}
              >
                <div className="font-medium">API Mode {!hasApiIntegrations && "(Not Available)"}</div>
                <div className="text-xs text-gray-500 mt-1">
                  Automated label creation with live rates
                </div>
              </button>
              <button
                onClick={() => setManualMode(true)}
                className={`flex-1 p-4 border rounded-lg text-left transition-colors ${
                  manualMode 
                    ? "border-blue-500 bg-blue-50 text-blue-700" 
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="font-medium">Manual Mode</div>
                <div className="text-xs text-gray-500 mt-1">
                  Enter tracking number manually
                </div>
              </button>
            </div>
          </div>

          {/* API Mode */}
          {!manualMode && hasApiIntegrations && (
            <div>
              <h3 className="font-medium text-gray-900 mb-4">Available Shipping Services</h3>
              
              {rates === undefined ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading shipping rates...</p>
                </div>
              ) : rates.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-yellow-500 text-4xl mb-4">⚠️</div>
                  <p className="text-gray-500">No shipping rates available</p>
                  <p className="text-xs text-gray-400 mt-2">
                    Check your courier integrations
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {rates.map((rate: any, index: number) => (
                    <div
                      key={index}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedRate === rate 
                          ? "border-blue-500 bg-blue-50" 
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => setSelectedRate(rate)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-gray-900">
                            {rate.courierName} - {rate.serviceName}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {rate.description}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            Transit time: {rate.transitDays} business days
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">
                            ${rate.price.toFixed(2)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {rate.currency}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Manual Mode */}
          {manualMode && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 mb-4">Manual Tracking Entry</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Courier
                </label>
                <select
                  value={manualCourier}
                  onChange={(e) => setManualCourier(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select courier...</option>
                  <option value="DHL">DHL</option>
                  <option value="UPS">UPS</option>
                  <option value="FedEx">FedEx</option>
                  <option value="SF Express">SF Express</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tracking Number
                </label>
                <input
                  type="text"
                  value={manualTracking}
                  onChange={(e) => setManualTracking(e.target.value)}
                  placeholder="Enter tracking number from courier portal"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="text-yellow-400 mr-3">ℹ️</div>
                  <div>
                    <div className="text-sm font-medium text-yellow-800">Manual Mode</div>
                    <div className="text-sm text-yellow-700 mt-1">
                      You'll need to create the shipping label through your courier's portal, 
                      then enter the tracking number here for customer visibility.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* No API Integrations Available */}
          {!hasApiIntegrations && !manualMode && (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-4">🚚</div>
              <p className="text-gray-500 mb-2">No courier integrations available</p>
              <p className="text-xs text-gray-400 mb-4">
                Set up API integrations in Courier Settings for automated label creation
              </p>
              <button
                onClick={() => setManualMode(true)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Use Manual Mode Instead
              </button>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          
          {!manualMode ? (
            <button
              onClick={handleCreateLabel}
              disabled={!selectedRate || isCreating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isCreating ? "Creating Label..." : "Create Label"}
            </button>
          ) : (
            <button
              onClick={handleManualUpdate}
              disabled={!manualTracking.trim() || !manualCourier || isCreating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isCreating ? "Updating..." : "Update Tracking"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}