import type { ActionFunction } from "react-router";
import { getAuth } from "@clerk/react-router/ssr.server";
import type { Route } from "./+types/auth";

export async function loader({ request }: Route.LoaderArgs) {
  try {
    // Add CORS headers for extension
    const headers = new Headers({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
    });

    // Handle preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 200, headers });
    }

    // Get the user ID from Clerk
    const { userId } = await getAuth({ request });
    
    if (!userId) {
      return new Response(
        JSON.stringify({ authenticated: false, error: "Not authenticated" }),
        { status: 401, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    // TODO: Get user data from your Convex database
    // For now, we'll return a basic response
    // You'll need to query your users table here
    
    return new Response(
      JSON.stringify({ 
        authenticated: true, 
        user: { 
          id: userId,
          role: "customer" // This should come from your database
        }
      }),
      { headers: { ...headers, "Content-Type": "application/json" } }
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