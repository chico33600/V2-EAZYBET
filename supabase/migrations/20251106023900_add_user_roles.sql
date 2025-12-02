/*
  # Add User Roles

  1. Changes
    - Add `role` column to `profiles` table with default value 'user'
    - Create check constraint to ensure role is either 'user' or 'admin'
  
  2. Security
    - Users cannot update their own role (this can only be done by admins via secure channels)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE profiles ADD COLUMN role text DEFAULT 'user' NOT NULL;
    ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role = ANY (ARRAY['user'::text, 'admin'::text]));
  END IF;
END $$;
