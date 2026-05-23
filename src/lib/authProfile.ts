/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { User as SupabaseAuthUser } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import type { Profile } from '../types';

type DbProfileRow = {
  id: string;
  username: string;
  full_name: string | null;
  profile_picture_url: string | null;
  bio?: string | null;
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
    profile_picture_url:
      (typeof meta.profile_picture_url === 'string' && meta.profile_picture_url) || null,
    bio: (typeof meta.bio === 'string' && meta.bio) || '',
  };
}

export function profileFromDbRow(row: DbProfileRow): Profile {
  return {
    id: row.id,
    username: row.username,
    full_name: row.full_name,
    profile_picture_url: row.profile_picture_url,
    bio: row.bio ?? '',
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

  if (data) return profileFromDbRow(data as DbProfileRow);

  const { data: authData } = await supabase.auth.getUser();
  if (authData.user?.id === userId) return profileFromAuthUser(authData.user);

  return null;
}
