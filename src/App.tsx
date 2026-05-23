/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Home, PlusSquare, Search, User, LogOut } from 'lucide-react';
import Feed from './components/Feed';
import CreatePostModal from './components/CreatePostModal';
import ProtectedRoute, { AuthScreen } from './components/ProtectedRoute';
import Avatar from './components/Avatar';
import { supabase } from './supabase';
import { fetchProfileForUser } from './lib/authProfile';
import type { Profile } from './types';

type Tab = 'home' | 'search' | 'profile';

const EMPTY_PROFILE: Profile = {
  id: '',
  username: 'guest',
  full_name: null,
  profile_picture_url: null,
};

export default function App() {
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authScreen, setAuthScreen] = useState<AuthScreen>('signin');
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [createOpen, setCreateOpen] = useState(false);
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3000);
  };

  const syncProfile = async (userId: string) => {
    const row = await fetchProfileForUser(userId);
    if (row) setProfile(row);
  };

  useEffect(() => {
    let mounted = true;

    const applySession = async (userId: string | null) => {
      if (!mounted) return;
      setAuthUserId(userId);
      if (userId) await syncProfile(userId);
      else setProfile(EMPTY_PROFILE);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      void applySession(session?.user?.id ?? null).finally(() => {
        if (mounted) setAuthReady(true);
      });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void applySession(session?.user?.id ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setAuthUserId(null);
    setProfile(EMPTY_PROFILE);
    setAuthScreen('signin');
    setActiveTab('home');
    showToast('Signed out');
  };

  return (
    <div className="ig-app min-h-screen bg-black text-white">
      {toast && (
        <div className="fixed left-1/2 top-4 z-[60] -translate-x-1/2 rounded-lg bg-neutral-800 px-4 py-2 text-sm shadow-lg">
          {toast}
        </div>
      )}

      <div className="mx-auto flex min-h-screen w-full max-w-[470px] flex-col border-x border-neutral-900">
        <ProtectedRoute
          userId={authUserId}
          authReady={authReady}
          authScreen={authScreen}
          onNavigateToSignIn={() => setAuthScreen('signin')}
          onNavigateToSignUp={() => setAuthScreen('signup')}
        >
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-neutral-800 bg-black px-4 py-3">
            <h1 className="text-xl font-semibold tracking-tight">Slyte</h1>
            <button
              type="button"
              onClick={handleSignOut}
              className="text-neutral-400 hover:text-white"
              aria-label="Sign out"
            >
              <LogOut size={20} />
            </button>
          </header>

          <main className="flex-1 pb-14">
            {activeTab === 'home' && (
              <Feed currentUserId={authUserId ?? undefined} refreshKey={feedRefreshKey} />
            )}

            {activeTab === 'search' && (
              <div className="px-4 py-16 text-center text-sm text-neutral-500">
                Search coming soon.
              </div>
            )}

            {activeTab === 'profile' && authUserId && (
              <div className="flex flex-col items-center px-4 py-10">
                <Avatar
                  url={profile.profile_picture_url}
                  alt={profile.username}
                  className="h-20 w-20"
                />
                <p className="mt-4 text-lg font-semibold">@{profile.username}</p>
                {profile.full_name && (
                  <p className="text-sm text-neutral-400">{profile.full_name}</p>
                )}
                {profile.bio && (
                  <p className="mt-2 max-w-xs text-center text-sm text-neutral-300">{profile.bio}</p>
                )}
              </div>
            )}
          </main>

          <nav className="fixed bottom-0 left-1/2 z-30 flex h-12 w-full max-w-[470px] -translate-x-1/2 items-center justify-around border-t border-neutral-800 bg-black px-2">
            <button
              type="button"
              onClick={() => setActiveTab('home')}
              className={activeTab === 'home' ? 'text-white' : 'text-neutral-500'}
              aria-label="Home"
            >
              <Home size={24} strokeWidth={activeTab === 'home' ? 2.5 : 1.75} />
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('search')}
              className={activeTab === 'search' ? 'text-white' : 'text-neutral-500'}
              aria-label="Search"
            >
              <Search size={24} strokeWidth={activeTab === 'search' ? 2.5 : 1.75} />
            </button>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="text-white"
              aria-label="Create post"
            >
              <PlusSquare size={24} strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={activeTab === 'profile' ? 'text-white' : 'text-neutral-500'}
              aria-label="Profile"
            >
              <User size={24} strokeWidth={activeTab === 'profile' ? 2.5 : 1.75} />
            </button>
          </nav>

          {authUserId && (
            <CreatePostModal
              open={createOpen}
              userId={authUserId}
              onClose={() => setCreateOpen(false)}
              onPosted={() => {
                setFeedRefreshKey((k) => k + 1);
                setActiveTab('home');
                showToast('Posted');
              }}
              onError={(msg) => showToast(msg)}
            />
          )}
        </ProtectedRoute>
      </div>
    </div>
  );
}
