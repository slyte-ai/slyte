/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../supabase';
import type { Comment } from '../types';

export async function adjustPostLikes(postId: string, delta: 1 | -1): Promise<number> {
  const { data, error } = await supabase.rpc('adjust_post_likes', {
    target_post_id: postId,
    delta,
  });

  if (error) throw new Error(error.message);
  return typeof data === 'number' ? data : 0;
}

export async function fetchCommentsForPost(postId: string): Promise<Comment[]> {
  const { data: comments, error } = await supabase
    .from('comments')
    .select('id, post_id, user_id, body, created_at')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  if (!comments?.length) return [];

  const userIds = [...new Set(comments.map((c) => c.user_id))];
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, username, profile_picture_url')
    .in('id', userIds);

  if (profileError) throw new Error(profileError.message);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id as string, p as { username: string; profile_picture_url: string | null }])
  );

  return comments.map((row) => {
    const author = profileMap.get(row.user_id);
    return {
      id: row.id,
      post_id: row.post_id,
      user_id: row.user_id,
      body: row.body,
      created_at: row.created_at,
      username: author?.username,
      profile_picture_url: author?.profile_picture_url ?? null,
    };
  });
}

export async function addComment(postId: string, userId: string, body: string): Promise<Comment> {
  const trimmed = body.trim();
  if (!trimmed) throw new Error('Comment cannot be empty');

  const { data, error } = await supabase
    .from('comments')
    .insert({ post_id: postId, user_id: userId, body: trimmed })
    .select('id, post_id, user_id, body, created_at')
    .single();

  if (error) throw new Error(error.message);

  const { data: author } = await supabase
    .from('profiles')
    .select('username, profile_picture_url')
    .eq('id', userId)
    .maybeSingle();

  return {
    ...(data as Comment),
    username: author?.username,
    profile_picture_url: author?.profile_picture_url ?? null,
  };
}
