import Link from "next/link";
import { Gift, Puzzle, HeartHandshake } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

const journeys = [
  {
    icon: Gift,
    title: "Explore Celebration Packages",
    description: "Ready-made, thoughtfully curated celebration experiences.",
    cta: "Explore Packages",
    href: "/packages",
    accent: "group-hover:bg-mocha/10",
    iconBg: "bg-mocha/5",
    iconColor: "text-mocha",
  },
  {
    icon: Puzzle,
    title: "Build Your Own Celebration",
    description:
      "Mix and match invites, activities, welcome details, return gifts and keepsakes.",
    cta: "Start Customizing",
    href: "/build-package",
    accent: "group-hover:bg-gold-light/20",
    iconBg: "bg-gold-light/10",
    iconColor: "text-amber-700",
  },
  {
    icon: HeartHandshake,
    title: "Need Help Deciding?",
    description:
      "Tell us what you're planning and we'll help shape the right celebration.",
    cta: "Book a Consultation",
    href: "/consultation",
    accent: "group-hover:bg-cream-dark",
    iconBg: "bg-cream",
    iconColor: "text-charcoal",
  },
];

export function CelebrationJourney() {
  return (
    <section className="py-20 md:py-28 bg-surface">
      <div className="max-w-6xl mx-auto px-5 md:px-10">
        <ScrollReveal>
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="h-px w-10 md:w-16 bg-gradient-to-r from-transparent to-mocha/60" />
              <p className="text-sm font-bold text-mocha uppercase tracking-[0.2em]">
                Your Way
              </p>
              <div className="h-px w-10 md:w-16 bg-gradient-to-l from-transparent to-mocha/60" />
            </div>
            <h2 className="font-display text-3xl md:text-4xl text-charcoal font-semibold">
              Choose Your Celebration Journey
            </h2>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 relative">
          {journeys.map((journey, i) => (
            <ScrollReveal key={journey.title} delay={i * 100} className="h-full">
              <div className="group relative flex flex-col items-center text-center h-full rounded-[2rem] border-2 border-border bg-white p-8 md:p-10 transition-all duration-500 hover:shadow-card hover:border-transparent hover:-translate-y-2 overflow-hidden cursor-default z-10">
                {/* Background hover effect */}
                <div className={`absolute inset-0 transition-colors duration-500 opacity-0 group-hover:opacity-100 ${journey.accent} -z-10`} />
                
                {/* Icon */}
                <div
                  className={`w-20 h-20 rounded-full ${journey.iconBg} flex items-center justify-center mb-8 transition-all duration-500 group-hover:scale-110 group-hover:shadow-md`}
                >
                  <journey.icon
                    size={32}
                    className={`${journey.iconColor} drop-shadow-sm transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110`}
                    strokeWidth={1.5}
                  />
                </div>

                {/* Content */}
                <h3 className="font-display text-xl md:text-2xl font-semibold text-charcoal mb-4">
                  {journey.title}
                </h3>
                <p className="text-sm md:text-base text-text-muted leading-relaxed mb-10 grow">
                  {journey.description}
                </p>

                {/* CTA */}
                <Link
                  href={journey.href}
                  className={`mt-auto w-full text-center text-sm font-bold uppercase tracking-wider px-6 py-4 rounded-xl transition-all duration-300 ${
                    i === 0
                      ? "btn-primary shadow-md hover:shadow-lg hover:-translate-y-1"
                      : "bg-white border-2 border-border text-charcoal hover:bg-charcoal hover:border-charcoal hover:text-white hover:-translate-y-1 hover:shadow-lg"
                  }`}
                >
                  {journey.cta}
                </Link>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
