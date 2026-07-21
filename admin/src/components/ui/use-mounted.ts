"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/** SSR-safe "has this component mounted on the client" check for gating createPortal, without setState-in-effect. */
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
