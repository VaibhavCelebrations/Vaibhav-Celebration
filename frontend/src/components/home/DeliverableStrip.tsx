import { PartyPopper, Palette, Gift, Gamepad2, Mail, Award } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import type { HomeDeliverablesSection } from "@/lib/cms/types";

const services = [
  { slug: "customized-celebrations", icon: PartyPopper, title: "Customized Celebrations", desc: "Every detail curated around your child." },
  { slug: "themed-experiences", icon: Palette, title: "Themed Experiences", desc: "Unique themes that bring imagination to life." },
  { slug: "personalized-return-gifts", icon: Gift, title: "Personalized Return Gifts", desc: "Thoughtful keepsakes for little guests." },
  { slug: "activity-experiences", icon: Gamepad2, title: "Activity Experiences", desc: "Fun-filled activities kids will love." },
  { slug: "digital-invitations", icon: Mail, title: "Digital Invitations", desc: "Beautiful e-invites for your special day." },
  { slug: "milestone-moments", icon: Award, title: "Milestone Moments", desc: "Cherishing every big moment beautifully." },
];

type DeliverableStripProps = {
  content?: HomeDeliverablesSection;
};

export function DeliverableStrip({ content }: DeliverableStripProps) {
  return (
    <section className="py-16 md:py-20 bg-surface">
      {(content?.title || content?.subtitle) && (
        <div className="max-w-7xl mx-auto px-5 md:px-10 mb-10 text-center">
          {content.title && (
            <h2 className="font-display text-3xl md:text-4xl text-charcoal font-semibold">{content.title}</h2>
          )}
          {content.subtitle && <p className="mt-3 text-text-muted">{content.subtitle}</p>}
        </div>
      )}
      <div className="max-w-7xl mx-auto px-5 md:px-10">
        {/* Desktop View */}
        <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-6 gap-6">
          {services.map((item, i) => (
            <ScrollReveal key={item.slug} delay={i * 60}>
              <div className="block h-full">
                <div className="flex flex-col items-center gap-3 group p-6 rounded-2xl border border-transparent transition-all duration-300 hover:border-border hover:shadow-card hover:bg-cream h-full text-center relative overflow-hidden">
                  <div className="flex items-center justify-center transition-transform duration-300 group-hover:scale-110 mb-2">
                    <item.icon size={44} className="text-mocha" strokeWidth={1.2} />
                  </div>
                  <div className="flex flex-col h-full grow">
                    <h3 className="font-display text-base font-semibold text-charcoal leading-tight mb-2 group-hover:text-mocha transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-text-light leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Mobile Marquee */}
        <div className="md:hidden flex overflow-hidden relative -mx-5 px-5 w-[100vw]">
          <div className="flex animate-marquee min-w-max">
            <div className="flex gap-4 pr-4">
              {services.map((item) => (
                <div key={item.slug} className="block h-full w-[160px] shrink-0">
                  <div className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-border/60 hover:bg-cream h-full text-center transition-colors">
                    <item.icon size={36} className="text-mocha" strokeWidth={1.2} />
                    <h3 className="font-display text-sm font-semibold text-charcoal leading-tight mt-1 mb-1">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-text-light leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {/* Duplicate for seamless scrolling */}
            <div className="flex gap-4 pr-4">
              {services.map((item) => (
                <div key={`${item.slug}-dup`} className="block h-full w-[160px] shrink-0">
                  <div className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-border/60 hover:bg-cream h-full text-center transition-colors">
                    <item.icon size={36} className="text-mocha" strokeWidth={1.2} />
                    <h3 className="font-display text-sm font-semibold text-charcoal leading-tight mt-1 mb-1">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-text-light leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
