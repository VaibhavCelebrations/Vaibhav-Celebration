import Link from "next/link";
import Image from "next/image";
import { MapPin, Mail, Phone, Clock } from "lucide-react";

const exploreLinks = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about" },
  { label: "Gallery", href: "/gallery" },
  { label: "Packages", href: "/packages" },
  { label: "Contact Us", href: "/contact" },
];

const themeLinks = [
  { label: "Space Theme", href: "/themes/space-theme" },
  { label: "Cocomelon Theme", href: "/themes/cocomelon-theme" },
  { label: "Princess Theme", href: "/themes/princess-theme" },
  { label: "Jungle Safari Theme", href: "/themes/jungle-safari-theme" },
  { label: "All Themes", href: "/themes" },
];

const blogLinks = [
  { label: "Magical Birthday Themes", href: "/blog/5-magical-themes-for-kids-birthday" },
  { label: "Personalized Return Gifts", href: "/blog/perfect-personalized-return-gifts" },
  { label: "1st Birthday Checklist", href: "/blog/1st-birthday-celebration-checklist" },
  { label: "Activity-Based Birthdays", href: "/blog/activity-based-birthdays-trend" },
  { label: "All Articles", href: "/blog" },
];

const supportLinks = [
  { label: "FAQs", href: "/faq" },
  { label: "Privacy Policy", href: "/legal/privacy-policy" },
  { label: "Refund & Cancellation", href: "/legal/refund-policy" },
  { label: "Terms & Conditions", href: "/legal/terms-of-service" },
];

export function Footer() {
  return (
    <footer className="bg-cream pt-16 md:pt-20 pb-8 border-t border-border">
      <div className="max-w-7xl mx-auto px-5 md:px-10 grid sm:grid-cols-2 lg:grid-cols-6 gap-10">
        {/* Brand */}
        <div className="lg:col-span-2">
          <Link href="/" className="flex items-center gap-2 mb-2">
            <Image src="/logo.png" alt="Vaibhav Celebrations" width={192} height={192} className="shrink-0 w-48 h-auto" />
          </Link>
          <p className="mt-4 text-xs text-text-muted leading-relaxed">
            Vaibhav Celebrations is a thoughtfully curated kids celebration brand
            specializing in customized birthday parties and milestone celebrations.
          </p>
          {/* Contact info */}
          <ul className="mt-6 space-y-2.5 text-xs text-text-muted">
            <li className="flex items-start gap-2"><MapPin size={13} className="shrink-0 mt-0.5 text-mocha" />Jaipur, Rajasthan, India</li>
            <li className="flex items-center gap-2"><Phone size={13} className="shrink-0 text-mocha" />+91 00000 00000</li>
            <li className="flex items-center gap-2"><Mail size={13} className="shrink-0 text-mocha" />hello@vaibhavcelebrations.in</li>
            <li className="flex items-center gap-2"><Clock size={13} className="shrink-0 text-mocha" />Mon - Sun: 10 AM - 6 PM</li>
          </ul>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="text-xs font-semibold tracking-wider uppercase text-charcoal mb-4">Quick Links</h4>
          <ul className="space-y-2.5 text-sm text-text-muted">
            {exploreLinks.map((l) => (<li key={l.label}><Link href={l.href} className="hover:text-mocha transition-colors">{l.label}</Link></li>))}
          </ul>
        </div>

        {/* Themes */}
        <div>
          <h4 className="text-xs font-semibold tracking-wider uppercase text-charcoal mb-4">Themes</h4>
          <ul className="space-y-2.5 text-sm text-text-muted">
            {themeLinks.map((l) => (<li key={l.label}><Link href={l.href} className="hover:text-mocha transition-colors">{l.label}</Link></li>))}
          </ul>
        </div>

        {/* Blog */}
        <div>
          <h4 className="text-xs font-semibold tracking-wider uppercase text-charcoal mb-4">Blog</h4>
          <ul className="space-y-2.5 text-sm text-text-muted">
            {blogLinks.map((l) => (<li key={l.label}><Link href={l.href} className="hover:text-mocha transition-colors">{l.label}</Link></li>))}
          </ul>
        </div>

        {/* Support */}
        <div>
          <h4 className="text-xs font-semibold tracking-wider uppercase text-charcoal mb-4">Support</h4>
          <ul className="space-y-2.5 text-sm text-text-muted">
            {supportLinks.map((l) => (<li key={l.label}><Link href={l.href} className="hover:text-mocha transition-colors">{l.label}</Link></li>))}
          </ul>
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
