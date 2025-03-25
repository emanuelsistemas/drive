/*
  # Add storage bucket for file uploads

  1. Storage
    - Create a new storage bucket named 'files' for storing uploaded files
    - Enable public access to the bucket
    - Add storage policies for authenticated users to manage their files
*/

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('files', 'files', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies directly on storage.objects
CREATE POLICY "Allow authenticated uploads"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'files');

CREATE POLICY "Allow authenticated updates"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'files' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Allow authenticated deletes"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Allow public read access"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'files');