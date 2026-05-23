/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../supabase';
import { mapDbComment } from './supabaseMappers';
import type { Comment } from '../types';

export async function adjustPostLikes(postId: string, delta: 1 | -1): Promise<number> {
  const { data, error } = await supabase.rpc('adjust_post_likes', {
    target_post_id: postId,
    delta,
  });

  if (error) throw new Error(error.message);
  return typeof data === 'number' ? data : 0;
}

export async function fetchAllComments(): Promise<Comment[]> {
  const { data: comments, error } = await supabase
    .from('comments')
    .select('id, post_id, user_id, body, created_at')
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  if (!comments?.length) return [];

  const userIds = [...new Set(comments.map((c) => c.user_id))];
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, username')
    .in('id', userIds);

  if (profileError) throw new Error(profileError.message);

  const nameMap = new Map((profiles ?? []).map((p) => [p.id as string, p.username as string]));

  return comments.map((row) =>
    mapDbComment({
      ...row,
      username: nameMap.get(row.user_id),
    })
  );
}

export async function addComment(
  postId: string,
  userId: string,
  commentText: string
): Promise<Comment> {
  const trimmed = commentText.trim();
  if (!trimmed) throw new Error('Comment cannot be empty');

  const { data, error } = await supabase
    .from('comments')
    .insert({ post_id: postId, user_id: userId, body: trimmed })
    .select('id, post_id, user_id, body, created_at')
    .single();

  if (error) throw new Error(error.message);

  const { data: author } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', userId)
    .maybeSingle();

  return mapDbComment({
    ...(data as { id: string; post_id: string; user_id: string; body: string; created_at: string }),
    username: author?.username,
  });
}

export async function insertPost(params: {
  userId: string;
  contentUrl: string;
  caption: string;
  type: 'photo' | 'video' | 'short';
}): Promise<void> {
  const { error } = await supabase.from('posts').insert({
    user_id: params.userId,
    content_url: params.contentUrl,
    caption: params.caption,
    type: params.type,
  });

  if (error) throw new Error(error.message);
}
