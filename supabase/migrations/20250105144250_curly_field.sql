/*
  # Create Lab Results System Schema

  1. New Tables
    - `lab_results`
      - `id` (uuid, primary key)
      - `created_at` (timestamp with time zone)
      - `birth_date` (date, not null)
      - `national_id` (text, not null)
      - `file_path` (text, not null)
      - `uploaded_by` (uuid, references auth.users)

  2. Security
    - Enable RLS on `lab_results` table
    - Add policies for:
      - Staff can insert new results
      - Staff can view all results
      - Public can view their own results using birth_date and national_id
*/

CREATE TABLE IF NOT EXISTS lab_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  birth_date date NOT NULL,
  national_id text NOT NULL,
  file_path text NOT NULL,
  uploaded_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;

-- Staff can insert new results
CREATE POLICY "Staff can insert results"
  ON lab_results
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Staff can view all results
CREATE POLICY "Staff can view all results"
  ON lab_results
  FOR SELECT
  TO authenticated
  USING (true);

-- Public can view their own results
CREATE POLICY "Public can view own results"
  ON lab_results
  FOR SELECT
  TO anon
  USING (
    birth_date::text = current_setting('request.jwt.claims')::json->>'birth_date'
    AND
    national_id = current_setting('request.jwt.claims')::json->>'national_id'
  );