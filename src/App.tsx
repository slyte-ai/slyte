/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, 
  Search, 
  PlusSquare, 
  Heart, 
  User, 
  Settings, 
  LogOut, 
  Bookmark, 
  Grid as GridIcon, 
  Compass, 
  Bell, 
  Loader2, 
  Camera, 
  Video, 
  Check, 
  Mic, 
  Tv, 
  Share2, 
  Volume2, 
  VolumeX, 
  Sliders, 
  Activity, 
  Plus, 
  Zap,
  Globe,
  Music,
  X,
  MessageSquare,
  Star,
  Cog,
  ChevronRight,
  ArrowLeft,
  Clock,
  Lock,
  Ban,
  EyeOff,
  RefreshCw,
  Archive,
  Accessibility
} from 'lucide-react';

import { Profile, Post, Comment, Notification, Story, Message } from './types';
import Feed from './components/Feed';
import ProtectedRoute, { AuthScreen } from './components/ProtectedRoute';
import StoryModal from './components/StoryModal';
import { PRESET_MEDIAS } from './mockData';
import { supabase } from './supabase';
import { fetchProfileForUser } from './lib/authProfile';
import {
  addComment,
  adjustPostLikes,
  fetchAllComments,
  insertPost,
} from './lib/postActions';
import {
  mapFeedPostRow,
  mapFeedPostToLegacyPost,
  mapProfileRow,
  type FeedPostRow,
} from './lib/supabaseMappers';

// API Configuration Hooks targeting the active Node/Express server endpoints
const API_BASE = window.location.origin;

const DEFAULT_CURRENT_USER: Profile = {
  id: 'current-user-id',
  username: 'your.handle',
  full_name: 'Member',
  avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
  bio: 'Visual designer & slyte builder 🚀',
  followers_count: 0,
  following_count: 0
};

