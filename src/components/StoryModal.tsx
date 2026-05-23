/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play, Pause } from 'lucide-react';
import { Story } from '../types';

interface StoryModalProps {
  story: Story | null;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
}

export default function StoryModal({ story, onClose, onNext, onPrev }: StoryModalProps) {
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!story) return;

    setProgress(0);
    setIsPaused(false);
  }, [story]);

  useEffect(() => {
    if (!story || isPaused) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          if (onNext) {
            onNext();
          } else {
            onClose();
          }
          return 100;
        }
        return prev + 1; // increase by 1% every 40ms -> total duration 4 seconds
      });
    }, 40);

    return () => clearInterval(interval);
  }, [story, isPaused, onNext, onClose]);

  if (!story) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-[#020202] flex items-center justify-center no-select">
        {/* Subtle backdrop vignette mask */}
        <div className="absolute inset-0 bg-radial-vignette opacity-80" />

        {/* Story viewport (mobile sized) */}
        <div className="relative w-full max-w-md h-full md:h-[90vh] md:rounded-2xl overflow-hidden bg-[#0A0A0A] flex flex-col justify-between">
          
          {/* Header Progress Bars */}
          <div className="absolute top-0 inset-x-0 p-3 z-30 bg-gradient-to-b from-black/80 to-transparent">
            {/* Story duration ticking meter */}
            <div className="w-full bg-neutral-800 h-1 rounded-full overflow-hidden flex">
              <div 
                className="h-full bg-gradient-to-r from-sky-400 via-[#0066FF] to-indigo-600 transition-all duration-75 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Author info */}
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-3">
                <img 
                  src={story.avatar_url} 
                  alt={story.username} 
                  className="w-9 h-9 rounded-full object-cover border-2 border-[#0066FF]"
                />
                <span className="font-sans font-semibold text-sm text-white">{story.username}</span>
                <span className="font-mono text-[10px] text-neutral-400">STORY LIVE</span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsPaused(!isPaused)} 
                  className="p-1 px-2 rounded-full bg-black/40 text-neutral-300 hover:text-white transition-colors"
                >
                  {isPaused ? <Play size={16} /> : <Pause size={16} />}
                </button>
                <button 
                  onClick={onClose} 
                  className="p-1.5 rounded-full bg-black/40 text-neutral-300 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Media Content Area */}
          <div 
            className="flex-1 w-full h-full flex items-center justify-center cursor-pointer relative"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const midPoint = rect.width / 2;
              
              if (clickX < midPoint) {
                if (onPrev) onPrev();
              } else {
                if (onNext) onNext();
              }
            }}
          >
            {story.media_type === 'video' ? (
              <video 
                src={story.media_url} 
                autoPlay 
                playsInline 
                muted 
                loop 
                className={`w-full h-full object-cover transition-all duration-300 ${
                  story.filter_type === 'mono' ? 'grayscale contrast-125' :
                  story.filter_type === 'vintage' ? 'sepia-[0.6] contrast-[1.1] brightness-[0.9] hue-rotate-[-15deg]' :
                  story.filter_type === 'neon' ? 'saturate-200 hue-rotate-90 brightness-[1.1]' :
                  story.filter_type === 'sepia' ? 'sepia' :
                  story.filter_type === 'cyber' ? 'hue-rotate-[180deg] saturate-150 contrast-125' : ''
                }`}
              />
            ) : (
              <img 
                src={story.media_url} 
                alt="Story content" 
                className={`w-full h-full object-cover transition-all duration-300 ${
                  story.filter_type === 'mono' ? 'grayscale contrast-125' :
                  story.filter_type === 'vintage' ? 'sepia-[0.6] contrast-[1.1] brightness-[0.9] hue-rotate-[-15deg]' :
                  story.filter_type === 'neon' ? 'saturate-200 hue-rotate-90 brightness-[1.1]' :
                  story.filter_type === 'sepia' ? 'sepia' :
                  story.filter_type === 'cyber' ? 'hue-rotate-[180deg] saturate-150 contrast-125' : ''
                }`}
              />
            )}

            {/* Overlay for personal message */}
            {story.personal_message && (
              <div 
                className="absolute inset-x-6 top-24 z-20 text-center cursor-default bg-black/60 backdrop-blur-md border border-neutral-800 p-3 rounded-xl shadow-xl hover:border-[#0066FF]/40 transition duration-300"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-sm font-sans font-semibold text-white tracking-normal leading-normal select-text">
                  {story.personal_message}
                </p>
              </div>
            )}

            {/* Overlay for embedded post */}
            {story.embedded_post_id && (
              <div 
                className="absolute inset-x-6 bottom-[15%] z-20 p-4 rounded-xl bg-black/75 backdrop-blur-lg border border-white/10 shadow-2xl flex flex-col gap-2.5 cursor-default hover:border-[#0066FF]/30 transition"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#0066FF] animate-pulse" />
                    <span className="text-xs text-white font-semibold">@{story.embedded_post_username}</span>
                  </div>
                  <span className="text-[8px] font-mono font-bold text-neutral-400 bg-neutral-900 border border-neutral-800 px-1.5 py-0.5 rounded uppercase tracking-wider">
                    STREAM NODE
                  </span>
                </div>
                
                <div className="flex gap-3 items-center">
                  {story.embedded_post_media_url && (
                    <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 border border-neutral-800 bg-[#0C0C0C]">
                      {story.embedded_post_media_type === 'video' ? (
                        <video 
                          src={story.embedded_post_media_url} 
                          className="w-full h-full object-cover pointer-events-none" 
                          muted 
                          playsInline 
                        />
                      ) : (
                        <img 
                          src={story.embedded_post_media_url} 
                          alt="Shared post visual" 
                          className="w-full h-full object-cover pointer-events-none" 
                        />
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-neutral-300 line-clamp-2 leading-relaxed italic">
                      "{story.embedded_post_caption || 'No description provided.'}"
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tap guidelines */}
            <div className="absolute inset-y-0 left-0 w-1/4" />
            <div className="absolute inset-y-0 right-0 w-1/4" />
          </div>

          {/* Bottom Swipe cue */}
          <div className="absolute bottom-6 inset-x-0 text-center text-xs text-neutral-400 font-sans tracking-widest animate-pulse">
            TAP SIDES TO NAVIGATE
          </div>
        </div>
      </div>
    </AnimatePresence>
  );
}
