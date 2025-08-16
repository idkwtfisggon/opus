import { httpRouter } from "convex/server";
import { paymentWebhook } from "./subscriptions";
import { httpAction } from "./_generated/server";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

export const chat = httpAction(async (ctx, req) => {
  // Extract the `messages` from the body of the request
  const { messages } = await req.json();

  const result = streamText({
    model: openai("gpt-4o"),
    messages,
    async onFinish({ text }) {
      // implement your own logic here, e.g. for storing messages
      // or recording token usage
      console.log(text);
    },
  });

  // Respond with the stream
  return result.toDataStreamResponse({
    headers: {
      "Access-Control-Allow-Origin": process.env.FRONTEND_URL || "http://localhost:5173",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
      Vary: "origin",
    },
  });
});

const http = httpRouter();

http.route({
  path: "/api/chat",
  method: "POST",
  handler: chat,
});

http.route({
  path: "/api/chat",
  method: "OPTIONS",
  handler: httpAction(async (_, request) => {
    // Make sure the necessary headers are present
    // for this to be a valid pre-flight request
    const headers = request.headers;
    if (
      headers.get("Origin") !== null &&
      headers.get("Access-Control-Request-Method") !== null &&
      headers.get("Access-Control-Request-Headers") !== null
    ) {
      return new Response(null, {
        headers: new Headers({
          "Access-Control-Allow-Origin": process.env.FRONTEND_URL || "http://localhost:5173",
          "Access-Control-Allow-Methods": "POST",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Max-Age": "86400",
        }),
      });
    } else {
      return new Response();
    }
  }),
});

http.route({
  path: "/api/auth/webhook",
  method: "POST",
  handler: httpAction(async (_, request) => {
    // Make sure the necessary headers are present
    // for this to be a valid pre-flight request
    const headers = request.headers;
    if (
      headers.get("Origin") !== null &&
      headers.get("Access-Control-Request-Method") !== null &&
      headers.get("Access-Control-Request-Headers") !== null
    ) {
      return new Response(null, {
        headers: new Headers({
          "Access-Control-Allow-Origin": process.env.FRONTEND_URL || "http://localhost:5173",
          "Access-Control-Allow-Methods": "POST",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Max-Age": "86400",
        }),
      });
    } else {
      return new Response();
    }
  }),
});

http.route({
  path: "/payments/webhook",
  method: "POST",
  handler: paymentWebhook,
});

// Browser Extension API - Get shipping options for checkout page
http.route({
  path: "/api/extension/shipping-options",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const { fromCountry, fromCountryCode, fromState, toCountry, weight, declaredValue, sortBy } = await request.json();
      
      // Validate required fields
      if (!fromCountry || !toCountry || !weight) {
        return Response.json({ error: "Missing required fields: fromCountry, toCountry, weight" }, { status: 400 });
      }

      // Use the same search function as the customer dashboard  
      const { api } = await import("./_generated/api");
      const shippingOptions = await ctx.runQuery(api.customerOrders.searchShippingOptions, {
        fromCountry,
        fromCountryCode: fromCountryCode || fromCountry,
        fromState,
        toCountry,
        weight: parseFloat(weight),
        declaredValue: parseFloat(declaredValue) || 0,
        sortBy: sortBy || "distance",
      });

      return Response.json({
        success: true,
        options: shippingOptions.map((option: any) => ({
          id: option.rateId,
          forwarder: option.forwarder.name,
          warehouse: `${option.warehouse.city}, ${option.warehouse.country}`,
          service: option.service.name,
          courier: option.courier.name,
          price: option.pricing.totalPrice,
          currency: option.pricing.currency,
          estimatedDays: `${option.delivery.estimatedDaysMin}-${option.delivery.estimatedDaysMax}`,
          availability: option.availability.status,
          warehouseAddress: `${option.warehouse.name}\n${option.warehouse.city}, ${option.warehouse.state} ${option.warehouse.country}`,
        }))
      }, {
        headers: {
          "Access-Control-Allow-Origin": "*", // Allow all origins for browser extension
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Content-Type": "application/json",
        },
      });

    } catch (error) {
      console.error("Extension API error:", error);
      return Response.json({ error: "Internal server error" }, { 
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS", 
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        }
      });
    }
  }),
});

// CORS preflight for extension API
http.route({
  path: "/api/extension/shipping-options",
  method: "OPTIONS",
  handler: httpAction(async (_, request) => {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }),
});

// Log that routes are configured
console.log("HTTP routes configured");

// Convex expects the router to be the default export of `convex/http.js`.
export default http;
