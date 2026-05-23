/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../supabase';
import type { PostType } from '../types';

export const SHORT_MAX_DURATION_SEC = 60;

export function isAcceptedMediaFile(file: File): boolean {
  const lower = file.name.toLowerCase();
  return /\.(jpe?g|png|mp4|mov)$/i.test(lower) || file.type.startsWith('image/') || file.type.startsWith('video/');
}

export function detectTypeFromFileName(fileName: string): PostType | null {
  const lower = fileName.toLowerCase();
  if (/\.(jpe?g|png)$/.test(lower)) return 'photo';
  if (/\.(mp4|mov)$/.test(lower)) return null;
  return null;
}

export function getVideoDurationSeconds(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(video.duration) ? video.duration : 0);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read video duration'));
    };
    video.src = url;
  });
}

export async function detectPostType(file: File): Promise<PostType> {
  const byName = detectTypeFromFileName(file.name);
  if (byName === 'photo') return 'photo';

  if (/\.(mp4|mov)$/i.test(file.name) || file.type.startsWith('video/')) {
    try {
      const duration = await getVideoDurationSeconds(file);
      return duration > 0 && duration <= SHORT_MAX_DURATION_SEC ? 'short' : 'video';
    } catch {
      return 'video';
    }
  }

  if (file.type.startsWith('image/')) return 'photo';
  throw new Error('Unsupported file type');
}

export async function publishPost(params: {
  userId: string;
  file: File;
  caption: string;
  type: PostType;
}): Promise<void> {
  const ext =
    params.file.name.split('.').pop()?.toLowerCase() ||
    (params.type === 'photo' ? 'jpg' : 'mp4');
  const storagePath = `posts/${params.userId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('media')
    .upload(storagePath, params.file, {
      cacheControl: '3600',
      upsert: false,
      contentType: params.file.type || undefined,
    });

  if (uploadError) throw new Error(uploadError.message);

  const { data: publicUrlData } = supabase.storage.from('media').getPublicUrl(storagePath);

  const { error: insertError } = await supabase.from('posts').insert({
    user_id: params.userId,
    content_url: publicUrlData.publicUrl,
    caption: params.caption.trim(),
    type: params.type,
  });

  if (insertError) throw new Error(insertError.message);
}
