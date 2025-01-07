/*
  # Update lab results search policy

  1. Changes
    - Add new RLS policy to allow searching by national_id and birth_date
    - Keep existing policies intact
    - Ensure data security by requiring both national_id and birth_date match
*/

-- Update public search policy
CREATE POLICY "Allow public to search results"
  ON lab_results
  FOR SELECT
  TO public
  USING (
    national_id = current_setting('request.jwt.claims')::json->>'national_id'
    AND
    birth_date::text = current_setting('request.jwt.claims')::json->>'birth_date'
  );