/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Heart, MessageCircle, Send } from 'lucide-react';
import Avatar from './Avatar';
import type { Comment, FeedPost } from '../types';
import { addComment, fetchCommentsForPost } from '../lib/postActions';

interface PostCardProps {
  post: FeedPost;
  currentUserId?: string;
  isLiked: boolean;
  isLiking?: boolean;
  onLike: (postId: string) => void | Promise<void>;
}

const PostCard: React.FC<PostCardProps> = ({
  post,
  currentUserId,
  isLiked,
  isLiking = false,
  onLike,
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(true);
  const [postingComment, setPostingComment] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [showComments, setShowComments] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingComments(true);
    setCommentsError(null);

    fetchCommentsForPost(post.id)
      .then((rows) => {
        if (!cancelled) setComments(rows);
      })
      .catch((err) => {
        if (!cancelled) {
          setCommentsError(err instanceof Error ? err.message : 'Failed to load comments');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingComments(false);
      });

    return () => {
      cancelled = true;
    };
  }, [post.id]);

  const mediaAspect =
    post.type === 'short'
      ? 'aspect-[9/16] max-h-[min(80vh,640px)]'
      : post.type === 'video'
        ? 'aspect-video'
        : 'aspect-square';

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId || !commentText.trim() || postingComment) return;

    setPostingComment(true);
    setCommentsError(null);
    try {
      const created = await addComment(post.id, currentUserId, commentText);
      setComments((prev) => [...prev, { ...created, username: 'you' }]);
      setCommentText('');
      setShowComments(true);
    } catch (err) {
      setCommentsError(err instanceof Error ? err.message : 'Could not post comment');
    } finally {
      setPostingComment(false);
    }
  };

  return (
    <article className="ig-post border-b border-neutral-800 bg-black text-white">
      <header className="flex items-center gap-3 px-3 py-2.5">
        <Avatar
          url={post.profile_picture_url}
          alt={post.username}
          className="h-8 w-8"
        />
        <p className="text-sm font-semibold">{post.username}</p>
      </header>

      <div className={`relative w-full bg-neutral-950 ${mediaAspect}`}>
        {post.type === 'photo' ? (
          <img
            src={post.content_url}
            alt={post.caption || 'Post'}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <video
            src={post.content_url}
            className="h-full w-full object-cover"
            playsInline
            muted
            autoPlay
            loop
            controls
          />
        )}
      </div>

      <div className="px-3 py-2">
        <div className="mb-2 flex items-center gap-4">
          <button
            type="button"
            onClick={() => onLike(post.id)}
            disabled={isLiking || !currentUserId}
            className="transition hover:opacity-70 disabled:opacity-40"
            aria-pressed={isLiked}
            aria-label="Like"
          >
            <Heart
              size={24}
              className={isLiked ? 'text-red-500' : 'text-white'}
              fill={isLiked ? 'currentColor' : 'none'}
            />
          </button>
          <button
            type="button"
            onClick={() => setShowComments((v) => !v)}
            className="transition hover:opacity-70"
            aria-label="Comments"
          >
            <MessageCircle size={24} />
          </button>
          <button type="button" className="ml-auto transition hover:opacity-70" aria-label="Share">
            <Send size={22} />
          </button>
        </div>

        <p className="mb-1 text-sm font-semibold">
          {Number(post.likes_count).toLocaleString()} likes
        </p>

        {post.caption && (
          <p className="text-sm leading-snug">
            <span className="mr-2 font-semibold">{post.username}</span>
            {post.caption}
          </p>
        )}

        {comments.length > 0 && !showComments && (
          <button
            type="button"
            onClick={() => setShowComments(true)}
            className="mt-1 text-sm text-neutral-500 hover:text-neutral-400"
          >
            View all {comments.length} comments
          </button>
        )}

        {showComments && (
          <div className="mt-2 max-h-40 space-y-2 overflow-y-auto">
            {loadingComments && (
              <p className="text-xs text-neutral-500">Loading comments…</p>
            )}
            {commentsError && (
              <p className="text-xs text-red-400">{commentsError}</p>
            )}
            {comments.map((c) => (
              <div key={c.id} className="flex gap-2 text-sm">
                <Avatar
                  url={c.profile_picture_url}
                  alt={c.username ?? 'user'}
                  className="h-6 w-6"
                />
                <p>
                  <span className="mr-2 font-semibold">{c.username ?? 'user'}</span>
                  {c.body}
                </p>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmitComment} className="mt-3 flex items-center gap-2 border-t border-neutral-900 pt-2">
          <input
            type="text"
            placeholder={currentUserId ? 'Add a comment…' : 'Sign in to comment'}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            disabled={!currentUserId || postingComment}
            className="flex-1 bg-transparent text-sm text-white placeholder-neutral-600 focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!currentUserId || !commentText.trim() || postingComment}
            className="text-sm font-semibold text-[#0095f6] disabled:opacity-40"
          >
            Post
          </button>
        </form>
      </div>
    </article>
  );
};

export default PostCard;
