import { useState, useEffect, useRef } from 'react';
import { BrowserMultiFormatReader, NotFoundException, ChecksumException, FormatException } from '@zxing/library';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onError?: (error: string) => void;
  isActive: boolean;
  className?: string;
}

export default function BarcodeScanner({ onScan, onError, isActive, className = "" }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize barcode reader
  useEffect(() => {
    codeReaderRef.current = new BrowserMultiFormatReader();
    
    // Get available video devices
    const getDevices = async () => {
      try {
        const videoInputDevices = await codeReaderRef.current!.listVideoInputDevices();
        setDevices(videoInputDevices);
        
        // Prefer back camera (environment)
        const backCamera = videoInputDevices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('environment') ||
          device.label.toLowerCase().includes('rear')
        );
        
        setSelectedDeviceId(backCamera?.deviceId || videoInputDevices[0]?.deviceId || '');
      } catch (error) {
        console.error('Error getting video devices:', error);
        setCameraError('Unable to access camera devices');
      }
    };

    getDevices();

    return () => {
      stopScanning();
    };
  }, []);

  const startScanning = async () => {
    if (!codeReaderRef.current || !videoRef.current) return;
    
    setCameraError(null);
    setIsScanning(true);

    try {
      // Request camera permissions explicitly
      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
          facingMode: selectedDeviceId ? undefined : 'environment',
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      // Set video source
      videoRef.current.srcObject = stream;
      
      // Start scanning once video loads
      videoRef.current.onloadedmetadata = () => {
        if (videoRef.current) {
          videoRef.current.play();
          startBarcodeDetection();
        }
      };

    } catch (error: any) {
      console.error('Camera access error:', error);
      let errorMessage = 'Camera access denied';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera found on this device.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Camera not supported on this device.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera is already in use by another application.';
      }
      
      setCameraError(errorMessage);
      setIsScanning(false);
      onError?.(errorMessage);
    }
  };

  const startBarcodeDetection = () => {
    if (!codeReaderRef.current || !videoRef.current) return;

    const detectBarcodes = () => {
      if (!isActive || !videoRef.current || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) return;

      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw current video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Get image data for barcode detection
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      try {
        // Attempt to decode barcode from image data
        codeReaderRef.current!.decodeFromImageData(imageData)
          .then((result) => {
            if (result) {
              console.log('Barcode detected:', result.getText());
              onScan(result.getText());
              // Continue scanning after a brief pause
              setTimeout(() => {
                if (isActive) {
                  requestAnimationFrame(detectBarcodes);
                }
              }, 1000);
            } else {
              // Continue scanning
              if (isActive) {
                requestAnimationFrame(detectBarcodes);
              }
            }
          })
          .catch((error) => {
            // Continue scanning on detection errors (these are normal)
            if (!(error instanceof NotFoundException) && 
                !(error instanceof ChecksumException) && 
                !(error instanceof FormatException)) {
              console.error('Barcode detection error:', error);
            }
            
            if (isActive) {
              requestAnimationFrame(detectBarcodes);
            }
          });
      } catch (error) {
        console.error('Canvas processing error:', error);
        if (isActive) {
          requestAnimationFrame(detectBarcodes);
        }
      }
    };

    // Start detection loop
    requestAnimationFrame(detectBarcodes);
  };

  const stopScanning = () => {
    setIsScanning(false);
    
    // Stop video stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Clear video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    // Reset barcode reader
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
  };

  // Start/stop scanning based on isActive prop
  useEffect(() => {
    if (isActive && !isScanning && selectedDeviceId) {
      startScanning();
    } else if (!isActive && isScanning) {
      stopScanning();
    }
  }, [isActive, selectedDeviceId]);

  // Handle device selection change
  const handleDeviceChange = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    if (isScanning) {
      stopScanning();
      // Will restart automatically due to useEffect
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Camera Selection (if multiple cameras) */}
      {devices.length > 1 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground mb-2">
            Camera Selection
          </label>
          <select
            value={selectedDeviceId}
            onChange={(e) => handleDeviceChange(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            {devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${device.deviceId.slice(0, 8)}...`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Video Element */}
      <div className="relative bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-auto max-h-96 object-cover"
          playsInline
          muted
          autoPlay
        />
        
        {/* Scanning Overlay */}
        {isScanning && !cameraError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="border-2 border-white bg-white/10 rounded-lg p-4">
              <div className="w-48 h-48 border-2 border-white/50 rounded-lg relative">
                <div className="absolute top-0 left-0 w-6 h-6 border-l-4 border-t-4 border-white rounded-tl-lg"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-r-4 border-t-4 border-white rounded-tr-lg"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-l-4 border-b-4 border-white rounded-bl-lg"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-r-4 border-b-4 border-white rounded-br-lg"></div>
                
                {/* Scanning line animation */}
                <div className="absolute inset-x-0 top-1/2 h-0.5 bg-white animate-pulse"></div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isActive && !isScanning && !cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
              <p>Starting camera...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-500/10 border-2 border-red-500 rounded-lg">
            <div className="text-center p-4">
              <svg className="w-12 h-12 text-red-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="text-red-700 font-medium mb-2">Camera Error</p>
              <p className="text-red-600 text-sm">{cameraError}</p>
              <button
                onClick={startScanning}
                className="mt-3 px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Hidden canvas for barcode processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera Permissions Help */}
      {cameraError?.includes('permission') && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="font-medium text-yellow-800 mb-2">Camera Permission Required</h4>
          <div className="text-sm text-yellow-700 space-y-1">
            <p><strong>iOS Safari:</strong> Tap the address bar → Camera icon → Allow</p>
            <p><strong>Android Chrome:</strong> Tap the camera icon in address bar → Allow</p>
            <p><strong>Other browsers:</strong> Look for camera permission popup and click Allow</p>
          </div>
        </div>
      )}
    </div>
  );
}