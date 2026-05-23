/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { User as SupabaseAuthUser } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { mapProfileRow } from './supabaseMappers';
import type { Profile } from '../types';

export function profileFromAuthUser(user: SupabaseAuthUser): Profile {
  const meta = user.user_metadata ?? {};
  const username =
    (typeof meta.username === 'string' && meta.username) ||
    user.email?.split('@')[0] ||
    'user';

  const picture =
    (typeof meta.profile_picture_url === 'string' && meta.profile_picture_url) ||
    (typeof meta.avatar_url === 'string' && meta.avatar_url) ||
    '';

  return {
    id: user.id,
    username,
    full_name: (typeof meta.full_name === 'string' && meta.full_name) || username,
    avatar_url: picture,
    profile_picture_url: picture || null,
    bio: (typeof meta.bio === 'string' && meta.bio) || '',
    followers_count: 0,
    following_count: 0,
  };
}

export async function fetchProfileForUser(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, profile_picture_url, bio')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('[Auth] Failed to load profile:', error.message);
    return null;
  }

  if (data) {
    return mapProfileRow({
      ...data,
      full_name: data.full_name ?? null,
      profile_picture_url: data.profile_picture_url ?? null,
      bio: data.bio ?? null,
    });
  }

  const { data: authData } = await supabase.auth.getUser();
  if (authData.user?.id === userId) {
    return profileFromAuthUser(authData.user);
  }

  return null;
}
