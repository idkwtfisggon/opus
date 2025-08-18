import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import DualCameraCapture from "./DualCameraCapture";
import { Eye, ClipboardList } from "lucide-react";

interface ArrivalCaptureProps {
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

export default function ArrivalCapture({ orderId, onComplete, onCancel }: ArrivalCaptureProps) {
  const [step, setStep] = useState<"info" | "camera" | "weight" | "analysis" | "confirmation">("info");
  const [frontPhoto, setFrontPhoto] = useState<File | null>(null);
  const [sidePhoto, setSidePhoto] = useState<File | null>(null);
  const [photoAnalysis, setPhotoAnalysis] = useState<PhotoAnalysis | null>(null);
  const [weight, setWeight] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [damageAssessment, setDamageAssessment] = useState<"none" | "minor" | "major">("none");
  const [damageNotes, setDamageNotes] = useState("");
  const [analysisResults, setAnalysisResults] = useState<any>(null);

  // Get order details
  const order = useQuery(api.orders.getOrder, { orderId });
  
  // Get current staff info (assuming you have staff context)
  const staff = useQuery(api.staff.getCurrentStaff, {});

  // Mutations
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const createConditionRecord = useMutation(api.parcelConditions.createConditionRecord);
  const processPackageAnalysis = useMutation(api.parcelConditions.processPackageAnalysis);
  const confirmDamageAssessment = useMutation(api.parcelConditions.confirmDamageAssessment);

  const handlePhotoCapture = (frontFile: File, sideFile: File, analysis: PhotoAnalysis) => {
    setFrontPhoto(frontFile);
    setSidePhoto(sideFile);
    setPhotoAnalysis(analysis);
    setStep("weight");
  };

  const handleWeightSubmit = () => {
    if (!weight.trim()) return;
    setStep("analysis");
    processArrival();
  };

  const processArrival = async () => {
    if (!frontPhoto || !sidePhoto || !photoAnalysis || !staff || !order) return;

    setIsProcessing(true);
    
    try {
      // Upload both photos
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

      // Create condition record with dual photos
      const conditionId = await createConditionRecord({
        orderId,
        eventType: "arrival",
        frontPhotoStorageId: frontStorageId,
        sidePhotoStorageId: sideStorageId,
        photoAnalysis,
        actualWeight: parseFloat(weight),
        staffId: staff._id,
        staffName: staff.name,
        warehouseId: staff.assignedWarehouses[0],
        deviceInfo: navigator.userAgent,
      });

      // Run OpenCV dimension analysis (damage assessment is manual)
      const dimensionResults = (photoAnalysis as any).dimensionResults;
      const analysis = await processPackageAnalysis({
        conditionId,
        frontPhotoStorageId: frontStorageId,
        sidePhotoStorageId: sideStorageId,
        ...(dimensionResults && { dimensionResults }),
      });

      setAnalysisResults(analysis);
      setStep("confirmation");
      
    } catch (error) {
      console.error("Error processing arrival:", error);
      alert("Failed to process package arrival. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinalConfirmation = async () => {
    if (!analysisResults) return;

    try {
      // Submit human confirmation
      await confirmDamageAssessment({
        conditionId: analysisResults.conditionId,
        finalDamageAssessment: damageAssessment,
        damageNotes: damageNotes.trim() || undefined,
        confirmedDamageTags: damageAssessment !== "none" ? [damageAssessment] : undefined,
      });

      onComplete();
    } catch (error) {
      console.error("Error confirming assessment:", error);
      alert("Failed to save assessment. Please try again.");
    }
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

  // Step 1: Information
  if (step === "info") {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-md w-full p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Package Arrival Verification
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
              <span className="text-sm text-gray-600">Merchant:</span>
              <div className="font-medium">{order.merchantName}</div>
            </div>
            <div>
              <span className="text-sm text-gray-600">Declared Weight:</span>
              <div className="font-medium">{order.declaredWeight}kg</div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-blue-900 mb-2">What we'll capture:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Clear photo showing package condition</li>
              <li>• Actual weight measurement</li>
              <li>• AI-assisted damage assessment</li>
              <li>• Your final condition verification</li>
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
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Start Capture
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
        eventType="arrival"
        orderId={orderId}
      />
    );
  }

  // Step 3: Weight Entry
  if (step === "weight") {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-md w-full p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Package Weight
          </h2>
          
          <div className="mb-4">
            <div className="text-sm text-gray-600 mb-1">Declared Weight</div>
            <div className="text-lg font-medium text-gray-900">{order.declaredWeight} kg</div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Actual Weight (kg) *
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="Enter actual weight"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep("camera")}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Back to Photo
            </button>
            <button
              onClick={handleWeightSubmit}
              disabled={!weight.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 4: AI Analysis
  if (step === "analysis") {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-md w-full p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Analyzing Package Condition
            </h2>
            <p className="text-gray-600">
              AI is examining the photo for damage detection and size measurement...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Step 5: Human Confirmation
  if (step === "confirmation" && analysisResults) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Confirm Package Condition
          </h2>

          {/* Analysis Results */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-3">Analysis Results</h3>
            
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              {/* Dimensions */}
              {analysisResults.dimensions?.calculatedDimensions && (
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">📏 Measured Dimensions</div>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Length:</span>
                      <span className="font-medium">{analysisResults.dimensions.calculatedDimensions.length_mm.toFixed(1)} mm</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Width:</span>
                      <span className="font-medium">{analysisResults.dimensions.calculatedDimensions.width_mm.toFixed(1)} mm</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Height:</span>
                      <span className="font-medium">{analysisResults.dimensions.calculatedDimensions.height_mm.toFixed(1)} mm</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Dim Weight:</span>
                      <span className="font-medium">{analysisResults.dimensions.calculatedDimensions.dim_weight.toFixed(2)} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Confidence:</span>
                      <span className="font-medium">{(analysisResults.dimensions.calculatedDimensions.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Manual Damage Assessment */}
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Damage Assessment
                </div>
                <div className="text-sm text-blue-600 flex items-center gap-2">
                  <ClipboardList className="w-4 h-4" />
                  Manual assessment required - complete below
                </div>
              </div>

              {/* Photo Quality */}
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">📸 Photo Quality</div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600">FRONT:</div>
                    <div className="text-xs">
                      Sharpness: {photoAnalysis?.frontPhoto.blurScore.toFixed(0)}/100<br/>
                      Ruler: {photoAnalysis?.frontPhoto.hasScaleReference ? '✓' : '✗'}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600">SIDE:</div>
                    <div className="text-xs">
                      Sharpness: {photoAnalysis?.sidePhoto.blurScore.toFixed(0)}/100
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Human Assessment */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-3">Your Assessment</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Package Condition *
                </label>
                <div className="space-y-2">
                  {[
                    { value: "none", label: "No Damage", color: "green" },
                    { value: "minor", label: "Minor Damage", color: "yellow" },
                    { value: "major", label: "Major Damage", color: "red" },
                  ].map((option) => (
                    <label key={option.value} className="flex items-center">
                      <input
                        type="radio"
                        value={option.value}
                        checked={damageAssessment === option.value}
                        onChange={(e) => setDamageAssessment(e.target.value as any)}
                        className="mr-3"
                      />
                      <span className={`px-2 py-1 rounded text-sm font-medium ${
                        option.color === "green" ? "bg-green-100 text-green-800" :
                        option.color === "yellow" ? "bg-yellow-100 text-yellow-800" :
                        "bg-red-100 text-red-800"
                      }`}>
                        {option.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {damageAssessment !== "none" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Damage Notes
                  </label>
                  <textarea
                    value={damageNotes}
                    onChange={(e) => setDamageNotes(e.target.value)}
                    placeholder="Describe the damage (e.g., 'Dent on top-left corner, box slightly crushed')"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep("weight")}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={handleFinalConfirmation}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Complete Arrival
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}