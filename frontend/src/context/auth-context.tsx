"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import type { User } from "@/lib/ecom-types";
import * as authApi from "@/lib/customer-auth-api";
import { ApiClientError, onAuthLost } from "@/lib/api-client";

/* ── Context shape ─────────────────────────────────────────────────── */

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  isAuthModalOpen: boolean;
  /** Opens the login/signup modal. `onSuccess` runs once the user is authenticated
   *  (e.g. to retry an "add to wishlist" action that triggered the gate). */
  openAuthModal: (onSuccess?: () => void, options?: { tab?: "login" | "signup" }) => void;
  closeAuthModal: () => void;
  /** Apply an already-authenticated user (e.g. after guest OTP verify set cookies). */
  applyAuthenticatedUser: (user: User, onSuccess?: () => void) => void;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  /** Preferred auth-modal tab when opened from checkout gate. */
  authModalTab: "login" | "signup";
  /** Why the modal opened on its own (e.g. the session expired); null when the customer opened it. */
  authModalNotice: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

type AuthTabMessage = "signed-in" | "signed-out";

/** A returning tab re-checks the session at most this often. */
const SESSION_RECHECK_MS = 60_000;

/* ── Provider ──────────────────────────────────────────────────────── */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"login" | "signup">("login");
  const [authModalNotice, setAuthModalNotice] = useState<string | null>(null);
  const onSuccessRef = useRef<(() => void) | null>(null);
  // Mirrors `isAuthenticated` for listeners that outlive a render (auth-lost, focus, other tabs).
  const isAuthenticatedRef = useRef(false);
  const lastCheckedAtRef = useRef(0);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const applySignedIn = useCallback((nextUser: User) => {
    isAuthenticatedRef.current = true;
    lastCheckedAtRef.current = Date.now();
    setUser(nextUser);
    setIsAuthenticated(true);
    setAuthModalNotice(null);
  }, []);

  const applySignedOut = useCallback(() => {
    isAuthenticatedRef.current = false;
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const tellOtherTabs = useCallback((type: AuthTabMessage) => {
    try {
      channelRef.current?.postMessage(type);
    } catch {
      // channel closed — other tabs re-check on focus anyway
    }
  }, []);

  /** `apiFetch` refreshes an expired access token itself, so a 401 here means the session is gone. */
  const refreshUser = useCallback(async () => {
    try {
      applySignedIn(await authApi.fetchCurrentUser());
    } catch (err) {
      // A network blip or rate limit says nothing about the session — keep the current state.
      if (err instanceof ApiClientError && err.status === 401) applySignedOut();
    }
  }, [applySignedIn, applySignedOut]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await authApi.fetchCurrentUser();
        if (!cancelled) applySignedIn(me);
      } catch {
        if (!cancelled) applySignedOut();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applySignedIn, applySignedOut]);

  // Session ended mid-visit (revoked, expired, signed out elsewhere): say so instead of failing silently.
  useEffect(() => {
    return onAuthLost(() => {
      if (!isAuthenticatedRef.current) return;
      applySignedOut();
      onSuccessRef.current = null;
      setAuthModalTab("login");
      setAuthModalNotice("Your session has expired. Please sign in again to continue.");
      setIsAuthModalOpen(true);
      tellOtherTabs("signed-out");
    });
  }, [applySignedOut, tellOtherTabs]);

  // Coming back to a tab after a while: renew quietly before the customer's next click needs it.
  useEffect(() => {
    const recheck = () => {
      if (document.visibilityState !== "visible" || !isAuthenticatedRef.current) return;
      if (Date.now() - lastCheckedAtRef.current < SESSION_RECHECK_MS) return;
      lastCheckedAtRef.current = Date.now();
      void refreshUser();
    };
    document.addEventListener("visibilitychange", recheck);
    window.addEventListener("focus", recheck);
    return () => {
      document.removeEventListener("visibilitychange", recheck);
      window.removeEventListener("focus", recheck);
    };
  }, [refreshUser]);

  // Signing in or out in one tab is reflected in the others.
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel("vc-auth");
    channelRef.current = channel;
    channel.onmessage = (event: MessageEvent<AuthTabMessage>) => {
      if (event.data === "signed-in") void refreshUser();
      else if (event.data === "signed-out") applySignedOut();
    };
    return () => {
      channelRef.current = null;
      channel.close();
    };
  }, [refreshUser, applySignedOut]);

  const openAuthModal = useCallback((onSuccess?: () => void, options?: { tab?: "login" | "signup" }) => {
    onSuccessRef.current = onSuccess ?? null;
    if (options?.tab) setAuthModalTab(options.tab);
    setAuthModalNotice(null);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
    setAuthModalNotice(null);
    onSuccessRef.current = null;
  }, []);

  const handleAuthSuccess = useCallback(
    (nextUser: User) => {
      applySignedIn(nextUser);
      setIsAuthModalOpen(false);
      tellOtherTabs("signed-in");
      const cb = onSuccessRef.current;
      onSuccessRef.current = null;
      if (cb) setTimeout(cb, 0);
    },
    [applySignedIn, tellOtherTabs],
  );

  const applyAuthenticatedUser = useCallback(
    (nextUser: User, onSuccess?: () => void) => {
      applySignedIn(nextUser);
      setIsAuthModalOpen(false);
      tellOtherTabs("signed-in");
      if (onSuccess) setTimeout(onSuccess, 0);
    },
    [applySignedIn, tellOtherTabs],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const nextUser = await authApi.login({ email, password });
      handleAuthSuccess(nextUser);
    },
    [handleAuthSuccess],
  );

  const signup = useCallback(
    async (name: string, email: string, phone: string, password: string) => {
      const nextUser = await authApi.signup({ name, email, phone: phone || undefined, password });
      handleAuthSuccess(nextUser);
    },
    [handleAuthSuccess],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      applySignedOut();
      tellOtherTabs("signed-out");
    }
  }, [applySignedOut, tellOtherTabs]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        isAuthModalOpen,
        authModalTab,
        authModalNotice,
        openAuthModal,
        closeAuthModal,
        applyAuthenticatedUser,
        login,
        signup,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* ── Hook ──────────────────────────────────────────────────────────── */

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
