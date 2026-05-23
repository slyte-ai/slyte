/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PostType = 'photo' | 'video' | 'short';

export interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  profile_picture_url: string | null;
  bio?: string;
}

/** Row from `feed_posts` view */
export interface FeedPost {
  id: string;
  created_at: string;
  user_id: string;
  content_url: string;
  caption: string;
  type: PostType;
  likes_count: number;
  username: string;
  full_name: string | null;
  profile_picture_url: string | null;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  created_at: string;
  username?: string;
  profile_picture_url?: string | null;
}
