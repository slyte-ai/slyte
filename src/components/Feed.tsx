/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '../supabase';
import { FeedPost } from '../types';
import PostCard from './PostCard';

interface FeedProps {
  currentUserId?: string;
}

export default function Feed({ currentUserId }: FeedProps) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [likingPostId, setLikingPostId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLikedPosts = useCallback(async (userId: string) => {
    const { data, error: likesError } = await supabase
      .from('likes')
      .select('post_id')
      .eq('user_id', userId);

    if (likesError) {
      console.error('[Feed] Failed to load likes:', likesError.message);
      return;
    }

    setLikedPostIds(new Set((data ?? []).map((row) => row.post_id)));
  }, []);

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

    if (currentUserId) {
      await loadLikedPosts(currentUserId);
    } else {
      setLikedPostIds(new Set());
    }

    setLoading(false);
  }, [currentUserId, loadLikedPosts]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const handleLike = async (postId: string) => {
    if (!currentUserId || likingPostId) return;

    const alreadyLiked = likedPostIds.has(postId);
    setLikingPostId(postId);

    if (alreadyLiked) {
      const { error: unlikeError } = await supabase
        .from('likes')
        .delete()
        .eq('user_id', currentUserId)
        .eq('post_id', postId);

      if (!unlikeError) {
        setLikedPostIds((prev) => {
          const next = new Set(prev);
          next.delete(postId);
          return next;
        });
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, likes_count: Math.max(0, p.likes_count - 1) }
              : p
          )
        );
      } else {
        console.error('[Feed] Unlike failed:', unlikeError.message);
      }
    } else {
      const { error: likeError } = await supabase.from('likes').insert({
        user_id: currentUserId,
        post_id: postId,
      });

      if (!likeError) {
        setLikedPostIds((prev) => new Set(prev).add(postId));
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, likes_count: p.likes_count + 1 } : p
          )
        );
      } else {
        console.error('[Feed] Like failed:', likeError.message);
      }
    }

    setLikingPostId(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-neutral-400">
        <Loader2 className="h-8 w-8 animate-spin text-[#0066FF]" />
        <p className="text-sm">Loading feed…</p>
      </div>
    );
  }

  if (error) {
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
