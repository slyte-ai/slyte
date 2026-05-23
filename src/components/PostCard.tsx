/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import { FeedPost } from '../types';

const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200';

interface PostCardProps {
  post: FeedPost;
  isLiked: boolean;
  isLiking?: boolean;
  onLike: (postId: string) => void | Promise<void>;
}

const PostCard: React.FC<PostCardProps> = ({ post, isLiked, isLiking = false, onLike }) => {
  const [showDoubleTapHeart, setShowDoubleTapHeart] = useState(false);
  let lastTap = 0;

  const handleImageTap = () => {
    const now = Date.now();
    if (now - lastTap < 300) {
      if (!isLiked && !isLiking) {
        onLike(post.id);
      }
      setShowDoubleTapHeart(true);
      setTimeout(() => setShowDoubleTapHeart(false), 700);
    }
    lastTap = now;
  };

  return (
    <article
      id={`feed-post-${post.id}`}
      className="border-b border-neutral-900 bg-black text-white"
    >
      <header className="flex items-center gap-3 px-3 py-3">
        <img
          src={post.avatar_url || DEFAULT_AVATAR}
          alt={post.username}
          className="h-9 w-9 rounded-full object-cover ring-2 ring-neutral-800"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">@{post.username}</p>
          {post.full_name && (
            <p className="truncate text-xs text-neutral-500">{post.full_name}</p>
          )}
        </div>
      </header>

      <div
        className="relative aspect-square w-full cursor-pointer bg-neutral-950"
        onClick={handleImageTap}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleImageTap()}
        aria-label="Double tap to like"
      >
        <img
          src={post.image_url}
          alt={post.caption || 'Post image'}
          className="h-full w-full object-cover"
          loading="lazy"
        />
        {showDoubleTapHeart && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <Heart size={72} className="fill-[#0066FF] text-[#0066FF] drop-shadow-lg" />
          </div>
        )}
      </div>

      <div className="px-3 py-3">
        <button
          type="button"
          onClick={() => onLike(post.id)}
          disabled={isLiking}
          className={`mb-2 flex items-center gap-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
            isLiked ? 'text-[#0066FF]' : 'text-neutral-300 hover:text-white'
          }`}
          aria-pressed={isLiked}
        >
          <Heart size={22} fill={isLiked ? 'currentColor' : 'none'} />
          <span>Like</span>
          <span className="text-neutral-400">·</span>
          <span>{Number(post.likes_count).toLocaleString()}</span>
        </button>

        {post.caption && (
          <p className="text-sm leading-relaxed text-white">
            <span className="mr-2 font-semibold text-sky-300">@{post.username}</span>
            {post.caption}
          </p>
        )}
      </div>
    </article>
  );
};

export default PostCard;
