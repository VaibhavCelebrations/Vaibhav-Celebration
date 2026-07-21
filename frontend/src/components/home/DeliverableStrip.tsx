import Link from "next/link";
import { PartyPopper, Palette, Gift, Gamepad2, Mail, Award, ArrowRight } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

const services = [
  { slug: "customized-celebrations", icon: PartyPopper, title: "Customized Celebrations", desc: "Every detail curated around your child." },
  { slug: "themed-experiences", icon: Palette, title: "Themed Experiences", desc: "Unique themes that bring imagination to life." },
  { slug: "personalized-return-gifts", icon: Gift, title: "Personalized Return Gifts", desc: "Thoughtful keepsakes for little guests." },
  { slug: "activity-experiences", icon: Gamepad2, title: "Activity Experiences", desc: "Fun-filled activities kids will love." },
  { slug: "digital-invitations", icon: Mail, title: "Digital Invitations", desc: "Beautiful e-invites for your special day." },
  { slug: "milestone-moments", icon: Award, title: "Milestone Moments", desc: "Cherishing every big moment beautifully." },
];

export function DeliverableStrip() {
  return (
    <section className="py-16 md:py-20 bg-surface">
      <div className="max-w-7xl mx-auto px-5 md:px-10">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {services.map((item, i) => (
            <ScrollReveal key={item.slug} delay={i * 60}>
              <Link href={`/services/${item.slug}`} className="block h-full">
                <div className="flex flex-col items-center gap-3 group p-5 md:p-6 rounded-2xl border border-transparent transition-all duration-300 hover:border-border hover:shadow-card hover:bg-cream h-full text-center relative overflow-hidden">
                  <div className="flex items-center justify-center transition-transform duration-300 group-hover:scale-110 mb-2">
                    <item.icon size={44} className="text-mocha" strokeWidth={1.2} />
                  </div>
                  <div className="flex flex-col h-full grow">
                    <h3 className="font-display text-sm md:text-base font-semibold text-charcoal leading-tight mb-2 group-hover:text-mocha transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-text-light leading-relaxed mb-4">
                      {item.desc}
                    </p>
                    <span className="mt-auto text-[11px] font-bold text-mocha uppercase tracking-wider opacity-0 translate-y-3 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 flex items-center justify-center gap-1">
                      Know More <ArrowRight size={12} />
                    </span>
                  </div>
                </div>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
