/*
  # Add Delete Policy for Lab Results

  1. Security
    - Allow authenticated users to delete their own uploaded files
*/

-- Allow authenticated users to delete their own files
CREATE POLICY "Allow authenticated users to delete own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'lab-results' 
  AND (auth.uid() = owner)
);