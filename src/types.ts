/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  bio: string;
  followers_count: number;
  following_count: number;
  is_premium?: boolean;
  premium_glow_color?: 'blue' | 'violet' | 'orange' | 'emerald' | null;
}

/** Row shape from the Supabase `feed_posts` view */
export interface FeedPost {
  id: string;
  user_id: string;
  image_url: string;
  caption: string;
  location: string | null;
  likes_count: number;
  created_at: string;
  username: string;
  avatar_url: string;
  full_name: string | null;
}

export interface Post {
  id: string;
  user_id: string;
  media_type: 'image' | 'video';
  media_url: string;
  thumbnail_url: string;
  caption: string;
  location: string;
  created_at: string;
  likes_count: number;
  duration_seconds: number;
  // Included fields for convenience in local views:
  username?: string;
  avatar_url?: string;
  is_premium?: boolean;
  premium_glow_color?: string | null;
  // Video editing fields
  trim_start?: number;
  trim_end?: number;
  filter_type?: 'none' | 'mono' | 'vintage' | 'neon' | 'sepia' | 'cyber';
  bg_music_title?: string;
  bg_music_url?: string;
}

export interface Like {
  id: string;
  user_id: string;
  post_id: string;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  username: string;
  comment_text: string;
  created_at: string;
}

export interface Notification {
  id: string;
  target_user_id: string;
  type: 'like' | 'comment' | 'follow';
  source_username: string;
  source_avatar: string;
  timestamp: string;
  is_following?: boolean;
}

export interface Story {
  id: string;
  username: string;
  avatar_url: string;
  media_url: string;
  media_type: 'image' | 'video';
  personal_message?: string;
  embedded_post_id?: string;
  embedded_post_username?: string;
  embedded_post_caption?: string;
  embedded_post_media_url?: string;
  embedded_post_media_type?: 'image' | 'video';
  filter_type?: 'none' | 'mono' | 'vintage' | 'neon' | 'sepia' | 'cyber';
}

export interface Message {
  id: string;
  thread_id: string; // The username of the user this conversation is with (or other identifier)
  sender_id: string; // ID of the sender (either currentUser or the other party)
  sender_username: string;
  text: string;
  created_at: string;
}

