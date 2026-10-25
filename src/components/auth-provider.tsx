"use client";

import { onAuthStateChanged, signOut as firebaseSignOut, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, errorMessage } from "@/lib/api";
import { fb, firebaseConfigured } from "@/lib/firebase/client";
import type { UserProfile } from "@/lib/types";

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}

/** Where a signed-in user belongs, based on how far through sign-up they are. */
export function homeFor(profile: UserProfile | null) {
  if (!profile?.role) return "/onboarding/role";
  // Accounts from before company names were unique confirm their company once.
  if (profile.role === "owner") return profile.companyId ? "/owner" : "/onboarding/company";
  if (!profile.profileComplete) return "/onboarding/driver";
  return profile.companyId ? "/driver" : "/onboarding/driver-company";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, profile: null, loading: firebaseConfigured, error: null });

  useEffect(() => {
    if (!firebaseConfigured) return;
    const { auth, db } = fb();
    let stopProfile = () => {};

    const stopAuth = onAuthStateChanged(auth, async (user) => {
      stopProfile();
      if (!user) {
        setState({ user: null, profile: null, loading: false, error: null });
        return;
      }
      setState({ user, profile: null, loading: true, error: null });
      try {
        // Creates the user record on first sign-in.
        await api("/api/me", { method: "POST" });
      } catch (err) {
        setState({ user, profile: null, loading: false, error: errorMessage(err) });
        return;
      }
      stopProfile = onSnapshot(
        doc(db, "users", user.uid),
        (snap) => {
          const profile = snap.exists() ? ({ ...snap.data(), uid: user.uid } as UserProfile) : null;
          setState({ user, profile, loading: false, error: null });
        },
        (err) => setState({ user, profile: null, loading: false, error: err.message }),
      );
    });

    return () => {
      stopProfile();
      stopAuth();
    };
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(fb().auth);
  }, []);

  return <AuthContext.Provider value={{ ...state, signOut }}>{children}</AuthContext.Provider>;
}
