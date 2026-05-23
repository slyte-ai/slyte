/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Loader2, X } from 'lucide-react';
import { detectPostType, isAcceptedMediaFile, publishPost } from '../lib/createPost';
import type { PostType } from '../types';

interface CreatePostModalProps {
  open: boolean;
  userId: string;
  onClose: () => void;
  onPosted: () => void;
  onError: (message: string) => void;
}

export default function CreatePostModal({
  open,
  userId,
  onClose,
  onPosted,
  onError,
}: CreatePostModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [postType, setPostType] = useState<PostType | null>(null);
  const [caption, setCaption] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [posting, setPosting] = useState(false);

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setPostType(null);
    setCaption('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    if (posting) return;
    reset();
    onClose();
  };

  useEffect(() => {
    if (!open) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handlePick = () => fileInputRef.current?.click();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (!picked) return;

    if (!isAcceptedMediaFile(picked)) {
      onError('Use JPG, PNG, MP4, or MOV only.');
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(picked);
    setPreviewUrl(URL.createObjectURL(picked));
    setDetecting(true);
    setPostType(null);

    try {
      const type = await detectPostType(picked);
      setPostType(type);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not read file');
      reset();
    } finally {
      setDetecting(false);
    }
  };

  const handlePost = async () => {
    if (!file || !postType || posting) return;
    setPosting(true);
    try {
      await publishPost({ userId, file, caption, type: postType });
      reset();
      onPosted();
      onClose();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to post');
    } finally {
      setPosting(false);
    }
  };

  const isVideo = postType === 'video' || postType === 'short';
  const aspectClass =
    postType === 'short' ? 'aspect-[9/16] max-h-[55vh]' : 'aspect-square max-h-[50vh]';

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,video/mp4,video/quicktime,.jpg,.jpeg,.png,.mp4,.mov"
        className="hidden"
        onChange={handleFile}
      />

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 sm:items-center"
            onClick={handleClose}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="ig-card flex w-full max-w-md flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <header className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={posting}
                  className="text-neutral-300 hover:text-white disabled:opacity-40"
                  aria-label="Close"
                >
                  <X size={22} />
                </button>
                <span className="text-sm font-semibold">Create new post</span>
                <button
                  type="button"
                  onClick={handlePost}
                  disabled={!file || !postType || posting || detecting}
                  className="text-sm font-semibold text-[#0095f6] hover:text-[#1877f2] disabled:opacity-40"
                >
                  {posting ? <Loader2 size={18} className="animate-spin" /> : 'Post'}
                </button>
              </header>

              <div className="flex flex-col gap-4 p-4">
                {!file ? (
                  <button
                    type="button"
                    onClick={handlePick}
                    className="rounded-xl border border-dashed border-neutral-700 py-16 text-sm text-neutral-400 transition hover:border-neutral-500 hover:text-white"
                  >
                    Select photo or video
                  </button>
                ) : (
                  <div
                    className={`relative mx-auto w-full overflow-hidden rounded-lg bg-neutral-950 ${aspectClass}`}
                  >
                    {detecting ? (
                      <div className="flex h-full min-h-[200px] items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-[#0095f6]" />
                      </div>
                    ) : isVideo ? (
                      <video
                        src={previewUrl!}
                        className="h-full w-full object-cover"
                        controls
                        playsInline
                        muted
                        loop
                      />
                    ) : (
                      <img
                        src={previewUrl!}
                        alt="Preview"
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                )}

                {file && !detecting && (
                  <button
                    type="button"
                    onClick={handlePick}
                    className="text-center text-xs text-[#0095f6] hover:underline"
                  >
                    Choose different file
                  </button>
                )}

                <textarea
                  rows={3}
                  placeholder="Write a caption…"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full resize-none bg-transparent text-sm text-white placeholder-neutral-600 focus:outline-none"
                  maxLength={2200}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
