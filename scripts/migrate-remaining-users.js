import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jjdnkskwcmdndktrejws.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqZG5rc2t3Y21kbmRrdHJlandzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5MzExMjksImV4cCI6MjA3MTUwNzEyOX0.NSobF7wUisyvIUGi97bYLYhoJV_A8PJ-LlEHi7t99uU'
);

async function createSupabaseAccount(email, password, role) {
  console.log(`Creating Supabase account for ${email}...`);
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: role
      }
    }
  });
  
  if (error) {
    console.error(`Error creating ${email}:`, error.message);
    return null;
  }
  
  console.log(`✅ Created ${email} with ID: ${data.user?.id}`);
  return data.user?.id;
}

async function updateConvexRecord(email, newSupabaseId) {
  console.log(`Updating Convex record for ${email} to use Supabase ID: ${newSupabaseId}`);
  
  try {
    const response = await fetch('http://localhost:5173/api/migrate-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, newSupabaseId })
    });
    
    const result = await response.json();
    if (response.ok) {
      console.log(`✅ Updated ${email} database record`);
    } else {
      console.error(`❌ Failed to update ${email}:`, result.error);
    }
  } catch (error) {
    console.error(`❌ Error updating ${email}:`, error.message);
  }
}

async function migrateRemainingUsers() {
  console.log('🚀 Starting complete user migration...\n');
  
  // Create aredsnuff@gmail.com account (customer)
  const aredsnuffId = await createSupabaseAccount('aredsnuff@gmail.com', 'password123', 'customer');
  if (aredsnuffId) {
    await updateConvexRecord('aredsnuff@gmail.com', aredsnuffId);
  }
  
  console.log('');
  
  // Create benedickels@gmail.com account (staff)
  const benedickelsId = await createSupabaseAccount('benedickels@gmail.com', 'password123', 'staff');  
  if (benedickelsId) {
    await updateConvexRecord('benedickels@gmail.com', benedickelsId);
  }
  
  console.log('\n🎉 Migration complete! All accounts now use Supabase authentication.');
}

migrateRemainingUsers().catch(console.error);