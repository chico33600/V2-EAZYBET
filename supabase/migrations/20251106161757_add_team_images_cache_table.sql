/*
  # Add Team Images Cache Table

  1. New Table
    - `team_images_cache`
      - `id` (uuid, primary key)
      - `team_name` (text, unique, normalized team name)
      - `badge_url` (text, nullable) - Team badge/logo URL
      - `banner_url` (text, nullable) - Team banner URL
      - `stadium_url` (text, nullable) - Stadium image URL
      - `source` (text) - Image source (wikimedia)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Purpose
    - Cache Wikimedia image URLs to avoid repeated API calls
    - Improve performance by reusing already fetched images
    - Store image URLs for team badges, banners, and stadiums

  3. Security
    - Enable RLS on table
    - Allow authenticated users to read cached images
    - Only allow system/service role to insert/update cache
*/

CREATE TABLE IF NOT EXISTS team_images_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name text UNIQUE NOT NULL,
  badge_url text,
  banner_url text,
  stadium_url text,
  source text DEFAULT 'wikimedia',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE team_images_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view team images cache"
  ON team_images_cache
  FOR SELECT
  USING (true);

CREATE INDEX IF NOT EXISTS idx_team_images_cache_team_name 
  ON team_images_cache(team_name);
