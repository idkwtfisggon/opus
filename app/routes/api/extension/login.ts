import type { Route } from "./+types/login";

const EXTENSION_ORIGIN = process.env.EXTENSION_ORIGIN || "chrome-extension://*";
const BASE_HEADERS = {
  "Access-Control-Allow-Origin": EXTENSION_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
} as const;

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
    if (!process.env.CLERK_SECRET_KEY) {
      return new Response(
        JSON.stringify({ error: "Server misconfigured" }),
        { status: 500, headers }
      );
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email and password required" }),
        { status: 400, headers }
      );
    }

    const clerkResponse = await fetch("https://api.clerk.com/v1/sign_ins", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.CLERK_SECRET_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        identifier: email,
        password: password
      })
    });

    if (!clerkResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Invalid credentials" }),
        { status: 401, headers }
      );
    }

    const signInData = await clerkResponse.json();

    if (signInData.status === "complete" && signInData.created_session_id) {
      return new Response(
        JSON.stringify({ sessionId: signInData.created_session_id }),
        { status: 200, headers }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid credentials" }),
      { status: 401, headers }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Authentication failed" }),
      { status: 500, headers }
    );
  }
}