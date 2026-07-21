import { SectionHeader } from "@/components/ui/SectionHeader";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

const steps = [
  { num: "01", title: "Explore Themes", desc: "Browse curated celebration themes designed for ages 1–10." },
  { num: "02", title: "Choose Your Package", desc: "Compare Standard, Premium and Luxe experiences side by side." },
  { num: "03", title: "Customize & Book", desc: "Add optional extras, pick your date, and confirm online." },
  { num: "04", title: "We Bring It to Life", desc: "Sit back and celebrate — we handle every detail, start to finish." },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-16 md:py-24 pb-24 md:pb-32 bg-navy text-ivory overflow-hidden">
      <div className="pointer-events-none absolute top-10 left-1/2 -translate-x-1/2 w-[36rem] h-[36rem] bg-gold/5 rounded-full blur-3xl" />
      <div className="max-w-7xl mx-auto px-5 md:px-10">
        <ScrollReveal>
          <SectionHeader eyebrow="Simple & Seamless" title="How Booking Works" description="From browsing to booking, your celebration is just four steps away." light />
        </ScrollReveal>
        <ScrollReveal delay={150}>
          <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
            {steps.map((step) => (
              <div key={step.num} className="text-center lg:text-left">
                <span className="font-display text-5xl text-gold-light/30 font-semibold">{step.num}</span>
                <h3 className="font-display text-xl font-semibold mt-3">{step.title}</h3>
                <p className="text-sm text-ivory/65 mt-2 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
      <div className="absolute bottom-0 left-0 w-full h-14 md:h-20 bg-ivory" style={{ clipPath: "polygon(0 100%, 100% 0, 100% 100%)" }} />
    </section>
  );
}
