// OpenCV.js is loaded globally from CDN
declare global {
  var cv: any;
}

interface RulerDetection {
  pixelsPerMm: number;
  rulerCorners: Array<{ x: number; y: number }>;
  perspectiveCorrected: boolean;
  confidence: number;
}

interface DimensionResult {
  length_mm: number;
  width_mm: number;
  height_mm: number;
  dim_weight: number;
  confidence: number;
}

interface PackageDimensions {
  detectedRuler: RulerDetection;
  calculatedDimensions: DimensionResult;
  processingTimeMs: number;
}

// Initialize OpenCV (call this once when app starts)
export const initializeOpenCV = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if OpenCV is already available
    if (typeof window !== 'undefined' && window.cv && window.cv.Mat) {
      console.log('OpenCV.js already initialized');
      resolve();
      return;
    }
    
    // Wait for OpenCV to load from CDN
    if (typeof window !== 'undefined') {
      const checkOpenCV = () => {
        if (window.cv && window.cv.Mat) {
          console.log('OpenCV.js initialized from CDN');
          resolve();
        } else {
          setTimeout(checkOpenCV, 100);
        }
      };
      
      // Start checking after 1 second to give script time to load
      setTimeout(checkOpenCV, 1000);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        reject(new Error('OpenCV.js failed to load within 10 seconds'));
      }, 10000);
    } else {
      reject(new Error('Window object not available (SSR)'));
    }
  });
};

// Detect 4x3 label with measurement rulers  
const detectLabelRuler = (image: any): RulerDetection => {
  const cv = window.cv;
  // Convert to grayscale for better edge detection
  const gray = new cv.Mat();
  cv.cvtColor(image, gray, cv.COLOR_RGBA2GRAY);
  
  // Apply Gaussian blur to reduce noise
  const blurred = new cv.Mat();
  cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
  
  // Detect edges using Canny
  const edges = new cv.Mat();
  cv.Canny(blurred, edges, 50, 150);
  
  // Find contours
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
  
  let bestRulerCandidate: RulerDetection | null = null;
  let maxArea = 0;
  
  // Look for rectangular contours that could be the 4x3 label
  for (let i = 0; i < contours.size(); i++) {
    const contour = contours.get(i);
    const area = cv.contourArea(contour);
    
    // Filter by area (label should be reasonably sized)
    if (area < 1000 || area > 50000) continue;
    
    // Approximate contour to polygon
    const epsilon = 0.02 * cv.arcLength(contour, true);
    const approx = new cv.Mat();
    cv.approxPolyDP(contour, approx, epsilon, true);
    
    // Look for quadrilaterals (4 corners)
    if (approx.rows === 4) {
      const aspectRatio = area / (cv.boundingRect(contour).width * cv.boundingRect(contour).height);
      
      // Check if it's roughly rectangular and has good aspect ratio
      if (aspectRatio > 0.7 && area > maxArea) {
        maxArea = area;
        
        // Extract corner points
        const corners = [];
        for (let j = 0; j < 4; j++) {
          corners.push({
            x: approx.data32S[j * 2],
            y: approx.data32S[j * 2 + 1],
          });
        }
        
        // Calculate pixels per mm (4 inches = 101.6mm, 3 inches = 76.2mm)
        const rect = cv.boundingRect(contour);
        const avgPixelsPerMm = (rect.width / 101.6 + rect.height / 76.2) / 2;
        
        bestRulerCandidate = {
          pixelsPerMm: avgPixelsPerMm,
          rulerCorners: corners,
          perspectiveCorrected: true,
          confidence: Math.min(aspectRatio, 0.95), // Max 95% confidence
        };
      }
    }
    
    approx.delete();
    contour.delete();
  }
  
  // Cleanup
  gray.delete();
  blurred.delete();
  edges.delete();
  contours.delete();
  hierarchy.delete();
  
  // Return best candidate or fallback
  return bestRulerCandidate || {
    pixelsPerMm: 3.78, // Fallback: ~96 DPI converted to mm
    rulerCorners: [],
    perspectiveCorrected: false,
    confidence: 0.3, // Low confidence for fallback
  };
};

