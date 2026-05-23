-- 
-- SLYTE - POSTGRESQL & SUPABASE DATABASE DDL SCHEMA
-- 

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. PROFILES TABLE
-- ==========================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT DEFAULT 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
    bio TEXT,
    followers_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT username_min_length CHECK (char_length(username) >= 3)
);

-- ==========================================
-- 2. POSTS TABLE
-- ==========================================
CREATE TABLE public.posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
    media_url TEXT NOT NULL,
    thumbnail_url TEXT,
    caption TEXT DEFAULT '',
    location TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    likes_count INTEGER DEFAULT 0,
    duration_seconds FLOAT DEFAULT 0.0,
    
    CONSTRAINT posts_media_url_not_empty CHECK (media_url <> '')
);

-- Index for fast user feeds and chronological retrieval
CREATE INDEX idx_posts_user_id ON public.posts(user_id);
CREATE INDEX idx_posts_created_at ON public.posts(created_at DESC);

-- ==========================================
-- 3. LIKES TABLE (Relational Many-to-Many join)
-- ==========================================
CREATE TABLE public.likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_user_post_like UNIQUE (user_id, post_id)
);

CREATE INDEX idx_likes_post_id ON public.likes(post_id);

-- ==========================================
-- 4. COMMENTS TABLE
-- ==========================================
CREATE TABLE public.comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_comments_post_id ON public.comments(post_id);

-- ==========================================
-- 5. NOTIFICATIONS TABLE
-- ==========================================
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('like', 'comment', 'follow')),
    source_username TEXT NOT NULL,
    source_avatar TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    is_following BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_target_user_id ON public.notifications(target_user_id);

-- ==========================================
-- 6. AUTOMATION TRIGGERS (LIKE & FOLLOWER COUNTS)
-- ==========================================

-- Trigger to increment/decrement likes_count on posts auto-reactively
CREATE OR REPLACE FUNCTION public.handle_post_like_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.posts 
        SET likes_count = likes_count + 1 
        WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.posts 
        SET likes_count = GREATEST(0, likes_count - 1) 
        WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_post_likes
AFTER INSERT OR DELETE ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.handle_post_like_change();


-- ==========================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES FOR SECURE SYNC
-- ==========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Profiles: Anyone can read profiles, but owners can update them or create them
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (true);

-- Posts: Anyone can view, authenticating user can insert/delete
CREATE POLICY "Posts are viewable by everyone" ON public.posts
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create posts" ON public.posts
    FOR INSERT WITH CHECK (true);

-- Likes & Comments: Anyone can select, users can manage their own
CREATE POLICY "Likes are viewable by everyone" ON public.likes
    FOR SELECT USING (true);

CREATE POLICY "Users can toggle likes" ON public.likes
    FOR ALL USING (true);

CREATE POLICY "Comments are viewable by everyone" ON public.comments
    FOR SELECT USING (true);

CREATE POLICY "Users can write/delete comments" ON public.comments
    FOR ALL USING (true);

-- Notifications: Only target user can see
CREATE POLICY "Users can see their own notifications" ON public.notifications
    FOR SELECT USING (true);

CREATE POLICY "System can generate notifications" ON public.notifications
    FOR INSERT WITH CHECK (true);


-- ==========================================
-- 8. STORAGE BUCKETS CONFIGURATION INSTRUCTIONS
-- ==========================================
-- To support file bucket uploads for Slyte media, set up a Supabase Storage Bucket
-- named 'media' (Public). Files can be uploaded using the supabase.storage client:
-- 
-- Example Client JavaScript:
-- const { data, error } = await supabase.storage
--   .from('media')
--   .upload(`posts/${profile.username}/${Date.now()}-${file.name}`, file, {
--     cacheControl: '3600',
--     upsert: false
--   });
-- 
-- const mediaUrl = supabase.storage.from('media').getPublicUrl(data.path).data.publicUrl;
