import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Create a setup intent for adding a payment method
export const createSetupIntent = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.runQuery(api.users.getUserByToken, {
      tokenIdentifier: identity.subject,
    });

    if (!user) throw new Error("User not found");

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      try {
        if (!process.env.STRIPE_SECRET_KEY) {
          throw new Error("STRIPE_SECRET_KEY environment variable is not set");
        }

        const customerData = new URLSearchParams();
        customerData.append("metadata[convexUserId]", user._id);

        if (user.email && user.email.trim()) {
          customerData.append("email", user.email.trim());
        }

        const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
        if (fullName) {
          customerData.append("name", fullName);
        }

        if (user.phoneNumber && user.phoneNumber.trim()) {
          customerData.append("phone", user.phoneNumber.trim());
        }

        const response = await fetch("https://api.stripe.com/v1/customers", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.STRIPE_SECRET_KEY}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: customerData,
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Stripe API error: ${error}`);
        }

        const customer = await response.json();

        await ctx.runMutation(api.users.updateUser, {
          userId: user._id,
          updates: { stripeCustomerId: customer.id },
        });

        customerId = customer.id;
      } catch (error: any) {
        console.error("Error creating Stripe customer:", error);
        throw new Error(`Failed to create Stripe customer: ${error.message || error}`);
      }
    }

    try {
      if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error("STRIPE_SECRET_KEY environment variable is not set");
      }

      const response = await fetch("https://api.stripe.com/v1/setup_intents", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.STRIPE_SECRET_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `customer=${encodeURIComponent(customerId!)}&payment_method_types[]=card&usage=off_session`,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Stripe API error: ${error}`);
      }

      const setupIntent = await response.json();

      return {
        clientSecret: setupIntent.client_secret,
        setupIntentId: setupIntent.id,
      };
    } catch (error: any) {
      console.error("Error creating setup intent:", error);
      throw new Error(`Failed to create setup intent: ${error.message || error}`);
    }
  },
});

// Get payment methods for a customer
export const getPaymentMethods = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.runQuery(api.users.getUserByToken, {
      tokenIdentifier: identity.subject,
    });

    if (!user || !user.stripeCustomerId) return [];

    try {
      if (!process.env.STRIPE_SECRET_KEY) {
        return [];
      }

      const response = await fetch(`https://api.stripe.com/v1/payment_methods?customer=${user.stripeCustomerId}&type=card`, {
        headers: {
          "Authorization": `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        },
      });

      if (!response.ok) {
        console.error("Error fetching payment methods:", await response.text());
        return [];
      }

      const data = await response.json();

      return data.data.map((pm: any) => ({
        id: pm.id,
        brand: pm.card?.brand || "unknown",
        last4: pm.card?.last4 || "0000",
        expMonth: pm.card?.exp_month || 1,
        expYear: pm.card?.exp_year || 2025,
        isDefault: pm.id === user.defaultPaymentMethodId,
        holderName: pm.billing_details?.name || "Unknown",
      }));
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      return [];
    }
  },
});

// Set default payment method
export const setDefaultPaymentMethod = action({
  args: {
    paymentMethodId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.runQuery(api.users.getUserByToken, {
      tokenIdentifier: identity.subject,
    });

    if (!user || !user.stripeCustomerId) throw new Error("User not found");

    try {
      if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error("STRIPE_SECRET_KEY environment variable is not set");
      }

      const response = await fetch(`https://api.stripe.com/v1/customers/${user.stripeCustomerId}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.STRIPE_SECRET_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          "invoice_settings[default_payment_method]": args.paymentMethodId,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Stripe API error: ${error}`);
      }

      await ctx.runMutation(api.users.updateUser, {
        userId: user._id,
        updates: { defaultPaymentMethodId: args.paymentMethodId },
      });

      return { success: true };
    } catch (error: any) {
      console.error("Error setting default payment method:", error);
      throw new Error(`Failed to set default payment method: ${error.message || error}`);
    }
  },
});

// Delete a payment method
export const deletePaymentMethod = action({
  args: {
    paymentMethodId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.runQuery(api.users.getUserByToken, {
      tokenIdentifier: identity.subject,
    });

    if (!user) throw new Error("User not found");

    try {
      if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error("STRIPE_SECRET_KEY environment variable is not set");
      }

      const response = await fetch(`https://api.stripe.com/v1/payment_methods/${args.paymentMethodId}/detach`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.STRIPE_SECRET_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Stripe API error: ${error}`);
      }

      if (user.defaultPaymentMethodId === args.paymentMethodId) {
        await ctx.runMutation(api.users.updateUser, {
          userId: user._id,
          updates: { defaultPaymentMethodId: undefined },
        });
      }

      return { success: true };
    } catch (error: any) {
      console.error("Error deleting payment method:", error);
      throw new Error(`Failed to delete payment method: ${error.message || error}`);
    }
  },
});