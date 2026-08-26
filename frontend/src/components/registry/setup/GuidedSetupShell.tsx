"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, X } from "lucide-react";
import * as shopApi from "@/lib/shop-api";
import { CheckoutStepper } from "@/components/ecom/CheckoutStepper";
import type { GiftRegistryDetailDto } from "@/lib/shop-types";
import { SETUP_STEPS, type SetupStepId } from "./types";
import { DetailsStep } from "./steps/DetailsStep";
import { CoverImageStep } from "./steps/CoverImageStep";
import { ProductsStep } from "./steps/ProductsStep";
import { ReviewStep } from "./steps/ReviewStep";

const STORAGE_PREFIX = "vbc-registry-setup-step-";

function isStepId(value: string | null): value is SetupStepId {
  return Boolean(value) && SETUP_STEPS.some((s) => s.id === value);
}

function inferInitialStep(registry: GiftRegistryDetailDto, stored: SetupStepId | null): SetupStepId {
  if (stored) return stored;
  if (registry.status === "ACTIVE") return "review";
  const done = (key: string) => registry.readiness?.checklist.find((c) => c.key === key)?.done ?? false;
  if (!done("details") || !done("eventDate") || !done("address")) return "details";
  if (!registry.coverImageUrl) return "cover";
  if (registry.items.length === 0) return "products";
  return "review";
}

export function GuidedSetupShell({ registryId }: { registryId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [registry, setRegistry] = useState<GiftRegistryDetailDto | null>(null);
  const [step, setStep] = useState<SetupStepId | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const headingRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await shopApi.getMyRegistry(registryId);
      setRegistry(data);
      return data;
    } catch {
      setNotFound(true);
      return null;
    }
  }, [registryId]);

  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    (async () => {
      const data = await load();
      setIsLoading(false);
      if (!data) return;
      const queryStep = searchParams.get("step");
      const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_PREFIX + registryId) : null;
      const initial = isStepId(queryStep) ? queryStep : inferInitialStep(data, isStepId(stored) ? stored : null);
      setStep(initial);
    })();
  }, [registryId, load, searchParams]);

  useEffect(() => {
    if (!step || typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_PREFIX + registryId, step);
    headingRef.current?.focus();
  }, [step, registryId]);

  const stepIndex = useMemo(() => (step ? SETUP_STEPS.findIndex((s) => s.id === step) : 0), [step]);

  const goTo = useCallback((next: SetupStepId) => setStep(next), []);
  const goNext = useCallback(() => {
    setStep((current) => {
      const idx = SETUP_STEPS.findIndex((s) => s.id === current);
      return SETUP_STEPS[Math.min(idx + 1, SETUP_STEPS.length - 1)].id;
    });
  }, []);
  const goBack = useCallback(() => {
    setStep((current) => {
      const idx = SETUP_STEPS.findIndex((s) => s.id === current);
      return SETUP_STEPS[Math.max(idx - 1, 0)].id;
    });
  }, []);

  const onUpdated = useCallback((next: GiftRegistryDetailDto) => setRegistry(next), []);
  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  const exit = () => {
    if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_PREFIX + registryId);
    router.push(`/account/registry/${registryId}`);
  };

  if (isLoading || !step) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 size={28} className="animate-spin text-mocha" />
      </div>
    );
  }

  if (notFound || !registry) {
    return (
      <div className="text-center py-20">
        <h2 className="font-display text-xl font-bold text-charcoal mb-4">Registry not found</h2>
        <Link href="/account/orders" className="btn-primary px-8 py-3 text-sm">Back to Orders</Link>
      </div>
    );
  }

  const stepProps = { registry, onUpdated, goNext, goBack, goTo, refresh };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <p className="text-xs font-semibold text-text-muted">Guided Gift Registry Setup</p>
        <button
          type="button"
          onClick={exit}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-text-muted hover:text-charcoal cursor-pointer"
        >
          <X size={14} /> Exit
        </button>
      </div>

      <div className="mb-10 w-full">
        <CheckoutStepper steps={SETUP_STEPS.map((s) => ({ label: s.label }))} currentStep={Math.max(0, stepIndex)} />
      </div>

      {/* Focus target on step change so screen readers announce progress. */}
      <div ref={headingRef} tabIndex={-1} className="outline-none">
        {step === "details" && <DetailsStep {...stepProps} />}
        {step === "cover" && <CoverImageStep {...stepProps} />}
        {step === "products" && <ProductsStep {...stepProps} />}
        {step === "review" && <ReviewStep {...stepProps} />}
      </div>
    </div>
  );
}
