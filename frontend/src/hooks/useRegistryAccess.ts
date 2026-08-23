"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import * as shopApi from "@/lib/shop-api";
import type { RegistryAccessDto } from "@/lib/shop-types";

export const REGISTRY_ACCESS_EVENT = "vc-registry-access-changed";

export function notifyRegistryAccessChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(REGISTRY_ACCESS_EVENT));
  }
}

const EMPTY_ACCESS: RegistryAccessDto = {
  canAccess: false,
  paidUpgradeCount: 0,
  registryCount: 0,
  pendingSetups: [],
  availablePurchases: [],
};

export function useRegistryAccess() {
  const { isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();
  const [access, setAccess] = useState<RegistryAccessDto>(EMPTY_ACCESS);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setAccess(EMPTY_ACCESS);
      return;
    }
    setLoading(true);
    try {
      setAccess(await shopApi.getRegistryAccess());
    } catch {
      setAccess(EMPTY_ACCESS);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isLoading) return;
    void refresh();
  }, [isLoading, refresh, pathname]);

  useEffect(() => {
    function onChange() {
      void refresh();
    }
    window.addEventListener(REGISTRY_ACCESS_EVENT, onChange);
    return () => window.removeEventListener(REGISTRY_ACCESS_EVENT, onChange);
  }, [refresh]);

  return { access, loading, refresh };
}
