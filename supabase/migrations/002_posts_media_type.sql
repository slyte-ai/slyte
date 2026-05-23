-- Add media_type to posts (photo | video | short)
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS media_type TEXT NOT NULL DEFAULT 'photo'
  CHECK (media_type IN ('photo', 'video', 'short'));

-- Recreate feed view with media_type
CREATE OR REPLACE VIEW public.feed_posts AS
SELECT
  p.id,
  p.user_id,
  p.image_url,
  p.caption,
  p.location,
  p.likes_count,
  p.created_at,
  p.media_type,
  u.username,
  u.avatar_url,
  u.full_name
FROM public.posts p
INNER JOIN public.users u ON u.id = p.user_id
ORDER BY p.created_at DESC;
