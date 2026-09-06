import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { FeaturedEventCard } from "@/components/events/FeaturedEventCard";
import type { EventCard } from "@/lib/cms/types";

interface FeaturedEventSectionProps {
  event: EventCard | null;
}

export function FeaturedEventSection({ event }: FeaturedEventSectionProps) {
  if (!event) return null;

  return (
    <section className="py-14 md:py-20 bg-cream/70 border-b border-border-light/60">
      <div className="max-w-7xl mx-auto px-5 md:px-10">
        <ScrollReveal>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 md:mb-12">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <span className="w-2 h-2 rounded-full bg-mocha animate-pulse" />
                <p className="text-xs font-bold text-mocha uppercase tracking-[0.2em]">
                  Signature Experiences
                </p>
              </div>
              <h2 className="font-display text-3xl md:text-4xl lg:text-5xl text-charcoal font-bold leading-tight">
                Featured Celebration
              </h2>
              <p className="text-text-muted text-sm md:text-base mt-2 max-w-xl">
                Step inside our signature events and see how we craft unforgettable themes, immersive decor, and magical celebrations.
              </p>
            </div>

            <Link
              href="/events"
              className="inline-flex items-center gap-2 text-xs md:text-sm font-bold text-mocha hover:text-mocha-dark bg-white border border-mocha/30 hover:border-mocha px-6 py-3 rounded-full shadow-sm hover:shadow transition-all duration-300 uppercase tracking-wider group shrink-0 w-fit"
            >
              Explore All Events
              <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <FeaturedEventCard event={event} priority={false} />
        </ScrollReveal>
      </div>
    </section>
  );
}
