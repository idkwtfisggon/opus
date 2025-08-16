import { mutation, query, internal } from "./_generated/server";
import { v } from "convex/values";

// Create a new parcel condition record
export const createConditionRecord = mutation({
  args: {
    orderId: v.string(),
    eventType: v.union(v.literal("arrival"), v.literal("handover")),
    frontPhotoStorageId: v.string(),
    sidePhotoStorageId: v.string(),
    photoAnalysis: v.object({
      frontPhoto: v.object({
        blurScore: v.number(),
        exposureScore: v.number(),
        hasScaleReference: v.boolean(),
        rulerDetectionConfidence: v.number(),
      }),
      sidePhoto: v.object({
        blurScore: v.number(),
        exposureScore: v.number(),
      }),
    }),
    actualWeight: v.number(),
    staffId: v.string(),
    staffName: v.string(),
    warehouseId: v.string(),
    deviceInfo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Create initial record with dual photos and analysis
    const conditionId = await ctx.db.insert("parcelConditions", {
      orderId: args.orderId,
      eventType: args.eventType,
      frontPhotoStorageId: args.frontPhotoStorageId,
      sidePhotoStorageId: args.sidePhotoStorageId,
      photoAnalysis: args.photoAnalysis,
      
      // Initialize damage detection (manual assessment only)
      damageDetection: {
        manualAssessment: true, // Staff does the assessment
        flaggedForReview: false,
        analysisDate: now,
      },
      dimensionCalculation: {
        detectedRuler: {
          pixelsPerMm: 0,
          rulerCorners: [],
          perspectiveCorrected: false,
        },
        calculatedDimensions: {
          length_mm: 0,
          width_mm: 0,
          height_mm: 0,
          dim_weight: 0,
          confidence: 0,
        },
      },
      finalDamageAssessment: "none", // Default, staff will confirm
      
      actualWeight: args.actualWeight,
      staffId: args.staffId,
      staffName: args.staffName,
      warehouseId: args.warehouseId,
      deviceInfo: args.deviceInfo,
      
      requiresReview: false, // Will be set during processing
      timestamp: now,
      createdAt: now,
    });
    
    return conditionId;
  },
});

