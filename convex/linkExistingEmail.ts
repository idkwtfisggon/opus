import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Manually link an existing Mailgun email to a Supabase user ID
export const linkExistingEmailToUser = mutation({
  args: {
    supabaseUserId: v.string(),
    mailgunEmail: v.string(),
    realEmail: v.string(),
  },
  handler: async (ctx, { supabaseUserId, mailgunEmail, realEmail }) => {
    // Check if this email address already exists
    const existing = await ctx.db
      .query("customerEmailAddresses")
      .withIndex("by_email_address", (q) => q.eq("emailAddress", mailgunEmail))
      .first();

    if (existing) {
      // Update the existing record to point to the new Supabase user ID
      await ctx.db.patch(existing._id, {
        customerId: supabaseUserId,
        realEmail: realEmail,
      });
      return existing;
    }

    // Create new customer email record
    const emailId = await ctx.db.insert("customerEmailAddresses", {
      customerId: supabaseUserId,
      emailAddress: mailgunEmail,
      realEmail: realEmail,
      isActive: true,
      createdAt: Date.now(),
      totalEmailsReceived: 0,
      totalEmailsForwarded: 0,
    });

    return await ctx.db.get(emailId);
  },
});

// Migrate existing emails to new customer ID
export const migrateEmailsToNewCustomerId = mutation({
  args: {
    oldCustomerId: v.string(),
    newCustomerId: v.string(),
  },
  handler: async (ctx, { oldCustomerId, newCustomerId }) => {
    // Get all emails for the old customer ID
    const emails = await ctx.db
      .query("emailMessages")
      .withIndex("by_customer", (q) => q.eq("customerId", oldCustomerId))
      .collect();

    // Update each email to use the new customer ID
    for (const email of emails) {
      await ctx.db.patch(email._id, {
        customerId: newCustomerId,
      });
    }

    return { migratedCount: emails.length };
  },
});