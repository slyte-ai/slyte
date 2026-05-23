/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Loader2 } from 'lucide-react';
import SignIn from './SignIn';
import SignUp from './SignUp';

export type AuthScreen = 'signin' | 'signup';

interface ProtectedRouteProps {
  userId: string | null;
  authReady: boolean;
  authScreen: AuthScreen;
  onNavigateToSignIn: () => void;
  onNavigateToSignUp: () => void;
  children: React.ReactNode;
}

export default function ProtectedRoute({
  userId,
  authReady,
  authScreen,
  onNavigateToSignIn,
  onNavigateToSignUp,
  children,
}: ProtectedRouteProps) {
  if (!authReady) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-black text-neutral-400">
        <Loader2 className="h-8 w-8 animate-spin text-[#0066FF]" />
        <p className="text-xs">Loading session…</p>
      </div>
    );
  }

  if (!userId) {
    if (authScreen === 'signup') {
      return <SignUp onNavigateToSignIn={onNavigateToSignIn} />;
    }
    return <SignIn onNavigateToSignUp={onNavigateToSignUp} />;
  }

  return <>{children}</>;
}
