import { Check } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

const pillars = [
  {
    title: "One Theme, Every Detail",
    description: "Invitations, décor, activities and return gifts — all designed around a single, cohesive theme.",
  },
  {
    title: "Stress-Free Planning",
    description: "No more juggling five different vendors — book online and let us handle the rest.",
  },
  {
    title: "Instagram-Worthy Moments",
    description: "Editorial-quality styling, crafted to be as beautiful in photos as it is in person.",
  },
];

export function WhyUsSection() {
  return (
    <section id="why-us" className="py-16 md:py-24 bg-paper border-y border-gold-light/40">
      <div className="max-w-7xl mx-auto px-5 md:px-10 grid lg:grid-cols-2 gap-14 items-center">
        {/* Image */}
        <ScrollReveal className="order-2 lg:order-1">
          <div className="rounded-xl overflow-hidden shadow-card aspect-[6/5] bg-gradient-to-br from-blush to-peach">
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-navy/25 text-sm font-medium tracking-wider uppercase bg-white/40 px-4 py-2 rounded-full">
                [Why Us — Image from Admin]
              </span>
            </div>
          </div>
        </ScrollReveal>

        {/* Content */}
        <ScrollReveal className="order-1 lg:order-2" delay={100}>
          <p className="text-xs md:text-sm font-semibold tracking-[0.25em] text-gold-dark uppercase mb-4">
            The VAIBHAV Promise
          </p>
          <h2 className="font-display text-3xl md:text-4xl text-navy font-semibold leading-tight">
            Why Parents Choose Us
          </h2>
          <p className="mt-5 text-charcoal/75 leading-relaxed max-w-lg">
            We know planning a birthday shouldn&apos;t feel like a second job.
            VAIBHAV Celebrations exists to take that weight off your shoulders —
            with premium, personalized, theme-based celebration solutions under
            one roof.
          </p>

          <div className="mt-10 space-y-7">
            {pillars.map((pillar) => (
              <div key={pillar.title} className="flex gap-4">
                <div className="w-11 h-11 shrink-0 rounded-full bg-gold-light flex items-center justify-center">
                  <Check size={18} className="text-gold-dark" strokeWidth={1.8} />
                </div>
                <div>
                  <h3 className="font-display text-lg text-navy font-semibold">
                    {pillar.title}
                  </h3>
                  <p className="text-sm text-charcoal/70 mt-1 max-w-md">
                    {pillar.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
