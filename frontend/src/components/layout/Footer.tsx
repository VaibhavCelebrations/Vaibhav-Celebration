import Link from "next/link";
import Image from "next/image";
import { MapPin, Mail, Phone, Clock } from "lucide-react";

const exploreLinks = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about" },
  { label: "Events", href: "/events" },
  { label: "Themes", href: "/themes" },
  { label: "Packages", href: "/packages" },
  { label: "Blog", href: "/blog" },
];

const eventLinks = [
  { label: "All Events", href: "/events" },
  { label: "Grand 1st Birthday", href: "/events/grand-1st-birthday" },
];

const supportLinks = [
  { label: "FAQs", href: "/faq" },
  { label: "Contact Us", href: "/contact" },
  { label: "Privacy Policy", href: "/legal/privacy-policy" },
  { label: "Refund & Cancellation", href: "/legal/refund-policy" },
  { label: "Terms & Conditions", href: "/legal/terms-of-service" },
];

export function Footer() {
  return (
    <footer className="bg-cream pt-16 md:pt-20 pb-8 border-t border-border">
      <div className="max-w-7xl mx-auto px-5 md:px-10 grid sm:grid-cols-2 lg:grid-cols-5 gap-10">
        {/* Brand */}
        <div className="lg:col-span-1">
          <Link href="/" className="flex items-center gap-2 mb-2">
            <Image src="/logo.png" alt="Vaibhav Celebrations" width={192} height={192} className="shrink-0 w-48 h-auto" />
          </Link>
          <p className="mt-4 text-xs text-text-muted leading-relaxed">
            Vaibhav Celebrations is a thoughtfully curated kids celebration brand
            specializing in customized birthday parties and milestone celebrations.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="text-xs font-semibold tracking-wider uppercase text-charcoal mb-4">Quick Links</h4>
          <ul className="space-y-2.5 text-sm text-text-muted">
            {exploreLinks.map((l) => (<li key={l.label}><Link href={l.href} className="hover:text-mocha transition-colors">{l.label}</Link></li>))}
          </ul>
        </div>

        {/* Events */}
        <div>
          <h4 className="text-xs font-semibold tracking-wider uppercase text-charcoal mb-4">Events</h4>
          <ul className="space-y-2.5 text-sm text-text-muted">
            {eventLinks.map((l) => (<li key={l.label}><Link href={l.href} className="hover:text-mocha transition-colors">{l.label}</Link></li>))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="text-xs font-semibold tracking-wider uppercase text-charcoal mb-4">Contact Us</h4>
          <ul className="space-y-3 text-sm text-text-muted">
            <li className="flex items-start gap-2"><MapPin size={14} className="shrink-0 mt-0.5 text-mocha" />Jaipur, Rajasthan, India</li>
            <li className="flex items-center gap-2"><Phone size={14} className="shrink-0 text-mocha" />+91 00000 00000</li>
            <li className="flex items-center gap-2"><Mail size={14} className="shrink-0 text-mocha" />hello@vaibhavcelebrations.in</li>
            <li className="flex items-center gap-2"><Clock size={14} className="shrink-0 text-mocha" />Mon - Sun: 10:00 AM - 6:00 PM</li>
          </ul>
        </div>

        {/* Newsletter */}
        <div>
          <h4 className="text-xs font-semibold tracking-wider uppercase text-charcoal mb-4">Newsletter</h4>
          <p className="text-sm text-text-muted mb-4">Subscribe to get updates and exclusive offers.</p>
          <div className="flex">
            <input type="email" placeholder="Enter your email" className="flex-1 min-w-0 rounded-l-lg border border-border bg-surface px-3 py-2.5 text-sm text-charcoal placeholder:text-text-light focus:outline-none focus:border-mocha" />
            <button className="bg-mocha hover:bg-mocha-dark text-white px-4 rounded-r-lg transition-colors" aria-label="Subscribe">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="max-w-7xl mx-auto px-5 md:px-10 mt-12 pt-6 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-text-light">
        <p>© {new Date().getFullYear()} Vaibhav Celebrations. All rights reserved.</p>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 text-charcoal/60">
            <a href="https://www.instagram.com/vaibhavcelebrations.in/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:text-mocha transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r="0.6" fill="currentColor" stroke="none"/></svg>
            </a>
            <a href="https://www.facebook.com/profile.php?id=61574357200002" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="hover:text-mocha transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M15 8h2V4h-2a4 4 0 0 0-4 4v3H9v4h2v7h4v-7h2.5l.5-4H15V8Z"/></svg>
            </a>
          </div>
          <div className="flex gap-4">
            <Link href="/legal/privacy-policy" className="hover:text-mocha transition-colors">Privacy Policy</Link>
            <Link href="/legal/terms-of-service" className="hover:text-mocha transition-colors">Terms & Conditions</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
