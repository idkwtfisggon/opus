import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Fix user role - change user back to customer
export const fixUserRole = mutation({
  args: {
    email: v.string(),
    newRole: v.union(v.literal("customer"), v.literal("forwarder"), v.literal("admin")),
  },
  handler: async (ctx, { email, newRole }) => {
    // Find user by email
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), email))
      .first();

    if (!user) {
      throw new Error(`User not found with email: ${email}`);
    }

    // Update role
    await ctx.db.patch(user._id, {
      role: newRole,
      updatedAt: Date.now(),
    });

    console.log(`Updated user ${email} role from ${user.role} to ${newRole}`);
    
    return {
      success: true,
      user: {
        email: user.email,
        oldRole: user.role,
        newRole,
      }
    };
  },
});