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
      <main className="pt-28 md:pt-36 pb-20 bg-surface min-h-screen">
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

          <div className="grid grid-cols-1 gap-16 md:gap-32">
            {events.map((event, i) => {
              const isFirst = i === 0;
              const isEven = i % 2 === 0;
              
              return (
                <ScrollReveal key={event.id} delay={100}>
                  <Link 
                    href={`/events/${event.slug}`} 
                    className={`group block relative w-full rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-card transition-all duration-700 hover:shadow-hover hover:-translate-y-2 bg-white ${isFirst ? '' : ''}`}
                  >
                    <div className={`flex flex-col ${isFirst ? 'md:flex-col' : (isEven ? 'md:flex-row' : 'md:flex-row-reverse')} h-full`}>
                      
                      {/* Image Section */}
                      <div className={`relative w-full ${isFirst ? 'md:aspect-[21/9] aspect-video' : 'md:w-3/5 aspect-video md:aspect-auto md:min-h-[500px]'} overflow-hidden`}>
                        <Image 
                          src={event.coverImage} 
                          alt={event.title} 
                          fill 
                          className="object-cover transition-transform duration-1000 group-hover:scale-105" 
                          sizes={isFirst ? "100vw" : "(max-width: 768px) 100vw, 60vw"} 
                          priority={i < 2} 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/90 via-charcoal/40 to-transparent opacity-80 group-hover:opacity-60 transition-opacity duration-700" />
                      </div>

                      {/* Content Section */}
                      <div className={`w-full ${isFirst ? 'md:absolute md:bottom-0 md:left-0 md:right-0 md:bg-gradient-to-t md:from-charcoal md:via-charcoal/90 md:to-transparent md:pt-32' : 'md:w-2/5'} p-8 md:p-12 lg:p-16 flex flex-col justify-center relative bg-white md:bg-transparent overflow-hidden`}>
                        {/* Decorative Background Element (only on non-first) */}
                        {!isFirst && (
                          <div className={`absolute ${isEven ? '-right-20' : '-left-20'} -bottom-20 w-64 h-64 bg-cream rounded-full blur-[80px] opacity-50 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none`} />
                        )}
                        
                        <div className="relative z-10">
                          <h2 
                            className={`font-display font-bold mb-4 leading-[1.1] transition-colors duration-500 ${isFirst ? 'text-3xl md:text-5xl lg:text-6xl group-hover:text-mocha-light' : 'text-3xl md:text-4xl lg:text-5xl text-charcoal group-hover:text-mocha'}`}
                            style={isFirst ? { color: '#F5F3E6' } : undefined}
                          >
                            {event.title}
                          </h2>
                          
                          <div className="flex flex-wrap gap-4 mb-6">
                            {event.date && (
                              <div className={`flex items-center gap-2 font-medium text-sm ${isFirst ? 'text-cream/90' : 'text-text-muted'}`}>
                                <Calendar size={16} className={isFirst ? "text-mocha-light" : "text-mocha"} />
                                <span>{event.date}</span>
                              </div>
                            )}
                            {event.location && (
                              <div className={`flex items-center gap-2 font-medium text-sm ${isFirst ? 'text-cream/90' : 'text-text-muted'}`}>
                                <MapPin size={16} className={isFirst ? "text-mocha-light" : "text-mocha"} />
                                <span>{event.location}</span>
                              </div>
                            )}
                          </div>

                          <div 
                            className={`prose prose-p:leading-relaxed prose-p:text-base mb-8 line-clamp-3 ${isFirst ? 'prose-invert text-cream/90 prose-p:text-cream/90 md:prose-p:text-lg max-w-3xl' : 'prose-p:text-text-muted'}`}
                            dangerouslySetInnerHTML={{ __html: event.shortDescription }}
                          />

                          <div className={`inline-flex items-center gap-2 font-bold uppercase tracking-wider text-sm group-hover:gap-4 transition-all ${isFirst ? 'text-charcoal bg-cream hover:bg-white px-6 py-3 rounded-full' : 'text-mocha'}`}>
                            Explore Event <ArrowRight size={16} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </main>
      <Footer />
      <WhatsAppFABServer />
    </>
  );
}
