/*
  # Fix Profile Creation Trigger

  ## Problem
  The trigger function `handle_new_user()` was failing because it runs in the user's security context,
  but RLS policies require authentication which doesn't exist yet during signup.

  ## Solution
  Make the trigger function run with SECURITY DEFINER and bypass RLS by granting it the necessary permissions.
  The function will run with the permissions of the function owner (postgres), allowing it to insert into profiles.

  ## Changes
  1. Recreate the trigger function with proper security context
  2. Ensure it can bypass RLS when creating the initial profile
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Recreate function with proper security settings
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
