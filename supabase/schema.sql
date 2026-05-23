-- =============================================================================
-- Slyte — Phase 1: users, posts, likes
-- Run in Supabase SQL Editor (Dashboard → SQL → New query)
-- =============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. USERS (public profile row per auth.users account)
-- -----------------------------------------------------------------------------
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT DEFAULT 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
  bio TEXT DEFAULT '',
  followers_count INTEGER NOT NULL DEFAULT 0 CHECK (followers_count >= 0),
  following_count INTEGER NOT NULL DEFAULT 0 CHECK (following_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT users_username_unique UNIQUE (username),
  CONSTRAINT users_username_format CHECK (
    username ~ '^[a-z0-9._]{3,30}$'
  )
);

CREATE INDEX idx_users_username ON public.users (username);

-- Auto-create a profile row when someone signs up via Supabase Auth
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

  INSERT INTO public.users (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    base_username,
    COALESCE(NEW.raw_user_meta_data->>'full_name', base_username),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'
    )
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
-- 2. POSTS
-- -----------------------------------------------------------------------------
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT NOT NULL DEFAULT '',
  location TEXT DEFAULT '',
  likes_count INTEGER NOT NULL DEFAULT 0 CHECK (likes_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT posts_image_url_not_empty CHECK (char_length(trim(image_url)) > 0)
);

CREATE INDEX idx_posts_user_id ON public.posts (user_id);
CREATE INDEX idx_posts_created_at_desc ON public.posts (created_at DESC);

-- Feed-friendly view (username + avatar joined for the home feed)
CREATE OR REPLACE VIEW public.feed_posts AS
SELECT
  p.id,
  p.user_id,
  p.image_url,
  p.caption,
  p.location,
  p.likes_count,
  p.created_at,
  u.username,
  u.avatar_url,
  u.full_name
FROM public.posts p
INNER JOIN public.users u ON u.id = p.user_id
ORDER BY p.created_at DESC;

-- -----------------------------------------------------------------------------
-- 3. LIKES
-- -----------------------------------------------------------------------------
CREATE TABLE public.likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT likes_unique_user_post UNIQUE (user_id, post_id)
);

CREATE INDEX idx_likes_post_id ON public.likes (post_id);
CREATE INDEX idx_likes_user_id ON public.likes (user_id);

-- Keep posts.likes_count in sync when likes are inserted/deleted
CREATE OR REPLACE FUNCTION public.sync_post_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts
    SET likes_count = likes_count + 1,
        updated_at = NOW()
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts
    SET likes_count = GREATEST(0, likes_count - 1),
        updated_at = NOW()
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER on_like_change
  AFTER INSERT OR DELETE ON public.likes
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_post_likes_count();

-- -----------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS)
-- -----------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- USERS
CREATE POLICY "Users are viewable by everyone"
  ON public.users FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- POSTS
CREATE POLICY "Posts are viewable by everyone"
  ON public.posts FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create posts"
  ON public.posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts"
  ON public.posts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
  ON public.posts FOR DELETE
  USING (auth.uid() = user_id);

-- LIKES
CREATE POLICY "Likes are viewable by everyone"
  ON public.likes FOR SELECT
  USING (true);

CREATE POLICY "Users can like posts"
  ON public.likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own likes"
  ON public.likes FOR DELETE
  USING (auth.uid() = user_id);

-- Grant API access (Supabase does this by default, but explicit is safe)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.feed_posts TO anon, authenticated;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.posts TO authenticated;
GRANT ALL ON public.likes TO authenticated;
GRANT SELECT ON public.users, public.posts, public.likes TO anon;