export default function App() {
  // Supabase authentication (global session)
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authScreen, setAuthScreen] = useState<AuthScreen>('signin');
  const isLoggedIn = Boolean(authUserId);

  const [currentUser, setCurrentUser] = useState<Profile>(DEFAULT_CURRENT_USER);

  // App core database states (synchronized across Server Rest APIs + Local Fallbacks)
  const [profiles, setProfiles] = useState<Profile[]>(() => {
    const saved = localStorage.getItem('slyte_profiles_data');
    if (saved) return JSON.parse(saved);
    return [];
  });

  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('slyte_messages_data');
    if (saved) return JSON.parse(saved);
    return [];
  });

  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [likesSet, setLikesSet] = useState<Set<string>>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('slyte_liked_posts') : null;
    return saved ? new Set<string>(JSON.parse(saved)) : new Set<string>();
  }); // post IDs liked by current user
  const [savedPostsSet, setSavedPostsSet] = useState<Set<string>>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('slyte_saved_posts') : null;
    return saved ? new Set<string>(JSON.parse(saved)) : new Set<string>();
  }); // post IDs saved/bookmarked

  // DM active state selection
  const [activeThreadUsername, setActiveThreadUsername] = useState<string | null>(null);
  const [dmSearchQuery, setDmSearchQuery] = useState('');
  const [dmInputText, setDmInputText] = useState('');

  // Premium Customization Overlay store selection
  const [isPremiumStoreOpen, setIsPremiumStoreOpen] = useState(false);
  const [selectedGlowColor, setSelectedGlowColor] = useState<string>('#800000');

  // Slyte-style Settings overlay states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsSearchQuery, setSettingsSearchQuery] = useState('');
  const [isAccountPrivate, setIsAccountPrivate] = useState(() => {
    return typeof window !== 'undefined' && localStorage.getItem('slyte_account_privacy') === 'private';
  });
  const [forceHighContrastRings, setForceHighContrastRings] = useState(() => {
    return typeof window !== 'undefined' && localStorage.getItem('slyte_high_contrast_rings') === 'true';
  });

  // Navigation state
  const [activeTab, setActiveTab] = useState<'home' | 'search' | 'create' | 'notifications' | 'profile' | 'messages'>('home');

  // Media Feed parameters & search
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);
  const [feedSort, setFeedSort] = useState<'chronological' | 'foryou'>('chronological');
  const [searchQuery, setSearchQuery] = useState('');
  const [isGlobalMuted, setIsGlobalMuted] = useState(true);

  // Stories interaction
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [activeStoryIdx, setActiveStoryIdx] = useState<number>(-1);

  // Dynamic stories state
  const [stories, setStories] = useState<Story[]>(() => {
    const saved = localStorage.getItem('slyte_stories_data');
    return saved ? JSON.parse(saved) : [];
  });

  // Sync stories to local storage
  useEffect(() => {
    localStorage.setItem('slyte_stories_data', JSON.stringify(stories));
  }, [stories]);

  // Share to Story dialog flow
  const [sharingPost, setSharingPost] = useState<Post | null>(null);
  const [personalMessage, setPersonalMessage] = useState('');
  const [storyFilter, setStoryFilter] = useState<'none' | 'mono' | 'vintage' | 'neon' | 'sepia' | 'cyber'>('none');

  // Video editor pipeline states
  const [videoTrimStart, setVideoTrimStart] = useState<number>(0);
  const [videoTrimEnd, setVideoTrimEnd] = useState<number>(15);
  const [videoFilter, setVideoFilter] = useState<'none' | 'mono' | 'vintage' | 'neon' | 'sepia' | 'cyber'>('none');
  const [videoBgMusicTitle, setVideoBgMusicTitle] = useState<string>('');
  const [videoBgMusicUrl, setVideoBgMusicUrl] = useState<string>('');
  const [isEditorMusicPlaying, setIsEditorMusicPlaying] = useState<boolean>(false);

  // Media upload pipeline states
  const [uploadMediaType, setUploadMediaType] = useState<'image' | 'video'>('video');
  const [uploadMediaUrl, setUploadMediaUrl] = useState('');
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploadLocation, setUploadLocation] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');

  // Profile control states
  const [profileTab, setProfileTab] = useState<'posts' | 'saved'>('posts');
  const [viewingDetailPost, setViewingDetailPost] = useState<Post | null>(null);

  // Network State Simulator for the Bento displays
  const [latency, setLatency] = useState(12);
  const [totalStorage, setTotalStorage] = useState(14.2);

  // Global alert message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Helper trigger alerts
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const applyUserProfile = (profile: Profile) => {
    setCurrentUser(profile);
    localStorage.setItem('slyte_current_user', JSON.stringify(profile));
  };

  const syncProfileForAuthUser = async (userId: string) => {
    const profile = await fetchProfileForUser(userId);
    if (profile) {
      applyUserProfile(profile);
    }
  };

  // Supabase auth session + onAuthStateChange
  useEffect(() => {
    let mounted = true;

    const handleSession = async (userId: string | null) => {
      if (!mounted) return;
      setAuthUserId(userId);
      if (userId) {
        localStorage.setItem('slyte_is_logged_in', 'true');
        await syncProfileForAuthUser(userId);
      } else {
        localStorage.removeItem('slyte_is_logged_in');
        localStorage.removeItem('slyte_current_user');
        setCurrentUser(DEFAULT_CURRENT_USER);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      void handleSession(session?.user?.id ?? null).finally(() => {
        if (mounted) setAuthReady(true);
      });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void handleSession(session?.user?.id ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Load and bootstrap initial setup
  useEffect(() => {
    // Latency fluctuation for realistic aesthetic values
    const latInterval = setInterval(() => {
      setLatency(prev => {
        const diff = Math.random() > 0.5 ? 1 : -1;
        const next = prev + diff;
        return next > 25 ? 12 : next < 4 ? 6 : next;
      });
    }, 4500);

    // Bootstrap/Seed State synchronization from Backend with LocalStorage backups
    fetchData();

    return () => clearInterval(latInterval);
  }, []);

  const fetchData = async () => {
    try {
      const { data: profileRows, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, full_name, profile_picture_url, bio');

      if (!profilesError && profileRows?.length) {
        setProfiles(
          profileRows.map((row) =>
            mapProfileRow({
              id: row.id,
              username: row.username,
              full_name: row.full_name ?? null,
              profile_picture_url: row.profile_picture_url ?? null,
              bio: row.bio ?? null,
            })
          )
        );
      } else {
        const resProfiles = await fetch(`${API_BASE}/api/profiles`);
        if (resProfiles.ok) {
          setProfiles(await resProfiles.json());
        } else {
          setProfiles([]);
        }
      }

      const { data: feedRows, error: feedError } = await supabase
        .from('feed_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (!feedError && feedRows) {
        setPosts(
          feedRows.map((row) =>
            mapFeedPostToLegacyPost(mapFeedPostRow(row as FeedPostRow))
          )
        );
      } else {
        const resPosts = await fetch(`${API_BASE}/api/posts`);
        if (resPosts.ok) {
          setPosts(await resPosts.json());
        } else {
          setPosts([]);
        }
      }

      try {
        setComments(await fetchAllComments());
      } catch {
        const resComments = await fetch(`${API_BASE}/api/comments`);
        if (resComments.ok) {
          setComments(await resComments.json());
        } else {
          setComments([]);
        }
      }

      const resNotifications = await fetch(`${API_BASE}/api/notifications`);
      if (resNotifications.ok) {
        setNotifications(await resNotifications.json());
      } else {
        setNotifications([]);
      }
    } catch {
      setProfiles([]);
      setPosts([]);
      setComments([]);
      setNotifications([]);
    }
  };

  // Sync state to LocalStorage
  useEffect(() => {
    localStorage.setItem('slyte_offline_comments', JSON.stringify(comments));
  }, [comments]);

  useEffect(() => {
    localStorage.setItem('slyte_local_posts', JSON.stringify(posts));
  }, [posts]);

  useEffect(() => {
    localStorage.setItem('slyte_profiles_data', JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    localStorage.setItem('slyte_messages_data', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('slyte_account_privacy', isAccountPrivate ? 'private' : 'public');
  }, [isAccountPrivate]);

  useEffect(() => {
    localStorage.setItem('slyte_high_contrast_rings', String(forceHighContrastRings));
  }, [forceHighContrastRings]);

  // Set selected glow color based on user when premium store opens
  useEffect(() => {
    if (isPremiumStoreOpen && currentUser?.premium_glow_color) {
      setSelectedGlowColor(currentUser.premium_glow_color as any);
    }
  }, [isPremiumStoreOpen, currentUser]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setAuthUserId(null);
    setCurrentUser(DEFAULT_CURRENT_USER);
    setAuthScreen('signin');
    setActiveTab('home');
    localStorage.removeItem('slyte_is_logged_in');
    localStorage.removeItem('slyte_current_user');
    showToast('Signed out.');
  };

  // Interactive comment posting handler
  const handlePostComment = async (postId: string, commentText: string) => {
    const userId = authUserId ?? currentUser.id;
    try {
      const created = await addComment(postId, userId, commentText);
      setComments((prev) => [...prev, created]);
    } catch (err) {
      console.error('[App] Comment failed:', err);
      showToast(
        err instanceof Error ? err.message : 'Failed to post comment.'
      );
    }
  };

  // Interactive Double click & like handler
  const handleLikePost = async (postId: string) => {
    const userId = authUserId ?? currentUser.id;
    if (!userId) return;

    const alreadyLiked = likesSet.has(postId);
    try {
      const newCount = await adjustPostLikes(postId, alreadyLiked ? -1 : 1);

      setLikesSet((prev) => {
        const next = new Set(prev);
        if (alreadyLiked) next.delete(postId);
        else next.add(postId);
        localStorage.setItem('slyte_liked_posts', JSON.stringify(Array.from(next)));
        return next;
      });

      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, likes_count: newCount } : p))
      );
      setFeedRefreshKey((k) => k + 1);
    } catch (err) {
      console.error('[App] Like failed:', err);
      showToast(err instanceof Error ? err.message : 'Like failed.');
    }
  };

  // Saved/Bookmarks toggle handler
  const handleToggleSavePost = (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextSaved = new Set(savedPostsSet);
    if (nextSaved.has(postId)) {
      nextSaved.delete(postId);
      showToast('Removed from Saved Bookmarks.');
    } else {
      nextSaved.add(postId);
      showToast('Added to Saved Bookmarks container.');
    }
    setSavedPostsSet(nextSaved);
    localStorage.setItem('slyte_saved_posts', JSON.stringify(Array.from(nextSaved)));
  };

  // Story bar triggering
  const handleStartStory = (story: Story, index: number) => {
    setSelectedStory(story);
    setActiveStoryIdx(index);
  };

  const handleNextStory = () => {
    const nextIdx = activeStoryIdx + 1;
    if (nextIdx < stories.length) {
      setSelectedStory(stories[nextIdx]);
      setActiveStoryIdx(nextIdx);
    } else {
      // Finished all stories
      setSelectedStory(null);
      setActiveStoryIdx(-1);
    }
  };

  const handlePrevStory = () => {
    const prevIdx = activeStoryIdx - 1;
    if (prevIdx >= 0) {
      setSelectedStory(stories[prevIdx]);
      setActiveStoryIdx(prevIdx);
    } else {
      setSelectedStory(null);
      setActiveStoryIdx(-1);
    }
  };

  // Notifications toggle: Follow Back trigger
  const handleNotificationFollowBack = async (notiId: string, username: string) => {
    const targetNoti = notifications.find(n => n.id === notiId);
    const wasFollowing = targetNoti?.is_following || false;

    // Transmit backend follow-toggle event
    try {
      const res = await fetch(`${API_BASE}/api/notifications/follow-toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host_profile_id: currentUser.id,
          target_username: username,
          is_following: !wasFollowing
        })
      });

      if (res.ok) {
        // Safe backend response verified! Synchronize all dynamic database counters onto frontend
        await fetchData();

        // Update current logged in user profile details from backend
        const userRes = await fetch(`${API_BASE}/api/profiles`);
        if (userRes.ok) {
          const profilesData: Profile[] = await userRes.json();
          const me = profilesData.find(p => p.id === currentUser.id);
          if (me) {
            setCurrentUser(me);
            localStorage.setItem('slyte_current_user', JSON.stringify(me));
          }
        }

        showToast(wasFollowing ? `Unfollowed @${username}` : `Now following @${username}!`);
      } else {
        throw new Error();
      }

    } catch (e) {
      showToast('Action failed: server disconnected.');
    }
  };

  // Extended Media Upload Pipeline Handler with simulated delay
  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadMediaUrl.trim()) {
      showToast('Specify a valid high-resolution media link.');
      return;
    }

    setIsUploading(true);
    setUploadProgressText('Optimizing media streams & compressing audio blocks...');

    // Progress bar and state simulations
    setTimeout(() => {
      setUploadProgressText('Generating stream cache frames & optimizing CDN routes...');
    }, 1000);

    setTimeout(async () => {
      try {
        const userId = authUserId ?? currentUser.id;
        await insertPost({
          userId,
          contentUrl: uploadMediaUrl.trim(),
          caption: uploadCaption.trim() || 'No description supplied.',
          type: uploadMediaType === 'image' ? 'photo' : 'video',
        });

        await fetchData();
        setFeedRefreshKey((k) => k + 1);
        showToast('Slyte stream published successfully!');
      } catch (err) {
        console.error('[App] Create post failed:', err);
        showToast(
          err instanceof Error ? err.message : 'Failed to deploy video asset.'
        );
      }

      setTotalStorage(prev => parseFloat((prev + 0.15).toFixed(2))); // Update storage simulation indicator
      setIsUploading(false);
      setUploadMediaUrl('');
      setUploadCaption('');
      setUploadLocation('');
      
      // Reset Video Editor options
      setVideoTrimStart(0);
      setVideoTrimEnd(15);
      setVideoFilter('none');
      setVideoBgMusicTitle('');
      setVideoBgMusicUrl('');
      setIsEditorMusicPlaying(false);

      setActiveTab('home'); // Index route redirection
    }, 2500);
  };

  // Real-time filtering search mechanism
  const filteredPostsList = posts.filter(post => {
    const captionMatch = post.caption.toLowerCase().includes(searchQuery.toLowerCase());
    const userMatch = (post.username || '').toLowerCase().includes(searchQuery.toLowerCase());
    const locationMatch = post.location.toLowerCase().includes(searchQuery.toLowerCase());
    return captionMatch || userMatch || locationMatch;
  });

  // Chronological Sorting Toggles
  const sortedPosts = feedSort === 'chronological' 
    ? [...filteredPostsList].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    : [...filteredPostsList].sort(() => Math.random() - 0.5); // Random seed shuffle

  // Select profile to view in dashboard modal/tab switcher
  const handleUserSelectProfile = (username: string) => {
    if (username === currentUser.username) {
      setActiveTab('profile');
      setProfileTab('posts');
    } else {
      showToast(`Viewing external stream cards of @${username}`);
      setSearchQuery(username);
      setActiveTab('search');
    }
  };

  // Publish Shared Post to Story
  const handlePublishStory = () => {
    if (!sharingPost) return;

    const newStory: Story = {
      id: `story-shared-${Date.now()}`,
      username: currentUser.username,
      avatar_url: currentUser.avatar_url,
      media_url: sharingPost.media_url,
      media_type: sharingPost.media_type,
      personal_message: personalMessage.trim() || undefined,
      filter_type: storyFilter,
      embedded_post_id: sharingPost.id,
      embedded_post_username: sharingPost.username || 'anonymous',
      embedded_post_caption: sharingPost.caption,
      embedded_post_media_url: sharingPost.media_url,
      embedded_post_media_type: sharingPost.media_type
    };

    setStories(prev => [newStory, ...prev]);
    setSharingPost(null);
    setPersonalMessage('');
    setStoryFilter('none');
    showToast('Published shared post to your Story!');
  };

  return (
    <div id="slyte-root" className="min-h-screen w-full bg-[#050505] text-white flex items-center justify-center overflow-x-hidden font-sans p-0 lg:p-4 selection:bg-[#0066FF] selection:text-white">
      
      {/* Toast container */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed top-6 z-[100] px-4 py-2.5 rounded-xl bg-[#0066FF] text-white border border-sky-400 font-sans text-xs font-semibold shadow-lg shadow-[#0066FF]/30 flex items-center gap-2"
          >
            <Activity size={14} className="animate-pulse" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Primary Layout wrapper featuring full Bento Grid styling */}
      <div className="flex w-full max-w-6xl items-center justify-between gap-6 px-3 md:px-8 xl:px-12">
        
        {/* Bento Column 1: Left specification modules (hidden on mobile, optimized on large screen sizes) */}
        <div id="bento-col-1" className="hidden lg:flex flex-col w-[300px] xl:w-[325px] gap-5 shrink-0 self-stretch justify-center">
          {/* Brand Introduction Card info */}
          <div className="bg-[#0A0A0A] border border-slate-900/80 p-5 rounded-3xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#0066FF] to-cyan-500 opacity-5 blur-xl group-hover:opacity-15 transition-opacity" />
            
            <div className="flex items-center gap-2 mb-3">
              <h1 className="text-3xl font-extrabold tracking-tighter bg-gradient-to-r from-white via-cyan-300 to-[#0066FF] bg-clip-text text-transparent">Slyte</h1>
              <div className="ml-auto w-2 h-2 rounded-full bg-[#0066FF] animate-ping" />
            </div>

            <p className="text-[#8E8E8E] text-[11px] leading-relaxed mb-4 italic">
              Next-generation high-performance ad-free format. Specially formatted mobile viewport stream container.
            </p>

            <div className="flex flex-wrap gap-1.5">
              <span className="px-2.5 py-0.5 bg-[#0066FF]/10 border border-[#0066FF]/30 rounded-full text-[#0066FF] text-[8px] font-bold uppercase tracking-wider">
                V2.4 Active
              </span>
              <span className="px-2.5 py-0.5 bg-white/5 border border-white/10 rounded-full text-[#8E8E8E] text-[8px] font-bold uppercase tracking-wider">
                Lossless Video
              </span>
            </div>
          </div>

          {/* Quick Metrics Subgrid of Bento Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#0A0A0A] border border-slate-900/80 p-4 rounded-2xl flex flex-col justify-between hover:border-slate-800 transition-colors">
              <span className="text-[#8E8E8E] text-[9px] uppercase font-bold tracking-widest">Network Node</span>
              <span className="text-lg font-mono font-bold mt-1.5 flex items-center gap-1.5 text-white">
                <Globe size={11} className="text-[#0066FF]" />
                Cloud
              </span>
            </div>

            <div className="bg-[#0A0A0A] border border-slate-900/80 p-4 rounded-2xl flex flex-col justify-between hover:border-slate-800 transition-colors">
              <span className="text-[#8E8E8E] text-[9px] uppercase font-bold tracking-widest">Latency ping</span>
              <span className="text-lg font-mono font-bold mt-1.5 text-[#0066FF] flex items-center gap-1">
                {latency}ms
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </span>
            </div>

            {/* Storage container usage */}
            <div className="bg-[#0A0A0A] border border-slate-900/80 p-4 rounded-2xl col-span-2 flex flex-col justify-between hover:border-slate-800 transition-colors">
              <div className="flex items-center justify-between w-full">
                <span className="text-[#8E8E8E] text-[9px] uppercase font-bold tracking-widest">Media cache</span>
                <span className="text-xs font-mono font-medium text-white">{totalStorage.toFixed(2)}GB</span>
              </div>
              <div className="w-full bg-neutral-900 h-1 rounded-full mt-3 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#0066FF] to-cyan-400" style={{ width: `${(totalStorage/20)*100}%` }} />
              </div>
            </div>

            {/* Simulated Live Broadcast Channels using Stories avatars */}
            <div className="bg-[#0A0A0A] border border-slate-900/80 p-4 rounded-2xl col-span-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#8E8E8E] text-[9px] uppercase font-bold tracking-widest">Live Streams</span>
                <span className="text-[8px] bg-[#0066FF] text-white font-bold tracking-wider rounded-sm px-1">4 ACTIVE</span>
              </div>
              <div className="flex -space-x-2 mt-1 select-none">
                {stories.slice(0, 4).map((story) => (
                  <img
                    key={story.id}
                    src={story.avatar_url}
                    alt={story.username}
                    className="w-7 h-7 rounded-full object-cover border border-black ring-1 ring-[#0066FF]"
                  />
                ))}
                <div className="w-7 h-7 rounded-full bg-slate-900 border border-black flex items-center justify-center text-[10px] text-neutral-400 font-bold font-mono">
                  +12
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bento Column 2: Center Viewport Layout Structure (Strictly responsive mobile-first width) */}
        <div id="bento-col-2" className="flex-1 max-w-[430px] lg:max-w-[390px] h-screen lg:h-[720px] bg-black lg:rounded-[42px] border-0 lg:border-[8px] lg:border-[#1A1A1A] lg:shadow-[0_0_80px_rgba(0,102,255,0.12)] flex flex-col overflow-hidden relative">
          
          {/* Top Notch Dynamic Island Styling bar for premium mobile look (Desktop only component) */}
          <div className="hidden lg:flex h-10 w-full bg-black items-center px-6 justify-between select-none shrink-0 border-b border-white/5 z-40 text-xs text-neutral-400 font-mono">
            <span className="font-bold">13:34</span>
            <div className="w-16 h-4 bg-[#111] rounded-full border border-slate-900 flex items-center justify-center text-[8px] font-bold text-sky-400 tracking-widest gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[#0066FF] animate-pulse" />
              Slyte
            </div>
            <div className="flex items-center gap-1 text-[10px]">
              <Zap size={10} className="text-[#0066FF]" />
              <span>5G</span>
            </div>
          </div>

          {/* APPLICATION MAIN ROUTER CONTAINER */}
          <ProtectedRoute
            userId={authUserId}
            authReady={authReady}
            authScreen={authScreen}
            onNavigateToSignIn={() => setAuthScreen('signin')}
            onNavigateToSignUp={() => setAuthScreen('signup')}
          >
            <div className="flex-1 flex flex-col relative bg-black overflow-hidden">
              
              {/* Core view renderings */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden pb-18">
                
                {activeTab === 'home' && (
                  /* VIEW 1: HOME FEED */
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                  >
                    {/* Fixed Feed Top Header banner */}
                    <div className="sticky top-0 bg-black/85 backdrop-blur-md border-b border-slate-920 z-30 px-4 py-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-extrabold tracking-tighter bg-gradient-to-r from-white via-neutral-100 to-[#0066FF] bg-clip-text text-transparent">Slyte</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => setIsGlobalMuted(!isGlobalMuted)} 
                          className="p-1.5 text-neutral-400 hover:text-white rounded-full bg-slate-950/60 border border-slate-900 transition-colors"
                        >
                          {isGlobalMuted ? <VolumeX size={14} className="text-rose-500" /> : <Volume2 size={14} className="text-[#0066FF]" />}
                        </button>
                        <div className="relative">
                          <Bell size={18} className="text-neutral-300 hover:text-white transition-colors cursor-pointer" onClick={() => setActiveTab('notifications')} />
                          <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#0066FF] animate-ping" />
                        </div>

                        <button 
                          onClick={() => setActiveTab('messages')}
                          className="relative p-1.5 text-neutral-400 hover:text-[#0066FF] rounded-full bg-slate-950/60 border border-slate-900 transition-colors"
                          id="feed-inbox-btn"
                          title="Open Messages Inbox"
                        >
                          <MessageSquare size={14} />
                          <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#0066FF]" />
                        </button>
                      </div>
                    </div>

                    {/* Chronological sorting & curation pills */}
                    <div className="px-4 py-2 border-b border-slate-950 flex items-center gap-2 bg-black/40">
                      <button
                        onClick={() => setFeedSort('chronological')}
                        className={`px-3 py-1 rounded-full text-[10px] font-sans font-bold transition ${
                          feedSort === 'chronological' 
                            ? 'bg-[#0066FF] text-white shadow-md shadow-blue-500/10' 
                            : 'bg-[#0A0A0A] text-[#8E8E8E] border border-slate-900 hover:text-white'
                        }`}
                      >
                        Chronological Feed
                      </button>
                      <button
                        onClick={() => {
                          setFeedSort('foryou');
                          showToast('Shuffling feed engine seed dynamics.');
                        }}
                        className={`px-3 py-1 rounded-full text-[10px] font-sans font-bold transition ${
                          feedSort === 'foryou' 
                            ? 'bg-[#0066FF] text-white shadow-md shadow-blue-500/10' 
                            : 'bg-[#0A0A0A] text-[#8E8E8E] border border-slate-900 hover:text-white'
                        }`}
                      >
                        For You Shuffled
                      </button>
                    </div>

                    {/* High-Contrast Interactive Stories horizontal list */}
                    <div className="py-4 border-b border-slate-950 bg-[#020202] flex gap-3 overflow-x-auto px-4 scrollbar-none no-select">
                      {/* Active profile own story link */}
                      <div className="flex flex-col items-center gap-1 shrink-0 cursor-pointer">
                        <div className="relative inline-block">
                          <img 
                            src={currentUser.avatar_url} 
                            alt={currentUser.username} 
                            className="w-14 h-14 rounded-full object-cover border-2 border-neutral-900 bg-slate-900"
                          />
                          <div className="absolute bottom-0 right-0 p-0.5 rounded-full bg-[#0066FF] border-2 border-black text-white">
                            <Plus size={10} strokeWidth={4} />
                          </div>
                        </div>
                        <span className="text-[9px] text-[#8E8E8E] max-w-[55px] truncate text-center">Your Story</span>
                      </div>

                      {/* Active stories channel */}
                      {stories.map((story, idx) => {
                        return (
                          <div 
                            key={story.id} 
                            onClick={() => handleStartStory(story, idx)}
                            className="flex flex-col items-center gap-1 shrink-0 cursor-pointer"
                            id={`story-icon-${story.id}`}
                          >
                            <div className="rounded-full p-[2px] bg-gradient-to-tr from-[#0066FF] via-cyan-400 to-indigo-600 hover:scale-105 transition duration-300">
                              <img 
                                src={story.avatar_url} 
                                alt={story.username} 
                                className="w-[52px] h-[52px] rounded-full object-cover border-2 border-black"
                              />
                            </div>
                            <span className="text-[9px] text-white font-medium max-w-[55px] truncate text-center">{story.username}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Supabase feed (feed_posts view) */}
                    <Feed
                      currentUserId={authUserId ?? undefined}
                      refreshKey={feedRefreshKey}
                    />
                  </motion.div>
                )}

                {activeTab === 'search' && (
                  /* VIEW 2: SEARCH & EXPLORE MASONRY GRID */
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="p-4"
                  >
                    {/* Header */}
                    <div className="mb-4">
                      <h3 className="text-lg font-extrabold tracking-tight">Explore Ecosystem</h3>
                      <p className="text-[#8E8E8E] text-[10px] uppercase tracking-wider">Search across digital channels & locations</p>
                    </div>

                    {/* Search Field */}
                    <div className="relative mb-5">
                      <span className="absolute inset-y-0 left-3.5 flex items-center text-neutral-500">
                        <Search size={14} />
                      </span>
                      <input
                        type="text"
                        placeholder="Filter by caption text, tags, locations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#0A0A0A] border border-slate-910 rounded-full py-2.5 pl-10 pr-4 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#0066FF] transition-colors"
                      />
                      {searchQuery && (
                        <button 
                          onClick={() => setSearchQuery('')} 
                          className="absolute inset-y-0 right-3.5 text-[10px] font-bold text-neutral-500 hover:text-white"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {/* Responsive masonry style explore grid mapping all matching elements */}
                    <div className="grid grid-cols-3 gap-1.5 rounded-2xl overflow-hidden">
                      {filteredPostsList.map((post, idx) => {
                        const isVideo = post.media_type === 'video';
                        return (
                          <div
                            key={post.id}
                            id={`explore-thumb-${post.id}`}
                            onClick={() => {
                              setViewingDetailPost(post);
                            }}
                            className={`relative aspect-square bg-[#050505] cursor-pointer group overflow-hidden ${
                              idx % 7 === 0 ? 'col-span-2 row-span-2 aspect-auto h-full min-h-[140px]' : ''
                            }`}
                          >
                            <img
                              src={post.thumbnail_url || post.media_url}
                              alt="Explore asset"
                              className="w-full h-full object-cover filter brightness-95 group-hover:scale-105 group-hover:brightness-100 transition-all duration-300"
                            />
                            
                            {/* Camera or video overlay indicator badges */}
                            <div className="absolute top-2 right-2 p-1 rounded-sm bg-black/70 border border-white/10 text-white select-none pointer-events-none">
                              {isVideo ? <Video size={10} className="text-sky-400" /> : <Camera size={10} />}
                            </div>

                            {/* Minimal slide up meta data detailing likes/comments when hovered */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col justify-end p-2.5 select-none text-left">
                              <span className="text-[10px] font-bold truncate">@{post.username || 'slyte_usr'}</span>
                              <div className="flex gap-2 mt-0.5 text-[8px] font-mono text-neutral-300">
                                <span className="flex items-center gap-0.5"><Heart size={8} fill="#0066FF" /> {post.likes_count}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {filteredPostsList.length === 0 && (
                      <div className="py-24 text-center text-neutral-600 flex flex-col items-center justify-center gap-1">
                        <Search size={22} className="text-neutral-500 mb-2" />
                        <span className="text-xs font-semibold text-neutral-500">Search Results Null</span>
                        <p className="text-[10px] text-neutral-600 max-w-[180px]">No stream records match. Try searching another term.</p>
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'create' && (
                  /* VIEW 3: HIGH EFFICIENCY BROADCAST PIPELINE (Long-form creator tool) */
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="p-4 no-select"
                  >
                    <div className="mb-4">
                      <h3 className="text-lg font-extrabold tracking-tight">Stream Pipeline</h3>
                      <p className="text-[#8E8E8E] text-[10px] uppercase tracking-wider">Deploy high-performance multimedia feeds</p>
                    </div>

                    {/* Segmented Controller choices */}
                    <div className="flex bg-[#0A0A0A] border border-slate-900 rounded-lg p-1 mb-5">
                      <button
                        type="button"
                        onClick={() => setUploadMediaType('video')}
                        className={`flex-1 py-1.5 text-[10px] uppercase font-bold rounded-md transition flex items-center justify-center gap-1.5 ${
                          uploadMediaType === 'video' ? 'bg-[#0066FF] text-white shadow' : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        <Video size={12} />
                        Longer Format Video
                      </button>
                      <button
                        type="button"
                        onClick={() => setUploadMediaType('image')}
                        className={`flex-1 py-1.5 text-[10px] uppercase font-bold rounded-md transition flex items-center justify-center gap-1.5 ${
                          uploadMediaType === 'image' ? 'bg-[#0066FF] text-white shadow' : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        <Camera size={12} />
                        Post Picture Space
                      </button>
                    </div>

                    {/* Quick Seed Presets to facilitate direct sandbox uploads */}
                    <div className="bg-[#050505] border border-slate-900/60 p-3 rounded-xl mb-5">
                      <span className="text-[8px] tracking-wider uppercase font-mono font-bold text-sky-400 block mb-2">
                        One-Click Preset Stream links
                      </span>
                      <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                        {PRESET_MEDIAS.filter(m => m.type === uploadMediaType).map((m, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setUploadMediaUrl(m.url);
                              setUploadCaption(m.caption);
                              setUploadLocation(m.location);
                              showToast(`Loaded preset media metadata.`);
                            }}
                            className="w-full text-left bg-[#0A0A0A] border border-slate-900 px-3 py-2 rounded-lg text-[10px] font-medium text-neutral-300 hover:border-[#0066FF] hover:text-white transition flex items-center justify-between"
                          >
                            <span>{m.name}</span>
                            <span className="text-[8px] font-mono opacity-60 uppercase">{m.type} URL</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <form onSubmit={handleCreatePost} className="flex flex-col gap-4">
                      <div>
                        <label className="block text-[9px] text-neutral-400 uppercase tracking-widest font-mono mb-1 font-bold">
                          Media Stream URL
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Drop direct mp4/jpg/png file path here..."
                          value={uploadMediaUrl}
                          onChange={(e) => setUploadMediaUrl(e.target.value)}
                          className="w-full bg-[#0A0A0A] border border-slate-900 rounded-xl py-3 px-4 text-xs font-mono text-white focus:outline-none focus:border-[#0066FF] transition-colors"
                        />
                      </div>

                      {/* Interactive Video Shaping and Trim Studio */}
                      {uploadMediaType === 'video' && uploadMediaUrl.trim() && (
                        <div className="bg-[#0A0A0A] border border-slate-900 rounded-2xl p-4 flex flex-col gap-3">
                          <div className="flex items-center justify-between border-b border-slate-900 pb-2 mb-1">
                            <div>
                              <h4 className="text-xs font-extrabold text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Video size={12} />
                                Slyte Video Editing Studio
                              </h4>
                              <p className="text-[8px] text-neutral-400 font-mono">Trim, apply high-contrast filters, & sync audio tracks</p>
                            </div>
                            <span className="text-[8px] font-mono font-bold text-[#0066FF] bg-[#0066FF]/10 border border-[#0066FF]/20 px-1.5 py-0.5 rounded tracking-wide">
                              STUDIO MODE
                            </span>
                          </div>

                          {/* Real-time Filtered Trimmed Video Preview */}
                          <video 
                            src={uploadMediaUrl} 
                            autoPlay 
                            loop 
                            muted
                            playsInline 
                            className={`aspect-video w-full rounded-xl bg-[#030303] object-cover border border-slate-900 ${
                              videoFilter === 'mono' ? 'grayscale contrast-125' :
                              videoFilter === 'vintage' ? 'sepia-[0.6] contrast-[1.1] brightness-[0.9] hue-rotate-[-15deg]' :
                              videoFilter === 'neon' ? 'saturate-200 hue-rotate-90 brightness-[1.1]' :
                              videoFilter === 'sepia' ? 'sepia' :
                              videoFilter === 'cyber' ? 'hue-rotate-[180deg] saturate-150 contrast-125' : ''
                            }`}
                            onTimeUpdate={(e) => {
                              const video = e.currentTarget;
                              if (video.currentTime < videoTrimStart) {
                                video.currentTime = videoTrimStart;
                              }
                              if (video.currentTime > videoTrimEnd) {
                                video.currentTime = videoTrimStart;
                              }
                            }}
                          />

                          {/* Hidden preview audio element */}
                          {videoBgMusicUrl && isEditorMusicPlaying && (
                            <audio src={videoBgMusicUrl} autoPlay loop />
                          )}

                          {/* TRIMMING CONTROLS */}
                          <div className="bg-slate-950 border border-slate-900 p-3 rounded-xl flex flex-col gap-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] text-[#8E8E8E] font-bold uppercase tracking-widest font-mono">Precision Trimmer</span>
                              <span className="text-[9px] font-mono text-[#0066FF] font-black">
                                {videoTrimStart.toFixed(0)}s - {videoTrimEnd.toFixed(0)}s ({(videoTrimEnd - videoTrimStart).toFixed(0)}s Clip)
                              </span>
                            </div>
                            
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[8px] text-neutral-400 font-mono w-6 shrink-0 font-bold">START:</span>
                                <input
                                  type="range"
                                  min="0"
                                  max="28"
                                  step="1"
                                  value={videoTrimStart}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    if (val < videoTrimEnd - 1) {
                                      setVideoTrimStart(val);
                                    }
                                  }}
                                  className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-[#0066FF]"
                                />
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-[8px] text-neutral-400 font-mono w-6 shrink-0 font-bold">END:</span>
                                <input
                                  type="range"
                                  min="2"
                                  max="30"
                                  step="1"
                                  value={videoTrimEnd}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    if (val > videoTrimStart + 1) {
                                      setVideoTrimEnd(val);
                                    }
                                  }}
                                  className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-[#0066FF]"
                                />
                              </div>
                            </div>
                          </div>

                          {/* FILTER SELECT MATRIX */}
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[9px] text-[#8E8E8E] font-bold uppercase tracking-widest font-mono">Select Video Filter Accent</span>
                            <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
                              {([
                                { id: 'none', label: 'Original' },
                                { id: 'mono', label: 'Mono Block' },
                                { id: 'vintage', label: 'Vintage' },
                                { id: 'neon', label: 'Neon Glow' },
                                { id: 'sepia', label: 'Warm Sepia' },
                                { id: 'cyber', label: 'Cyberpunk' }
                              ] as const).map((filt) => (
                                <button
                                  key={filt.id}
                                  type="button"
                                  onClick={() => setVideoFilter(filt.id)}
                                  className={`px-3 py-1.5 rounded-lg text-[9px] font-mono uppercase shrink-0 font-bold transition ${
                                    videoFilter === filt.id 
                                      ? 'bg-gradient-to-r from-[#0066FF] to-blue-500 text-white shadow' 
                                      : 'bg-slate-950 border border-slate-900 text-neutral-400 hover:text-white'
                                  }`}
                                >
                                  {filt.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* BACKGROUND MUSIC AUDIO SYSTEM */}
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] text-[#8E8E8E] font-bold uppercase tracking-widest font-mono flex items-center gap-1.5">
                                <Music size={10} className="text-[#0066FF]" />
                                royalty-free background music
                              </span>
                              {videoBgMusicUrl && (
                                <button
                                  type="button"
                                  onClick={() => setIsEditorMusicPlaying(!isEditorMusicPlaying)}
                                  className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase transition ${
                                    isEditorMusicPlaying 
                                      ? 'bg-emerald-600 text-white animate-pulse' 
                                      : 'bg-slate-800 text-neutral-200 hover:bg-slate-700'
                                  }`}
                                >
                                  {isEditorMusicPlaying ? '❚❚ Mute' : '▶ Listen'}
                                </button>
                              )}
                            </div>
                            
                            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                              {([
                                { title: 'No Music Track', url: '' },
                                { title: 'Neon Synth', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
                                { title: 'Ambient Cloud', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
                                { title: 'Lo-Fi Chill', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3' },
                                { title: 'Heavy Cyberbass', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3' }
                              ]).map((track) => (
                                <button
                                  key={track.title}
                                  type="button"
                                  onClick={() => {
                                    setVideoBgMusicTitle(track.url ? track.title : '');
                                    setVideoBgMusicUrl(track.url);
                                    if (track.url) setIsEditorMusicPlaying(true);
                                    else setIsEditorMusicPlaying(false);
                                  }}
                                  className={`px-3 py-2 rounded-xl text-[9px] font-sans font-semibold shrink-0 transition flex items-center gap-1.5 ${
                                    videoBgMusicUrl === track.url 
                                      ? 'bg-sky-950 border border-sky-400 text-sky-400' 
                                      : 'bg-slate-950 border border-slate-900 text-neutral-400 hover:text-white'
                                  }`}
                                >
                                  {track.url && <Music size={9} />}
                                  {track.title}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-[9px] text-[#8E8E8E] uppercase tracking-widest font-mono mb-1 font-bold">
                          Describe caption
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Inject tags, procedural structures description or credit details..."
                          value={uploadCaption}
                          onChange={(e) => setUploadCaption(e.target.value)}
                          className="w-full bg-[#0A0A0A] border border-slate-900 rounded-xl py-2 px-4 text-xs text-white focus:outline-none focus:border-[#0066FF] transition-colors resize-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] text-neutral-400 uppercase tracking-widest font-mono mb-1 font-bold">
                          Geo Coordinates Location
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Reykjavik, Iceland"
                          value={uploadLocation}
                          onChange={(e) => setUploadLocation(e.target.value)}
                          className="w-full bg-[#0A0A0A] border border-slate-900 rounded-xl py-3 px-4 text-xs text-white focus:outline-none focus:border-[#0066FF] transition-colors"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isUploading}
                        className="w-full mt-2 bg-[#0066FF] text-white hover:bg-blue-600 font-sans font-bold text-xs rounded-xl py-3.5 shadow-lg shadow-blue-500/10 active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <Share2 size={13} />
                        Share to Slyte Ecosystem
                      </button>
                    </form>
                  </motion.div>
                )}

                {activeTab === 'notifications' && (
                  /* VIEW 4: INTERACTIVE NOTIFICATIONS FEED TABLE */
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="p-4 no-select font-sans"
                  >
                    <div className="mb-4">
                      <h3 className="text-lg font-extrabold tracking-tight">Signal Feed</h3>
                      <p className="text-[#8E8E8E] text-[10px] uppercase tracking-wider">Dynamic telemetry logs & activities</p>
                    </div>

                    <div className="flex flex-col border border-slate-950 rounded-2xl overflow-hidden bg-black/20">
                      {notifications.map((noti) => {
                        const isFollowType = noti.type === 'follow';
                        return (
                          <div 
                            key={noti.id} 
                            id={`noti-${noti.id}`} 
                            className="flex items-center justify-between p-3.5 border-b border-slate-950 last:border-0 hover:bg-[#020202] transition"
                          >
                            <div className="flex items-center gap-3">
                              <img
                                src={noti.source_avatar}
                                alt={noti.source_username}
                                className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-800"
                              />
                              <div>
                                <p className="text-xs text-white">
                                  <span className="font-semibold text-sky-400 mr-1.5">@{noti.source_username}</span>
                                  {noti.type === 'like' && 'liked your media artifact.'}
                                  {noti.type === 'comment' && 'commented on your timeline stream.'}
                                  {noti.type === 'follow' && 'requested to inspect your signals.'}
                                </p>
                                <span className="text-[9px] text-neutral-500 font-mono tracking-tighter uppercase mt-0.5 block">
                                  {noti.timestamp}
                                </span>
                              </div>
                            </div>

                            {isFollowType && (
                              <button
                                onClick={() => handleNotificationFollowBack(noti.id, noti.source_username)}
                                className={`px-3 py-1 rounded-full text-[9px] font-bold tracking-tight uppercase border transition ${
                                  noti.is_following
                                    ? 'bg-transparent text-neutral-400 border-slate-900'
                                    : 'bg-[#0066FF] text-white border-[#0066FF] shadow-xs active:scale-95'
                                }`}
                              >
                                {noti.is_following ? 'Following' : 'Follow Back'}
                              </button>
                            )}
                          </div>
                        );
                      })}

                      {notifications.length === 0 && (
                        <div className="py-24 text-center text-neutral-500 flex flex-col items-center justify-center gap-1.5">
                          <Bell size={24} className="text-neutral-500 animate-pulse" />
                          <span className="text-xs font-semibold text-neutral-400">Signal Feed Clean</span>
                          <p className="text-[10px] text-neutral-600">All alerts cleared from server telemetry.</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {activeTab === 'messages' && (
                  /* VIEW: DIRECT MULTI-USER MESSAGING ENGINE */
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="flex flex-col min-h-[calc(100vh-130px)] bg-black font-sans"
                  >
                    {activeThreadUsername ? (
                      /* ACTIVE CHAT WINDOW VIEWPORT */
                      (() => {
                        const targetProfile = profiles.find(p => p.username.toLowerCase() === activeThreadUsername.toLowerCase()) || {
                          username: activeThreadUsername,
                          full_name: activeThreadUsername,
                          avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
                          is_premium: false,
                          premium_glow_color: null
                        };
                        
                        // Filter messages for current thread
                        const currentThreadMsgs = messages.filter(
                          m => m.thread_id.toLowerCase() === activeThreadUsername.toLowerCase()
                        );

                        const handleSend = (e: React.FormEvent) => {
                          e.preventDefault();
                          if (!dmInputText.trim()) return;
                          
                          const newMsg: Message = {
                            id: `m-local-${Date.now()}`,
                            thread_id: activeThreadUsername,
                            sender_id: currentUser.id,
                            sender_username: currentUser.username,
                            text: dmInputText.trim(),
                            created_at: new Date().toISOString()
                          };
                          
                          const updatedMessagesWithUser = [...messages, newMsg];
                          setMessages(updatedMessagesWithUser);
                          localStorage.setItem('slyte_messages_data', JSON.stringify(updatedMessagesWithUser));
                          setDmInputText('');
                          
                          // Trigger mini automatic response for interactive feedback
                          setTimeout(() => {
                            const autoMsgText = "Packet received. Syncing video timeline layers onto the canvas...";
                            const autoMsg: Message = {
                              id: `m-auto-${Date.now()}`,
                              thread_id: activeThreadUsername,
                              sender_id: targetProfile.id || 'auto-p',
                              sender_username: activeThreadUsername,
                              text: autoMsgText,
                              created_at: new Date().toISOString()
                            };
                            
                            setMessages(prev => {
                              const nextMsgs = [...prev, autoMsg];
                              localStorage.setItem('slyte_messages_data', JSON.stringify(nextMsgs));
                              return nextMsgs;
                            });
                          }, 1500);
                        };

                        return (
                          <div className="flex flex-col flex-1">
                            {/* Chat Header */}
                            <div className="sticky top-0 bg-[#060606]/95 backdrop-blur-md border-b border-slate-900 px-3 py-3 flex items-center justify-between z-10">
                              <div className="flex items-center gap-2.5">
                                <button 
                                  onClick={() => setActiveThreadUsername(null)} 
                                  className="p-1 px-2 rounded bg-slate-950 text-sky-400 hover:text-white border border-slate-900 text-[10px] font-bold uppercase tracking-wider transition"
                                >
                                  ← Back
                                </button>
                                
                                <img 
                                  src={targetProfile.avatar_url} 
                                  alt={targetProfile.username} 
                                  className="w-8 h-8 rounded-full object-cover border border-slate-900"
                                />

                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-white flex items-center gap-1">
                                    @{targetProfile.username}
                                  </span>
                                  <span className="text-[7px] uppercase tracking-wider text-emerald-500 font-mono">
                                    ● SECURE CONNECTION
                                  </span>
                                </div>
                              </div>

                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            </div>

                            {/* Conversation Bubble Stream View */}
                            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 min-h-[380px] max-h-[500px]">
                              {currentThreadMsgs.length === 0 ? (
                                <div className="text-center py-20 text-neutral-600 font-mono text-[10px] flex flex-col items-center gap-1">
                                  <span>NO TELEMETRY RECORDED</span>
                                  <span>Send a message to initiate thread</span>
                                </div>
                              ) : (
                                currentThreadMsgs.map((msg) => {
                                  const isMe = msg.sender_id === currentUser.id || msg.sender_username.toLowerCase() === currentUser.username.toLowerCase();
                                  
                                  return (
                                    <div 
                                      key={msg.id} 
                                      className={`max-w-[80%] p-3 rounded-2xl text-xs leading-relaxed ${
                                        isMe 
                                          ? 'ml-auto bg-[#0066FF] text-white rounded-br-none shadow-[0_2px_8px_rgba(0,102,255,0.25)]' 
                                          : 'bg-slate-900 text-white rounded-bl-none border border-slate-800'
                                      }`}
                                    >
                                      <div>{msg.text}</div>
                                      <span className="text-[7.5px] text-white/50 block text-right mt-1 font-mono uppercase tracking-widest">
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                  );
                                })
                              )}
                            </div>

                            {/* Active Chat Input Bar */}
                            <form onSubmit={handleSend} className="sticky bottom-0 bg-[#040404]/95 border-t border-slate-900 p-2.5 flex items-center gap-2">
                              <input 
                                type="text"
                                value={dmInputText}
                                onChange={(e) => setDmInputText(e.target.value)}
                                placeholder={`Write secure message to @${targetProfile.username}...`}
                                className="flex-1 bg-slate-950 border border-slate-900 text-xs rounded-xl px-4 py-2.5 text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#0066FF] transition duration-200 font-sans"
                              />
                              <button 
                                type="submit"
                                disabled={!dmInputText.trim()}
                                className="px-4 py-2.5 bg-[#0066FF] hover:bg-[#0052cc] rounded-xl text-xs font-bold uppercase transition active:scale-95 disabled:opacity-40 disabled:scale-100 font-sans"
                              >
                                Send
                              </button>
                            </form>
                          </div>
                        );
                      })()
                    ) : (
                      /* INBOX OVERVIEW STATE */
                      <div className="flex flex-col">
                        {/* Header controls with title overview */}
                        <div className="bg-black/95 backdrop-blur-md px-4 py-3.5 border-b border-slate-900 flex items-center justify-between">
                          <span className="text-xs font-bold font-mono tracking-widest text-[#0066FF] flex items-center gap-2 uppercase">
                            <MessageSquare size={14} className="text-[#0066FF]" />
                            MESSENGER INBOX
                          </span>
                          <button 
                            onClick={() => setActiveTab('home')} 
                            className="text-[9px] uppercase font-bold tracking-wider px-2.5 py-1 bg-slate-950 border border-slate-900 rounded text-neutral-400 hover:text-white transition"
                          >
                            Return Feed
                          </button>
                        </div>

                        {/* Search active profile usernames bar */}
                        <div className="p-3 border-b border-slate-900 bg-[#030303]/40">
                          <input 
                            type="text"
                            value={dmSearchQuery}
                            onChange={(e) => setDmSearchQuery(e.target.value)}
                            placeholder="Type profile handle to inspect/chat..."
                            className="w-full bg-slate-950 border border-slate-900 rounded-xl px-3.5 py-2.5 text-xs placeholder-neutral-500 text-white focus:outline-hidden focus:border-[#0066FF] transition duration-200"
                          />
                        </div>

                        {/* Profiles matched from client search */}
                        {dmSearchQuery.trim() && (
                          <div className="bg-neutral-950 border-b border-slate-900 max-h-48 overflow-y-auto">
                            <div className="px-3 py-1.5 text-[8px] font-mono tracking-widest text-[#8E8E8E] uppercase border-b border-slate-950">
                              Matches Found
                            </div>
                            {profiles
                              .filter(p => p.username.toLowerCase().includes(dmSearchQuery.toLowerCase()) && p.username !== currentUser.username)
                              .map(p => {
                                return (
                                  <div 
                                    key={p.id}
                                    onClick={() => {
                                      setActiveThreadUsername(p.username);
                                      setDmSearchQuery('');
                                    }}
                                    className="flex items-center gap-2.5 px-3 py-2 border-b border-slate-950 hover:bg-[#0066FF]/10 cursor-pointer transition duration-150"
                                  >
                                    <img src={p.avatar_url} className="w-6 h-6 rounded-full object-cover border border-slate-900" />
                                    <div className="flex flex-col">
                                      <span className="text-xs font-semibold text-white flex items-center gap-1">
                                        @{p.username}
                                      </span>
                                      <span className="text-[9px] text-[#8E8E8E] truncate max-w-[180px]">{p.full_name}</span>
                                    </div>
                                    <span className="ml-auto text-[8px] font-mono tracking-wider uppercase text-[#0066FF] font-semibold">
                                      Start Chat
                                    </span>
                                  </div>
                                );
                              })}
                            {profiles.filter(p => p.username.toLowerCase().includes(dmSearchQuery.toLowerCase()) && p.username !== currentUser.username).length === 0 && (
                              <div className="py-4 text-center text-xs text-neutral-600 font-mono">
                                No profile matches found.
                              </div>
                            )}
                          </div>
                        )}

                        {/* Direct threads list view */}
                        <div className="flex flex-col">
                          {(() => {
                            const threadHandles = Array.from(new Set(messages.map(m => m.thread_id.toLowerCase())));
                            const activeThreadsList = threadHandles.map(handle => {
                              const p = profiles.find(p => p.username.toLowerCase() === handle) || {
                                username: handle,
                                full_name: handle,
                                avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
                                is_premium: false,
                                premium_glow_color: null
                              };
                              const threadMsgs = messages.filter(m => m.thread_id.toLowerCase() === handle);
                              const lastMsg = threadMsgs[threadMsgs.length - 1];
                              return { handle, profile: p, lastMsg };
                            }).sort((a, b) => {
                              const aTime = a.lastMsg ? new Date(a.lastMsg.created_at).getTime() : 0;
                              const bTime = b.lastMsg ? new Date(b.lastMsg.created_at).getTime() : 0;
                              return bTime - aTime;
                            });

                            if (activeThreadsList.length === 0) {
                              return (
                                <div className="py-20 text-center text-neutral-500 flex flex-col items-center justify-center gap-1.5">
                                  <MessageSquare size={24} className="text-neutral-500" />
                                  <span className="text-xs font-semibold text-neutral-400">Inbox Completely Empty</span>
                                  <p className="text-[9px] text-neutral-600 max-w-[200px] leading-relaxed">Search profiles in the search bar above to establish new interactive chat streams.</p>
                                </div>
                              );
                            }

                            return activeThreadsList.map((tr) => {
                              return (
                                <div 
                                  key={tr.handle}
                                  onClick={() => setActiveThreadUsername(tr.handle)}
                                  className="flex items-center gap-3.5 px-3.5 py-4 border-b border-slate-950 hover:bg-[#0066FF]/5 cursor-pointer transition-all duration-150 relative active:bg-slate-950"
                                  id={`thread-select-${tr.handle}`}
                                >
                                  <img 
                                    src={tr.profile.avatar_url} 
                                    alt={tr.profile.username} 
                                    className="w-11 h-11 rounded-full object-cover border border-slate-900 shrink-0"
                                  />

                                  <div className="flex-1 min-w-0 font-sans">
                                    <div className="flex items-center justify-between mb-0.5">
                                      <span className="text-xs font-semibold text-white flex items-center gap-1">
                                        @{tr.profile.username}
                                      </span>
                                      <span className="text-[7.5px] font-mono text-[#8E8E8E] uppercase tracking-wider">
                                        {tr.lastMsg ? new Date(tr.lastMsg.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-[#8E8E8E] truncate pr-4">
                                      {tr.lastMsg ? tr.lastMsg.text : 'Secure channel opened'}
                                    </p>
                                  </div>

                                  <span className="text-neutral-700 font-bold font-mono text-[9px] uppercase tracking-wider">
                                    OPEN →
                                  </span>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'profile' && (
                  /* VIEW 5: USER PROFILE & SETTINGS CONSOLE */
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="pb-6 font-sans transition-all duration-500"
                  >
                    {/* Header bar controls with toggle Cog */}
                    <div className="bg-black/85 backdrop-blur-md px-4 py-3 border-b border-slate-950 sticky top-0 z-10 flex items-center justify-between">
                      <span className="text-sm font-extrabold tracking-tighter font-sans flex items-center gap-1.5 uppercase text-[#38bdf8]">
                        <Sliders size={13} className="text-[#0066FF]" />
                        <span>@{currentUser.username}</span>
                      </span>
                      <button 
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-1.5 text-neutral-400 hover:text-white transition rounded-full active:scale-95 cursor-pointer flex items-center justify-center"
                        title="Settings and Privacy"
                      >
                        <Settings size={18} />
                      </button>
                    </div>

                    {/* Circular Avatar, stats count layouts */}
                    <div className="px-4 py-5 flex items-center gap-5">
                      <div className="relative group shrink-0">
                        <img
                          src={currentUser.avatar_url}
                          alt={currentUser.username}
                          className="w-16 h-16 rounded-full object-cover ring-2 ring-[#0066FF] shadow-lg shadow-blue-500/10"
                        />
                        <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                          <Camera size={16} className="text-sky-300" />
                        </div>
                      </div>

                      {/* Horizontal specs counters */}
                      <div className="flex-1 grid grid-cols-3 gap-2 text-center select-none">
                        <div className="bg-[#050505] p-2 rounded-xl border border-slate-950">
                          <span className="block text-sm font-bold text-white font-mono">
                            {posts.filter(p => p.user_id === currentUser.id).length}
                          </span>
                          <span className="block text-[8px] text-neutral-400 uppercase tracking-wider mt-0.5">Posts</span>
                        </div>
                        <div className="bg-[#050505] p-2 rounded-xl border border-slate-950">
                          <span className="block text-sm font-bold text-white font-mono">
                            {(currentUser.followers_count).toLocaleString()}
                          </span>
                          <span className="block text-[8px] text-neutral-400 uppercase tracking-wider mt-0.5">Followers</span>
                        </div>
                        <div className="bg-[#050505] p-2 rounded-xl border border-slate-950">
                          <span className="block text-sm font-bold text-white font-mono">
                            {(currentUser.following_count).toLocaleString()}
                          </span>
                          <span className="block text-[8px] text-neutral-400 uppercase tracking-wider mt-0.5">Following</span>
                        </div>
                      </div>
                    </div>

                    {/* Bio metadata details block */}
                    <div className="px-4 pb-4">
                      <h4 className="text-xs font-bold text-white">{currentUser.full_name}</h4>
                      <p className="text-neutral-400 text-xs mt-1 leading-relaxed whitespace-pre-line">{currentUser.bio}</p>
                    </div>

                    {/* Dashboard grid Tab controllers (Toggle between Grid list vs Bookmarked views) */}
                    <div className="flex border-t border-[#0F172A] p-1 bg-black/60 sticky z-10 font-sans">
                      <button
                        onClick={() => setProfileTab('posts')}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] uppercase font-bold transition flex items-center justify-center gap-1.5 ${
                          profileTab === 'posts' 
                            ? 'bg-[#0066FF] text-white shadow-md shadow-blue-500/10' 
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        <GridIcon size={12} />
                        Grid Streams
                      </button>
                      <button
                        onClick={() => setProfileTab('saved')}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] uppercase font-bold transition flex items-center justify-center gap-1.5 ${
                          profileTab === 'saved' 
                            ? 'bg-[#0066FF] text-white shadow-md shadow-blue-500/10' 
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        <Bookmark size={12} />
                        Saved ({savedPostsSet.size})
                      </button>
                    </div>

                    {/* Active profile grid list (renders uploaded images/videos matching logic) */}
                    <div className="grid grid-cols-3 gap-1.5 p-3">
                      {posts
                        .filter(p => {
                          if (profileTab === 'posts') {
                            return p.user_id === currentUser.id;
                          } else {
                            return savedPostsSet.has(p.id);
                          }
                        })
                        .map((post) => (
                          <div
                            key={post.id}
                            onClick={() => setViewingDetailPost(post)}
                            className="relative aspect-square rounded-lg overflow-hidden border border-slate-950 cursor-pointer group hover:border-[#0066FF] transition-all"
                          >
                            <img
                              src={post.thumbnail_url || post.media_url}
                              alt="Profile artwork grid"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            {post.media_type === 'video' && (
                              <div className="absolute top-2.5 right-2.5 p-1 rounded bg-black/60 border border-slate-800 text-sky-400 pointer-events-none">
                                <Video size={10} />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-mono">
                              PREVIEW
                            </div>
                          </div>
                        ))}

                      {/* Display warning if feed list resolves with 0 items mapped */}
                      {((profileTab === 'posts' && posts.filter(p => p.user_id === currentUser.id).length === 0) ||
                        (profileTab === 'saved' && savedPostsSet.size === 0)) && (
                        <div className="col-span-3 py-16 text-center text-neutral-600 flex flex-col items-center justify-center">
                          <GridIcon size={24} className="text-slate-800 mb-2" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Node Grid Empty</span>
                          <p className="text-[9px] text-slate-600 max-w-[150px] leading-tight mt-1">Deploy media in the stream tab or bookmark other streams to display lists.</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

              </div>

              {/* STICKY BOTTOM NAVIGATION BAR VIEW PORT (Always anchored securely) */}
              <nav className="absolute bottom-0 inset-x-0 h-16 bg-black/80 backdrop-blur-xl border-t border-slate-920 flex items-center justify-around z-30 select-none pb-safe">
                <button
                  onClick={() => { setActiveTab('home'); setViewingDetailPost(null); }}
                  className={`relative flex flex-col items-center justify-center gap-1 py-2 px-3 ${
                    activeTab === 'home' ? 'text-[#0066FF]' : 'text-[#8E8E8E] hover:text-white'
                  } transition duration-200`}
                >
                  <Home size={20} className={`${activeTab === 'home' ? 'scale-110 text-[#0066FF]' : 'hover:scale-110 text-[#8E8E8E]'}`} />
                  {activeTab === 'home' && (
                    <motion.div
                      layoutId="activeTabDot"
                      className="absolute bottom-1 w-1 h-1 rounded-full bg-[#0066FF]"
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    />
                  )}
                </button>

                <button
                  onClick={() => { setActiveTab('search'); setViewingDetailPost(null); }}
                  className={`relative flex flex-col items-center justify-center gap-1 py-2 px-3 ${
                    activeTab === 'search' ? 'text-[#0066FF]' : 'text-[#8E8E8E] hover:text-white'
                  } transition duration-200`}
                >
                  <Search size={20} className={`${activeTab === 'search' ? 'scale-110 text-[#0066FF]' : 'hover:scale-110 text-[#8E8E8E]'}`} />
                  {activeTab === 'search' && (
                    <motion.div
                      layoutId="activeTabDot"
                      className="absolute bottom-1 w-1 h-1 rounded-full bg-[#0066FF]"
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    />
                  )}
                </button>

                {/* Creator pipeline quick switch option button */}
                <button
                  onClick={() => { setActiveTab('create'); setViewingDetailPost(null); }}
                  className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 via-[#0066FF] to-cyan-500 flex items-center justify-center shadow-lg shadow-[#0066FF]/20 hover:scale-[1.05] transition active:scale-[0.98] text-white"
                >
                  <PlusSquare size={20} strokeWidth={2.5} />
                </button>

                <button
                  onClick={() => { setActiveTab('notifications'); setViewingDetailPost(null); }}
                  className={`relative flex flex-col items-center justify-center gap-1 py-2 px-3 ${
                    activeTab === 'notifications' ? 'text-[#0066FF]' : 'text-[#8E8E8E] hover:text-white'
                  } transition duration-200`}
                >
                  <Heart size={20} className={`${activeTab === 'notifications' ? 'scale-110 text-[#0066FF]' : 'hover:scale-110 text-[#8E8E8E]'}`} />
                  {activeTab === 'notifications' && (
                    <motion.div
                      layoutId="activeTabDot"
                      className="absolute bottom-1 w-1 h-1 rounded-full bg-[#0066FF]"
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    />
                  )}
                </button>

                <button
                  onClick={() => { setActiveTab('profile'); setViewingDetailPost(null); }}
                  className={`relative flex flex-col items-center justify-center gap-1 py-2 px-3 ${
                    activeTab === 'profile' ? 'text-[#0066FF]' : 'text-[#8E8E8E] hover:text-white'
                  } transition duration-200`}
                >
                  <User size={20} className={`${activeTab === 'profile' ? 'scale-110 text-[#0066FF]' : 'hover:scale-110 text-[#8E8E8E]'}`} />
                  {activeTab === 'profile' && (
                    <motion.div
                      layoutId="activeTabDot"
                      className="absolute bottom-1 w-1 h-1 rounded-full bg-[#0066FF]"
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    />
                  )}
                </button>
              </nav>

          {/* SIMULATED OPTIMIZATION DARK OVERLAY MODAL */}
          <AnimatePresence>
            {isUploading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#020202]/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center"
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0, y: 15 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 15 }}
                  transition={{ type: "spring", damping: 25, stiffness: 220 }}
                  className="p-6 bg-slate-950 border border-slate-900 rounded-3xl flex flex-col items-center shadow-2xl"
                >
                  <Loader2 size={36} className="text-[#0066FF] animate-spin mb-4" />
                  <span className="text-[9px] uppercase tracking-wider font-mono font-bold text-sky-400 mb-2">Deploying Video Artifact</span>
                  <p className="text-white text-xs font-semibold max-w-[220px] leading-relaxed">
                    {uploadProgressText}
                  </p>
                  
                  {/* Miniature progress line */}
                  <div className="w-40 h-1 bg-neutral-900 rounded-full mt-4 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-sky-400 to-[#0066FF] animate-[pulse_1.5s_infinite]" style={{ width: '80%' }} />
                  </div>
                </motion.div>
              </motion.div>
            )}



            {isSettingsOpen && (
              <motion.div 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 26, stiffness: 210 }}
                className="absolute inset-0 bg-[#000000] z-50 flex flex-col font-sans"
                id="slyte-settings-pane"
              >
                {/* 1. TOP HEADER */}
                <div className="bg-black border-b border-zinc-900/60 px-4 py-3.5 sticky top-0 z-10 flex items-center justify-between col-span-full">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => {
                        setIsSettingsOpen(false);
                        setSettingsSearchQuery('');
                      }}
                      className="p-1 text-zinc-400 hover:text-white transition rounded-full active:scale-90 cursor-pointer flex items-center justify-center bg-zinc-950/65 border border-zinc-900"
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <span className="text-sm font-semibold text-zinc-100 font-sans tracking-tight">
                      Settings and privacy
                    </span>
                  </div>
                  <div className="w-8 h-8" />
                </div>

                {/* SCROLLABLE VIEWPORT AREA */}
                <div className="flex-1 overflow-y-auto pb-8 bg-[#000000]">
                  {/* 2. SEARCH BAR CONTAINER */}
                  <div className="px-4 py-3 sticky top-0 bg-[#000000] z-10">
                    <div className="relative flex items-center bg-zinc-900/90 border border-zinc-900/60 rounded-xl px-3.5 py-2 text-zinc-400 focus-within:border-zinc-700/60 transition">
                      <Search size={15} className="text-zinc-500 mr-2 shrink-0" />
                      <input 
                        type="text" 
                        placeholder="Search settings" 
                        value={settingsSearchQuery}
                        onChange={(e) => setSettingsSearchQuery(e.target.value)}
                        className="bg-transparent text-xs w-full focus:outline-none placeholder-zinc-500 text-white font-sans"
                      />
                      {settingsSearchQuery && (
                        <button 
                          onClick={() => setSettingsSearchQuery('')} 
                          className="text-zinc-500 hover:text-white transition p-0.5"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 4. SLYTE MENU LIST DATA GROUPS */}
                  {(() => {
                    interface SettingItem {
                      id: string;
                      title: string;
                      subtitle?: string;
                      icon: React.ReactNode;
                      rightElement?: React.ReactNode;
                      descBlock?: React.ReactNode;
                      isDanger?: boolean;
                      action: () => void;
                    }
                    interface SettingGroup {
                      id: string;
                      title: string;
                      items: SettingItem[];
                    }
                    const settingsGroups: SettingGroup[] = [
                      {
                        id: 'group-1',
                        title: 'Account & Credentials',
                        items: [
                          {
                            id: 'accounts-center',
                            title: 'Accounts Center',
                            subtitle: 'Password, security, personal details, ad preferences',
                            icon: <User size={18} className="text-zinc-400" />,
                            action: () => {
                              alert("Slyte Accounts Center:\nAll passcodes, security logs, cryptographic tokens and session keys are active.");
                            }
                          },
                          {
                            id: 'time-spent',
                            title: 'Time spent',
                            icon: <Clock size={18} className="text-zinc-400" />,
                            action: () => {
                              alert("Time spent:\nYour total screen duration on Slyte averages 1.4 hours per day.");
                            }
                          }
                        ]
                      },
                      {
                        id: 'group-2',
                        title: 'How You Use Slyte',
                        items: [
                          {
                            id: 'account-privacy',
                            title: 'Account privacy',
                            icon: <Lock size={18} className="text-zinc-400" />,
                            rightElement: (
                              <span className="text-[10px] font-bold bg-[#0066FF]/10 text-[#0066FF] border border-[#0066FF]/20 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                                {isAccountPrivate ? 'Private' : 'Public'}
                              </span>
                            ),
                            action: () => {
                              const nextVal = !isAccountPrivate;
                              setIsAccountPrivate(nextVal);
                              setCurrentUser(prev => ({ ...prev, is_private: nextVal }));
                              try {
                                fetch(`${API_BASE}/api/profiles/privacy`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ is_private: nextVal })
                                }).catch(() => {});
                              } catch(e) {}
                              showToast(`Channel altered to ${nextVal ? 'PRIVATE' : 'PUBLIC'}`);
                            }
                          },
                          {
                            id: 'close-friends',
                            title: 'Close Friends',
                            icon: <Star size={18} className="text-zinc-400" />,
                            rightElement: <span className="text-xs text-zinc-500 font-mono">0</span>,
                            action: () => {
                              alert("Close Friends:\nCurrently 0 customized profiles designated as high priority contacts.");
                            }
                          },
                          {
                            id: 'blocked',
                            title: 'Blocked',
                            icon: <Ban size={18} className="text-zinc-400" />,
                            rightElement: <span className="text-xs text-zinc-500 font-mono">None</span>,
                            action: () => {
                              alert("Blocked Users:\nNo users or interaction streams are currently blocklisted.");
                            }
                          },
                          {
                            id: 'hidden-words',
                            title: 'Hidden Words',
                            icon: <EyeOff size={18} className="text-zinc-400" />,
                            action: () => {
                              alert("Hidden Words Filters:\nAutomatic text moderation and sensitive dictionary censorship rules are fully enabled.");
                            }
                          }
                        ]
                      },
                      {
                        id: 'group-3',
                        title: 'Media & Preferences',
                        items: [
                          {
                            id: 'content-preferences',
                            title: 'Reset suggested content',
                            icon: <RefreshCw size={18} className="text-zinc-400" />,
                            action: () => {
                              const shuffled = [...posts].sort(() => Math.random() - 0.5);
                              setPosts(shuffled);
                              showToast("Content preferences deleted and reset! Shuffling feed...");
                            }
                          },
                          {
                            id: 'archive',
                            title: 'Archive',
                            icon: <Archive size={18} className="text-zinc-400" />,
                            action: () => {
                              alert("Archive Cabinet:\nAll previous visual assets, procedural loops, and expired stories are backed up safely.");
                            }
                          },
                          {
                            id: 'accessibility',
                            title: 'Text scaling and size',
                            icon: <Accessibility size={18} className="text-zinc-400" />,
                            action: () => {
                              alert("Accessibility Details:\nSlyte is configured with responsive fluid typography scales matching standard screen zoom configurations.");
                            }
                          }
                        ]
                      },
                      {
                        id: 'group-4',
                        title: 'Log Out Actions',
                        items: [
                          {
                            id: 'logout',
                            title: `Log out of @${currentUser.username}`,
                            icon: <LogOut size={18} className="text-[#EF4444]" />,
                            isDanger: true,
                            action: () => {
                              setIsSettingsOpen(false);
                              handleSignOut();
                            }
                          }
                        ]
                      }
                    ];

                    const filteredGroups = settingsGroups.map(group => {
                      const matchedItems = group.items.filter(item => {
                        const q = settingsSearchQuery.toLowerCase().trim();
                        if (!q) return true;
                        const inTitle = item.title.toLowerCase().includes(q);
                        const inSubtitle = item.subtitle ? item.subtitle.toLowerCase().includes(q) : false;
                        return inTitle || inSubtitle;
                      });
                      return { ...group, items: matchedItems };
                    }).filter(group => group.items.length > 0);

                    if (filteredGroups.length === 0) {
                      return (
                        <div className="py-14 px-6 text-center flex flex-col items-center justify-center font-sans">
                          <Search size={32} className="text-zinc-800 mb-3" />
                          <span className="text-zinc-400 text-xs font-bold uppercase tracking-widest block">No Settings Found</span>
                          <p className="text-xs text-zinc-600 mt-1 max-w-[200px] leading-relaxed">
                            No active menu groups contain "{settingsSearchQuery}"
                          </p>
                          <button 
                            onClick={() => setSettingsSearchQuery('')}
                            className="mt-4 px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-[9px] uppercase font-bold tracking-wider rounded-lg cursor-pointer transition"
                          >
                            Reset Field
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div className="flex flex-col gap-1 mt-2">
                        {filteredGroups.map(group => (
                          <div key={group.id} className="flex flex-col mb-1">
                            <h3 className="text-[9.5px] font-bold text-zinc-500 uppercase tracking-widest px-4 pt-4 pb-1.5 font-mono select-none">
                              {group.title}
                            </h3>
                            <div className="flex flex-col bg-black">
                              {group.items.map(item => {
                                const isDanger = item.isDanger;
                                return (
                                  <div key={item.id} className="flex flex-col">
                                    <button 
                                      onClick={item.action}
                                      className="w-full px-4 py-3.5 flex items-center justify-between text-left transition hover:bg-zinc-900/10 active:bg-zinc-900/25 cursor-pointer"
                                    >
                                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                        <div className="flex items-center justify-center shrink-0">
                                          {item.icon}
                                        </div>
                                        <div className="flex flex-col min-w-0 flex-1">
                                          <span className={`text-[12px] font-semibold tracking-tight truncate ${isDanger ? 'text-[#EF4444]' : 'text-zinc-100'}`}>
                                            {item.title}
                                          </span>
                                          {item.subtitle && (
                                            <span className="text-[10px] text-zinc-500 font-sans leading-tight mt-0.5">
                                              {item.subtitle}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0 ml-1">
                                        {item.rightElement}
                                        {!isDanger && <ChevronRight size={14} className="text-zinc-600" />}
                                      </div>
                                    </button>
                                    {item.descBlock}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                </div>
              </motion.div>
            )}
          </AnimatePresence>

            </div>
          </ProtectedRoute>

        </div>

        {/* Bento Column 3: Right trending lists (hidden on mobile, optimized on large screen sizes) */}
        <div id="bento-col-3" className="hidden lg:flex flex-col w-[260px] gap-5 shrink-0 self-stretch justify-center">
          {/* Trending clusters bento block */}
          <div className="bg-[#0A0A0A] border border-slate-900/80 p-5 rounded-3xl hover:border-slate-800 transition">
            <h4 className="text-[#8E8E8E] text-[9px] uppercase font-bold tracking-widest mb-4 flex items-center gap-1.5 font-mono">
              <Zap size={11} className="text-[#0066FF]" />
              Trending Clusters
            </h4>

            <div className="space-y-3.5 select-none text-left">
              <div 
                onClick={() => { setSearchQuery('Kyoto'); setActiveTab('search'); }}
                className="flex items-center gap-2.5 group cursor-pointer"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[#0066FF] group-hover:scale-125 transition-transform" />
                <span className="text-xs text-neutral-300 hover:text-sky-300 transition-colors font-medium">#KyotoHighlands</span>
              </div>
              
              <div 
                onClick={() => { setSearchQuery('Tokyo'); setActiveTab('search'); }}
                className="flex items-center gap-2.5 group cursor-pointer"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-slate-800 group-hover:bg-[#0066FF] group-hover:scale-125 transition-transform" />
                <span className="text-xs text-neutral-300 hover:text-sky-300 transition-colors font-medium">#NeoTokyoRain</span>
              </div>

              <div 
                onClick={() => { setSearchQuery('Iceland'); setActiveTab('search'); }}
                className="flex items-center gap-2.5 group cursor-pointer"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-slate-800 group-hover:bg-[#0066FF] group-hover:scale-125 transition-transform" />
                <span className="text-xs text-neutral-300 hover:text-sky-300 transition-colors font-medium">#CinematicStream</span>
              </div>
              
              <div 
                onClick={() => { setSearchQuery('monolithic'); setActiveTab('search'); }}
                className="flex items-center gap-2.5 group cursor-pointer"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-slate-800 group-hover:bg-[#0066FF] group-hover:scale-125 transition-transform" />
                <span className="text-xs text-neutral-300 hover:text-sky-300 transition-colors font-medium">#MonolithicVoid</span>
              </div>
            </div>
          </div>

          {/* System status bento block */}
          <div className="bg-[#0066FF]/5 border border-[#0066FF]/15 p-5 rounded-3xl text-left hover:bg-[#0066FF]/10 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[#0066FF] text-[9px] uppercase font-bold tracking-widest font-mono">System Node</h4>
              <span className="text-[7px] text-emerald-400 font-mono tracking-widest font-bold">ONLINE</span>
            </div>
            
            <p className="text-[11px] text-neutral-400 leading-relaxed font-sans">
              Local synchronization state initialized. Authorization emergency bypass hook active on registry failure.
            </p>
            
            <div className="mt-3 h-1 w-full bg-neutral-900 rounded-full overflow-hidden">
              <div className="h-full w-5/6 bg-[#0066FF] rounded-full animate-pulse" />
            </div>
          </div>
        </div>

      </div>

      {/* FULL SCREEN ARTWORK EXPLORE PREVIEW MODAL */}
      <AnimatePresence>
        {viewingDetailPost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#020202]/95 flex items-center justify-center p-4"
            onClick={() => setViewingDetailPost(null)}
          >
            {/* Modal content element */}
            <motion.div 
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 240 }}
              className="w-full max-w-sm rounded-3xl bg-black border border-slate-900 overflow-hidden shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-4 right-4 z-20">
                <button
                  type="button"
                  onClick={() => setViewingDetailPost(null)}
                  className="p-1.5 rounded-full bg-black/60 border border-slate-800 text-neutral-300 hover:text-white transition-colors"
                >
                  <LogOut size={14} className="rotate-90" />
                </button>
              </div>

              {/* Header profile info */}
              <div className="p-3 bg-black flex items-center justify-between border-b border-slate-900">
                <div className="flex items-center gap-2">
                  <img
                    src={viewingDetailPost.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'}
                    alt={viewingDetailPost.username}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div>
                    <h5 className="text-xs font-bold text-white">@{viewingDetailPost.username || 'slyte_user'}</h5>
                    <span className="text-[8px] uppercase tracking-widest text-[#8E8E8E] font-mono">{viewingDetailPost.location || 'Earth'}</span>
                  </div>
                </div>

                <button
                  onClick={(e) => handleToggleSavePost(viewingDetailPost.id, e)}
                  className={`p-1.5 rounded-lg border.5 transition ${
                    savedPostsSet.has(viewingDetailPost.id)
                      ? 'bg-[#0066FF]/10 text-[#0066FF] border-[#0066FF]/20'
                      : 'bg-transparent text-neutral-400 border-slate-900 hover:text-white'
                  }`}
                >
                  <Bookmark size={13} fill={savedPostsSet.has(viewingDetailPost.id)? '#0066FF' : 'none'} />
                </button>
              </div>

              {/* Primary content preview file layout */}
              <div className="relative aspect-[4/5] bg-[#050505] flex items-center justify-center overflow-hidden">
                {viewingDetailPost.media_type === 'video' ? (
                  <video
                    src={viewingDetailPost.media_url}
                    controls
                    autoPlay
                    playsInline
                    loop
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={viewingDetailPost.media_url}
                    alt="Detail artwork preview tag"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              {/* Caption and likes information */}
              <div className="p-4 bg-black font-sans">
                <div className="flex gap-4 mb-2">
                  <span className="text-xs text-[#0066FF] font-mono font-bold">
                    ❤️ {(viewingDetailPost.likes_count).toLocaleString()} LIKES
                  </span>
                </div>
                <p className="text-xs text-white leading-relaxed">
                  <strong className="text-blue-300 mr-2">@{viewingDetailPost.username}</strong>
                  {viewingDetailPost.caption}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FULL SCREEN TIMED STORY MODAL OVERLAY */}
      {selectedStory && (
        <StoryModal
          story={selectedStory}
          onClose={() => { setSelectedStory(null); setActiveStoryIdx(-1); }}
          onNext={handleNextStory}
          onPrev={handlePrevStory}
        />
      )}

      {/* SHARING TO STORY DRAFT DIALOG MODULE */}
      <AnimatePresence>
        {sharingPost && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#080808] border border-slate-900 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col p-5"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-900">
                <div>
                  <h4 className="text-sm font-extrabold tracking-tight text-white flex items-center gap-1.5">
                    <Share2 size={14} className="text-[#0066FF]" />
                    Share to Story Studio
                  </h4>
                  <p className="text-[9px] text-[#8E8E8E] uppercase tracking-wider font-mono">Create an interactive story overlay</p>
                </div>
                <button 
                  onClick={() => { setSharingPost(null); setPersonalMessage(''); setStoryFilter('none'); }}
                  className="p-1 rounded-full text-neutral-400 hover:text-white bg-slate-950 border border-slate-900 transition"
                  id="close-share-story"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Story Canvas Draft Preview */}
              <span className="text-[8px] font-bold text-sky-400 uppercase tracking-widest font-mono mb-1.5 block">Story Canvas Draft Preview</span>
              <div className="relative aspect-[9/16] w-full max-h-[220px] rounded-2xl overflow-hidden bg-neutral-950 border border-slate-900 flex items-center justify-center group mb-4">
                {sharingPost.media_type === 'video' ? (
                  <video 
                    src={sharingPost.media_url} 
                    className={`w-full h-full object-cover select-none pointer-events-none ${
                      storyFilter === 'mono' ? 'grayscale contrast-125' :
                      storyFilter === 'vintage' ? 'sepia-[0.6] contrast-[1.1] brightness-[0.9] hue-rotate-[-15deg]' :
                      storyFilter === 'neon' ? 'saturate-200 hue-rotate-90 brightness-[1.1]' :
                      storyFilter === 'sepia' ? 'sepia' :
                      storyFilter === 'cyber' ? 'hue-rotate-[180deg] saturate-150 contrast-125' : ''
                    }`}
                    muted 
                    playsInline 
                  />
                ) : (
                  <img 
                    src={sharingPost.media_url} 
                    alt="Story media draft" 
                    className={`w-full h-full object-cover select-none pointer-events-none ${
                      storyFilter === 'mono' ? 'grayscale contrast-125' :
                      storyFilter === 'vintage' ? 'sepia-[0.6] contrast-[1.1] brightness-[0.9] hue-rotate-[-15deg]' :
                      storyFilter === 'neon' ? 'saturate-200 hue-rotate-90 brightness-[1.1]' :
                      storyFilter === 'sepia' ? 'sepia' :
                      storyFilter === 'cyber' ? 'hue-rotate-[180deg] saturate-150 contrast-125' : ''
                    }`}
                  />
                )}

                {/* Personal Message Preview Overlay */}
                {personalMessage.trim() && (
                  <div className="absolute top-4 inset-x-3 pointer-events-none">
                    <div className="bg-black/70 backdrop-blur-md border border-[#0066FF]/20 py-1.5 px-2.5 rounded-lg text-center">
                      <p className="text-[10px] text-white font-sans font-semibold italic text-ellipsis overflow-hidden line-clamp-2">
                        "{personalMessage}"
                      </p>
                    </div>
                  </div>
                )}

                {/* Embedded Card Block Preview */}
                <div className="absolute inset-x-3 bottom-3 p-2 rounded-lg bg-black/80 backdrop-blur-sm border border-white/5 pointer-events-none flex flex-col gap-1">
                  <div className="flex items-center gap-1">
                    <div className="w-1 h-1 rounded-full bg-[#0066FF]" />
                    <span className="text-[9px] text-white font-semibold flex items-center gap-1">@{sharingPost.username} <span className="text-[7px] text-neutral-400 font-mono">SHARED</span></span>
                  </div>
                  <p className="text-[8px] text-neutral-300 truncate italic">"{sharingPost.caption}"</p>
                </div>
              </div>

              {/* Personal message input field */}
              <div className="mb-3.5">
                <label className="block text-[9px] text-neutral-400 uppercase tracking-widest font-bold font-mono mb-1">
                  Personal Message
                </label>
                <input
                  type="text"
                  placeholder="Insert custom message (e.g. Look at this view!)..."
                  value={personalMessage}
                  onChange={(e) => setPersonalMessage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-900 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-[#0066FF] transition"
                  id="share-story-message"
                  maxLength={100}
                />
              </div>

              {/* Story Visual filters */}
              <div className="mb-4">
                <label className="block text-[9px] text-neutral-400 uppercase tracking-widest font-bold font-mono mb-1.5 flex items-center justify-between">
                  <span>Visual Art Filter</span>
                  <span className="text-sky-400 text-[8px] font-mono">{storyFilter.toUpperCase()}</span>
                </label>
                <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
                  {([
                    { id: 'none', label: 'Normal' },
                    { id: 'mono', label: 'B&W' },
                    { id: 'vintage', label: 'Vintage' },
                    { id: 'neon', label: 'Neon Glow' },
                    { id: 'sepia', label: 'Sepia Tone' },
                    { id: 'cyber', label: 'Cyberpunk' }
                  ] as const).map((filt) => (
                    <button
                      key={filt.id}
                      type="button"
                      onClick={() => setStoryFilter(filt.id)}
                      className={`px-2.5 py-1 rounded text-[8px] uppercase font-mono font-bold shrink-0 transition ${
                        storyFilter === filt.id 
                          ? 'bg-[#0066FF] text-white' 
                          : 'bg-slate-950 border border-slate-900 text-[#8E8E8E] hover:text-white'
                      }`}
                    >
                      {filt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => { setSharingPost(null); setPersonalMessage(''); setStoryFilter('none'); }}
                  className="w-full py-2.5 border border-slate-900 rounded-xl text-[10px] uppercase tracking-wider text-neutral-400 hover:text-white font-bold transition font-sans"
                >
                  Discard Draft
                </button>
                <button
                  type="button"
                  onClick={handlePublishStory}
                  className="w-full py-2.5 bg-[#0066FF] hover:bg-blue-600 text-white rounded-xl text-[10px] uppercase tracking-wider font-bold transition font-sans flex items-center justify-center gap-1.5"
                  id="publish-story-btn"
                >
                  <Plus size={12} />
                  Add to Story
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
