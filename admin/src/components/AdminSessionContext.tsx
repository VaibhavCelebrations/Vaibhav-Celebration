"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getSession, type AdminUser } from "@/lib/data/session";

type AdminSessionState = {
  admin: AdminUser;
  refresh: () => Promise<void>;
};

const AdminSessionCtx = createContext<AdminSessionState | null>(null);

export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setAdmin(await getSession());
    } catch {
      router.replace("/login");
    }
  }, [router]);

  useEffect(() => {
    getSession()
      .then(setAdmin)
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-(--color-ink-muted)">
        Loading admin session…
      </div>
    );
  }

  if (!admin) return null;

  return <AdminSessionCtx.Provider value={{ admin, refresh }}>{children}</AdminSessionCtx.Provider>;
}

export function useAdminSession(): AdminSessionState {
  const ctx = useContext(AdminSessionCtx);
  if (!ctx) throw new Error("useAdminSession must be used within AdminSessionProvider");
  return ctx;
}

export function RoleGate({ allow, children }: { allow: AdminUser["role"][]; children: ReactNode }) {
  const { admin } = useAdminSession();
  if (!allow.includes(admin.role)) {
    return (
      <div className="card p-8 text-center text-sm text-(--color-text-muted)">
        You don&apos;t have access to this section.
      </div>
    );
  }
  return <>{children}</>;
}
