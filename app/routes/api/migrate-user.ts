import { fetchMutation } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import type { Route } from "./+types/migrate-user";

export async function action({ request }: Route.ActionArgs) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS", 
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers });
  }

  try {
    const { email, newSupabaseId } = await request.json();
    
    console.log(`Migrating ${email} to Supabase ID: ${newSupabaseId}`);
    
    // Update user record
    await fetchMutation(api.fixUsers.migrateUserToSupabase, { 
      email, 
      newSupabaseId 
    });
    
    return new Response(JSON.stringify({ success: true }), { status: 200, headers });
  } catch (error) {
    console.error('Migration error:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { status: 500, headers }
    );
  }
}