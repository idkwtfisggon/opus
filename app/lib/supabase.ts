import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side client with service key for admin operations  
const supabaseServiceKey = typeof process !== 'undefined' ? process.env.SUPABASE_SERVICE_KEY : null
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null

export type AuthUser = {
  id: string
  email: string
  user_metadata: {
    username?: string
    first_name?: string
    last_name?: string
    role?: string
    migrated_from_clerk?: boolean
    clerk_user_id?: string
  }
  created_at: string
  last_sign_in_at?: string
}