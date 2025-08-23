import type { Route } from "./+types/auth";

const EXTENSION_ORIGIN = process.env.EXTENSION_ORIGIN || "chrome-extension://*";
const BASE_HEADERS = {
  "Access-Control-Allow-Origin": EXTENSION_ORIGIN,
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
    if (!process.env.CLERK_SECRET_KEY) {
      return new Response(
        JSON.stringify({ error: "Server misconfigured" }),
        { status: 500, headers }
      );
    }

    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers }
      );
    }

    const sessionId = authHeader.slice(7).trim();
    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: "Invalid session" }),
        { status: 401, headers }
      );
    }

    const clerkResponse = await fetch(`https://api.clerk.com/v1/sessions/${sessionId}`, {
      headers: {
        "Authorization": `Bearer ${process.env.CLERK_SECRET_KEY}`
      }
    });

    if (!clerkResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Invalid session" }),
        { status: 401, headers }
      );
    }

    const sessionData = await clerkResponse.json();

    if (sessionData.status === "active") {
      return new Response(
        JSON.stringify({ ok: true, userId: sessionData.user_id }),
        { status: 200, headers }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid session" }),
      { status: 401, headers }
    );

  } catch (error) {
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