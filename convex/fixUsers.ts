import { mutation } from "./_generated/server";

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