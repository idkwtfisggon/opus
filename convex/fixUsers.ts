import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Fix all existing users to be forwarders
export const makeAllUsersForwarders = mutation({
  handler: async (ctx) => {
    // Get all users
    const users = await ctx.db.query("users").collect();
    
    console.log(`Found ${users.length} users to update`);
    
    for (const user of users) {
      if (user.role !== "forwarder") {
        await ctx.db.patch(user._id, {
          role: "forwarder",
          updatedAt: Date.now(),
        });
        console.log(`Updated user ${user._id} (${user.email}) to forwarder role`);
      }
    }
    
    return { updated: users.length, message: "All users updated to forwarder role" };
  },
});

// Debug function to check users and forwarders
export const debugUsers = mutation({
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const forwarders = await ctx.db.query("forwarders").collect();
    
    console.log("=== USERS ===");
    for (const user of users) {
      console.log(`User: ${user._id}, Email: ${user.email}, TokenId: ${user.tokenIdentifier}, Role: ${user.role}`);
    }
    
    console.log("=== FORWARDERS ===");
    for (const forwarder of forwarders) {
      console.log(`Forwarder: ${forwarder._id}, UserId: ${forwarder.userId}, BusinessName: ${forwarder.businessName}`);
    }
    
    return { users: users.length, forwarders: forwarders.length };
  },
});

// Create forwarder records for users who don't have them
export const createForwarderRecordsForUsers = mutation({
  handler: async (ctx) => {
    // Get all users with forwarder role
    const forwarderUsers = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), "forwarder"))
      .collect();
    
    console.log(`Found ${forwarderUsers.length} forwarder users`);
    
    let created = 0;
    
    for (const user of forwarderUsers) {
      // Check if forwarder record exists
      const existingForwarder = await ctx.db
        .query("forwarders")
        .withIndex("by_user", (q) => q.eq("userId", user.tokenIdentifier))
        .first();
      
      if (!existingForwarder) {
        // Create forwarder record
        const forwarderId = await ctx.db.insert("forwarders", {
          userId: user.tokenIdentifier,
          businessName: user.name || "My Business",
          contactEmail: user.email || "",
          contactPhone: user.phoneNumber || "",
          timezone: "Asia/Singapore",
          maxParcelsPerMonth: 1000,
          maxParcelWeight: 30,
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        
        console.log(`Created forwarder record ${forwarderId} for user ${user._id} (${user.email})`);
        created++;
      }
    }
    
    return { created, message: `Created ${created} forwarder records` };
  },
});

// Fix the forwarder record with all the data to use the Supabase ID
export const fixForwarderUserId = mutation({
  handler: async (ctx) => {
    // Find the forwarder with the old Clerk ID that has all the data
    const oldForwarder = await ctx.db
      .query("forwarders")
      .filter((q) => q.eq(q.field("userId"), "user_30t46oUNZB9yniLtgUDOcqa9sCS"))
      .first();
    
    if (!oldForwarder) {
      return { success: false, message: "Old forwarder record not found" };
    }
    
    console.log(`Found old forwarder: ${oldForwarder._id} with userId: ${oldForwarder.userId}`);
    
    // Update it to use the Supabase ID
    await ctx.db.patch(oldForwarder._id, {
      userId: "333e6599-2839-4eb8-b662-0b894fba37b2",
      contactEmail: "benongyr@gmail.com",
      updatedAt: Date.now(),
    });
    
    console.log(`Updated forwarder ${oldForwarder._id} to use Supabase ID`);
    
    // Delete the empty new forwarder record
    const newForwarder = await ctx.db
      .query("forwarders")
      .filter((q) => q.eq(q.field("businessName"), "Ben Forward Co"))
      .first();
    
    if (newForwarder) {
      await ctx.db.delete(newForwarder._id);
      console.log(`Deleted empty forwarder record ${newForwarder._id}`);
    }
    
    return { success: true, message: "Forwarder userId updated to Supabase ID" };
  },
});

// Fix aredsnuff account to use Supabase ID
export const fixAredsnuffAccount = mutation({
  handler: async (ctx) => {
    // Find the aredsnuff user with old Clerk ID
    const oldUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), "aredsnuff@gmail.com"))
      .first();
    
    if (!oldUser) {
      return { success: false, message: "aredsnuff user not found" };
    }
    
    console.log(`Found aredsnuff user: ${oldUser._id} with tokenId: ${oldUser.tokenIdentifier}`);
    
    // Update to use a new Supabase ID (you'll need to get this after creating the account)
    // For now, let's use a placeholder - you'll need to replace this with the actual Supabase ID
    const newSupabaseId = "PLACEHOLDER_SUPABASE_ID"; // Replace with actual ID
    
    await ctx.db.patch(oldUser._id, {
      tokenIdentifier: newSupabaseId,
      updatedAt: Date.now(),
    });
    
    console.log(`Updated aredsnuff user ${oldUser._id} to use Supabase ID: ${newSupabaseId}`);
    
    return { success: true, message: "aredsnuff account updated to Supabase ID" };
  },
});

// Migrate any user to Supabase ID
export const migrateUserToSupabase = mutation({
  args: {
    email: v.string(),
    newSupabaseId: v.string()
  },
  handler: async (ctx, { email, newSupabaseId }) => {
    // Find the user by email
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), email))
      .first();
    
    if (!user) {
      throw new Error(`User ${email} not found`);
    }
    
    console.log(`Migrating user ${user._id} (${email}) to Supabase ID: ${newSupabaseId}`);
    
    // Update user record
    await ctx.db.patch(user._id, {
      tokenIdentifier: newSupabaseId,
      updatedAt: Date.now(),
    });
    
    // If this is a staff member, update staff record too
    const staff = await ctx.db
      .query("staff")
      .filter((q) => q.eq(q.field("userId"), user.tokenIdentifier))
      .first();
      
    if (staff) {
      console.log(`Updating staff record for ${email}`);
      await ctx.db.patch(staff._id, {
        userId: newSupabaseId,
        updatedAt: Date.now(),
      });
    }
    
    console.log(`✅ Successfully migrated ${email} to Supabase`);
    return { success: true, message: `Migrated ${email} to Supabase` };
  },
});

// Update staff record to use Supabase ID
export const migrateStaffToSupabase = mutation({
  args: {
    email: v.string(),
    newSupabaseId: v.string()
  },
  handler: async (ctx, { email, newSupabaseId }) => {
    // Find staff record by email
    const staff = await ctx.db
      .query("staff")
      .filter((q) => q.eq(q.field("email"), email))
      .first();
    
    if (!staff) {
      throw new Error(`Staff member ${email} not found`);
    }
    
    console.log(`Updating staff ${staff._id} (${email}) to Supabase ID: ${newSupabaseId}`);
    
    await ctx.db.patch(staff._id, {
      userId: newSupabaseId,
      updatedAt: Date.now(),
    });
    
    console.log(`✅ Successfully updated staff ${email} to Supabase`);
    return { success: true, message: `Updated staff ${email} to Supabase` };
  },
});