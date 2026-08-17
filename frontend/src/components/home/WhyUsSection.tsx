import { Home, Heart, Smile, Gift } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

const pillars = [
  {
    icon: Home,
    title: "Everything Under One Roof",
    description:
      "One coordinated celebration ecosystem instead of managing multiple vendors.",
  },
  {
    icon: Heart,
    title: "Personalized Around You",
    description:
      "Built around the child's interests, personality, milestone or celebration concept.",
  },
  {
    icon: Smile,
    title: "Stress-Free Planning",
    description:
      "One point of coordination from planning through wrap-up.",
  },
  {
    icon: Gift,
    title: "Premium & Meaningful",
    description:
      "Thoughtful details, experiences and keepsakes — not generic party supplies.",
  },
];

export function WhyUsSection() {
  return (
    <section id="why-us" className="py-20 md:py-28 bg-surface">
      <div className="max-w-7xl mx-auto px-5 md:px-10">
        <ScrollReveal>
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="h-px w-10 md:w-16 bg-gradient-to-r from-transparent to-mocha/60" />
              <p className="text-sm font-bold text-mocha uppercase tracking-[0.2em]">
                The Vaibhav Promise
              </p>
              <div className="h-px w-10 md:w-16 bg-gradient-to-l from-transparent to-mocha/60" />
            </div>
            <h2 className="font-display text-3xl md:text-4xl text-charcoal font-semibold">
              Why Families Choose Vaibhav Celebrations
            </h2>
            <p className="mt-4 text-text-muted text-base md:text-lg max-w-2xl mx-auto">
              We don&apos;t just decorate; we tell stories. Every detail is curated to create magical memories.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-6 relative">
          {pillars.map((pillar, i) => (
            <ScrollReveal key={pillar.title} delay={i * 100} className="h-full">
              <div className="group relative flex flex-col items-center text-center h-full rounded-[2rem] border-2 border-border bg-white p-8 md:p-10 transition-all duration-500 hover:shadow-card hover:border-transparent hover:-translate-y-2 overflow-hidden cursor-default z-10">
                {/* Background hover effect */}
                <div className="absolute inset-0 transition-colors duration-500 opacity-0 group-hover:opacity-100 bg-mocha/5 -z-10" />

                {/* Icon */}
                <div className="w-16 h-16 rounded-full bg-mocha/10 flex items-center justify-center mb-6 transition-all duration-500 group-hover:scale-110 group-hover:shadow-md group-hover:bg-mocha/20">
                  <pillar.icon
                    size={28}
                    className="text-mocha transition-transform duration-500 group-hover:-rotate-6"
                    strokeWidth={1.5}
                  />
                </div>

                {/* Content */}
                <h3 className="font-display text-lg md:text-xl font-semibold text-charcoal mb-3 transition-colors duration-300">
                  {pillar.title}
                </h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
