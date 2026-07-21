import Link from "next/link";
import { ArrowRight, Phone, Mail } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

export function CTABand() {
  return (
    <section id="contact-cta" className="py-20 md:py-32 bg-charcoal text-white relative overflow-hidden">
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-96 h-96 bg-mocha/15 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 bg-mocha/10 rounded-full blur-3xl" />
      
      <div className="max-w-4xl mx-auto px-5 md:px-10 text-center relative z-10">
        <ScrollReveal>
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-px w-10 md:w-16 bg-gradient-to-r from-transparent to-gold-soft/60" />
            <p className="text-sm font-bold text-gold-soft uppercase tracking-[0.2em]">
              Ready To Create A Birthday They&apos;ll Never Forget?
            </p>
            <div className="h-px w-10 md:w-16 bg-gradient-to-l from-transparent to-gold-soft/60" />
          </div>
          
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold leading-[1.15] !text-white">
            Let&apos;s create a themed birthday
            <br className="hidden md:block" /> experience your child will remember
          </h2>
          
          <p className="mt-8 text-white/70 text-lg max-w-2xl mx-auto leading-relaxed">
            Every celebration at Vaibhav Celebrations is thoughtfully designed
            around one beautiful story — from the first invitation to the final
            keepsake.
          </p>
          
          <div className="mt-12 flex flex-wrap justify-center items-center gap-4">
            <Link
              href="/consultation"
              className="inline-flex items-center justify-center gap-2 bg-mocha hover:bg-mocha-light text-white font-bold px-10 py-5 rounded-full transition-all duration-300 hover:scale-105 hover:shadow-lg uppercase tracking-wider text-sm min-w-[240px]"
            >
              Book Your Celebration
            </Link>
            <a
              href="https://wa.me/910000000000"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 border-2 border-white/20 text-white hover:bg-white/10 hover:border-white/40 font-bold px-10 py-5 rounded-full transition-all duration-300 uppercase tracking-wider text-sm min-w-[240px]"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.33 4.95L2 22l5.29-1.39a9.9 9.9 0 0 0 4.75 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm5.8 14.03c-.24.68-1.4 1.3-1.93 1.36-.5.06-1.02.27-3.42-.71-2.89-1.19-4.75-4.12-4.9-4.31-.14-.19-1.17-1.56-1.17-2.98 0-1.42.75-2.11 1.02-2.4.27-.29.58-.36.78-.36h.56c.18 0 .42-.03.65.5.24.55.81 1.9.88 2.04.07.14.11.31.02.5-.09.19-.14.31-.28.48-.14.17-.29.37-.42.5-.14.14-.28.29-.12.57.16.28.71 1.17 1.53 1.89 1.05.94 1.94 1.23 2.22 1.37.28.14.44.12.6-.07.16-.19.68-.79.87-1.06.18-.28.36-.23.61-.14.24.09 1.55.73 1.82.86.27.14.45.2.51.32.07.11.07.65-.17 1.33Z"/></svg>
              WhatsApp Us
            </a>
          </div>
          
          <div className="mt-16 flex flex-wrap justify-center gap-x-10 gap-y-3 text-sm text-white/50">
            <span className="flex items-center gap-2"><Phone size={16} /> +91 00000 00000</span>
            <span className="flex items-center gap-2"><Mail size={16} /> hello@vaibhavcelebrations.in</span>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
