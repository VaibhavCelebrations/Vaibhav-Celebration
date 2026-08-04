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
import { ApiClientError } from "@/lib/api-client";

/* ── Context shape ─────────────────────────────────────────────────── */

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  isAuthModalOpen: boolean;
  /** Opens the login/signup modal. `onSuccess` runs once the user is authenticated
   *  (e.g. to retry an "add to wishlist" action that triggered the gate). */
  openAuthModal: (onSuccess?: () => void) => void;
  closeAuthModal: () => void;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

/* ── Provider ──────────────────────────────────────────────────────── */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const onSuccessRef = useRef<(() => void) | null>(null);

  const refreshUser = useCallback(async () => {
    try {
      const me = await authApi.fetchCurrentUser();
      setUser(me);
      setIsAuthenticated(true);
    } catch {
      setUser(null);
      setIsAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await authApi.fetchCurrentUser();
        if (!cancelled) {
          setUser(me);
          setIsAuthenticated(true);
        }
      } catch (err) {
        // Access token expired but session cookie may still be valid — try a silent refresh.
        if (err instanceof ApiClientError && err.status === 401) {
          try {
            await import("@/lib/api-client").then((m) => m.apiFetch("/customer/auth/refresh", { method: "POST" }));
            const me = await authApi.fetchCurrentUser();
            if (!cancelled) {
              setUser(me);
              setIsAuthenticated(true);
            }
          } catch {
            if (!cancelled) {
              setUser(null);
              setIsAuthenticated(false);
            }
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openAuthModal = useCallback((onSuccess?: () => void) => {
    onSuccessRef.current = onSuccess ?? null;
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
    onSuccessRef.current = null;
  }, []);

  const handleAuthSuccess = useCallback((nextUser: User) => {
    setUser(nextUser);
    setIsAuthenticated(true);
    setIsAuthModalOpen(false);
    const cb = onSuccessRef.current;
    onSuccessRef.current = null;
    if (cb) setTimeout(cb, 0);
  }, []);

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
      setUser(null);
      setIsAuthenticated(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
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
