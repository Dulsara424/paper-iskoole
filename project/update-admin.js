#!/usr/bin/env node
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@paper.lk';

console.log('SUPABASE_URL:', SUPABASE_URL);
console.log('ADMIN_EMAIL:', ADMIN_EMAIL);
console.log('SERVICE_ROLE_KEY present:', !!SUPABASE_SERVICE_ROLE_KEY);

if (!SUPABASE_URL) {
  console.error('Error: SUPABASE_URL is required');
  process.exit(1);
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY is required in .env file');
  console.error('Get this from your Supabase dashboard settings');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  try {
    console.log('\nUpdating role for user with email:', ADMIN_EMAIL);
    
    const { data, error } = await supabase.from('profiles').update({ role: 'admin' }).eq('email', ADMIN_EMAIL).select('*');
    
    if (error) {
      console.error('Error updating profile:', error.message);
      process.exit(1);
    }
    
    if (data && data.length > 0) {
      console.log('Successfully updated user to admin:', data[0]);
      console.log('\nPlease sign out and sign back in to see the Admin Dashboard.');
    } else {
      console.error('No user found with email:', ADMIN_EMAIL);
      process.exit(1);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

main();
