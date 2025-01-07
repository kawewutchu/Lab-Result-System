/*
  # Create Storage Bucket for Lab Results

  1. Storage Setup
    - Create storage bucket for lab results
    - Set public bucket access
*/

-- Create bucket for lab results
INSERT INTO storage.buckets (id, name, public)
VALUES (
  'lab-results',
  'Lab Results Storage',
  true
)
ON CONFLICT (id) DO NOTHING;