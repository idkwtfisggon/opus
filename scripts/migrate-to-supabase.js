import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// Initialize Supabase with service key for admin operations
const supabaseUrl = 'https://jjdnkskwcmdndktrejws.supabase.co';
const supabaseServiceKey = 'sb_secret_zGP_44OTAwRaCdoWPNJmSg_mvSg0aJy';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Clerk credentials
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

async function fetchClerkUsers() {
  console.log('Fetching users from Clerk...');
  
  const response = await fetch('https://api.clerk.com/v1/users', {
    headers: {
      'Authorization': `Bearer ${CLERK_SECRET_KEY}`
    }
  });
  
  if (!response.ok) {
    throw new Error(`Clerk API error: ${response.status}`);
  }
  
  return await response.json();
}

async function createUserProfile(user) {
  const email = user.email_addresses[0]?.email_address;
  if (!email) return null;

  // Determine role from Clerk metadata or username
  let role = 'customer'; // default
  if (user.username === 'workerben' || user.username?.includes('staff')) {
    role = 'staff';
  } else if (user.public_metadata?.role) {
    role = user.public_metadata.role;
  }

  const userData = {
    clerk_user_id: user.id,
    email: email,
    username: user.username,
    first_name: user.first_name,
    last_name: user.last_name,
    role: role,
    profile_image_url: user.profile_image_url,
    created_at: new Date(user.created_at).toISOString(),
    updated_at: new Date(user.updated_at).toISOString(),
    last_sign_in_at: user.last_sign_in_at ? new Date(user.last_sign_in_at).toISOString() : null,
    password_enabled: user.password_enabled,
    public_metadata: user.public_metadata || {},
    private_metadata: user.private_metadata || {}
  };

  return userData;
}

async function migrateUsers() {
  try {
    console.log('Starting migration...');
    
    // Fetch all users from Clerk
    const clerkUsers = await fetchClerkUsers();
    console.log(`Found ${clerkUsers.length} users in Clerk`);
    
    // Process each user
    for (const clerkUser of clerkUsers) {
      const userData = await createUserProfile(clerkUser);
      if (!userData) {
        console.log(`Skipping user ${clerkUser.id} - no email`);
        continue;
      }
      
      console.log(`Migrating user: ${userData.email} (${userData.role})`);
      
      // Create auth user first (with Supabase Auth)
      const { data: authUser, error: signUpError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: 'temp_password_123', // They'll need to reset
        email_confirm: true,
        user_metadata: {
          username: userData.username,
          first_name: userData.first_name,
          last_name: userData.last_name,
          role: userData.role,
          migrated_from_clerk: true,
          clerk_user_id: userData.clerk_user_id
        }
      });
      
      if (signUpError) {
        console.error(`Failed to create auth user for ${userData.email}:`, signUpError);
        continue;
      }
      
      console.log(`✅ Created user: ${userData.email} with role ${userData.role}`);
    }
    
    console.log('Migration completed!');
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Run migration
migrateUsers();