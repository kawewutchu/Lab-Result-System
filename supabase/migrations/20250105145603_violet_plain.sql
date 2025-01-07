/*
  # Setup Storage Policies for Lab Results

  1. Security
    - Allow authenticated users to upload files to lab-results bucket
    - Allow public access to view files in lab-results bucket
*/

-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'lab-results');

-- Allow public access to view files
CREATE POLICY "Allow public to view files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'lab-results');