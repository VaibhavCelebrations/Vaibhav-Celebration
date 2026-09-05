import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, MapPin, Calendar, Sparkles } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppFABServer } from "@/components/layout/WhatsAppFABServer";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { buildPageMetadata } from "@/lib/cms/metadata";
import { listEvents } from "@/lib/cms/events";

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata("events", {
    title: "Our Events",
    description: "Explore our magical past events and celebrations.",
  });
}

export default async function EventsPage() {
  const events = await listEvents().catch(() => []);

  return (
    <>
      <Navbar />
      <main className="pt-28 md:pt-36 pb-20 bg-cream min-h-screen">
        <div className="max-w-6xl mx-auto px-5 md:px-10">
          <ScrollReveal>
            <div className="text-center mb-16 md:mb-24">
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="h-px w-10 md:w-16 bg-gradient-to-r from-transparent to-mocha/60" />
                <p className="text-sm font-bold text-mocha uppercase tracking-[0.2em]">Experiences</p>
                <div className="h-px w-10 md:w-16 bg-gradient-to-l from-transparent to-mocha/60" />
              </div>
              <h1 className="font-display text-4xl md:text-6xl lg:text-7xl text-charcoal font-bold mb-6">Signature Events</h1>
              <p className="text-text-muted max-w-2xl mx-auto text-lg md:text-xl leading-relaxed">
                Step inside some of our most beautiful celebrations. We bring dreams to life with meticulous attention to detail and boundless creativity.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
            {events.map((event, i) => (
              <ScrollReveal key={event.id} delay={(i % 6) * 100}>
                <Link 
                  href={`/events/${event.slug}`} 
                  className="group block relative w-full h-full bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2 border border-border-light/40 flex flex-col"
                >
                  {/* Image Section */}
                  <div className="relative w-full aspect-[4/3] overflow-hidden bg-cream-dark">
                    <Image 
                      src={event.coverImage} 
                      alt={event.title} 
                      fill 
                      className="object-cover transition-transform duration-700 group-hover:scale-105" 
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw" 
                      priority={i < 4} 
                    />
                    <div className="absolute inset-0 bg-mocha/20 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10 flex items-center justify-center pointer-events-none">
                      <span className="bg-white/95 text-mocha text-xs font-bold px-5 py-2.5 rounded-full shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-500 uppercase tracking-widest">
                        View Event
                      </span>
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className="p-6 md:p-8 flex-1 flex flex-col relative z-20 bg-white">
                    <h2 className="font-display font-bold text-2xl lg:text-3xl text-charcoal group-hover:text-mocha transition-colors mb-3 leading-snug line-clamp-2">
                      {event.title}
                    </h2>
                    
                    <div className="flex flex-wrap items-center gap-4 mb-4">
                      {event.date && (
                        <div className="flex items-center gap-1.5 font-medium text-xs text-text-muted">
                          <Calendar size={14} className="text-mocha" />
                          <span>{event.date}</span>
                        </div>
                      )}
                      {event.location && (
                        <div className="flex items-center gap-1.5 font-medium text-xs text-text-muted">
                          <MapPin size={14} className="text-mocha" />
                          <span>{event.location}</span>
                        </div>
                      )}
                    </div>

                    <div 
                      className="prose prose-sm prose-p:leading-relaxed prose-p:text-text-muted mb-6 line-clamp-3"
                      dangerouslySetInnerHTML={{ __html: event.shortDescription }}
                    />
                  </div>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </main>
      <Footer />
      <WhatsAppFABServer />
    </>
  );
}
