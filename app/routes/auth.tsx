import { createClient } from '@supabase/supabase-js'
import type { Route } from "./+types/auth";

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return Response.json({ error: "Email and password required" }, { status: 400 });
    }

    // Sign in with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error || !data.session) {
      return Response.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Check user role
    const userRole = data.user.user_metadata?.role || 'customer';
    
    return Response.json({ 
      sessionId: data.session.access_token,
      user: {
        id: data.user.id,
        email: data.user.email,
        firstName: data.user.user_metadata?.first_name,
        lastName: data.user.user_metadata?.last_name,
        role: userRole
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return Response.json({ error: "Authentication failed" }, { status: 500 });
  }
}