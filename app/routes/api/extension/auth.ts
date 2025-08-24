import { createClient } from '@supabase/supabase-js'
import type { Route } from "./+types/auth";

const BASE_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
} as const;

export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers(BASE_HEADERS);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers });
  }

  try {
    const supabase = createClient(
      'https://jjdnkskwcmdndktrejws.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqZG5rc2t3Y21kbmRrdHJlandzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5MzExMjksImV4cCI6MjA3MTUwNzEyOX0.NSobF7wUisyvIUGi97bYLYhoJV_A8PJ-LlEHi7t99uU'
    );

    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers }
      );
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Invalid session" }),
        { status: 401, headers }
      );
    }

    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid session" }),
        { status: 401, headers }
      );
    }

    // Allow all user roles
    const userRole = user.user_metadata?.role || 'forwarder';

    return new Response(
      JSON.stringify({ 
        ok: true, 
        userId: user.id,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.user_metadata?.first_name,
          lastName: user.user_metadata?.last_name,
          role: userRole
        }
      }),
      { status: 200, headers }
    );

  } catch (error) {
    console.error('Extension auth error:', error);
    return new Response(
      JSON.stringify({ error: "Authentication failed" }),
      { status: 500, headers }
    );
  }
}

export async function action({ request }: Route.ActionArgs) {
  const headers = new Headers(BASE_HEADERS);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers });
  }

  return new Response(
    JSON.stringify({ error: "Method not allowed" }),
    { status: 405, headers }
  );
}