/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Comment, FeedPost, Post, PostType, Profile } from '../types';

/** Raw row from `feed_posts` view */
export type FeedPostRow = {
  id: string;
  user_id: string;
  content_url: string;
  caption: string;
  type: PostType;
  likes_count: number;
  created_at: string;
  username: string;
  full_name: string | null;
  profile_picture_url: string | null;
};

export function mapFeedPostRow(row: FeedPostRow): FeedPost {
  const avatar = row.profile_picture_url ?? '';
  return {
    id: row.id,
    user_id: row.user_id,
    content_url: row.content_url,
    image_url: row.content_url,
    caption: row.caption,
    location: null,
    likes_count: row.likes_count,
    created_at: row.created_at,
    type: row.type,
    media_type: row.type === 'photo' ? 'image' : row.type,
    username: row.username,
    full_name: row.full_name,
    profile_picture_url: row.profile_picture_url,
    avatar_url: avatar,
  };
}

export function mapFeedPostToLegacyPost(row: FeedPost): Post {
  return {
    id: row.id,
    user_id: row.user_id,
    media_type: row.type === 'photo' ? 'image' : 'video',
    media_url: row.content_url,
    thumbnail_url: row.content_url,
    caption: row.caption,
    location: row.location ?? '',
    created_at: row.created_at,
    likes_count: row.likes_count,
    duration_seconds: 0,
    username: row.username,
    avatar_url: row.avatar_url,
  };
}

export function mapDbComment(row: {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  created_at: string;
  username?: string;
}): Comment {
  return {
    id: row.id,
    post_id: row.post_id,
    user_id: row.user_id,
    username: row.username ?? 'user',
    comment_text: row.body,
    created_at: row.created_at,
  };
}

type ProfileRow = {
  id: string;
  username: string;
  full_name: string | null;
  profile_picture_url: string | null;
  bio: string | null;
};

export function mapProfileRow(row: ProfileRow): Profile {
  return {
    id: row.id,
    username: row.username,
    full_name: row.full_name ?? row.username,
    avatar_url: row.profile_picture_url ?? '',
    profile_picture_url: row.profile_picture_url,
    bio: row.bio ?? '',
    followers_count: 0,
    following_count: 0,
  };
}
