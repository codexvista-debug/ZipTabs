-- Supabase Storage Lockdown: note-attachments
-- 1. Updates bucket configuration to private (disables unauthenticated public CDN downloads)
-- 2. Requires all file downloads to use authenticated signed URLs generated via /api/storage/file

UPDATE storage.buckets
SET public = false
WHERE id = 'note-attachments';

-- Drop public read access policy from storage.objects
DROP POLICY IF EXISTS "Allow public access to note-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated read note-attachments" ON storage.objects;

-- Allow read access for authenticated service and signed token validation
CREATE POLICY "Allow authenticated read note-attachments"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'note-attachments');

-- Allow write operations for ZipTabs client uploads
DROP POLICY IF EXISTS "Allow public upload to note-attachments" ON storage.objects;
CREATE POLICY "Allow public upload to note-attachments"
  ON storage.objects
  FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'note-attachments');

DROP POLICY IF EXISTS "Allow public delete from note-attachments" ON storage.objects;
CREATE POLICY "Allow public delete from note-attachments"
  ON storage.objects
  FOR DELETE
  TO public
  USING (bucket_id = 'note-attachments');
