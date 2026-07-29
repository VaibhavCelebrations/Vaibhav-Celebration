import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, MapPin, Sparkles } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CTABand } from "@/components/home/CTABand";
import { WhatsAppFABServer } from "@/components/layout/WhatsAppFABServer";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { SimpleGalleryGrid } from "@/components/shared/SimpleGalleryGrid";
import { getEventBySlug } from "@/lib/cms/events";
import { getPublicSettings, getWhatsAppNumber } from "@/lib/cms/settings";

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const event = await getEventBySlug(slug);
    return { title: `${event.title} | Vaibhav Celebrations`, description: event.shortDescription };
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

  const [settings, whatsappNumber] = await Promise.all([
    getPublicSettings().catch(() => null),
    getWhatsAppNumber().catch(() => ""),
  ]);

  return (
    <>
      <Navbar />
      <main className="bg-surface min-h-screen">
        <section className="relative w-full h-[55vh] md:h-[65vh] min-h-[380px]">
          <Image src={event.coverImage} alt={event.title} fill className="object-cover" priority sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/50 to-charcoal/20" />
          <div className="absolute inset-0 flex flex-col justify-end">
            <div className="max-w-4xl mx-auto px-5 md:px-10 w-full pb-10 md:pb-14 text-center">
              <ScrollReveal>
                <Link href="/events" className="inline-flex items-center gap-1.5 text-sm text-mocha hover:text-mocha-dark font-medium mb-6 transition-colors">
                  <ArrowLeft size={16} /> All Events
                </Link>
                <h1 className="font-display text-4xl md:text-5xl lg:text-7xl text-charcoal font-bold leading-tight mb-6">{event.title}</h1>
                <div className="flex flex-wrap justify-center gap-4 md:gap-6">
                  {event.location && (
                    <span className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm text-charcoal text-sm font-semibold px-5 py-2.5 rounded-full shadow-sm">
                      <MapPin size={15} className="text-mocha" />{event.location}
                    </span>
                  )}
                  {event.theme && (
                    <span className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm text-charcoal text-sm font-semibold px-5 py-2.5 rounded-full shadow-sm">
                      <Sparkles size={15} className="text-mocha" />{event.theme}
                    </span>
                  )}
                  {event.date && (
                    <span className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm text-charcoal text-sm font-semibold px-5 py-2.5 rounded-full shadow-sm">
                      <Calendar size={15} className="text-mocha" />{event.date}
                    </span>
                  )}
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        <section className="py-12 md:py-16 border-b border-border-light">
          <div className="max-w-3xl mx-auto px-5 md:px-10 text-center">
            <ScrollReveal>
              <p className="text-text-muted text-lg md:text-xl leading-relaxed">{event.shortDescription}</p>
              <div className="flex justify-center gap-4 mt-10">
                <Link href="/consultation" className="btn-primary text-sm px-8 py-4 shadow-lg hover:shadow-xl transition-all">Plan a Similar Event</Link>
                <Link href="/contact" className="btn-outline text-sm px-8 py-4 transition-all">Get In Touch</Link>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {event.gallery.length > 0 && (
          <section className="py-16 md:py-24 bg-cream">
            <div className="max-w-6xl mx-auto px-5 md:px-10">
              <ScrollReveal>
                <div className="text-center mb-12">
                  <p className="text-xs font-bold text-mocha uppercase tracking-[0.2em] mb-3">Gallery</p>
                  <h2 className="font-display text-3xl md:text-4xl text-charcoal font-bold">Event Highlights</h2>
                </div>
              </ScrollReveal>
              <ScrollReveal delay={100}>
                <SimpleGalleryGrid images={event.gallery} altPrefix={event.title} />
              </ScrollReveal>
            </div>
          </section>
        )}

        <CTABand settings={settings ?? undefined} whatsappNumber={whatsappNumber} />
      </main>
      <Footer />
      <WhatsAppFABServer />
    </>
  );
}
