/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, MessageCircle, MapPin, Volume2, VolumeX, Send, CornerDownRight, Share2, Music } from 'lucide-react';
import { Post, Comment, Profile } from '../types';

interface PostCardProps {
  key?: string | number;
  post: Post;
  currentUserId: string;
  currentUserProfile: { username: string; avatar_url: string } | null;
  comments: Comment[];
  isGlobalMuted: boolean;
  onToggleMuteGlobal: () => void;
  onPostComment: (postId: string, commentText: string) => void;
  onLikePost: (postId: string) => void;
  userLiked: boolean;
  onUserSelectProfile?: (username: string) => void;
  onSharePost?: (post: Post) => void;
  profiles?: Profile[];
}

const getFilterClass = (type?: string) => {
  switch (type) {
    case 'mono': return 'grayscale contrast-125';
    case 'vintage': return 'sepia-[0.6] contrast-[1.1] brightness-[0.9] hue-rotate-[-15deg]';
    case 'neon': return 'saturate-200 hue-rotate-90 brightness-[1.1]';
    case 'sepia': return 'sepia';
    case 'cyber': return 'hue-rotate-[180deg] saturate-150 contrast-125';
    default: return '';
  }
};

export default function PostCard({
  post,
  currentUserId,
  currentUserProfile,
  comments,
  isGlobalMuted,
  onToggleMuteGlobal,
  onPostComment,
  onLikePost,
  userLiked,
  onUserSelectProfile,
  onSharePost,
  profiles = []
}: PostCardProps) {
  const getProfile = (uname?: string) => {
    if (!uname) return null;
    return profiles.find(p => p.username.toLowerCase() === uname.toLowerCase()) || null;
  };

  const postUser = getProfile(post.username);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [showVolumeIndicator, setShowVolumeIndicator] = useState(false);
  const [showDoubleTapHeart, setShowDoubleTapHeart] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [isCaptionExpanded, setIsCaptionExpanded] = useState(false);

  // Intersection Observer for Auto-Play Optimization Engine
  useEffect(() => {
    if (post.media_type !== 'video' || !videoRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            if (videoRef.current) {
              // Seed start time for trim
              if (post.trim_start && videoRef.current.currentTime < post.trim_start) {
                videoRef.current.currentTime = post.trim_start;
              }
              videoRef.current.play().catch(() => {});
            }
            setIsPlaying(true);
          } else {
            videoRef.current?.pause();
            setIsPlaying(false);
          }
        });
      },
      {
        threshold: [0.1, 0.5, 0.9],
        rootMargin: '0px'
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [post.media_type, post.trim_start]);

  // Adjust local video player's mute state when global mute settings change
  useEffect(() => {
    if (videoRef.current) {
      // If we have background music, we mute the physical video and play the background audio track instead!
      if (post.bg_music_url) {
        videoRef.current.muted = true;
      } else {
        videoRef.current.muted = isGlobalMuted;
      }
    }
    if (audioRef.current) {
      audioRef.current.muted = isGlobalMuted;
    }
  }, [isGlobalMuted, post.bg_music_url]);

  // Sync background music with playback state
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  // Handle video element timeupdate with trim support
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const start = post.trim_start ?? 0;
      const end = post.trim_end ?? videoRef.current.duration ?? 999;

      if (videoRef.current.currentTime < start) {
        videoRef.current.currentTime = start;
      }
      if (videoRef.current.currentTime > end) {
        videoRef.current.currentTime = start;
      }

      const currentRelative = videoRef.current.currentTime - start;
      const totalRelative = end - start;
      const percentage = (currentRelative / (totalRelative || 1)) * 100;
      setVideoProgress(percentage);
    }
  };

  // Sound toggle with center flashing indicator
  const handleToggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleMuteGlobal();
    setShowVolumeIndicator(true);
    setTimeout(() => {
      setShowVolumeIndicator(false);
    }, 700);
  };

  // Double tap handler
  let lastTap = 0;
  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    if (now - lastTap < DOUBLE_PRESS_DELAY) {
      // Trigger like
      if (!userLiked) {
        onLikePost(post.id);
      }
      setShowDoubleTapHeart(true);
      setTimeout(() => setShowDoubleTapHeart(false), 900);
    }
    lastTap = now;
  };

  const handlePostCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    onPostComment(post.id, commentInput.trim());
    setCommentInput('');
  };

  const postComments = comments.filter((c) => c.post_id === post.id);
  const visibleComments = postComments.slice(-2); // Get the 2 latest comments

  const captionLimit = 80;
  const shouldTruncateCaption = post.caption.length > captionLimit && !isCaptionExpanded;
  const renderedCaption = shouldTruncateCaption
    ? `${post.caption.substring(0, captionLimit)}...`
    : post.caption;

  return (
    <div 
      ref={containerRef}
      id={`feed-post-${post.id}`} 
      className="border-b border-slate-900 bg-black py-4 w-full text-white font-sans no-select"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 pb-3">
        <div className="flex items-center gap-3">
          <img
            src={post.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'}
            alt={post.username}
            onClick={() => onUserSelectProfile?.(post.username || '')}
            className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-800 hover:ring-[#0066FF] cursor-pointer transition-all duration-300"
          />
          <div>
            <h4 
              onClick={() => onUserSelectProfile?.(post.username || '')}
              className="text-white hover:text-sky-400 font-semibold text-sm cursor-pointer flex items-center gap-1"
            >
              <span>@{post.username}</span>
            </h4>
            {post.location && (
              <span className="text-neutral-400 flex items-center gap-1 text-[10px] uppercase font-mono">
                <MapPin size={10} className="text-[#0066FF]" />
                {post.location}
              </span>
            )}
          </div>
        </div>
        <div className="w-2 h-2 rounded-full bg-[#0066FF] animate-pulse" />
      </div>

      {/* Media Field with Double Tap Recognition */}
      <div 
        className="relative w-full aspect-[4/5] bg-[#050505] flex items-center justify-center overflow-hidden border-y border-slate-900 group"
        onClick={handleDoubleTap}
      >
        {post.bg_music_url && (
          <audio 
            ref={audioRef}
            src={post.bg_music_url}
            loop
            muted={isGlobalMuted}
          />
        )}

        {post.media_type === 'video' ? (
          <div className="w-full h-full relative cursor-pointer">
            <video
              ref={videoRef}
              src={post.media_url}
              playsInline
              loop
              muted={post.bg_music_url ? true : isGlobalMuted}
              onTimeUpdate={handleTimeUpdate}
              onClick={(e) => {
                const video = videoRef.current;
                if (video) {
                  if (video.paused) {
                    video.play().catch(() => {});
                    setIsPlaying(true);
                  } else {
                    video.pause();
                    setIsPlaying(false);
                  }
                }
              }}
              className={`w-full h-full object-cover transition-all duration-300 ${getFilterClass(post.filter_type)}`}
            />

            {/* Glowing background music overlay card if active */}
            {post.bg_music_title && isPlaying && !isGlobalMuted && (
              <div className="absolute top-4 left-4 z-20 px-2.5 py-1.5 rounded-full bg-black/80 backdrop-blur-md border border-sky-500/20 text-[#0066FF] flex items-center gap-1.5 animate-pulse text-[10px] font-mono">
                <Music size={12} className="animate-spin duration-3000 text-[#0066FF]" />
                <span className="text-white max-w-[120px] truncate">{post.bg_music_title}</span>
              </div>
            )}

            {/* Muted/Unmuted Global Switch overlay bottom right */}
            <button
              onClick={handleToggleSound}
              className="absolute bottom-4 right-4 z-20 p-2.5 rounded-full bg-black/75 border border-slate-900 text-neutral-300 hover:text-white transition-all scale-100 group-hover:scale-105"
            >
              {isGlobalMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>

            {/* Micro progress line track bar along layout boundary */}
            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-neutral-900 z-10">
              <div 
                className="h-full bg-gradient-to-r from-[#0066FF] to-indigo-500 transition-all duration-100 ease-out"
                style={{ width: `${videoProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <img
            src={post.media_url}
            alt="Slyte content feed"
            className={`w-full h-full object-cover transition-all duration-300 ${getFilterClass(post.filter_type)}`}
          />
        )}

        {/* Floating Speaker Centered Flash indicator */}
        <AnimatePresence>
          {showVolumeIndicator && (
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="absolute pointer-events-none z-30 p-4 rounded-full bg-black/80 backdrop-blur-md border border-slate-700 text-[#0066FF]"
            >
              {isGlobalMuted ? <VolumeX size={28} /> : <Volume2 size={28} />}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Double click animated Pop Heart layer */}
        <AnimatePresence>
          {showDoubleTapHeart && (
            <motion.div
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: [0.3, 1.2, 1], opacity: [0, 1, 1] }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="absolute pointer-events-none z-30 text-[#0066FF]"
            >
              <Heart size={82} fill="#0066FF" className="drop-shadow-2xl shadow-sky-500/50" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Interactive Actions bar */}
      <div className="flex items-center gap-4 px-3 py-3">
        <button 
          onClick={() => onLikePost(post.id)}
          className={`flex items-center gap-1.5 text-sm font-semibold transition-colors duration-200 ${
            userLiked ? 'text-[#0066FF]' : 'text-neutral-300 hover:text-white'
          }`}
        >
          <Heart size={21} fill={userLiked ? '#0066FF' : 'none'} className={userLiked ? 'scale-110' : ''} />
          <span>{post.likes_count.toLocaleString()}</span>
        </button>

        <span className="flex items-center gap-1.5 text-sm text-neutral-300 font-semibold">
          <MessageCircle size={21} />
          <span>{postComments.length}</span>
        </span>

        <button 
          onClick={() => onSharePost?.(post)}
          className="flex items-center gap-1.5 text-sm text-neutral-300 hover:text-white transition-colors duration-200 font-semibold"
          id={`post-share-btn-${post.id}`}
        >
          <Share2 size={21} />
          <span className="text-xs">Share</span>
        </button>

        <div className="ml-auto flex items-center gap-1.5">
          {post.bg_music_title && (
            <span className="flex items-center gap-1 text-[8px] bg-sky-950/40 border border-sky-900/50 text-sky-400 px-1.5 py-0.5 rounded font-mono uppercase">
              <Music size={8} />
              {post.bg_music_title}
            </span>
          )}

          {post.duration_seconds > 0 && (
            <span className="font-mono text-[9px] text-neutral-400 border border-slate-800 px-1.5 py-0.5 rounded uppercase">
              {post.duration_seconds.toFixed(1)}s HD
            </span>
          )}
        </div>
      </div>

      {/* Caption block */}
      <div className="px-3 pb-2 font-sans">
        <p className="text-sm text-white leading-relaxed">
          <span 
            onClick={() => onUserSelectProfile?.(post.username || '')}
            className="font-semibold text-sky-300 hover:underline cursor-pointer mr-2 inline-flex items-center gap-0.5"
          >
            <span>@{post.username}</span>
          </span>
          {renderedCaption}
          {shouldTruncateCaption && (
            <button
              onClick={() => setIsCaptionExpanded(true)}
              className="text-[#0066FF] ml-1 font-semibold hover:underline"
            >
              ...more
            </button>
          )}
        </p>
        <span className="text-[10px] text-neutral-500 block mt-1 font-mono uppercase">
          {new Date(post.created_at).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })}
        </span>
      </div>

      {/* Comments section (Latest 2) */}
      {visibleComments.length > 0 && (
        <div className="px-3 py-1.5 bg-neutral-950/40 rounded-lg mx-3 mb-3 border border-slate-950 flex flex-col gap-2">
          {visibleComments.map((comment) => {
            const commentUser = getProfile(comment.username);

            return (
              <div key={comment.id} className="text-xs text-neutral-300 flex items-center gap-2">
                <CornerDownRight size={11} className="text-neutral-600 shrink-0" />
                
                <img
                  src={commentUser?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'}
                  alt={comment.username}
                  onClick={() => onUserSelectProfile?.(comment.username)}
                  className="w-5 h-5 rounded-full object-cover border border-slate-800 cursor-pointer shrink-0"
                />

                <div className="leading-tight flex flex-center flex-wrap gap-x-1">
                  <span 
                    onClick={() => onUserSelectProfile?.(comment.username)}
                    className="font-semibold text-sky-400 hover:underline cursor-pointer inline-flex items-center gap-0.5 mr-1"
                  >
                    <span>@{comment.username}</span>
                  </span>
                  <span className="text-neutral-300">{comment.comment_text}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Active comment Input line */}
      <form onSubmit={handlePostCommentSubmit} className="px-3 flex gap-2">
        <input
          type="text"
          placeholder="Add active comment..."
          value={commentInput}
          onChange={(e) => setCommentInput(e.target.value)}
          className="flex-1 bg-slate-950 border border-slate-900 rounded-full px-3.5 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#0066FF] transition-all"
        />
        <button
          type="submit"
          disabled={!commentInput.trim()}
          className="p-1 px-3 text-xs font-semibold text-[#0066FF] hover:text-sky-300 disabled:text-neutral-700 transition"
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  );
}
