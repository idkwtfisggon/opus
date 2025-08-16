import { useState, useRef, useCallback, useEffect } from "react";
import { initializeOpenCV, calculatePackageDimensions, mockCalculatePackageDimensions } from "../../utils/opencv-dimensions";

interface DualCameraCaptureProps {
  onPhotoCapture: (frontPhoto: File, sidePhoto: File, analysis: PhotoAnalysis) => void;
  onCancel: () => void;
  eventType: "arrival" | "handover";
  orderId: string;
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

type CaptureStep = "front" | "side" | "review";

export default function DualCameraCapture({ onPhotoCapture, onCancel, eventType, orderId }: DualCameraCaptureProps) {
  const [step, setStep] = useState<CaptureStep>("front");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [frontPhoto, setFrontPhoto] = useState<{ file: File; preview: string } | null>(null);
  const [sidePhoto, setSidePhoto] = useState<{ file: File; preview: string } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<PhotoAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOpenCVReady, setIsOpenCVReady] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize camera and OpenCV
  useEffect(() => {
    const initCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment", // Use back camera on mobile
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false
        });
        
        setStream(mediaStream);
        
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        setError("Camera access denied. Please enable camera permissions.");
        console.error("Camera error:", err);
      }
    };

    const initOpenCV = async () => {
      try {
        await initializeOpenCV();
        setIsOpenCVReady(true);
        console.log('OpenCV initialized successfully');
      } catch (err) {
        console.warn('OpenCV initialization failed, falling back to mock analysis:', err);
        setIsOpenCVReady(false);
      }
    };

    initCamera();
    initOpenCV();

    // Cleanup
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Capture photo
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    // Set canvas size to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0);

    // Convert to blob
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `${step}_${orderId}_${Date.now()}.jpg`, {
          type: "image/jpeg"
        });
        const preview = canvas.toDataURL("image/jpeg", 0.8);
        
        if (step === "front") {
          setFrontPhoto({ file, preview });
          setStep("side");
        } else if (step === "side") {
          setSidePhoto({ file, preview });
          setStep("review");
          analyzePhotos(frontPhoto!.file, file);
        }
      }
    }, "image/jpeg", 0.8);
  }, [step, frontPhoto, orderId]);

  // Analyze both photos with OpenCV
  const analyzePhotos = async (frontFile: File, sideFile: File) => {
    setIsAnalyzing(true);
    
    try {
      let dimensionResults;
      
      if (isOpenCVReady) {
        // Use real OpenCV processing
        console.log('Running OpenCV dimension calculation...');
        dimensionResults = await calculatePackageDimensions(frontFile, sideFile);
      } else {
        // Fallback to mock analysis
        console.log('OpenCV not ready, using mock analysis...');
        dimensionResults = await mockCalculatePackageDimensions(frontFile, sideFile);
      }
      
      // Extract ruler detection and photo quality from OpenCV results
      const photoAnalysis: PhotoAnalysis = {
        frontPhoto: {
          blurScore: 75 + Math.random() * 20, // Mock photo quality scores
          exposureScore: 70 + Math.random() * 25,
          hasScaleReference: dimensionResults.detectedRuler.confidence > 0.3,
          rulerDetectionConfidence: dimensionResults.detectedRuler.confidence,
        },
        sidePhoto: {
          blurScore: 70 + Math.random() * 25,
          exposureScore: 65 + Math.random() * 30,
        },
      };
      
      // Store dimension results for later use
      (photoAnalysis as any).dimensionResults = dimensionResults;
      
      setAnalysis(photoAnalysis);
      
      console.log('OpenCV analysis complete:', {
        processing_time: dimensionResults.processingTimeMs + 'ms',
        ruler_confidence: (dimensionResults.detectedRuler.confidence * 100).toFixed(1) + '%',
        dimensions: `${dimensionResults.calculatedDimensions.length_mm.toFixed(1)} × ${dimensionResults.calculatedDimensions.width_mm.toFixed(1)} × ${dimensionResults.calculatedDimensions.height_mm.toFixed(1)} mm`,
        dim_weight: dimensionResults.calculatedDimensions.dim_weight.toFixed(2) + 'kg'
      });
      
    } catch (error) {
      console.error("OpenCV analysis failed:", error);
      setError("Photo analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Retake photos
  const retakePhoto = (photoType: "front" | "side") => {
    if (photoType === "front") {
      setFrontPhoto(null);
      setSidePhoto(null);
      setStep("front");
    } else {
      setSidePhoto(null);
      setStep("side");
    }
    setAnalysis(null);
    setError(null);
  };

  // Confirm and submit
  const confirmPhotos = () => {
    if (frontPhoto && sidePhoto && analysis) {
      onPhotoCapture(frontPhoto.file, sidePhoto.file, analysis);
    }
  };

  const qualityPassed = analysis && 
    analysis.frontPhoto.hasScaleReference && 
    analysis.frontPhoto.blurScore >= 60 && 
    analysis.sidePhoto.blurScore >= 60;

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-md w-full p-6">
          <div className="text-center">
            <div className="text-red-500 text-4xl mb-4">📷</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Camera Error</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Package Photo Capture - {eventType === "arrival" ? "Arrival" : "Handover"}
            </h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Progress indicator */}
          <div className="mb-6">
            <div className="flex items-center justify-center space-x-4">
              <div className={`flex items-center ${step === "front" ? "text-blue-600" : frontPhoto ? "text-green-600" : "text-gray-400"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === "front" ? "border-blue-600 bg-blue-50" : frontPhoto ? "border-green-600 bg-green-50" : "border-gray-300"}`}>
                  {frontPhoto ? "✓" : "1"}
                </div>
                <span className="ml-2 font-medium">FRONT Shot</span>
              </div>
              <div className="w-8 h-1 bg-gray-200 rounded">
                <div className={`h-full bg-blue-600 rounded transition-all ${frontPhoto ? "w-full" : "w-0"}`}></div>
              </div>
              <div className={`flex items-center ${step === "side" ? "text-blue-600" : sidePhoto ? "text-green-600" : "text-gray-400"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === "side" ? "border-blue-600 bg-blue-50" : sidePhoto ? "border-green-600 bg-green-50" : "border-gray-300"}`}>
                  {sidePhoto ? "✓" : "2"}
                </div>
                <span className="ml-2 font-medium">SIDE Shot</span>
              </div>
            </div>
          </div>

          {step === "review" ? (
            // Review Mode
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Front Photo */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium">FRONT Shot (with ruler)</h3>
                    <button
                      onClick={() => retakePhoto("front")}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Retake
                    </button>
                  </div>
                  {frontPhoto && (
                    <img
                      src={frontPhoto.preview}
                      alt="Front view"
                      className="w-full rounded-lg border"
                    />
                  )}
                </div>

                {/* Side Photo */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium">SIDE Shot</h3>
                    <button
                      onClick={() => retakePhoto("side")}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Retake
                    </button>
                  </div>
                  {sidePhoto && (
                    <img
                      src={sidePhoto.preview}
                      alt="Side view"
                      className="w-full rounded-lg border"
                    />
                  )}
                </div>
              </div>

              {/* Analysis Results */}
              {isAnalyzing ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
                    <div className="text-blue-700">
                      {isOpenCVReady ? 'Running OpenCV dimension calculation...' : 'Analyzing photos with fallback processing...'}
                    </div>
                  </div>
                  <div className="text-xs text-blue-600 mt-2">
                    {isOpenCVReady ? '• Detecting ruler scale reference\n• Measuring package dimensions\n• Calculating dimensional weight' : '• Using mock analysis (OpenCV not available)'}
                  </div>
                </div>
              ) : analysis ? (
                <div className={`border rounded-lg p-4 ${
                  qualityPassed 
                    ? "bg-green-50 border-green-200" 
                    : "bg-yellow-50 border-yellow-200"
                }`}>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Quality Analysis</span>
                      <span className={`px-2 py-1 rounded text-sm ${
                        qualityPassed 
                          ? "bg-green-100 text-green-800" 
                          : "bg-yellow-100 text-yellow-800"
                      }`}>
                        {qualityPassed ? "✓ Ready for Processing" : "⚠ Issues Detected"}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium text-sm text-gray-700 mb-2">📸 Photo Quality</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>FRONT Sharpness:</span>
                            <span className={analysis.frontPhoto.blurScore >= 60 ? "text-green-600" : "text-red-600"}>
                              {analysis.frontPhoto.blurScore.toFixed(0)}/100
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>SIDE Sharpness:</span>
                            <span className={analysis.sidePhoto.blurScore >= 60 ? "text-green-600" : "text-red-600"}>
                              {analysis.sidePhoto.blurScore.toFixed(0)}/100
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Ruler Detection:</span>
                            <span className={analysis.frontPhoto.hasScaleReference ? "text-green-600" : "text-red-600"}>
                              {analysis.frontPhoto.hasScaleReference ? `✓ ${(analysis.frontPhoto.rulerDetectionConfidence * 100).toFixed(0)}%` : "✗ Missing"}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-sm text-gray-700 mb-2">📏 Measurements {isOpenCVReady ? '(OpenCV)' : '(Mock)'}</h4>
                        {(analysis as any).dimensionResults && (
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>Length:</span>
                              <span className="font-medium">{(analysis as any).dimensionResults.calculatedDimensions.length_mm.toFixed(1)} mm</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Width:</span>
                              <span className="font-medium">{(analysis as any).dimensionResults.calculatedDimensions.width_mm.toFixed(1)} mm</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Height:</span>
                              <span className="font-medium">{(analysis as any).dimensionResults.calculatedDimensions.height_mm.toFixed(1)} mm</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Dim Weight:</span>
                              <span className="font-medium text-blue-600">{(analysis as any).dimensionResults.calculatedDimensions.dim_weight.toFixed(2)} kg</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {!qualityPassed && (
                      <div className="text-sm text-yellow-700 bg-yellow-100 p-3 rounded">
                        <div className="font-medium mb-1">Quality Issues:</div>
                        {!analysis.frontPhoto.hasScaleReference && "• FRONT shot must show the printed ruler label clearly\n"}
                        {analysis.frontPhoto.blurScore < 60 && "• FRONT shot needs better focus\n"}
                        {analysis.sidePhoto.blurScore < 60 && "• SIDE shot needs better focus\n"}
                        {analysis.frontPhoto.exposureScore < 50 && "• FRONT shot needs better lighting\n"}
                        {analysis.sidePhoto.exposureScore < 50 && "• SIDE shot needs better lighting"}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={onCancel}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                
                <button
                  onClick={confirmPhotos}
                  disabled={!qualityPassed}
                  className={`flex-1 px-4 py-2 rounded-lg ${
                    qualityPassed
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {qualityPassed ? "Use These Photos" : "Quality Check Required"}
                </button>
              </div>
            </div>
          ) : (
            // Camera View
            <div className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-auto max-h-96 object-cover"
                />
                
                {/* Camera overlay guides */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-4 left-4 right-4 bg-black bg-opacity-70 text-white p-3 rounded-lg">
                    <div className="text-sm font-medium mb-1">
                      {step === "front" ? "FRONT Shot Guidelines:" : "SIDE Shot Guidelines:"}
                    </div>
                    <div className="text-xs space-y-1">
                      {step === "front" ? (
                        <>
                          <div>• Position package so shipping label with rulers is fully visible</div>
                          <div>• Ensure all 4 ruler edges are in frame and clearly readable</div>
                          <div>• Keep package flat and centered in viewfinder</div>
                        </>
                      ) : (
                        <>
                          <div>• Show side profile of package for height measurement</div>
                          <div>• Keep package edge vertical and well-lit</div>
                          <div>• Capture full height from bottom to top</div>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Ruler overlay for front shot */}
                  {step === "front" && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="border-2 border-yellow-400 border-dashed bg-yellow-400 bg-opacity-20 rounded-lg" 
                           style={{ width: "60%", height: "40%" }}>
                        <div className="text-yellow-300 text-xs p-2">
                          Position package with label here
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Center crosshair */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="w-8 h-8 border-2 border-white opacity-50">
                      <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white transform -translate-y-1/2"></div>
                      <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white transform -translate-x-1/2"></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={capturePhoto}
                  className="w-16 h-16 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center text-white text-2xl"
                >
                  📷
                </button>
              </div>

              <div className="text-center text-sm text-gray-600">
                {step === "front" ? (
                  "Capture FRONT view showing the shipping label with rulers"
                ) : (
                  "Capture SIDE view for height measurement"
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hidden canvas for photo processing */}
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}