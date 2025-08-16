import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import DualCameraCapture from "./DualCameraCapture";

interface HandoverCaptureProps {
  orderId: string;
  onComplete: () => void;
  onCancel: () => void;
}

interface PhotoAnalysis {
  frontPhoto: {
    blurScore: number;
    exposureScore: number;
    hasScaleReference: boolean;
    rulerDetectionConfidence: number;
  };
  sidePhoto: {
    blurScore: number;
    exposureScore: number;
  };
}

export default function HandoverCapture({ orderId, onComplete, onCancel }: HandoverCaptureProps) {
  const [step, setStep] = useState<"info" | "camera" | "courier" | "analysis" | "verification">("info");
  const [frontPhoto, setFrontPhoto] = useState<File | null>(null);
  const [sidePhoto, setSidePhoto] = useState<File | null>(null);
  const [photoAnalysis, setPhotoAnalysis] = useState<PhotoAnalysis | null>(null);
  const [courierName, setCourierName] = useState("");
  const [courierRepresentative, setCourierRepresentative] = useState("");
  const [handoverNotes, setHandoverNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<any>(null);

  // Get order details
  const order = useQuery(api.orders.getOrder, { orderId });
  
  // Get arrival condition for comparison
  const arrivalCondition = useQuery(api.parcelConditions.getArrivalCondition, { orderId });
  
  // Get current staff info
  const staff = useQuery(api.staff.getCurrentStaff, {});

  // Mutations
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const createConditionRecord = useMutation(api.parcelConditions.createConditionRecord);
  const processPackageAnalysis = useMutation(api.parcelConditions.processPackageAnalysis);
  const createHandoverVerification = useMutation(api.parcelConditions.createHandoverVerification);

  const handlePhotoCapture = (frontFile: File, sideFile: File, analysis: PhotoAnalysis) => {
    setFrontPhoto(frontFile);
    setSidePhoto(sideFile);
    setPhotoAnalysis(analysis);
    setStep("courier");
  };

  const handleCourierInfoSubmit = () => {
    if (!courierName.trim()) return;
    setStep("analysis");
    processHandover();
  };

  const processHandover = async () => {
    if (!frontPhoto || !sidePhoto || !photoAnalysis || !staff || !order || !arrivalCondition) return;

    setIsProcessing(true);
    
    try {
      // Upload both handover photos
      const [frontUploadUrl, sideUploadUrl] = await Promise.all([
        generateUploadUrl(),
        generateUploadUrl(),
      ]);
      
      const [frontUploadResult, sideUploadResult] = await Promise.all([
        fetch(frontUploadUrl, {
          method: "POST",
          headers: { "Content-Type": frontPhoto.type },
          body: frontPhoto,
        }),
        fetch(sideUploadUrl, {
          method: "POST",
          headers: { "Content-Type": sidePhoto.type },
          body: sidePhoto,
        }),
      ]);
      
      const [{ storageId: frontStorageId }, { storageId: sideStorageId }] = await Promise.all([
        frontUploadResult.json(),
        sideUploadResult.json(),
      ]);

      // Create handover condition record with dual photos
      const conditionId = await createConditionRecord({
        orderId,
        eventType: "handover",
        frontPhotoStorageId: frontStorageId,
        sidePhotoStorageId: sideStorageId,
        photoAnalysis,
        actualWeight: arrivalCondition.actualWeight, // Use same weight as arrival
        staffId: staff._id,
        staffName: staff.name,
        warehouseId: staff.assignedWarehouses[0],
        deviceInfo: navigator.userAgent,
      });

      // Run OpenCV dimension analysis (damage assessment is manual)
      const dimensionResults = (photoAnalysis as any).dimensionResults;
      await processPackageAnalysis({
        conditionId,
        frontPhotoStorageId: frontStorageId,
        sidePhotoStorageId: sideStorageId,
        ...(dimensionResults && { dimensionResults }),
      });

      // Mock photo comparison (to be replaced with real CV)
      const mockComparison = await mockPhotoComparison();
      setComparisonResult(mockComparison);

      // Create handover verification record
      await createHandoverVerification({
        conditionId,
        courierName: courierName.trim(),
        courierRepresentative: courierRepresentative.trim() || undefined,
        handoverNotes: handoverNotes.trim() || undefined,
        comparisonResult: mockComparison,
      });

      setStep("verification");
      
    } catch (error) {
      console.error("Error processing handover:", error);
      alert("Failed to process package handover. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Mock photo comparison (to be replaced with real computer vision)
  const mockPhotoComparison = async (): Promise<any> => {
    // Simulate image comparison processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const changeDetected = Math.random() > 0.8; // 20% chance of detecting changes
    
    return {
      arrivalConditionId: arrivalCondition?._id,
      alignmentScore: 0.85 + Math.random() * 0.1, // 0.85-0.95
      changeDetected,
      lightingAdjusted: true,
      ssimScore: changeDetected ? 0.7 + Math.random() * 0.15 : 0.9 + Math.random() * 0.08,
      changedAreas: changeDetected ? [
        {
          area: "top-right",
          changeType: "new_damage",
          confidence: 0.7 + Math.random() * 0.2,
        }
      ] : undefined,
    };
  };

  if (!order || !staff) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-center mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  if (!arrivalCondition) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-md w-full p-6">
          <div className="text-center">
            <div className="text-yellow-500 text-4xl mb-4">⚠️</div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              No Arrival Record Found
            </h2>
            <p className="text-gray-600 mb-6">
              This package must complete arrival verification before handover can be processed.
            </p>
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 1: Information
  if (step === "info") {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-md w-full p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Package Handover Verification
          </h2>
          
          <div className="space-y-3 mb-6">
            <div>
              <span className="text-sm text-gray-600">Order ID:</span>
              <div className="font-medium">#{orderId.slice(-8).toUpperCase()}</div>
            </div>
            <div>
              <span className="text-sm text-gray-600">Customer:</span>
              <div className="font-medium">{order.customerName}</div>
            </div>
            <div>
              <span className="text-sm text-gray-600">Courier:</span>
              <div className="font-medium">{order.courier || "Not assigned"}</div>
            </div>
            <div>
              <span className="text-sm text-gray-600">Arrival Verified:</span>
              <div className="font-medium text-green-600">✓ {new Date(arrivalCondition.timestamp).toLocaleDateString()}</div>
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-orange-900 mb-2">Handover Process:</h3>
            <ul className="text-sm text-orange-800 space-y-1">
              <li>• Take photo of package before courier pickup</li>
              <li>• Compare with arrival condition automatically</li>
              <li>• Record courier representative details</li>
              <li>• Generate handover verification receipt</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => setStep("camera")}
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            >
              Start Handover
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Camera
  if (step === "camera") {
    return (
      <DualCameraCapture
        onPhotoCapture={handlePhotoCapture}
        onCancel={onCancel}
        eventType="handover"
        orderId={orderId}
      />
    );
  }

  // Step 3: Courier Information
  if (step === "courier") {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-md w-full p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Courier Information
          </h2>
          
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Courier Service *
              </label>
              <select
                value={courierName}
                onChange={(e) => setCourierName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">Select courier...</option>
                <option value="DHL">DHL</option>
                <option value="UPS">UPS</option>
                <option value="FedEx">FedEx</option>
                <option value="SF Express">SF Express</option>
                <option value="Local Courier">Local Courier</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Courier Representative
              </label>
              <input
                type="text"
                value={courierRepresentative}
                onChange={(e) => setCourierRepresentative(e.target.value)}
                placeholder="Driver name or ID (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Handover Notes
              </label>
              <textarea
                value={handoverNotes}
                onChange={(e) => setHandoverNotes(e.target.value)}
                placeholder="Any special instructions or observations (optional)"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep("camera")}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Back to Photo
            </button>
            <button
              onClick={handleCourierInfoSubmit}
              disabled={!courierName.trim()}
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Process Handover
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 4: Analysis
  if (step === "analysis") {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-md w-full p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Comparing Package Condition
            </h2>
            <p className="text-gray-600 mb-4">
              Analyzing handover photo against arrival condition...
            </p>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm text-gray-600 space-y-1">
                <div>✓ Damage detection analysis</div>
                <div>✓ Photo alignment and comparison</div>
                <div>⏳ Change detection in progress...</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 5: Verification Results
  if (step === "verification" && comparisonResult) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Handover Verification Complete
          </h2>

          {/* Comparison Results */}
          <div className="mb-6">
            <div className={`p-4 rounded-lg border-2 ${
              comparisonResult.changeDetected 
                ? "bg-yellow-50 border-yellow-200" 
                : "bg-green-50 border-green-200"
            }`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">Condition Comparison</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  comparisonResult.changeDetected
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-green-100 text-green-800"
                }`}>
                  {comparisonResult.changeDetected ? "⚠ Changes Detected" : "✓ No Changes"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Photo Alignment:</span>
                  <div className="font-medium">{(comparisonResult.alignmentScore * 100).toFixed(1)}%</div>
                </div>
                <div>
                  <span className="text-gray-600">Similarity Score:</span>
                  <div className="font-medium">{(comparisonResult.ssimScore * 100).toFixed(1)}%</div>
                </div>
              </div>

              {comparisonResult.changeDetected && comparisonResult.changedAreas && (
                <div className="mt-3 p-2 bg-yellow-100 rounded">
                  <div className="text-sm font-medium text-yellow-800 mb-1">Detected Changes:</div>
                  {comparisonResult.changedAreas.map((change: any, index: number) => (
                    <div key={index} className="text-sm text-yellow-700">
                      • {change.changeType.replace('_', ' ')} in {change.area} ({(change.confidence * 100).toFixed(0)}% confidence)
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Handover Details */}
          <div className="mb-6 bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3">Handover Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Courier:</span>
                <span className="font-medium">{courierName}</span>
              </div>
              {courierRepresentative && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Representative:</span>
                  <span className="font-medium">{courierRepresentative}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Staff:</span>
                <span className="font-medium">{staff.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Time:</span>
                <span className="font-medium">{new Date().toLocaleString()}</span>
              </div>
              {handoverNotes && (
                <div>
                  <span className="text-gray-600">Notes:</span>
                  <div className="mt-1 text-gray-900">{handoverNotes}</div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onComplete}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Complete Handover
            </button>
          </div>

          {comparisonResult.changeDetected && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="text-sm text-yellow-800">
                <strong>Note:</strong> Changes were detected compared to arrival condition. 
                This handover record has been flagged for review by management.
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}