-- Create public media bucket for post uploads (run once in Supabase SQL Editor)
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload to their own posts folder
CREATE POLICY "Users can upload post media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = 'posts'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Anyone can view post media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'media');

CREATE POLICY "Users can delete own post media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = 'posts'
  AND (storage.foldername(name))[2] = auth.uid()::text
);
