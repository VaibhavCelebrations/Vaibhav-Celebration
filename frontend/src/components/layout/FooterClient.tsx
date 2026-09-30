"use client";

import Link from "next/link";
import Image from "next/image";
import { MapPin, Mail, Phone, Clock } from "lucide-react";
import type { PublicSettings } from "@/lib/cms/types";
import { BUSINESS, DEFAULT_PUBLIC_SETTINGS, telHref } from "@/lib/business";
import { openCookieSettings } from "@/lib/cookie-consent";

const exploreLinks = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about" },
  { label: "Gallery", href: "/gallery" },
  { label: "Packages", href: "/packages" },
  { label: "Contact Us", href: "/contact" },
];

const supportLinks = [
  { label: "FAQs", href: "/faq" },
  { label: "Privacy Policy", href: "/legal/privacy-policy" },
  { label: "Refund & Cancellation", href: "/legal/refund-policy" },
  { label: "Shipping & Delivery", href: "/legal/cancellation-policy" },
  { label: "Terms & Conditions", href: "/legal/terms-of-service" },
];

export const DEFAULT_FOOTER_SETTINGS: PublicSettings = DEFAULT_PUBLIC_SETTINGS;

/** Drop empty/null values so they don't override the official fallbacks. */
function stripEmpty(settings?: Partial<PublicSettings>): Partial<PublicSettings> {
  if (!settings) return {};
  return Object.fromEntries(Object.entries(settings).filter(([, v]) => v !== null && v !== undefined && v !== ""));
}

const DEFAULT_THEME_LINKS = [{ label: "All Themes", href: "/themes" }];
const DEFAULT_BLOG_LINKS = [{ label: "All Articles", href: "/blog" }];

export type FooterClientProps = {
  settings?: PublicSettings;
  themeLinks?: Array<{ label: string; href: string }>;
  blogLinks?: Array<{ label: string; href: string }>;
};

export function FooterClient({
  settings: fromApi,
  themeLinks = DEFAULT_THEME_LINKS,
  blogLinks = DEFAULT_BLOG_LINKS,
}: FooterClientProps) {
  // Any field missing from the settings API falls back to the official business details.
  const settings: PublicSettings = { ...DEFAULT_PUBLIC_SETTINGS, ...stripEmpty(fromApi) };
  return (
    <footer className="bg-cream pt-16 md:pt-20 pb-8 border-t border-border">
      <div className="max-w-7xl mx-auto px-5 md:px-10 grid sm:grid-cols-2 lg:grid-cols-6 gap-10">
        <div className="lg:col-span-2">
          <Link href="/" className="flex items-center gap-2 mb-2">
            <Image src="/logo-v2.png" alt={settings.businessName} width={192} height={192} className="shrink-0 w-48 h-auto" style={{ height: "auto" }} />
          </Link>
          <p className="mt-4 text-xs text-text-muted leading-relaxed">
            {settings.businessName} is a thoughtfully curated kids celebration brand
            specializing in customized birthday parties and milestone celebrations.
          </p>
          <ul className="mt-6 space-y-2.5 text-xs text-text-muted">
            <li className="flex items-start gap-2"><MapPin size={13} className="shrink-0 mt-0.5 text-mocha" />{settings.businessAddress}</li>
            <li className="flex items-center gap-2">
              <Phone size={13} className="shrink-0 text-mocha" />
              <a href={telHref(settings.businessPhone)} className="hover:text-mocha transition-colors">{settings.businessPhone}</a>
            </li>
            <li className="flex items-center gap-2">
              <Mail size={13} className="shrink-0 text-mocha" />
              <a href={`mailto:${settings.businessEmail}`} className="hover:text-mocha transition-colors">{settings.businessEmail}</a>
            </li>
            <li className="flex items-center gap-2"><Clock size={13} className="shrink-0 text-mocha" />{BUSINESS.hours}</li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-semibold tracking-wider uppercase text-charcoal mb-4">Quick Links</h4>
          <ul className="space-y-2.5 text-sm text-text-muted">
            {exploreLinks.map((l) => (<li key={l.label}><Link href={l.href} className="hover:text-mocha transition-colors">{l.label}</Link></li>))}
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-semibold tracking-wider uppercase text-charcoal mb-4">Themes</h4>
          <ul className="space-y-2.5 text-sm text-text-muted">
            {themeLinks.map((l) => (<li key={l.href}><Link href={l.href} className="hover:text-mocha transition-colors">{l.label}</Link></li>))}
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-semibold tracking-wider uppercase text-charcoal mb-4">Blog</h4>
          <ul className="space-y-2.5 text-sm text-text-muted">
            {blogLinks.map((l) => (<li key={l.href}><Link href={l.href} className="hover:text-mocha transition-colors line-clamp-2">{l.label}</Link></li>))}
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-semibold tracking-wider uppercase text-charcoal mb-4">Support</h4>
          <ul className="space-y-2.5 text-sm text-text-muted">
            {supportLinks.map((l) => (<li key={l.label}><Link href={l.href} className="hover:text-mocha transition-colors">{l.label}</Link></li>))}
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 md:px-10 mt-12 pt-6 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-text-light">
        <div className="text-center sm:text-left space-y-1">
          <p>© {new Date().getFullYear()} {settings.businessName}. All rights reserved.</p>
          <p>
            Proprietor: {settings.businessProprietor} · GSTIN: {settings.businessGstin}
          </p>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 text-charcoal/60">
            {settings.instagramUrl && (
              <a
                href={settings.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Instagram ${settings.instagramHandle ?? ""}`.trim()}
                title={settings.instagramHandle ?? "Instagram"}
                className="hover:text-mocha transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r="0.6" fill="currentColor" stroke="none"/></svg>
              </a>
            )}
            {settings.facebookUrl && (
              <a href={settings.facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="hover:text-mocha transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M15 8h2V4h-2a4 4 0 0 0-4 4v3H9v4h2v7h4v-7h2.5l.5-4H15V8Z"/></svg>
              </a>
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
            <Link href="/legal/privacy-policy" className="hover:text-mocha transition-colors">Privacy Policy</Link>
            <Link href="/legal/terms-of-service" className="hover:text-mocha transition-colors">Terms & Conditions</Link>
            <button type="button" onClick={openCookieSettings} className="hover:text-mocha transition-colors cursor-pointer">
              Cookie Settings
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
