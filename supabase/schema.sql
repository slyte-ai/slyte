-- =============================================================================
-- Slyte — Unified Instagram-style schema
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- PROFILES (extends auth.users)
-- -----------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  full_name TEXT,
  profile_picture_url TEXT,
  bio TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT profiles_username_unique UNIQUE (username),
  CONSTRAINT profiles_username_format CHECK (username ~ '^[a-z0-9._]{3,30}$')
);

CREATE INDEX idx_profiles_username ON public.profiles (username);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username TEXT;
BEGIN
  base_username := LOWER(
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''),
      SPLIT_PART(NEW.email, '@', 1),
      'user'
    )
  );
  base_username := REGEXP_REPLACE(base_username, '[^a-z0-9._]', '', 'g');
  IF LENGTH(base_username) < 3 THEN
    base_username := 'user' || SUBSTRING(REPLACE(NEW.id::TEXT, '-', ''), 1, 8);
  END IF;

  INSERT INTO public.profiles (id, username, full_name, profile_picture_url)
  VALUES (
    NEW.id,
    base_username,
    COALESCE(NEW.raw_user_meta_data->>'full_name', base_username),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'profile_picture_url'), '')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- POSTS (single table for photo, video, short)
-- -----------------------------------------------------------------------------
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  content_url TEXT NOT NULL,
  caption TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL CHECK (type IN ('photo', 'video', 'short')),
  likes_count INTEGER NOT NULL DEFAULT 0 CHECK (likes_count >= 0),

  CONSTRAINT posts_content_url_not_empty CHECK (char_length(trim(content_url)) > 0)
);

CREATE INDEX idx_posts_user_id ON public.posts (user_id);
CREATE INDEX idx_posts_created_at_desc ON public.posts (created_at DESC);

-- -----------------------------------------------------------------------------
-- COMMENTS
-- -----------------------------------------------------------------------------
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(trim(body)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_post_id ON public.comments (post_id);

-- -----------------------------------------------------------------------------
-- FEED VIEW
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- LIKE COUNT HELPERS
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Posts are viewable by everyone"
  ON public.posts FOR SELECT USING (true);

CREATE POLICY "Users can create posts"
  ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts"
  ON public.posts FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Comments are viewable by everyone"
  ON public.comments FOR SELECT USING (true);

CREATE POLICY "Users can add comments"
  ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON public.comments FOR DELETE USING (auth.uid() = user_id);

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.feed_posts TO anon, authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.posts TO authenticated;
GRANT ALL ON public.comments TO authenticated;
GRANT SELECT ON public.profiles, public.posts, public.comments TO anon;
GRANT EXECUTE ON FUNCTION public.adjust_post_likes(UUID, INTEGER) TO authenticated, anon;
