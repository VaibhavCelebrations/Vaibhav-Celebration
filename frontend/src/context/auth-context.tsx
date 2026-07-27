"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { User, QuickFormData } from "@/lib/ecom-types";

/* ── Context shape ─────────────────────────────────────────────────── */

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  login: (email: string, password: string) => void;
  signup: (name: string, email: string, phone: string, password: string) => void;
  quickFormSubmit: (data: QuickFormData) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

/* ── Provider ──────────────────────────────────────────────────────── */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const openAuthModal = useCallback(() => setIsAuthModalOpen(true), []);
  const closeAuthModal = useCallback(() => setIsAuthModalOpen(false), []);

  const login = useCallback((_email: string, _password: string) => {
    // Mock login — backend will handle real auth
    setUser({
      id: "user-mock-1",
      name: "Demo User",
      email: _email,
      phone: "+91 98765 43210",
    });
    setIsAuthenticated(true);
    setIsAuthModalOpen(false);
  }, []);

  const signup = useCallback((name: string, email: string, phone: string, _password: string) => {
    // Mock signup — backend will handle real auth
    setUser({
      id: "user-mock-2",
      name,
      email,
      phone,
    });
    setIsAuthenticated(true);
    setIsAuthModalOpen(false);
  }, []);

  const quickFormSubmit = useCallback((data: QuickFormData) => {
    // Mock quick form — backend will auto-create account
    setUser({
      id: "user-mock-3",
      name: data.fullName,
      email: data.email,
      phone: data.phone,
    });
    setIsAuthenticated(true);
    setIsAuthModalOpen(false);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        login,
        signup,
        quickFormSubmit,
        logout,
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
