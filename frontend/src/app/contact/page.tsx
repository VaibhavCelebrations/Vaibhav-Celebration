import type { Metadata } from "next";
import { Phone, Mail, MapPin, Clock } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppFABServer } from "@/components/layout/WhatsAppFABServer";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { ContactForm } from "@/components/contact/ContactForm";
import { buildPageMetadata } from "@/lib/cms/metadata";
import { getContactPageContent } from "@/lib/cms/pages";
import { getPublicSettings } from "@/lib/cms/settings";

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata("contact", {
    title: "Contact Us",
    description: "Get in touch with Vaibhav Celebrations — we'd love to hear about your child's upcoming birthday.",
  });
}

export default async function ContactPage() {
  const [pageContent, settings] = await Promise.all([
    getContactPageContent().catch(() => null),
    getPublicSettings().catch(() => null),
  ]);

  const info = pageContent?.sections.info;
  const labels = pageContent?.sections.formLabels;

  const phone = info?.phone ?? settings?.businessPhone ?? "+91 00000 00000";
  const email = info?.email ?? settings?.businessEmail ?? "hello@vaibhavcelebrations.in";
  const address = info?.address ?? settings?.businessAddress ?? "Jaipur, Rajasthan, India";
  const hours = info?.hours ?? "Mon – Sun: 10 AM – 6 PM";

  return (
    <>
      <Navbar />
      <main className="pt-24 md:pt-28 pb-10 bg-surface min-h-[calc(100vh-80px)] flex flex-col justify-center">
        <div className="max-w-6xl w-full mx-auto px-5 md:px-10">
          <ScrollReveal delay={100}>
            <div className="bg-white rounded-[2rem] overflow-hidden shadow-2xl grid lg:grid-cols-5 border border-border-light relative">
              <div className="lg:col-span-2 bg-charcoal relative p-8 md:p-10 lg:p-12 flex flex-col overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-mocha/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-gold-soft/10 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/3" />

                <div className="relative z-10">
                  <h3 className="font-display text-3xl !text-white font-semibold mb-2">
                    {pageContent?.sections.hero?.title ?? "Contact Info"}
                  </h3>
                  <p className="text-white/70 text-sm mb-12">
                    {pageContent?.sections.hero?.subtitle ?? "Fill out the form and our team will get back to you within 24 hours."}
                  </p>

                  <div className="space-y-8">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 shrink-0 rounded-full bg-white/10 flex items-center justify-center border border-white/5 backdrop-blur-sm"><Phone size={20} className="text-gold-soft" /></div>
                      <div className="pt-1"><h4 className="text-xs uppercase tracking-wider !text-white/50 font-semibold mb-1">Phone</h4><p className="text-white font-medium text-lg">{phone}</p></div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 shrink-0 rounded-full bg-white/10 flex items-center justify-center border border-white/5 backdrop-blur-sm"><Mail size={20} className="text-gold-soft" /></div>
                      <div className="pt-1"><h4 className="text-xs uppercase tracking-wider !text-white/50 font-semibold mb-1">Email</h4><p className="text-white font-medium text-lg">{email}</p></div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 shrink-0 rounded-full bg-white/10 flex items-center justify-center border border-white/5 backdrop-blur-sm"><MapPin size={20} className="text-gold-soft" /></div>
                      <div className="pt-1"><h4 className="text-xs uppercase tracking-wider !text-white/50 font-semibold mb-1">Location</h4><p className="text-white font-medium text-lg">{address}</p></div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 shrink-0 rounded-full bg-white/10 flex items-center justify-center border border-white/5 backdrop-blur-sm"><Clock size={20} className="text-gold-soft" /></div>
                      <div className="pt-1"><h4 className="text-xs uppercase tracking-wider !text-white/50 font-semibold mb-1">Business Hours</h4><p className="text-white font-medium text-lg">{hours}</p></div>
                    </div>
                  </div>
                </div>

                <div className="relative z-10 mt-auto pt-16 flex gap-4">
                  {settings?.instagramUrl && (
                    <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                    </a>
                  )}
                  {settings?.facebookUrl && (
                    <a href={settings.facebookUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                    </a>
                  )}
                </div>
              </div>

              <div className="lg:col-span-3 p-8 md:p-10 lg:p-12 bg-white flex flex-col justify-center">
                <ContactForm submitLabel={labels?.submit ?? "Send Message"} fieldLabels={labels} />
              </div>
            </div>
          </ScrollReveal>
        </div>
      </main>
      <Footer />
      <WhatsAppFABServer />
    </>
  );
}
