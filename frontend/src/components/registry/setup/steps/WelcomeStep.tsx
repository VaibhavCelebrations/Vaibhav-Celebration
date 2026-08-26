"use client";

import Link from "next/link";
import { Gift, Link2, ListChecks, Rocket } from "lucide-react";
import type { StepProps } from "../types";

const HIGHLIGHTS = [
  {
    icon: ListChecks,
    title: "Tell us about the celebration",
    description: "A title, event date, and delivery address — takes about a minute.",
  },
  {
    icon: Gift,
    title: "Add the gifts you'd love",
    description: "Pick from our shop or link products from any other store.",
  },
  {
    icon: Link2,
    title: "Share one simple link",
    description: "Guests open it, pick a gift, and it ships straight to your door.",
  },
];

export function WelcomeStep({ registry, goNext }: StepProps) {
  return (
    <div className="animate-step-in space-y-8 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-mocha/10 text-mocha">
        <Rocket size={28} />
      </div>
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-charcoal">Let&apos;s set up your Gift Registry</h1>
        <p className="text-text-muted text-sm md:text-base mt-3 max-w-lg mx-auto leading-relaxed">
          Your Gift Registry is included with this celebration package. In a few guided steps you&apos;ll create a shareable wish list your
          guests can gift from — with everything delivered to your door.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
        {HIGHLIGHTS.map(({ icon: Icon, title, description }) => (
          <div key={title} className="bg-surface rounded-2xl border border-border-light p-4">
            <Icon size={18} className="text-mocha mb-2" />
            <p className="text-sm font-bold text-charcoal">{title}</p>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">{description}</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-text-light">Estimated setup time: 3–5 minutes. Your progress is saved automatically.</p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <button type="button" onClick={goNext} className="btn-primary px-8 py-3.5 text-sm font-bold uppercase tracking-wider">
          Get Started
        </button>
        <Link href={`/account/registry/${registry.id}`} className="text-sm font-semibold text-text-muted hover:text-mocha">
          Skip guide — go to manage view
        </Link>
      </div>
      {registry.title && (
        <p className="text-xs text-text-light">
          Picking up where you left off on <span className="font-semibold text-charcoal">{registry.title}</span>.
        </p>
      )}
    </div>
  );
}
