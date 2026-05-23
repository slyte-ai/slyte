/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '../supabase';
import { adjustPostLikes } from '../lib/postActions';
import { mapFeedPostRow, type FeedPostRow } from '../lib/supabaseMappers';
import type { FeedPost } from '../types';
import PostCard from './PostCard';

interface FeedProps {
  currentUserId?: string;
  refreshKey?: number;
}

const LIKED_KEY = 'slyte_liked_posts';

function loadLikedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(LIKED_KEY);
    return raw ? new Set<string>(JSON.parse(raw) as string[]) : new Set<string>();
  } catch {
    return new Set<string>();
  }
}

function saveLikedIds(ids: Set<string>) {
  localStorage.setItem(LIKED_KEY, JSON.stringify([...ids]));
}

export default function Feed({ currentUserId, refreshKey = 0 }: FeedProps) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(loadLikedIds);
  const [likingPostId, setLikingPostId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: feedError } = await supabase
      .from('feed_posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (feedError) {
      setError(feedError.message);
      setPosts([]);
    } else {
      setPosts((data ?? []).map((row) => mapFeedPostRow(row as FeedPostRow)));
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed, refreshKey]);

  const handleLike = async (postId: string) => {
    if (!currentUserId || likingPostId) return;

    const alreadyLiked = likedPostIds.has(postId);
    setLikingPostId(postId);

    try {
      const newCount = await adjustPostLikes(postId, alreadyLiked ? -1 : 1);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, likes_count: newCount } : p))
      );
      setLikedPostIds((prev) => {
        const next = new Set<string>(prev);
        if (alreadyLiked) next.delete(postId);
        else next.add(postId);
        saveLikedIds(next);
        return next;
      });
    } catch (err) {
      console.error('[Feed] Like failed:', err);
      setError(err instanceof Error ? err.message : 'Like failed');
    } finally {
      setLikingPostId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-neutral-400">
        <Loader2 className="h-8 w-8 animate-spin text-[#0066FF]" />
        <p className="text-sm">Loading feed...</p>
      </div>
    );
  }

  if (error && posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <p className="text-sm text-rose-400">Could not load feed: {error}</p>
        <button
          type="button"
          onClick={loadFeed}
          className="flex items-center gap-2 rounded-full border border-neutral-800 px-4 py-2 text-xs font-semibold text-white hover:border-[#0066FF]"
        >
          <RefreshCw size={14} />
          Retry
        </button>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center text-neutral-500">
        <p className="text-sm font-medium text-neutral-400">No posts yet</p>
        <p className="max-w-xs text-xs leading-relaxed">
          Posts from your Supabase feed will appear here once added to the database.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {error && (
        <p className="bg-rose-950/30 px-3 py-2 text-center text-xs text-rose-400">{error}</p>
      )}
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          isLiked={likedPostIds.has(post.id)}
          isLiking={likingPostId === post.id}
          onLike={handleLike}
        />
      ))}
    </div>
  );
}
