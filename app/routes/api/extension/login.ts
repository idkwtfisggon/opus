import { createClient } from '@supabase/supabase-js'
import type { Route } from "./+types/login";

const BASE_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
} as const;

export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers(BASE_HEADERS);
  
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers });
  }
  
  // Only allow GET requests in loader
  if (request.method === "GET") {
    return new Response(
      JSON.stringify({ error: "This endpoint only accepts POST requests" }),
      { status: 405, headers }
    );
  }
  
  return new Response(
    JSON.stringify({ error: "Method not allowed" }),
    { status: 405, headers }
  );
}

export async function action({ request }: Route.ActionArgs) {
  const headers = new Headers(BASE_HEADERS);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers });
  }

  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers }
    );
  }

  try {
    const supabase = createClient(
      'https://jjdnkskwcmdndktrejws.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqZG5rc2t3Y21kbmRrdHJlandzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5MzExMjksImV4cCI6MjA3MTUwNzEyOX0.NSobF7wUisyvIUGi97bYLYhoJV_A8PJ-LlEHi7t99uU'
    );

    const body = await request.json();
    console.log('Login attempt received:', JSON.stringify(body));
    const { email, password } = body;

    if (!email || !password) {
      console.log('Missing credentials:', { email: !!email, password: !!password });
      return new Response(
        JSON.stringify({ error: "Email and password required" }),
        { status: 400, headers }
      );
    }

    console.log('Attempting login for:', email, 'password length:', password?.length);

    // Sign in with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error || !data.session) {
      return new Response(
        JSON.stringify({ error: "Invalid credentials" }),
        { status: 401, headers }
      );
    }

    // Hard-code your role since you're a forwarder
    let userRole = 'forwarder';
    
    return new Response(
      JSON.stringify({ 
        sessionId: data.session.access_token,
        user: {
          id: data.user.id,
          email: data.user.email,
          firstName: data.user.user_metadata?.first_name,
          lastName: data.user.user_metadata?.last_name,
          role: userRole
        }
      }),
      { status: 200, headers }
    );

  } catch (error) {
    console.error('Extension login error:', error);
    return new Response(
      JSON.stringify({ error: "Authentication failed" }),
      { status: 500, headers }
    );
  }
}