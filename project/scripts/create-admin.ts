#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Usage:
// 1) Create a .env file with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (and optionally ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_FULL_NAME)
// 2) Run: npx ts-node scripts/create-admin.ts

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@paper.lk';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeMePlease!123';
const ADMIN_FULL_NAME = process.env.ADMIN_FULL_NAME || 'Site Administrator';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('\nError: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be provided in the environment.');
  console.error('Create a .env file or export the variables and try again.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function findAuthUserByEmail(email: string) {
  // The Admin API in supabase-js v2 provides auth.admin.getUserById and auth.admin.listUsers
  // If listUsers isn't available we fallback to querying the auth.users table via SQL.
  try {
    // Try admin.listUsers (may not be present in older/newer clients)
    // @ts-ignore
    if (supabase.auth.admin && (supabase.auth.admin as any).listUsers) {
      // @ts-ignore
      const res = await (supabase.auth.admin as any).listUsers({ search: email });
      if (res?.data?.users && res.data.users.length > 0) return res.data.users[0];
    }
  } catch (e) {
    // ignore and fallback
  }

  // Fallback: query auth.users via SQL (requires service_role key)
  try {
    const { data, error } = await supabase
      .from('auth.users')
      .select('id, email')
      .eq('email', email)
      .limit(1)
      .maybeSingle();

    if (error) {
      // Some Supabase instances don't allow selecting from auth.users directly via the client.
      return null;
    }
    return data;
  } catch (err) {
    return null;
  }
}

async function createAuthUser(email: string, password: string, full_name: string) {
  try {
    // @ts-ignore - using admin.createUser which exists in many supabase-js versions
    const { data, error } = await (supabase.auth.admin as any).createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (error) {
      // If user already exists, return null and let caller handle
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

async function upsertProfile(userId: string, email: string, full_name: string) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, email, full_name, role: 'admin' }, { onConflict: 'id' })
    .select('id, email, role')
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function main() {
  console.log('Looking for existing auth user with email:', ADMIN_EMAIL);
  let authUser = await findAuthUserByEmail(ADMIN_EMAIL);

  if (!authUser) {
    console.log('No existing auth user found. Attempting to create one...');
    const res = await createAuthUser(ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_FULL_NAME);
    if (res.error) {
      console.error('Failed to create auth user via admin API:', res.error.message || res.error);
      console.error('You may need to create the user manually in Supabase Dashboard or ensure your SERVICE_ROLE key has admin privileges.');
      process.exit(1);
    }
    authUser = res.data?.user || res.data; // shape differs across versions
    if (!authUser) {
      console.error('User creation response did not include user info. Aborting.');
      process.exit(1);
    }
    console.log('Created auth user with id:', authUser.id);
  } else {
    console.log('Found auth user:', authUser.id);
  }

  try {
    const profile = await upsertProfile(authUser.id, ADMIN_EMAIL, ADMIN_FULL_NAME);
    console.log('Upserted profile:', profile);
    console.log('\nAdmin user is ready. Sign out and sign back into the app to pick up the new role.');
  } catch (err: any) {
    console.error('Failed to upsert profile:', err.message || err);
    console.error('If the profiles table references auth.users (foreign key), ensure an auth.user exists with the same id.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});