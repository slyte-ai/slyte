/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '../supabase';
import { adjustPostLikes } from '../lib/postActions';
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
  const [likedIds, setLikedIds] = useState<Set<string>>(loadLikedIds);
  const [likingId, setLikingId] = useState<string | null>(null);
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
      setPosts((data ?? []) as FeedPost[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed, refreshKey]);

  const handleLike = async (postId: string) => {
    if (!currentUserId || likingId) return;

    const alreadyLiked = likedIds.has(postId);
    setLikingId(postId);

    try {
      const newCount = await adjustPostLikes(postId, alreadyLiked ? -1 : 1);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, likes_count: newCount } : p))
      );
      setLikedIds((prev) => {
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
      setLikingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-neutral-500">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm">Loading feed…</p>
      </div>
    );
  }

  if (error && posts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
        <p className="text-sm text-red-400">{error}</p>
        <button
          type="button"
          onClick={loadFeed}
          className="flex items-center gap-2 text-sm text-[#0095f6]"
        >
          <RefreshCw size={14} />
          Retry
        </button>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="py-20 text-center text-sm text-neutral-500">
        No posts yet. Tap + to share your first photo or video.
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[470px]">
      {error && (
        <p className="bg-red-950/40 px-4 py-2 text-center text-xs text-red-400">{error}</p>
      )}
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          currentUserId={currentUserId}
          isLiked={likedIds.has(post.id)}
          isLiking={likingId === post.id}
          onLike={handleLike}
        />
      ))}
    </div>
  );
}
