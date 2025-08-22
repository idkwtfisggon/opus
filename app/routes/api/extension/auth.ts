import { getAuth } from "@clerk/react-router/ssr.server";
import { createClerkClient } from "@clerk/clerk-sdk-node";
import type { Route } from "./+types/auth";

export async function loader({ request }: Route.LoaderArgs) {
  try {
    // Add CORS headers specifically for extension
    const headers = new Headers({
      "Access-Control-Allow-Origin": "chrome-extension://*", // Allow extension
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
      "Content-Type": "application/json"
    });

    // Handle preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 200, headers });
    }

    // Get user from Clerk
    const { userId } = await getAuth({ request });

    if (!userId) {
      return new Response(
        JSON.stringify({ authenticated: false, error: "Not authenticated" }),
        { status: 401, headers }
      );
    }

    // Get user from Clerk API
    const clerkUser = await createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY
    }).users.getUser(userId);

    // Check role from user metadata
    const userRole = clerkUser.publicMetadata?.role || 'customer';

    // Only allow customers
    if (userRole !== 'customer') {
      return new Response(
        JSON.stringify({
          authenticated: false,
          error: `Access denied. Only customer accounts can use this extension. Your role: ${userRole}`
        }),
        { status: 403, headers }
      );
    }

    return new Response(
      JSON.stringify({
        authenticated: true,
        user: {
          id: userId,
          email: clerkUser.primaryEmailAddress?.emailAddress,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
          role: userRole
        }
      }),
      { headers }
    );

  } catch (error) {
    console.error("Extension auth error:", error);
    return new Response(
      JSON.stringify({ authenticated: false, error: "Authentication failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// Handle OPTIONS requests for CORS
export async function action({ request }: Route.ActionArgs) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Credentials": "true",
      },
    });
  }
  
  return new Response(
    JSON.stringify({ error: "Method not allowed" }), 
    { status: 405, headers: { "Content-Type": "application/json" } }
  );
}