import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, MapPin } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppFAB } from "@/components/layout/WhatsAppFAB";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { placeholderEvents } from "@/lib/placeholder-data";

export const metadata: Metadata = {
  title: "Our Events",
  description: "Explore our magical past events and celebrations.",
};

export default function EventsPage() {
  return (
    <>
      <Navbar />
      <main className="pt-28 md:pt-36 pb-16 md:pb-24 bg-surface min-h-screen">
        <div className="max-w-7xl mx-auto px-5 md:px-10">
          
          <ScrollReveal>
            <div className="text-center mb-16">
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="h-px w-10 md:w-16 bg-gradient-to-r from-transparent to-mocha/60" />
                <p className="text-sm font-bold text-mocha uppercase tracking-[0.2em]">
                  Portfolio
                </p>
                <div className="h-px w-10 md:w-16 bg-gradient-to-l from-transparent to-mocha/60" />
              </div>
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-charcoal font-semibold mb-6">
                Our Magical Events
              </h1>
              <p className="text-text-muted max-w-2xl mx-auto text-lg">
                Step inside some of our most beautiful past celebrations. From intimate milestones to grand birthdays, see how we bring dreams to life.
              </p>
            </div>
          </ScrollReveal>

          {/* Horizontal cards in a 3-column grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {placeholderEvents.map((event, i) => (
              <ScrollReveal key={event.id} delay={i * 80}>
                <Link href={`/events/${event.slug}`} className="group block relative rounded-[2rem] overflow-hidden shadow-card aspect-[4/3] hover:shadow-hover transition-all duration-300 hover:-translate-y-2">
                  <Image 
                    src={event.coverImage} 
                    alt={event.title} 
                    fill 
                    className="object-cover transition-transform duration-1000 group-hover:scale-105" 
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    priority={i < 3}
                  />
                  {/* Overlay gradient identical to theme page logic */}
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal/95 via-charcoal/40 to-transparent transition-opacity duration-500" />
                  
                  <div className="absolute inset-0 p-6 flex flex-col justify-end text-left">
                    <div className="flex items-center gap-1.5 text-gold-soft mb-2">
                      <MapPin size={14} />
                      <span className="text-xs font-semibold uppercase tracking-wider">{event.location}</span>
                    </div>
                    
                    <h3 className="font-display text-2xl lg:text-3xl font-bold !text-white mb-2 group-hover:text-gold-soft transition-colors leading-[1.15]">
                      {event.title}
                    </h3>
                    <p className="text-white/80 text-sm leading-relaxed line-clamp-2 mb-6">
                      {event.shortDescription}
                    </p>
                    
                    <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md hover:bg-white/30 text-white font-bold px-5 py-2.5 rounded-full transition-all text-xs uppercase tracking-wider w-max">
                      View Event <ArrowRight size={14} />
                    </div>
                  </div>
                </Link>
              </ScrollReveal>
            ))}
          </div>

        </div>
      </main>
      <Footer />
      <WhatsAppFAB />
    </>
  );
}