// Measure package dimensions from front and side photos
const measurePackageDimensions = (
  frontImage: any,
  sideImage: any,
  rulerDetection: RulerDetection
): DimensionResult => {
  const cv = window.cv;
  const { pixelsPerMm } = rulerDetection;
  
  // Convert images to grayscale
  const frontGray = new cv.Mat();
  const sideGray = new cv.Mat();
  cv.cvtColor(frontImage, frontGray, cv.COLOR_RGBA2GRAY);
  cv.cvtColor(sideImage, sideGray, cv.COLOR_RGBA2GRAY);
  
  // Apply threshold to separate package from background
  const frontThresh = new cv.Mat();
  const sideThresh = new cv.Mat();
  cv.threshold(frontGray, frontThresh, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
  cv.threshold(sideGray, sideThresh, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
  
  // Find largest contour (should be the package)
  const measureContour = (image: any): { width: number; height: number } => {
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(image, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    
    let maxArea = 0;
    let bestRect = { width: 0, height: 0 };
    
    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const area = cv.contourArea(contour);
      
      if (area > maxArea) {
        maxArea = area;
        const rect = cv.boundingRect(contour);
        bestRect = { width: rect.width, height: rect.height };
      }
      
      contour.delete();
    }
    
    contours.delete();
    hierarchy.delete();
    return bestRect;
  };
  
  // Measure from both images
  const frontMeasurement = measureContour(frontThresh);
  const sideMeasurement = measureContour(sideThresh);
  
  // Convert pixels to mm
  const length_mm = frontMeasurement.width / pixelsPerMm;
  const width_mm = frontMeasurement.height / pixelsPerMm;
  const height_mm = sideMeasurement.height / pixelsPerMm;
  
  // Calculate dimensional weight (L×W×H / 5000)
  const dim_weight = (length_mm * width_mm * height_mm) / 5000;
  
  // Calculate confidence based on measurement consistency
  const frontArea = frontMeasurement.width * frontMeasurement.height;
  const sideArea = sideMeasurement.width * sideMeasurement.height;
  const areaRatio = Math.min(frontArea, sideArea) / Math.max(frontArea, sideArea);
  const confidence = Math.min(areaRatio * rulerDetection.confidence, 0.95);
  
  // Cleanup
  frontGray.delete();
  sideGray.delete();
  frontThresh.delete();
  sideThresh.delete();
  
  return {
    length_mm: Math.round(length_mm * 10) / 10, // Round to 1 decimal
    width_mm: Math.round(width_mm * 10) / 10,
    height_mm: Math.round(height_mm * 10) / 10,
    dim_weight: Math.round(dim_weight * 100) / 100, // Round to 2 decimals
    confidence,
  };
};

// Main function to calculate package dimensions
export const calculatePackageDimensions = async (
  frontImageFile: File,
  sideImageFile: File
): Promise<PackageDimensions> => {
  const startTime = Date.now();
  
  try {
    const cv = window.cv;
    if (!cv) {
      throw new Error('OpenCV.js not available');
    }
    
    // Convert File objects to cv.Mat
    const frontImageElement = await fileToImageElement(frontImageFile);
    const sideImageElement = await fileToImageElement(sideImageFile);
    
    const frontMat = cv.imread(frontImageElement);
    const sideMat = cv.imread(sideImageElement);
    
    // Step 1: Detect ruler in front image
    const rulerDetection = detectLabelRuler(frontMat);
    
    // Step 2: Measure package dimensions
    const dimensions = measurePackageDimensions(frontMat, sideMat, rulerDetection);
    
    // Cleanup
    frontMat.delete();
    sideMat.delete();
    
    return {
      detectedRuler: rulerDetection,
      calculatedDimensions: dimensions,
      processingTimeMs: Date.now() - startTime,
    };
    
  } catch (error) {
    console.error('OpenCV dimension calculation failed:', error);
    
    // Return fallback dimensions
    return {
      detectedRuler: {
        pixelsPerMm: 3.78,
        rulerCorners: [],
        perspectiveCorrected: false,
        confidence: 0.1,
      },
      calculatedDimensions: {
        length_mm: 150,
        width_mm: 100,
        height_mm: 50,
        dim_weight: 1.5,
        confidence: 0.1,
      },
      processingTimeMs: Date.now() - startTime,
    };
  }
};

// Helper function to convert File to HTMLImageElement
const fileToImageElement = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

// Mock fallback for when OpenCV isn't ready
export const mockCalculatePackageDimensions = async (
  frontImageFile: File,
  sideImageFile: File
): Promise<PackageDimensions> => {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  return {
    detectedRuler: {
      pixelsPerMm: 3.5 + Math.random() * 1,
      rulerCorners: [
        { x: 50, y: 30 },
        { x: 350, y: 35 },
        { x: 345, y: 180 },
        { x: 45, y: 175 },
      ],
      perspectiveCorrected: true,
      confidence: 0.8 + Math.random() * 0.15,
    },
    calculatedDimensions: {
      length_mm: 150 + Math.random() * 200,
      width_mm: 100 + Math.random() * 150,
      height_mm: 50 + Math.random() * 100,
      dim_weight: 0,
      confidence: 0.8 + Math.random() * 0.15,
    },
    processingTimeMs: 1200 + Math.random() * 800,
  };
};