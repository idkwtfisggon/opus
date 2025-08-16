import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Clean up user - remove forwarder record when converting to customer
export const removeForwarderRecord = mutation({
  args: {
    userId: v.string(), // Clerk user ID like user_311q2JRtxFvJwOm8pKvTsojKrb3
  },
  handler: async (ctx, { userId }) => {
    // Find and delete forwarder record
    const forwarder = await ctx.db
      .query("forwarders")
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    if (!forwarder) {
      return { message: "No forwarder record found" };
    }

    // Delete the forwarder record
    await ctx.db.delete(forwarder._id);

    console.log(`Deleted forwarder record for user ${userId}`);
    
    return {
      success: true,
      deletedForwarder: {
        id: forwarder._id,
        businessName: forwarder.businessName,
        userId: forwarder.userId,
      }
    };
  },
});