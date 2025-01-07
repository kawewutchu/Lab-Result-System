/*
  # Add delete permissions for lab results

  1. Changes
    - Add RLS policy for authenticated users to delete lab results
*/

-- Add policy for authenticated users to delete lab results
CREATE POLICY "Staff can delete results"
  ON lab_results
  FOR DELETE
  TO authenticated
  USING (true);