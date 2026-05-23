/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { User as SupabaseAuthUser } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { Profile } from '../types';

const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200';

type DbUserRow = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  followers_count: number;
  following_count: number;
};

export function profileFromAuthUser(user: SupabaseAuthUser): Profile {
  const meta = user.user_metadata ?? {};
  const username =
    (typeof meta.username === 'string' && meta.username) ||
    user.email?.split('@')[0] ||
    'user';

  return {
    id: user.id,
    username,
    full_name: (typeof meta.full_name === 'string' && meta.full_name) || username,
    avatar_url: (typeof meta.avatar_url === 'string' && meta.avatar_url) || DEFAULT_AVATAR,
    bio: (typeof meta.bio === 'string' && meta.bio) || '',
    followers_count: 0,
    following_count: 0,
  };
}

export function profileFromDbRow(row: DbUserRow): Profile {
  return {
    id: row.id,
    username: row.username,
    full_name: row.full_name ?? row.username,
    avatar_url: row.avatar_url ?? DEFAULT_AVATAR,
    bio: row.bio ?? '',
    followers_count: row.followers_count,
    following_count: row.following_count,
  };
}

export async function fetchProfileForUser(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();

  if (error) {
    console.error('[Auth] Failed to load profile:', error.message);
    return null;
  }

  if (data) {
    return profileFromDbRow(data as DbUserRow);
  }

  const { data: authData } = await supabase.auth.getUser();
  if (authData.user?.id === userId) {
    return profileFromAuthUser(authData.user);
  }

  return null;
}
