import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, MapPin, Sparkles, Users, Activity, HelpCircle, CheckCircle2 } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { SimpleGalleryGrid } from "@/components/shared/SimpleGalleryGrid";
import { getEventBySlug } from "@/lib/cms/events";
import { formatInrFromPaise } from "@/lib/cms/map-media";

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const event = await getEventBySlug(slug);
    return { title: `${event.seoTitle || event.title} | Vaibhav Celebrations`, description: event.seoDescription || event.shortDescription };
  } catch {
    return { title: "Event Not Found" };
  }
}

export default async function EventDetailPage({ params }: Props) {
  const { slug } = await params;

  let event;
  try {
    event = await getEventBySlug(slug);
  } catch {
    notFound();
  }

  const ctaLink = event.ctaUrl || `/events/${event.slug}/register`;
  const ctaText = event.ctaLabel || (event.isRegistrationOpen ? "Register Now" : "Contact Us");

  return (
    <div className="bg-surface min-h-screen">
      {/* Floating Back Button */}
      <Link href="/events" className="fixed top-6 left-6 z-50 bg-black/40 backdrop-blur-md hover:bg-white/10 text-white p-3 rounded-full border border-white/20 transition-colors shadow-xl">
        <ArrowLeft size={24} />
      </Link>

      {/* Massive Full Screen Hero Section with Intense Black Gradient */}
      <section className="relative w-full h-screen min-h-[600px] flex flex-col justify-end pb-20 md:pb-32">
        <Image src={event.coverImage} alt={event.title} fill className="object-cover opacity-90" priority sizes="100vw" />
        
        {/* Intense Black Gradient as requested */}
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/80 to-transparent" />
        <div className="absolute inset-0 bg-black/40" /> {/* Extra overlay for maximum contrast */}
        
        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 w-full">
          <ScrollReveal>
            <div className="inline-flex items-center gap-2 bg-black/40 text-mocha-light backdrop-blur-md px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest mb-6 border border-white/20">
              <Sparkles size={14} />
              {event.theme || "Special Event"}
            </div>
            
            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl text-white font-bold leading-[1.05] mb-8 drop-shadow-[0_4px_24px_rgba(0,0,0,0.8)] max-w-5xl">
              {event.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 md:gap-6 mb-12">
              {event.date && (
                <div className="flex items-center gap-2 text-white/95 text-sm md:text-base font-medium bg-black/30 px-4 py-2 rounded-full border border-white/10 backdrop-blur-sm shadow-sm">
                  <Calendar size={18} className="text-mocha-light" /> {event.date}
                </div>
              )}
              {event.location && (
                <div className="flex items-center gap-2 text-white/95 text-sm md:text-base font-medium bg-black/30 px-4 py-2 rounded-full border border-white/10 backdrop-blur-sm shadow-sm">
                  <MapPin size={18} className="text-mocha-light" /> {event.location}
                </div>
              )}
              {event.ageGroup && (
                <div className="flex items-center gap-2 text-white/95 text-sm md:text-base font-medium bg-black/30 px-4 py-2 rounded-full border border-white/10 backdrop-blur-sm shadow-sm">
                  <Users size={18} className="text-mocha-light" /> {event.ageGroup}
                </div>
              )}
            </div>

            {event.isRegistrationOpen && (
              <div className="flex flex-col sm:flex-row items-center gap-6 p-6 md:p-2 bg-white/10 border border-white/20 rounded-[2rem] md:rounded-full backdrop-blur-md w-fit shadow-xl">
                <Link href={ctaLink} className="bg-cream hover:bg-white text-charcoal px-10 py-5 rounded-full font-bold uppercase tracking-widest transition-all shadow-[0_0_40px_-10px_rgba(245,243,230,0.3)] hover:shadow-[0_0_60px_-10px_rgba(245,243,230,0.5)] flex items-center gap-3 w-full sm:w-auto justify-center">
                  {ctaText} <ArrowLeft size={20} className="rotate-180" />
                </Link>
                {event.registrationFeeInPaise != null && event.registrationFeeInPaise > 0 && (
                  <div className="flex flex-col px-6 w-full sm:w-auto items-center sm:items-start text-center sm:text-left">
                    <span className="text-white/70 text-xs uppercase tracking-wider font-bold">Entry Fee</span>
                    <span className="text-white font-medium text-lg">{formatInrFromPaise(event.registrationFeeInPaise)}</span>
                  </div>
                )}
                {event.registrationFeeInPaise === 0 && (
                  <div className="flex flex-col px-6 w-full sm:w-auto items-center sm:items-start text-center sm:text-left">
                    <span className="text-white/70 text-xs uppercase tracking-wider font-bold">Entry Fee</span>
                    <span className="text-white font-medium text-lg text-mocha-light">Free Entry</span>
                  </div>
                )}
              </div>
            )}
          </ScrollReveal>
        </div>
      </section>

      {/* Description Section (Light Theme) */}
      <section className="py-24 max-w-4xl mx-auto px-6 md:px-12">
        <ScrollReveal>
          <div 
            className="prose prose-lg md:prose-2xl prose-headings:font-display prose-headings:text-charcoal prose-p:text-text-muted prose-p:leading-relaxed prose-a:text-mocha mx-auto"
            dangerouslySetInnerHTML={{ __html: event.shortDescription }}
          />
        </ScrollReveal>
      </section>

      {/* Activities Section (Cream Background for contrast) */}
      {event.activities && event.activities.length > 0 && (
        <section className="py-24 bg-cream border-y border-border-light relative overflow-hidden">
          {/* Subtle Decorative Elements */}
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-mocha/20 to-transparent" />
          
          <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
            <ScrollReveal>
              <div className="flex flex-col mb-16 items-center text-center">
                <Activity className="text-mocha mb-6" size={48} />
                <h2 className="font-display text-4xl md:text-6xl text-charcoal font-bold tracking-tight">Event Highlights</h2>
                <p className="text-text-muted text-lg mt-4 max-w-2xl">What to expect at this exclusive celebration.</p>
              </div>
            </ScrollReveal>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {event.activities.map((act, i) => (
                <ScrollReveal key={i} delay={i * 100}>
                  <div className="group bg-white rounded-[2rem] p-8 md:p-10 shadow-sm hover:shadow-xl transition-all duration-500 h-full border border-border-light hover:border-mocha/30 flex flex-col gap-6">
                    <div className="w-14 h-14 shrink-0 bg-cream-dark rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-500 group-hover:bg-mocha/10">
                      <CheckCircle2 size={24} className="text-mocha" />
                    </div>
                    <p className="font-bold text-charcoal text-xl md:text-2xl leading-tight group-hover:text-mocha-dark transition-colors">{act.title}</p>
                    {act.description && <p className="text-text-muted text-sm leading-relaxed">{act.description}</p>}
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Gallery Section */}
      {event.gallery.length > 0 && (
        <section className="py-24 bg-surface">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <ScrollReveal>
              <div className="mb-16 text-center">
                <h2 className="font-display text-4xl md:text-6xl text-charcoal font-bold mb-4">Gallery</h2>
                <p className="text-text-muted text-xl">A glimpse into the stunning details.</p>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={100}>
              <SimpleGalleryGrid images={event.gallery} altPrefix={event.title} />
            </ScrollReveal>
          </div>
        </section>
      )}

      {/* FAQ Section */}
      {event.faqItems && event.faqItems.length > 0 && (
        <section className="py-24 bg-cream relative border-t border-border-light">
          <div className="max-w-4xl mx-auto px-6 md:px-12">
            <ScrollReveal>
              <div className="mb-16 text-center">
                <HelpCircle className="mx-auto text-mocha mb-6" size={48} />
                <h2 className="font-display text-4xl md:text-6xl text-charcoal font-bold">FAQs</h2>
              </div>
              <div className="space-y-6 md:space-y-8">
                {event.faqItems.map((faq, i) => (
                  <div key={i} className="bg-white rounded-[2rem] p-8 md:p-10 shadow-sm border border-border-light hover:border-mocha/20 transition-colors">
                    <h4 className="font-bold text-xl md:text-2xl mb-4 flex gap-4 text-charcoal">
                      <span className="text-mocha font-display">Q.</span> {faq.question}
                    </h4>
                    <p className="text-text-muted text-lg leading-relaxed md:ml-10">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </section>
      )}
    </div>
  );
}
