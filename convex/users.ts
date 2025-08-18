import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const findUserByToken = query({
  args: { tokenIdentifier: v.string() },
  handler: async (ctx, args) => {
    console.log("findUserByToken: Looking for tokenIdentifier =", args.tokenIdentifier);
    
    // Direct query without auth validation since this is called from server loaders
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", args.tokenIdentifier))
      .unique();

    console.log("findUserByToken: Found user =", user);
    return user;
  },
});

export const upsertUser = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    // Check if user exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (existingUser) {
      // Update if needed
      if (
        existingUser.name !== identity.name ||
        existingUser.email !== identity.email
      ) {
        await ctx.db.patch(existingUser._id, {
          name: identity.name,
          email: identity.email,
        });
      }
      return existingUser;
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      name: identity.name,
      email: identity.email,
      tokenIdentifier: identity.subject,
      role: "customer", // Default role - can be changed later
      createdAt: Date.now(),
    });

    return await ctx.db.get(userId);
  },
});

export const createUser = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    role: v.union(v.literal("customer"), v.literal("forwarder"), v.literal("admin")),
    phoneNumber: v.optional(v.string()),
    shippingAddress: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    country: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    preferredCurrency: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    console.log("createUser: Identity subject =", identity.subject);

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    console.log("createUser: Existing user =", existingUser);

    const updateData = {
      name: args.name,
      email: args.email,
      role: args.role,
      ...(args.phoneNumber && { phoneNumber: args.phoneNumber }),
      ...(args.shippingAddress && { shippingAddress: args.shippingAddress }),
      ...(args.city && { city: args.city }),
      ...(args.state && { state: args.state }),
      ...(args.country && { country: args.country }),
      ...(args.postalCode && { postalCode: args.postalCode }),
      ...(args.preferredCurrency && { preferredCurrency: args.preferredCurrency }),
      updatedAt: Date.now(),
    };

    if (existingUser) {
      // Update existing user with role and additional data
      await ctx.db.patch(existingUser._id, updateData);
      console.log("createUser: Updated existing user, ID =", existingUser._id);
      
      // Auto-generate shopping email if user is now a customer and doesn't have one
      if (args.role === "customer") {
        try {
          await ctx.runMutation("emails:autoGenerateCustomerEmail" as any, { customerId: existingUser._id });
        } catch (error) {
          console.error("Failed to generate customer email:", error);
          // Don't fail the update if email generation fails
        }
      }
      
      return existingUser._id;
    }

    // Create new user with specified role and additional data
    const userId = await ctx.db.insert("users", {
      ...updateData,
      tokenIdentifier: identity.subject,
      createdAt: Date.now(),
    });

    console.log("createUser: Created new user, ID =", userId, "with tokenIdentifier =", identity.subject);
    
    // Auto-generate shopping email for customers
    if (args.role === "customer") {
      try {
        await ctx.runMutation("emails:autoGenerateCustomerEmail" as any, { customerId: userId });
      } catch (error) {
        console.error("Failed to generate customer email:", error);
        // Don't fail the user creation if email generation fails
      }
    }
    
    return userId;
  },
});

// Migration function to fix users without roles
export const fixUserRole = mutation({
  args: {
    role: v.union(v.literal("customer"), v.literal("forwarder"), v.literal("admin")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Find the user
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (existingUser) {
      // Update user with the specified role
      await ctx.db.patch(existingUser._id, {
        role: args.role,
      });
      return existingUser;
    }

    throw new Error("User not found");
  },
});

// Update user profile information
export const updateUserProfile = mutation({
  args: {
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    country: v.optional(v.string()),
    timezone: v.optional(v.string()),
    language: v.optional(v.string()),
    bio: v.optional(v.string()),
    company: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    website: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    let existingUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!existingUser) {
      // Create user record if it doesn't exist (for legacy accounts)
      const userId = await ctx.db.insert("users", {
        name: identity.name,
        email: identity.email,
        tokenIdentifier: identity.subject,
        role: "forwarder", // Assume forwarder for legacy accounts
        createdAt: Date.now(),
      });
      existingUser = await ctx.db.get(userId);
      if (!existingUser) {
        throw new Error("Failed to create user record");
      }
    }

    // Update user profile
    await ctx.db.patch(existingUser._id, {
      ...args,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(existingUser._id);
  },
});

// Update notification preferences
export const updateNotificationSettings = mutation({
  args: {
    emailNotifications: v.optional(v.boolean()),
    orderStatusUpdates: v.optional(v.boolean()),
    marketingEmails: v.optional(v.boolean()),
    securityAlerts: v.optional(v.boolean()),
    smsNotifications: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    let existingUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!existingUser) {
      // Create user record if it doesn't exist (for legacy accounts)
      const userId = await ctx.db.insert("users", {
        name: identity.name,
        email: identity.email,
        tokenIdentifier: identity.subject,
        role: "forwarder", // Assume forwarder for legacy accounts
        createdAt: Date.now(),
      });
      existingUser = await ctx.db.get(userId);
      if (!existingUser) {
        throw new Error("Failed to create user record");
      }
    }

    // Merge with existing notification settings
    const currentSettings = existingUser.notificationSettings || {};
    const updatedSettings = {
      ...currentSettings,
      ...args,
    };

    await ctx.db.patch(existingUser._id, {
      notificationSettings: updatedSettings,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(existingUser._id);
  },
});

// Update user's last login timestamp
export const updateLastLogin = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        lastLoginAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return existingUser;
  },
});

// Get user's full profile with settings
export const getUserProfile = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    return user;
  },
});

// Update privacy settings
export const updatePrivacySettings = mutation({
  args: {
    profileVisibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
    allowMarketing: v.optional(v.boolean()),
    dataProcessingConsent: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    let existingUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!existingUser) {
      // Create user record if it doesn't exist
      const userId = await ctx.db.insert("users", {
        name: identity.name,
        email: identity.email,
        tokenIdentifier: identity.subject,
        role: "forwarder",
        createdAt: Date.now(),
      });
      existingUser = await ctx.db.get(userId);
      if (!existingUser) {
        throw new Error("Failed to create user record");
      }
    }

    await ctx.db.patch(existingUser._id, {
      ...args,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(existingUser._id);
  },
});

// Verify phone number for SMS 2FA
export const verifyPhoneNumber = mutation({
  args: {
    phoneNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    // In a real app, you'd integrate with SMS service like Twilio
    // For now, we'll just store the phone number as verified
    let existingUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!existingUser) {
      // Create user record if it doesn't exist
      const userId = await ctx.db.insert("users", {
        name: identity.name,
        email: identity.email,
        tokenIdentifier: identity.subject,
        role: "forwarder",
        createdAt: Date.now(),
      });
      existingUser = await ctx.db.get(userId);
      if (!existingUser) {
        throw new Error("Failed to create user record");
      }
    }

    await ctx.db.patch(existingUser._id, {
      phoneNumber: args.phoneNumber,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(existingUser._id);
  },
});
