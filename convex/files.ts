import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Generate upload URL for parcel condition photos
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Get file URL for displaying photos
export const getUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

// Delete a file (for cleanup or retakes)
export const deleteFile = mutation({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    await ctx.storage.delete(args.storageId);
  },
});

// Get file metadata
export const getMetadata = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.storage.getMetadata(args.storageId);
  },
});