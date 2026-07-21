import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, MapPin, Sparkles } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CTABand } from "@/components/home/CTABand";
import { WhatsAppFAB } from "@/components/layout/WhatsAppFAB";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { placeholderEvents } from "@/lib/placeholder-data";
import { MasonryGallery } from "@/components/gallery/MasonryGallery";

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const event = placeholderEvents.find((e) => e.slug === slug);
  if (!event) return { title: "Event Not Found" };
  return { title: `${event.title} | Vaibhav Celebrations`, description: event.shortDescription };
}

export default async function EventDetailPage({ params }: Props) {
  const { slug } = await params;
  const event = placeholderEvents.find((e) => e.slug === slug);
  if (!event) notFound();

  // Convert the simple string array to the object structure MasonryGallery expects
  const galleryImages = event.gallery.map((url, i) => ({
    id: `event-gal-${i}`,
    imageUrl: url,
    caption: `${event.title} - Highlight ${i + 1}`,
    altText: `Photo from ${event.title}`,
    tags: [event.theme],
    aspectRatio: i % 3 === 0 ? "portrait" : i % 2 === 0 ? "landscape" : "square" as any
  }));

  return (
    <>
      {/* We make the Navbar transparent at the top since we have a full-bleed hero image */}
      <Navbar />
      
      <main className="bg-surface min-h-screen">
        {/* Full-width Hero Image with smooth blend into content */}
        <section className="relative w-full h-[60vh] md:h-[70vh] min-h-[400px]">
          <Image 
            src={event.coverImage} 
            alt={event.title} 
            fill 
            className="object-cover" 
            priority
            sizes="100vw"
          />
          {/* Smooth blend gradient that fades into the surface color */}
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/60 to-transparent" />
          
          <div className="absolute inset-0 flex flex-col justify-end">
            <div className="max-w-4xl mx-auto px-5 md:px-10 w-full pb-10 md:pb-16 text-center">
              <ScrollReveal>
                <Link href="/events" className="inline-flex items-center gap-1.5 text-sm text-mocha hover:text-mocha-dark font-medium mb-6 transition-colors">
                  <ArrowLeft size={16} /> All Events
                </Link>
                <h1 className="font-display text-4xl md:text-5xl lg:text-7xl text-charcoal font-bold leading-tight mb-6">
                  {event.title}
                </h1>
                
                {/* Event Metadata */}
                <div className="flex flex-wrap justify-center gap-6 text-sm font-medium text-mocha uppercase tracking-widest mt-8">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} />
                    {event.location}
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} />
                    {event.theme}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={16} />
                    {event.date}
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="pb-16 md:pb-24 -mt-4 relative z-10">
          <div className="max-w-3xl mx-auto px-5 md:px-10">
            <ScrollReveal delay={100}>
              <div className="prose prose-lg md:prose-xl prose-p:text-text-muted prose-p:leading-relaxed prose-headings:font-display prose-headings:text-charcoal prose-headings:font-semibold max-w-none whitespace-pre-wrap text-center">
                {event.content}
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* Gallery Section */}
        <section className="pb-20 md:pb-32 bg-cream">
          <div className="max-w-7xl mx-auto px-5 md:px-10 pt-16 md:pt-24">
            <ScrollReveal>
              <div className="text-center mb-12">
                <h2 className="font-display text-3xl md:text-4xl text-charcoal font-bold mb-4">
                  Event Highlights
                </h2>
                <div className="h-px w-24 bg-mocha/30 mx-auto" />
              </div>
            </ScrollReveal>
            
            <ScrollReveal delay={100}>
              <MasonryGallery images={galleryImages} />
            </ScrollReveal>
          </div>
        </section>

        <CTABand />
      </main>
      <Footer />
      <WhatsAppFAB />
    </>
  );
}
