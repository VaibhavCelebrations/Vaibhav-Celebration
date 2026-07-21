import type { Metadata } from "next";
import { Phone, Mail, MapPin, Clock } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppFAB } from "@/components/layout/WhatsAppFAB";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with Vaibhav Celebrations — we'd love to hear about your child's upcoming birthday.",
};

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <main className="pt-28 md:pt-36 pb-20 md:pb-32 bg-surface min-h-screen">
        <div className="max-w-6xl mx-auto px-5 md:px-10">
          
          <ScrollReveal>
            <div className="mb-12">
              <SectionHeader 
                eyebrow="Get in Touch" 
                title="Let's Plan Something Magical" 
                description="Whether you have a fully formed vision or just the seed of an idea, we're here to bring your child's dream celebration to life." 
              />
            </div>
          </ScrollReveal>

          <ScrollReveal delay={100}>
            <div className="bg-white rounded-[2rem] overflow-hidden shadow-2xl grid lg:grid-cols-5 border border-border-light relative">
              
              {/* Left Column: Contact Information (Dark Theme) */}
              <div className="lg:col-span-2 bg-charcoal relative p-10 md:p-12 lg:p-16 flex flex-col overflow-hidden">
                {/* Decorative background blur */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-mocha/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-gold-soft/10 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/3" />
                
                <div className="relative z-10">
                  <h3 className="font-display text-3xl text-white font-semibold mb-2">Contact Info</h3>
                  <p className="text-white/70 text-sm mb-12">Fill out the form and our team will get back to you within 24 hours.</p>
                  
                  <div className="space-y-8">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 shrink-0 rounded-full bg-white/10 flex items-center justify-center border border-white/5 backdrop-blur-sm">
                        <Phone size={20} className="text-gold-soft" />
                      </div>
                      <div className="pt-1">
                        <h4 className="text-xs uppercase tracking-wider text-white/50 font-semibold mb-1">Phone</h4>
                        <p className="text-white font-medium text-lg">+91 00000 00000</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 shrink-0 rounded-full bg-white/10 flex items-center justify-center border border-white/5 backdrop-blur-sm">
                        <Mail size={20} className="text-gold-soft" />
                      </div>
                      <div className="pt-1">
                        <h4 className="text-xs uppercase tracking-wider text-white/50 font-semibold mb-1">Email</h4>
                        <p className="text-white font-medium text-lg">hello@vaibhavcelebrations.in</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 shrink-0 rounded-full bg-white/10 flex items-center justify-center border border-white/5 backdrop-blur-sm">
                        <MapPin size={20} className="text-gold-soft" />
                      </div>
                      <div className="pt-1">
                        <h4 className="text-xs uppercase tracking-wider text-white/50 font-semibold mb-1">Location</h4>
                        <p className="text-white font-medium text-lg">Jaipur, Rajasthan, India</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 shrink-0 rounded-full bg-white/10 flex items-center justify-center border border-white/5 backdrop-blur-sm">
                        <Clock size={20} className="text-gold-soft" />
                      </div>
                      <div className="pt-1">
                        <h4 className="text-xs uppercase tracking-wider text-white/50 font-semibold mb-1">Business Hours</h4>
                        <p className="text-white font-medium text-lg">Mon – Sun: 10 AM – 6 PM</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative z-10 mt-auto pt-16 flex gap-4">
                  <a href="https://www.instagram.com/vaibhavcelebrations.in/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                  </a>
                  <a href="https://www.facebook.com/profile.php?id=61574357200002" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                  </a>
                </div>
              </div>

              {/* Right Column: Form (Light Theme) */}
              <div className="lg:col-span-3 p-10 md:p-12 lg:p-16 bg-white">
                <form className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label htmlFor="contact-first-name" className="block text-sm font-semibold text-charcoal">First Name</label>
                      <input 
                        id="contact-first-name" 
                        type="text" 
                        className="w-full border-b-2 border-border-light bg-transparent px-0 py-2.5 text-charcoal placeholder:text-text-light focus:outline-none focus:border-mocha transition-colors rounded-none" 
                        placeholder="John"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="contact-last-name" className="block text-sm font-semibold text-charcoal">Last Name</label>
                      <input 
                        id="contact-last-name" 
                        type="text" 
                        className="w-full border-b-2 border-border-light bg-transparent px-0 py-2.5 text-charcoal placeholder:text-text-light focus:outline-none focus:border-mocha transition-colors rounded-none" 
                        placeholder="Doe"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label htmlFor="contact-email" className="block text-sm font-semibold text-charcoal">Email Address</label>
                      <input 
                        id="contact-email" 
                        type="email" 
                        className="w-full border-b-2 border-border-light bg-transparent px-0 py-2.5 text-charcoal placeholder:text-text-light focus:outline-none focus:border-mocha transition-colors rounded-none" 
                        placeholder="john@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="contact-phone" className="block text-sm font-semibold text-charcoal">Phone Number</label>
                      <input 
                        id="contact-phone" 
                        type="tel" 
                        className="w-full border-b-2 border-border-light bg-transparent px-0 py-2.5 text-charcoal placeholder:text-text-light focus:outline-none focus:border-mocha transition-colors rounded-none" 
                        placeholder="+91 00000 00000"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2 pt-2">
                    <label className="block text-sm font-semibold text-charcoal">What are you interested in?</label>
                    <div className="flex flex-wrap gap-3 mt-3">
                      <label className="cursor-pointer">
                        <input type="radio" name="interest" className="peer sr-only" defaultChecked />
                        <span className="inline-block px-5 py-2.5 rounded-full border border-border text-sm text-text-muted peer-checked:border-mocha peer-checked:bg-mocha/5 peer-checked:text-mocha transition-all">Birthday Theme</span>
                      </label>
                      <label className="cursor-pointer">
                        <input type="radio" name="interest" className="peer sr-only" />
                        <span className="inline-block px-5 py-2.5 rounded-full border border-border text-sm text-text-muted peer-checked:border-mocha peer-checked:bg-mocha/5 peer-checked:text-mocha transition-all">Milestone Event</span>
                      </label>
                      <label className="cursor-pointer">
                        <input type="radio" name="interest" className="peer sr-only" />
                        <span className="inline-block px-5 py-2.5 rounded-full border border-border text-sm text-text-muted peer-checked:border-mocha peer-checked:bg-mocha/5 peer-checked:text-mocha transition-all">Custom Query</span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <label htmlFor="contact-message" className="block text-sm font-semibold text-charcoal">Message</label>
                    <textarea 
                      id="contact-message" 
                      rows={4} 
                      className="w-full border-b-2 border-border-light bg-transparent px-0 py-2.5 text-charcoal placeholder:text-text-light focus:outline-none focus:border-mocha transition-colors rounded-none resize-none" 
                      placeholder="Tell us a little bit about the celebration you're planning..."
                    />
                  </div>

                  <div className="pt-6 text-right">
                    <button type="button" className="btn-primary px-10 py-4 rounded-full shadow-lg hover:shadow-xl transition-all">
                      Send Message
                    </button>
                  </div>
                </form>
              </div>

            </div>
          </ScrollReveal>
          
        </div>
      </main>
      <Footer />
      <WhatsAppFAB />
    </>
  );
}
