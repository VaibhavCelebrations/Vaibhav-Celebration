import { useEffect, useState } from "react";
import { apiFetch } from "./api-client";

export type DeliverySettings = {
  freeShippingThresholdInPaise: number;
  shippingFeeInPaise: number;
};

const DEFAULTS: DeliverySettings = {
  freeShippingThresholdInPaise: 299_900,
  shippingFeeInPaise: 19_900,
};

let cached: DeliverySettings | null = null;

export async function getDeliverySettings(): Promise<DeliverySettings> {
  if (cached) return cached;
  try {
    const data = await apiFetch<DeliverySettings>("/shop/delivery-settings", { cache: "no-store" });
    cached = data;
    return data;
  } catch {
    return DEFAULTS;
  }
}

/** Hook for client components — loads public delivery thresholds once. */
export function useDeliverySettings() {
  const [settings, setSettings] = useState<DeliverySettings>(DEFAULTS);
  useEffect(() => {
    void getDeliverySettings().then(setSettings);
  }, []);
  return settings;
}

export function invalidateDeliverySettingsCache() {
  cached = null;
}