// Update condition record with AI analysis results
export const updateWithAIAnalysis = mutation({
  args: {
    conditionId: v.string(),
    photoQuality: v.object({
      blurScore: v.number(),
      exposureScore: v.number(),
      hasScaleReference: v.boolean(),
      scaleReferenceConfidence: v.optional(v.number()),
    }),
    aiDamageSuggestions: v.object({
      tags: v.array(v.object({
        type: v.string(),
        confidence: v.number(),
        area: v.string(),
        boundingBox: v.optional(v.object({
          x: v.number(),
          y: v.number(),
          width: v.number(),
          height: v.number(),
        })),
      })),
      overallConfidence: v.number(),
      flaggedForReview: v.boolean(),
      aiProvider: v.string(),
      processingTimeMs: v.optional(v.number()),
    }),
    scaleReference: v.optional(v.object({
      detected: v.boolean(),
      labelCorners: v.optional(v.array(v.object({
        x: v.number(),
        y: v.number(),
      }))),
      pixelsPerInch: v.optional(v.number()),
    })),
    measuredDimensions: v.optional(v.object({
      length: v.number(),
      width: v.number(),
      height: v.number(),
      confidence: v.number(),
      measuredFromAngles: v.array(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conditionId as any, {
      photoQuality: args.photoQuality,
      aiDamageSuggestions: args.aiDamageSuggestions,
      ...(args.scaleReference && {
        scaleReference: {
          type: "4x3_label" as const,
          ...args.scaleReference,
        },
      }),
      ...(args.measuredDimensions && {
        measuredDimensions: args.measuredDimensions,
      }),
      requiresReview: args.aiDamageSuggestions.flaggedForReview,
    });
  },
});

// Update with human confirmation
export const confirmDamageAssessment = mutation({
  args: {
    conditionId: v.string(),
    finalDamageAssessment: v.union(v.literal("none"), v.literal("minor"), v.literal("major")),
    damageNotes: v.optional(v.string()),
    confirmedDamageTags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conditionId as any, {
      finalDamageAssessment: args.finalDamageAssessment,
      damageNotes: args.damageNotes,
      confirmedDamageTags: args.confirmedDamageTags,
    });
  },
});

// Create handover verification record with comparison
export const createHandoverVerification = mutation({
  args: {
    conditionId: v.string(),
    courierName: v.string(),
    courierRepresentative: v.optional(v.string()),
    handoverNotes: v.optional(v.string()),
    comparisonResult: v.object({
      arrivalConditionId: v.string(),
      alignmentScore: v.number(),
      changeDetected: v.boolean(),
      lightingAdjusted: v.boolean(),
      ssimScore: v.number(),
      changedAreas: v.optional(v.array(v.object({
        area: v.string(),
        changeType: v.string(),
        confidence: v.number(),
      }))),
    }),
  },
  handler: async (ctx, args) => {
    const statusChange = args.comparisonResult.changeDetected ? "new_damage" : "no_change";
    
    await ctx.db.patch(args.conditionId as any, {
      handoverDetails: {
        courierName: args.courierName,
        courierRepresentative: args.courierRepresentative,
        statusChange,
        handoverNotes: args.handoverNotes,
      },
      comparisonResult: args.comparisonResult,
      requiresReview: args.comparisonResult.changeDetected,
    });
  },
});

// Get condition records for an order
export const getOrderConditions = query({
  args: { orderId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("parcelConditions")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .order("desc")
      .collect();
  },
});

// Get conditions requiring review
export const getConditionsRequiringReview = query({
  args: { warehouseId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("parcelConditions")
      .withIndex("by_requires_review", (q) => q.eq("requiresReview", true));
    
    if (args.warehouseId) {
      query = query.filter((q) => q.eq(q.field("warehouseId"), args.warehouseId));
    }
    
    return await query.order("desc").collect();
  },
});

// Get arrival condition for handover comparison
export const getArrivalCondition = query({
  args: { orderId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("parcelConditions")
      .withIndex("by_order_event", (q) => 
        q.eq("orderId", args.orderId).eq("eventType", "arrival")
      )
      .first();
  },
});

// Mock OpenCV dimension calculation (to be replaced with real OpenCV)
export const mockDimensionCalculation = mutation({
  args: {
    conditionId: v.string(),
    frontPhotoStorageId: v.string(),
    sidePhotoStorageId: v.string(),
  },
  handler: async (ctx, args) => {
    // Simulate OpenCV processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock dimension calculation results
    const mockDimensions = {
      detectedRuler: {
        pixelsPerMm: 3.5 + Math.random() * 1, // ~4 pixels per mm typical
        rulerCorners: [
          { x: 50, y: 30 },   // Top-left
          { x: 350, y: 35 },  // Top-right  
          { x: 345, y: 180 }, // Bottom-right
          { x: 45, y: 175 },  // Bottom-left
        ],
        perspectiveCorrected: true,
      },
      calculatedDimensions: {
        length_mm: 150 + Math.random() * 200, // 150-350mm
        width_mm: 100 + Math.random() * 150,  // 100-250mm  
        height_mm: 50 + Math.random() * 100,  // 50-150mm
        dim_weight: 0, // Will calculate below
        confidence: 0.8 + Math.random() * 0.2, // 0.8-1.0
      },
      processingTimeMs: 1200 + Math.random() * 800,
    };
    
    // Calculate dimensional weight (L×W×H / 5000)
    const { length_mm, width_mm, height_mm } = mockDimensions.calculatedDimensions;
    mockDimensions.calculatedDimensions.dim_weight = (length_mm * width_mm * height_mm) / 5000;
    
    await ctx.db.patch(args.conditionId as any, {
      dimensionCalculation: mockDimensions,
    });
    
    return {
      ...mockDimensions,
      conditionId: args.conditionId,
    };
  },
});

// Initialize manual damage assessment (no AI processing needed)
export const initializeManualDamageAssessment = mutation({
  args: {
    conditionId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Simple manual assessment setup - no AI processing
    const manualResults = {
      manualAssessment: true,
      flaggedForReview: false, // Will be set by staff if needed
      processingTimeMs: 0, // Instant since it's manual
      analysisDate: now,
    };
    
    await ctx.db.patch(args.conditionId as any, {
      damageDetection: manualResults,
    });
    
    return {
      ...manualResults,
      conditionId: args.conditionId,
    };
  },
});

// Process package analysis (OpenCV dimensions only)
export const processPackageAnalysis = mutation({
  args: {
    conditionId: v.string(),
    frontPhotoStorageId: v.string(),
    sidePhotoStorageId: v.string(),
    dimensionResults: v.optional(v.object({
      detectedRuler: v.object({
        pixelsPerMm: v.number(),
        rulerCorners: v.array(v.object({
          x: v.number(),
          y: v.number(),
        })),
        perspectiveCorrected: v.boolean(),
        confidence: v.number(),
      }),
      calculatedDimensions: v.object({
        length_mm: v.number(),
        width_mm: v.number(),
        height_mm: v.number(),
        dim_weight: v.number(),
        confidence: v.number(),
      }),
      processingTimeMs: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    // Use real OpenCV results if provided, otherwise fall back to mock
    let dimensionResult;
    
    if (args.dimensionResults) {
      // Update with real OpenCV results from frontend
      await ctx.db.patch(args.conditionId as any, {
        dimensionCalculation: args.dimensionResults,
      });
      
      dimensionResult = {
        ...args.dimensionResults,
        conditionId: args.conditionId,
      };
    } else {
      // Fallback to mock calculation
      dimensionResult = await mockDimensionCalculation.handler(ctx, {
        conditionId: args.conditionId,
        frontPhotoStorageId: args.frontPhotoStorageId,
        sidePhotoStorageId: args.sidePhotoStorageId,
      });
    }
    
    // Initialize manual damage assessment
    const damageResult = await initializeManualDamageAssessment.handler(ctx, {
      conditionId: args.conditionId,
    });
    
    return {
      dimensions: dimensionResult,
      damage: damageResult,
      conditionId: args.conditionId,
    };
  },
});