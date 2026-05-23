-- Production Database Schema for Slyte Application
-- Handles Users, Posts, Likes, Comments, Notifications, and Messages

CREATE TABLE IF NOT EXISTS Users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  is_premium INTEGER DEFAULT 0,
  premium_glow_color TEXT
);

CREATE TABLE IF NOT EXISTS Posts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  media_type TEXT CHECK(media_type IN ('image', 'video')) NOT NULL,
  media_url TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  caption TEXT DEFAULT '',
  location TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  duration_seconds REAL DEFAULT 0,
  trim_start REAL DEFAULT 0,
  trim_end REAL DEFAULT 0,
  filter_type TEXT CHECK(filter_type IN ('none', 'mono', 'vintage', 'neon', 'sepia', 'cyber')) DEFAULT 'none',
  bg_music_title TEXT,
  bg_music_url TEXT,
  FOREIGN KEY(user_id) REFERENCES Users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Likes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  post_id TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES Users(id) ON DELETE CASCADE,
  FOREIGN KEY(post_id) REFERENCES Posts(id) ON DELETE CASCADE,
  UNIQUE(user_id, post_id)
);

CREATE TABLE IF NOT EXISTS Comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  comment_text TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(post_id) REFERENCES Posts(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES Users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Notifications (
  id TEXT PRIMARY KEY,
  target_user_id TEXT NOT NULL,
  type TEXT CHECK(type IN ('like', 'comment', 'follow')) NOT NULL,
  source_username TEXT NOT NULL,
  source_avatar TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  is_following INTEGER DEFAULT 0,
  FOREIGN KEY(target_user_id) REFERENCES Users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  sender_username TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL
);
