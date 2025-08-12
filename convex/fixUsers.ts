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