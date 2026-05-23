-- Migration: unified posts + comments (run on existing projects)
-- WARNING: drops legacy tables/views. Back up data first.

DROP VIEW IF EXISTS public.feed_posts CASCADE;
DROP TRIGGER IF EXISTS on_like_change ON public.likes;
DROP TABLE IF EXISTS public.likes CASCADE;

-- Rename users -> profiles if present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    ALTER TABLE public.users RENAME TO profiles;
    ALTER TABLE public.profiles RENAME COLUMN avatar_url TO profile_picture_url;
  END IF;
END $$;

-- Rebuild posts to unified shape
CREATE TABLE IF NOT EXISTS public.posts_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  content_url TEXT NOT NULL,
  caption TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL CHECK (type IN ('photo', 'video', 'short')),
  likes_count INTEGER NOT NULL DEFAULT 0 CHECK (likes_count >= 0)
);

-- Copy from old posts when columns exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'image_url') THEN
    INSERT INTO public.posts_new (id, created_at, user_id, content_url, caption, type, likes_count)
    SELECT
      id,
      COALESCE(created_at, NOW()),
      user_id,
      COALESCE(image_url, content_url, ''),
      COALESCE(caption, ''),
      COALESCE(media_type, type, 'photo'),
      COALESCE(likes_count, 0)
    FROM public.posts
    ON CONFLICT (id) DO NOTHING;
    DROP TABLE public.posts CASCADE;
    ALTER TABLE public.posts_new RENAME TO posts;
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'posts') THEN
    ALTER TABLE public.posts_new RENAME TO posts;
  ELSE
    DROP TABLE public.posts_new;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(trim(body)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments (post_id);

CREATE OR REPLACE VIEW public.feed_posts AS
SELECT
  p.id,
  p.created_at,
  p.user_id,
  p.content_url,
  p.caption,
  p.type,
  p.likes_count,
  pr.username,
  pr.full_name,
  pr.profile_picture_url
FROM public.posts p
INNER JOIN public.profiles pr ON pr.id = p.user_id
ORDER BY p.created_at DESC;

CREATE OR REPLACE FUNCTION public.adjust_post_likes(target_post_id UUID, delta INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE new_count INTEGER;
BEGIN
  UPDATE public.posts
  SET likes_count = GREATEST(0, likes_count + delta)
  WHERE id = target_post_id
  RETURNING likes_count INTO new_count;
  RETURN COALESCE(new_count, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.adjust_post_likes(UUID, INTEGER) TO authenticated, anon;
