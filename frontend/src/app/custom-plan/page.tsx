"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Minus,
  Plus,
  Calendar,
  MapPin,
  Users,
  Gift,
  Sparkles,
  ClipboardCheck,
  Palette,
  ShoppingBag,
  MessageCircle,
  Upload,
  ChevronDown,
  ChevronUp,
  X,
  Info,
  Heart,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { FooterClient } from "@/components/layout/FooterClient";
import { WhatsAppFAB } from "@/components/layout/WhatsAppFAB";
import { useCatalog } from "@/context/catalog-context";
import { submitConsultation } from "@/lib/cms/leads";
import { formatPaise } from "@/lib/shop-types";

/* ─── Constants ───────────────────────────────────────────────────── */

const CELEBRATION_TYPES = [
  "Kids' Birthday",
  "Baby Shower",
  "Naming Ceremony",
  "First Birthday",
  "Milestone Celebration",
  "Custom Celebration",
  "Other",
];

const BUDGET_RANGES = [
  "Under ₹10,000",
  "₹10,000 – ₹25,000",
  "₹25,000 – ₹50,000",
  "₹50,000 – ₹1,00,000",
  "₹1,00,000+",
];

const CITIES = [
  "Jaipur",
  "Delhi",
  "Mumbai",
  "Bangalore",
  "Hyderabad",
  "Pune",
  "Other",
];

const STEPS = [
  { label: "Details", icon: Calendar },
  { label: "Theme", icon: Palette },
  { label: "Build", icon: Gift },
  { label: "Add-ons", icon: ShoppingBag },
  { label: "Personalize", icon: Sparkles },
  { label: "Review", icon: ClipboardCheck },
] as const;

/* ─── Types ───────────────────────────────────────────────────── */

type ServiceItem = {
  id: string;
  name: string;
  description: string;
  priceInPaise: number;
  tier: "essential" | "signature" | "grand";
  phase: "before" | "during" | "after";
  category: string;
  hasQuantity?: boolean;
  hasPersonalization?: boolean;
  personalizationFields?: PersonalizationField[];
};

type PersonalizationField = {
  key: string;
  label: string;
  type: "text" | "select" | "number" | "file" | "textarea";
  options?: string[];
  required?: boolean;
  placeholder?: string;
};

type SelectedItem = {
  serviceId: string;
  quantity: number;
  personalization?: Record<string, string>;
};

type AddOnItem = {
  id: string;
  name: string;
  description: string;
  priceInPaise: number;
  hasQuantity?: boolean;
  hasPersonalization?: boolean;
  personalizationFields?: PersonalizationField[];
};

type CelebrationDetails = {
  eventType: string;
  childName: string;
  childAge: string;
  eventDate: string;
  city: string;
  venue: string;
  guestCount: number;
  budget: string;
  specialRequirement: string;
};

/* ─── Static service catalog ─────────────────────────────────── */

const SERVICE_CATALOG: ServiceItem[] = [
  // BEFORE THE CELEBRATION
  { id: "svc-digital-invite", name: "Digital Theme Invite", description: "Beautifully designed digital invitation matching your chosen theme.", priceInPaise: 149900, tier: "essential", phase: "before", category: "Invitations" },
  { id: "svc-animated-invite", name: "Signature Animated / Video Invite", description: "Animated or video-based theme invitation with custom details and music.", priceInPaise: 399900, tier: "signature", phase: "before", category: "Invitations" },
  { id: "svc-countdown-cards-3", name: "Countdown Cards (3 Days)", description: "Fun daily countdown cards to build excitement before the big day.", priceInPaise: 99900, tier: "signature", phase: "before", category: "Pre-Event Excitement" },
  { id: "svc-countdown-cards-5", name: "Countdown Cards (5 Days)", description: "Extended 5-day countdown cards with unique designs for each day.", priceInPaise: 149900, tier: "grand", phase: "before", category: "Pre-Event Excitement" },
  { id: "svc-parent-brief", name: "Parent Party Brief PDF", description: "A comprehensive guide covering timeline, setup, and day-of coordination.", priceInPaise: 99900, tier: "signature", phase: "before", category: "Planning" },
  { id: "svc-animated-brief", name: "Animated Parent Party Brief", description: "Animated PDF brief with interactive timeline and checklist.", priceInPaise: 199900, tier: "grand", phase: "before", category: "Planning" },
  // DURING THE CELEBRATION
  { id: "svc-welcome-board", name: "Welcome Board / Standee", description: "A custom-designed welcome board or standee at the venue entrance.", priceInPaise: 249900, tier: "essential", phase: "during", category: "Venue Setup" },
  { id: "svc-table-elements", name: "Theme Table Elements", description: "Themed centerpieces, table toppers, and coordinating elements.", priceInPaise: 199900, tier: "essential", phase: "during", category: "Venue Setup" },
  { id: "svc-activity-1", name: "Children Activity (1 Activity)", description: "One themed craft or game activity for children at the party.", priceInPaise: 14900, tier: "essential", phase: "during", category: "Activities", hasQuantity: true },
  { id: "svc-activity-2", name: "Children Activities (2 Activities)", description: "Two unique themed activities — craft + game for extra engagement.", priceInPaise: 14900, tier: "signature", phase: "during", category: "Activities", hasQuantity: true },
  { id: "svc-family-activity", name: "Family Activity", description: "A group activity that involves the whole family.", priceInPaise: 19900, tier: "grand", phase: "during", category: "Activities", hasQuantity: true },
  { id: "svc-welcome-item", name: "Welcome Item for Kids", description: "A themed welcome gift for each child at the entrance.", priceInPaise: 9900, tier: "signature", phase: "during", category: "Gifts", hasQuantity: true },
  { id: "svc-photo-props", name: "Theme Photo Props", description: "Fun themed photo props for memorable photos.", priceInPaise: 149900, tier: "signature", phase: "during", category: "Venue Setup" },
  { id: "svc-on-day-coordination", name: "On-Day Coordination (Jaipur)", description: "Full on-site coordination and setup management.", priceInPaise: 999900, tier: "grand", phase: "during", category: "Coordination" },
  // AFTER THE CELEBRATION
  { id: "svc-return-gift", name: "Return Gift Sourcing", description: "Carefully sourced themed return gifts for young guests.", priceInPaise: 14900, tier: "essential", phase: "after", category: "Return Gifts", hasQuantity: true },
  { id: "svc-thank-you-tags", name: "Thank You Tags", description: "Custom themed thank you tags for return gift bags.", priceInPaise: 4900, tier: "essential", phase: "after", category: "Return Gifts", hasQuantity: true },
  { id: "svc-gift-bag", name: "Theme Gift Bag", description: "Custom printed or assembled gift bags matching the theme.", priceInPaise: 9900, tier: "signature", phase: "after", category: "Return Gifts", hasQuantity: true },
  { id: "svc-custom-gift-box", name: "Custom Gift Box", description: "Signature custom-designed gift boxes with name and theme artwork.", priceInPaise: 19900, tier: "grand", phase: "after", category: "Return Gifts", hasQuantity: true },
  { id: "svc-edited-pictures", name: "Edited Highlight Pictures (3)", description: "3 professionally edited pictures from the celebration.", priceInPaise: 299900, tier: "signature", phase: "after", category: "Memories" },
  { id: "svc-keepsake-box", name: "Signature Keepsake Box", description: "A beautifully crafted keepsake box with mementos.", priceInPaise: 499900, tier: "grand", phase: "after", category: "Memories" },
  { id: "svc-gift-registry", name: "Gift Registry Access", description: "Digital gift registry — guests can contribute to specific gifts.", priceInPaise: 199900, tier: "signature", phase: "after", category: "Gifts" },
];

const ADDON_CATALOG: AddOnItem[] = [
  { id: "addon-birthday-tshirt", name: "Theme T-Shirt for Birthday Child", description: "Custom printed theme T-shirt for the birthday boy/girl.", priceInPaise: 59900, hasPersonalization: true, personalizationFields: [
    { key: "size", label: "T-Shirt Size", type: "select", options: ["2-3Y", "3-4Y", "4-5Y", "5-6Y", "6-7Y", "7-8Y", "8-10Y"], required: true },
    { key: "name", label: "Name to Print", type: "text", required: true, placeholder: "Child's name" },
  ]},
  { id: "addon-family-tshirts", name: "Matching Family T-Shirts", description: "Theme-coordinated T-shirts for family members.", priceInPaise: 49900, hasQuantity: true, hasPersonalization: true, personalizationFields: [
    { key: "sizes", label: "Sizes (comma-separated)", type: "text", required: true, placeholder: "e.g. S, M, L, XL" },
    { key: "names", label: "Names to Print", type: "text", placeholder: "e.g. Mom, Dad, Sister" },
  ]},
  { id: "addon-disposable-plates", name: "Theme Plates, Glasses & Napkins", description: "Matching themed disposable tableware set.", priceInPaise: 14900, hasQuantity: true },
  { id: "addon-extra-activity-kit", name: "Additional Activity Kit", description: "Extra themed activity kit — craft or game.", priceInPaise: 14900, hasQuantity: true },
  { id: "addon-extra-return-gifts", name: "Additional Return Gifts", description: "Extra return gifts beyond the base count.", priceInPaise: 14900, hasQuantity: true },
  { id: "addon-personalized-tags", name: "Personalized Gift Tags", description: "Custom tags with each guest child's name.", priceInPaise: 4900, hasQuantity: true, hasPersonalization: true, personalizationFields: [
    { key: "names", label: "Guest Names (comma-separated)", type: "textarea", placeholder: "Enter each child's name, separated by commas" },
  ]},
  { id: "addon-video-invite-upgrade", name: "Upgraded Video Invitation", description: "Signature animated video invitation with voiceover and music.", priceInPaise: 249900 },
  { id: "addon-extra-signage", name: "Additional Signage & Photo Props", description: "Extra themed signage boards, photo props, and standees.", priceInPaise: 199900 },
  { id: "addon-gift-registry", name: "Gift Registry (Custom Plan)", description: "Enable a digital gift registry for guest contributions.", priceInPaise: 199900 },
  { id: "addon-personalized-item", name: "Special Personalized Item", description: "Any custom personalized item — describe your requirements.", priceInPaise: 0, hasPersonalization: true, personalizationFields: [
    { key: "description", label: "Describe what you need", type: "textarea", required: true, placeholder: "Describe the personalized item you'd like..." },
  ]},
];

const STORAGE_KEY = "vc-custom-plan-draft";

/* ─── Stepper ─────────────────────────────────────────────────── */

function CustomStepper({ currentStep, onStepClick }: { currentStep: number; onStepClick: (step: number) => void }) {
  return (
    <div className="flex items-center justify-center w-full max-w-4xl mx-auto mb-10">
      {STEPS.map((step, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;
        const Icon = step.icon;
        const canClick = index < currentStep;
        return (
          <div key={step.label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center relative">
              <button
                type="button"
                onClick={() => canClick && onStepClick(index)}
                disabled={!canClick}
                className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 shrink-0 ${
                  isCompleted ? "bg-mocha text-white shadow-md cursor-pointer hover:scale-105"
                    : isActive ? "bg-mocha text-white shadow-lg scale-110"
                    : "bg-cream-dark text-text-light border border-border-light cursor-default"
                }`}
              >
                {isCompleted ? <Check size={18} /> : <Icon size={18} />}
              </button>
              <span className={`hidden md:block absolute top-14 text-[11px] font-semibold whitespace-nowrap ${isCompleted || isActive ? "text-charcoal" : "text-text-light"}`}>
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div className="flex-1 h-[2px] mx-2 md:mx-3 relative">
                <div className="absolute inset-0 bg-border-light rounded-full" />
                <div className="absolute inset-y-0 left-0 bg-mocha rounded-full transition-all duration-700" style={{ width: isCompleted ? "100%" : "0%" }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Progress Bar ────────────────────────────────────────────── */

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-semibold text-mocha uppercase tracking-wider">Step {current + 1} of {total}</span>
        <span className="text-xs text-text-muted">{Math.round(((current + 1) / total) * 100)}% Complete</span>
      </div>
      <div className="h-1.5 bg-border-light rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-mocha to-mocha-dark rounded-full transition-all duration-700 ease-out" style={{ width: `${((current + 1) / total) * 100}%` }} />
      </div>
    </div>
  );
}

/* ─── Sticky Price Summary ────────────────────────────────────── */

function StickyPriceSummary({ selectedServices, selectedAddons, guestCount }: { selectedServices: SelectedItem[]; selectedAddons: SelectedItem[]; guestCount: number }) {
  const total = useMemo(() => {
    let sum = 0;
    for (const sel of selectedServices) {
      const svc = SERVICE_CATALOG.find((s) => s.id === sel.serviceId);
      if (!svc) continue;
      const qty = svc.hasQuantity ? Math.max(sel.quantity, guestCount) : sel.quantity;
      sum += svc.priceInPaise * qty;
    }
    for (const sel of selectedAddons) {
      const addon = ADDON_CATALOG.find((a) => a.id === sel.serviceId);
      if (!addon) continue;
      sum += addon.priceInPaise * sel.quantity;
    }
    return sum;
  }, [selectedServices, selectedAddons, guestCount]);

  const count = selectedServices.length + selectedAddons.length;
  if (count === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div className="max-w-4xl mx-auto px-5 md:px-8 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-text-muted">Estimated Total</p>
          <p className="text-xl font-bold text-charcoal font-display">{total > 0 ? formatPaise(total) : "Price on Request"}</p>
          <p className="text-[10px] text-text-light">{count} item(s) selected</p>
        </div>
        <a href="https://wa.me/919876543210" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-mocha font-semibold hover:text-mocha-dark transition-colors">
          <MessageCircle size={16} /> Need Help?
        </a>
      </div>
    </div>
  );
}

/* ─── Main Content ────────────────────────────────────────────── */

function CustomPlanContent() {
  const router = useRouter();
  const { themes } = useCatalog();

  const [step, setStep] = useState(0);
  const [details, setDetails] = useState<CelebrationDetails>({ eventType: "", childName: "", childAge: "", eventDate: "", city: "", venue: "", guestCount: 10, budget: "", specialRequirement: "" });
  const [themeSlug, setThemeSlug] = useState<string | null>(null);
  const [customTheme, setCustomTheme] = useState("");
  const [customThemeNotes, setCustomThemeNotes] = useState("");
  const [selectedServices, setSelectedServices] = useState<SelectedItem[]>([]);
  const [selectedAddons, setSelectedAddons] = useState<SelectedItem[]>([]);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [buildTab, setBuildTab] = useState<"tier" | "phase">("phase");
  const [expandedPhase, setExpandedPhase] = useState<string | null>("before");

  // localStorage persistence
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const d = JSON.parse(saved);
        if (d.details) setDetails(d.details);
        if (d.themeSlug) setThemeSlug(d.themeSlug);
        if (d.customTheme) setCustomTheme(d.customTheme);
        if (d.customThemeNotes) setCustomThemeNotes(d.customThemeNotes);
        if (d.selectedServices) setSelectedServices(d.selectedServices);
        if (d.selectedAddons) setSelectedAddons(d.selectedAddons);
        if (d.contactName) setContactName(d.contactName);
        if (d.contactEmail) setContactEmail(d.contactEmail);
        if (d.contactPhone) setContactPhone(d.contactPhone);
        if (typeof d.step === "number") setStep(d.step);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ step, details, themeSlug, customTheme, customThemeNotes, selectedServices, selectedAddons, contactName, contactEmail, contactPhone }));
    } catch { /* ignore */ }
  }, [step, details, themeSlug, customTheme, customThemeNotes, selectedServices, selectedAddons, contactName, contactEmail, contactPhone]);

  const goTo = (s: number) => { setStep(s); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const canContinue = () => {
    if (step === 0) return !!details.eventType && !!details.childName && !!details.eventDate && !!details.city && details.guestCount >= 1;
    if (step === 1) return !!themeSlug || !!customTheme;
    if (step === 2) return selectedServices.length > 0;
    if (step === 3) return true;
    if (step === 4) return true;
    return false;
  };

  const toggleService = (serviceId: string) => {
    setSelectedServices((prev) => {
      const exists = prev.find((s) => s.serviceId === serviceId);
      if (exists) return prev.filter((s) => s.serviceId !== serviceId);
      return [...prev, { serviceId, quantity: 1 }];
    });
  };

  const updateServiceQty = (serviceId: string, delta: number) => {
    setSelectedServices((prev) => prev.map((s) => s.serviceId === serviceId ? { ...s, quantity: Math.max(1, s.quantity + delta) } : s));
  };

  const toggleAddon = (addonId: string) => {
    setSelectedAddons((prev) => {
      const exists = prev.find((a) => a.serviceId === addonId);
      if (exists) return prev.filter((a) => a.serviceId !== addonId);
      return [...prev, { serviceId: addonId, quantity: 1 }];
    });
  };

  const updateAddonQty = (addonId: string, delta: number) => {
    setSelectedAddons((prev) => prev.map((a) => a.serviceId === addonId ? { ...a, quantity: Math.max(1, a.quantity + delta) } : a));
  };

  const updatePersonalization = (type: "service" | "addon", itemId: string, key: string, value: string) => {
    const setter = type === "service" ? setSelectedServices : setSelectedAddons;
    setter((prev: SelectedItem[]) => prev.map((item) => item.serviceId === itemId ? { ...item, personalization: { ...item.personalization, [key]: value } } : item));
  };

  const calculateTotal = useCallback(() => {
    let total = 0;
    for (const sel of selectedServices) {
      const svc = SERVICE_CATALOG.find((s) => s.id === sel.serviceId);
      if (!svc) continue;
      total += svc.priceInPaise * (svc.hasQuantity ? Math.max(sel.quantity, details.guestCount) : sel.quantity);
    }
    for (const sel of selectedAddons) {
      const addon = ADDON_CATALOG.find((a) => a.id === sel.serviceId);
      if (!addon) continue;
      total += addon.priceInPaise * sel.quantity;
    }
    return total;
  }, [selectedServices, selectedAddons, details.guestCount]);

  const handleSubmit = async () => {
    if (!contactName || !contactEmail || !contactPhone) { setSubmitError("Please fill in your contact details."); return; }
    setSubmitting(true);
    setSubmitError(null);

    const selectedThemeName = themeSlug ? themes.find((t) => t.slug === themeSlug)?.title || themeSlug : customTheme || "Custom";

    const serviceLines = selectedServices.map((sel) => {
      const svc = SERVICE_CATALOG.find((s) => s.id === sel.serviceId);
      if (!svc) return "";
      const qty = svc.hasQuantity ? Math.max(sel.quantity, details.guestCount) : sel.quantity;
      const pNotes = sel.personalization ? Object.entries(sel.personalization).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(", ") : "";
      return `- ${svc.name} x ${qty} = ${formatPaise(svc.priceInPaise * qty)}${pNotes ? ` [${pNotes}]` : ""}`;
    }).filter(Boolean).join("\n");

    const addonLines = selectedAddons.map((sel) => {
      const addon = ADDON_CATALOG.find((a) => a.id === sel.serviceId);
      if (!addon) return "";
      const pNotes = sel.personalization ? Object.entries(sel.personalization).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(", ") : "";
      return `- ${addon.name} x ${sel.quantity} = ${addon.priceInPaise > 0 ? formatPaise(addon.priceInPaise * sel.quantity) : "Price on Request"}${pNotes ? ` [${pNotes}]` : ""}`;
    }).filter(Boolean).join("\n");

    const customRequirements = [
      `=== CUSTOM CELEBRATION PLAN ===`,
      `Event: ${details.eventType}`,
      `Child: ${details.childName} (Age: ${details.childAge})`,
      `Date: ${details.eventDate}`,
      `City: ${details.city} | Venue: ${details.venue}`,
      `Guests: ${details.guestCount} | Budget: ${details.budget}`,
      details.specialRequirement ? `Special: ${details.specialRequirement}` : "",
      `Theme: ${selectedThemeName}`,
      customThemeNotes ? `Theme Notes: ${customThemeNotes}` : "",
      ``,
      `--- SERVICES ---`,
      serviceLines || "(None)",
      `--- ADD-ONS ---`,
      addonLines || "(None)",
      `--- ESTIMATED TOTAL: ${calculateTotal() > 0 ? formatPaise(calculateTotal()) : "Price on Request"} ---`,
    ].filter(Boolean).join("\n");

    try {
      await submitConsultation({
        name: contactName,
        email: contactEmail,
        phone: contactPhone,
        eventDate: details.eventDate || new Date().toISOString().split("T")[0],
        childOrEventDetails: `${details.eventType} for ${details.childName} (Age ${details.childAge}) - ${details.guestCount} guests - Theme: ${selectedThemeName}`,
        customRequirements,
      });
      setSubmitted(true);
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      setSubmitError("Something went wrong. Please try again or contact us via WhatsApp.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-charcoal placeholder:text-text-light focus:outline-none focus:border-mocha focus:ring-1 focus:ring-mocha/20 transition-all duration-300";
  const selectClass = "w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-charcoal focus:outline-none focus:border-mocha focus:ring-1 focus:ring-mocha/20 transition-all duration-300 appearance-none cursor-pointer";

  if (submitted) {
    return (
      <>
        <Navbar />
        <main className="pt-28 md:pt-32 pb-20 min-h-screen bg-cream">
          <div className="max-w-xl mx-auto px-5 text-center">
            <div className="w-20 h-20 bg-mocha/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="text-mocha" size={36} />
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-semibold text-charcoal mb-4">Your Custom Plan Has Been Submitted!</h1>
            <p className="text-text-muted mb-8 max-w-md mx-auto">Our team will review your selections and get back to you within 24 hours with final pricing and availability.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/" className="btn-primary px-8 py-3 text-sm">Back to Home</Link>
              <a href="https://wa.me/919876543210" target="_blank" rel="noopener noreferrer" className="btn-outline px-8 py-3 text-sm flex items-center justify-center gap-2">
                <MessageCircle size={16} /> WhatsApp Us
              </a>
            </div>
          </div>
        </main>
        <FooterClient />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="pt-28 md:pt-32 pb-36 min-h-screen bg-cream">
        <div className="max-w-4xl mx-auto px-5 md:px-8">
          <CustomStepper currentStep={step} onStepClick={goTo} />
          <ProgressBar current={step} total={STEPS.length} />

          {/* ═══ STEP 0: Details ═══ */}
          {step === 0 && (
            <section>
              <h1 className="font-display text-2xl md:text-3xl font-semibold text-charcoal mb-2">Tell us about your celebration</h1>
              <p className="text-sm text-text-muted mb-8">Help us understand your event so we can suggest the best options.</p>
              <div className="bg-white rounded-2xl border border-border-light p-6 md:p-8 shadow-sm space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-charcoal mb-2">Type of Celebration *</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {CELEBRATION_TYPES.map((type) => (
                      <button key={type} type="button" onClick={() => setDetails((d) => ({ ...d, eventType: type }))}
                        className={`rounded-xl border px-3 py-2.5 text-sm transition-all text-center ${details.eventType === type ? "border-mocha bg-mocha/5 text-mocha font-semibold" : "border-border text-charcoal hover:border-mocha/40"}`}>
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-charcoal mb-2">Child&apos;s Name *</label>
                    <input type="text" value={details.childName} onChange={(e) => setDetails((d) => ({ ...d, childName: e.target.value }))} placeholder="Enter child's name" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-charcoal mb-2">Child&apos;s Age</label>
                    <input type="text" value={details.childAge} onChange={(e) => setDetails((d) => ({ ...d, childAge: e.target.value }))} placeholder="e.g. 5 years" className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-charcoal mb-2">Event Date *</label>
                  <input type="date" value={details.eventDate} onChange={(e) => setDetails((d) => ({ ...d, eventDate: e.target.value }))} className={inputClass} min={new Date().toISOString().split("T")[0]} />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-charcoal mb-2">City *</label>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                      {CITIES.map((city) => (
                        <button key={city} type="button" onClick={() => setDetails((d) => ({ ...d, city }))}
                          className={`rounded-xl border px-3 py-2 text-sm transition-all text-center ${details.city === city ? "border-mocha bg-mocha/5 text-mocha font-semibold" : "border-border text-charcoal hover:border-mocha/40"}`}>
                          {city}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-charcoal mb-2">Venue</label>
                    <input type="text" value={details.venue} onChange={(e) => setDetails((d) => ({ ...d, venue: e.target.value }))} placeholder="e.g. Home, Banquet Hall" className={inputClass} />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-charcoal mb-2">Number of Children / Guests *</label>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => setDetails((d) => ({ ...d, guestCount: Math.max(1, d.guestCount - 1) }))} className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-cream transition-colors"><Minus size={16} /></button>
                      <span className="text-lg font-bold text-charcoal min-w-[3ch] text-center">{details.guestCount}</span>
                      <button type="button" onClick={() => setDetails((d) => ({ ...d, guestCount: d.guestCount + 1 }))} className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-cream transition-colors"><Plus size={16} /></button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-charcoal mb-2">Approximate Budget</label>
                    <div className="grid grid-cols-2 gap-2">
                      {BUDGET_RANGES.map((range) => (
                        <button key={range} type="button" onClick={() => setDetails((d) => ({ ...d, budget: range }))}
                          className={`rounded-xl border px-3 py-2 text-xs transition-all text-center ${details.budget === range ? "border-mocha bg-mocha/5 text-mocha font-semibold" : "border-border text-charcoal hover:border-mocha/40"}`}>
                          {range}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-charcoal mb-2">Any Special Requirement</label>
                  <textarea value={details.specialRequirement} onChange={(e) => setDetails((d) => ({ ...d, specialRequirement: e.target.value }))} placeholder="Tell us anything special..." rows={3} className={inputClass} />
                </div>
              </div>
            </section>
          )}

          {/* ═══ STEP 1: Theme ═══ */}
          {step === 1 && (
            <section>
              <h1 className="font-display text-2xl md:text-3xl font-semibold text-charcoal mb-2">Choose a theme</h1>
              <p className="text-sm text-text-muted mb-8">Pick from our curated themes or describe your own custom theme.</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {themes.map((theme) => (
                  <button key={theme.slug} type="button" onClick={() => { setThemeSlug(theme.slug); setCustomTheme(""); }}
                    className={`rounded-2xl border p-3 text-left transition-all ${themeSlug === theme.slug ? "border-2 border-mocha bg-mocha/5" : "border-border hover:border-mocha/40"}`}>
                    {theme.heroImageUrl ? (
                      <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden mb-3 bg-cream-dark">
                        <Image src={theme.heroImageUrl} alt={theme.title} fill className="object-cover" sizes="(max-width: 768px) 50vw, 25vw" />
                      </div>
                    ) : (
                      <div className="w-full aspect-[4/3] rounded-xl bg-cream-dark mb-3 flex items-center justify-center"><Palette className="text-mocha/30" size={32} /></div>
                    )}
                    <p className="text-sm font-semibold text-charcoal truncate">{theme.title}</p>
                  </button>
                ))}
                <button type="button" onClick={() => { setThemeSlug(null); setCustomTheme("custom"); }}
                  className={`rounded-2xl border p-3 text-left transition-all ${!themeSlug && customTheme ? "border-2 border-mocha bg-mocha/5" : "border-border hover:border-mocha/40 border-dashed"}`}>
                  <div className="w-full aspect-[4/3] rounded-xl bg-cream-dark mb-3 flex items-center justify-center"><Sparkles className="text-mocha/50" size={32} /></div>
                  <p className="text-sm font-semibold text-charcoal">Other / Custom</p>
                </button>
              </div>
              {!themeSlug && customTheme && (
                <div className="bg-white rounded-2xl border border-border-light p-6 shadow-sm space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-charcoal mb-2">Your Preferred Theme / Character *</label>
                    <input type="text" value={customTheme === "custom" ? "" : customTheme} onChange={(e) => setCustomTheme(e.target.value || "custom")} placeholder="e.g. Bluey, Peppa Pig, Unicorn..." className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-charcoal mb-2">Additional Notes</label>
                    <textarea value={customThemeNotes} onChange={(e) => setCustomThemeNotes(e.target.value)} placeholder="Describe the look, colours, or share any reference details..." rows={3} className={inputClass} />
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ═══ STEP 2: Build ═══ */}
          {step === 2 && (
            <section>
              <h1 className="font-display text-2xl md:text-3xl font-semibold text-charcoal mb-2">Build your celebration</h1>
              <p className="text-sm text-text-muted mb-6">Mix and match from any package tier. Select what fits your celebration best.</p>
              <div className="flex gap-2 mb-6">
                <button type="button" onClick={() => setBuildTab("phase")} className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${buildTab === "phase" ? "bg-mocha text-white" : "bg-white border border-border text-charcoal hover:border-mocha/40"}`}>By Journey</button>
                <button type="button" onClick={() => setBuildTab("tier")} className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${buildTab === "tier" ? "bg-mocha text-white" : "bg-white border border-border text-charcoal hover:border-mocha/40"}`}>By Package Tier</button>
              </div>

              {buildTab === "phase" ? (
                <div className="space-y-4">
                  {(["before", "during", "after"] as const).map((phase) => {
                    const phaseItems = SERVICE_CATALOG.filter((s) => s.phase === phase);
                    const labels = { before: "Before the Celebration", during: "During the Celebration", after: "After the Celebration" };
                    const isOpen = expandedPhase === phase;
                    return (
                      <div key={phase} className="bg-white rounded-2xl border border-border-light shadow-sm overflow-hidden">
                        <button type="button" onClick={() => setExpandedPhase(isOpen ? null : phase)} className="w-full flex items-center justify-between px-6 py-4 hover:bg-cream/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${phase === "before" ? "bg-blue-50 text-blue-600" : phase === "during" ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}>
                              {phase === "before" ? <Calendar size={16} /> : phase === "during" ? <Sparkles size={16} /> : <Gift size={16} />}
                            </div>
                            <span className="font-display text-lg font-semibold text-charcoal">{labels[phase]}</span>
                            <span className="text-xs bg-cream px-2 py-0.5 rounded-full text-text-muted">{phaseItems.length} items</span>
                          </div>
                          {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </button>
                        {isOpen && (
                          <div className="px-6 pb-6 grid gap-3">
                            {phaseItems.map((svc) => {
                              const isSelected = selectedServices.some((s) => s.serviceId === svc.id);
                              const sel = selectedServices.find((s) => s.serviceId === svc.id);
                              return (
                                <div key={svc.id} className={`rounded-xl border p-4 transition-all ${isSelected ? "border-mocha bg-mocha/5" : "border-border-light hover:border-mocha/30"}`}>
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h4 className="text-sm font-semibold text-charcoal">{svc.name}</h4>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${svc.tier === "essential" ? "bg-emerald-50 text-emerald-700" : svc.tier === "signature" ? "bg-amber-50 text-amber-700" : "bg-purple-50 text-purple-700"}`}>{svc.tier}</span>
                                      </div>
                                      <p className="text-xs text-text-muted">{svc.description}</p>
                                      <p className="text-sm font-bold text-mocha mt-1">{formatPaise(svc.priceInPaise)}{svc.hasQuantity && <span className="font-normal text-text-muted"> / unit</span>}</p>
                                    </div>
                                    <button type="button" onClick={() => toggleService(svc.id)} className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${isSelected ? "bg-mocha text-white" : "bg-cream border border-border hover:border-mocha"}`}>
                                      {isSelected ? <Check size={18} /> : <Plus size={18} />}
                                    </button>
                                  </div>
                                  {isSelected && svc.hasQuantity && (
                                    <div className="mt-3 flex items-center gap-3 pt-3 border-t border-border-light/50">
                                      <span className="text-xs text-text-muted">Qty:</span>
                                      <button type="button" onClick={() => updateServiceQty(svc.id, -1)} className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-cream"><Minus size={12} /></button>
                                      <span className="text-sm font-bold text-charcoal min-w-[2ch] text-center">{Math.max(sel?.quantity ?? 1, details.guestCount)}</span>
                                      <button type="button" onClick={() => updateServiceQty(svc.id, 1)} className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-cream"><Plus size={12} /></button>
                                      {(sel?.quantity ?? 1) < details.guestCount && <span className="text-[10px] text-amber-700">Min {details.guestCount} (matching guest count)</span>}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-6">
                  {(["essential", "signature", "grand"] as const).map((tier) => {
                    const tierItems = SERVICE_CATALOG.filter((s) => s.tier === tier);
                    const labels = { essential: "Essential Package Items", signature: "Signature Package Items", grand: "Grand Package Items" };
                    return (
                      <div key={tier}>
                        <h3 className={`text-base font-display font-semibold mb-3 ${tier === "essential" ? "text-emerald-700" : tier === "signature" ? "text-amber-700" : "text-purple-700"}`}>{labels[tier]}</h3>
                        <div className="grid gap-3">
                          {tierItems.map((svc) => {
                            const isSelected = selectedServices.some((s) => s.serviceId === svc.id);
                            const sel = selectedServices.find((s) => s.serviceId === svc.id);
                            return (
                              <div key={svc.id} className={`bg-white rounded-xl border p-4 transition-all ${isSelected ? "border-mocha bg-mocha/5" : "border-border-light hover:border-mocha/30"}`}>
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-semibold text-charcoal">{svc.name}</h4>
                                    <p className="text-xs text-text-muted mt-0.5">{svc.description}</p>
                                    <p className="text-sm font-bold text-mocha mt-1">{formatPaise(svc.priceInPaise)}{svc.hasQuantity && <span className="font-normal text-text-muted"> / unit</span>}</p>
                                  </div>
                                  <button type="button" onClick={() => toggleService(svc.id)} className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${isSelected ? "bg-mocha text-white" : "bg-cream border border-border hover:border-mocha"}`}>
                                    {isSelected ? <Check size={18} /> : <Plus size={18} />}
                                  </button>
                                </div>
                                {isSelected && svc.hasQuantity && (
                                  <div className="mt-3 flex items-center gap-3 pt-3 border-t border-border-light/50">
                                    <span className="text-xs text-text-muted">Qty:</span>
                                    <button type="button" onClick={() => updateServiceQty(svc.id, -1)} className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-cream"><Minus size={12} /></button>
                                    <span className="text-sm font-bold text-charcoal min-w-[2ch] text-center">{Math.max(sel?.quantity ?? 1, details.guestCount)}</span>
                                    <button type="button" onClick={() => updateServiceQty(svc.id, 1)} className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-cream"><Plus size={12} /></button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* ═══ STEP 3: Add-ons ═══ */}
          {step === 3 && (
            <section>
              <h1 className="font-display text-2xl md:text-3xl font-semibold text-charcoal mb-2">Optional Add-ons</h1>
              <p className="text-sm text-text-muted mb-8">Enhance your celebration with these extras. All add-ons are optional.</p>
              <div className="grid gap-3">
                {ADDON_CATALOG.map((addon) => {
                  const isSelected = selectedAddons.some((a) => a.serviceId === addon.id);
                  const sel = selectedAddons.find((a) => a.serviceId === addon.id);
                  return (
                    <div key={addon.id} className={`bg-white rounded-xl border p-4 transition-all ${isSelected ? "border-mocha bg-mocha/5" : "border-border-light hover:border-mocha/30"}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-charcoal">{addon.name}</h4>
                          <p className="text-xs text-text-muted mt-0.5">{addon.description}</p>
                          <p className="text-sm font-bold text-mocha mt-1">{addon.priceInPaise > 0 ? formatPaise(addon.priceInPaise) : "Price on Request"}{addon.hasQuantity && addon.priceInPaise > 0 && <span className="font-normal text-text-muted"> / unit</span>}</p>
                        </div>
                        <button type="button" onClick={() => toggleAddon(addon.id)} className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${isSelected ? "bg-mocha text-white" : "bg-cream border border-border hover:border-mocha"}`}>
                          {isSelected ? <Check size={18} /> : <Plus size={18} />}
                        </button>
                      </div>
                      {isSelected && addon.hasQuantity && (
                        <div className="mt-3 flex items-center gap-3 pt-3 border-t border-border-light/50">
                          <span className="text-xs text-text-muted">Qty:</span>
                          <button type="button" onClick={() => updateAddonQty(addon.id, -1)} className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-cream"><Minus size={12} /></button>
                          <span className="text-sm font-bold text-charcoal min-w-[2ch] text-center">{sel?.quantity ?? 1}</span>
                          <button type="button" onClick={() => updateAddonQty(addon.id, 1)} className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-cream"><Plus size={12} /></button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ═══ STEP 4: Personalization ═══ */}
          {step === 4 && (
            <section>
              <h1 className="font-display text-2xl md:text-3xl font-semibold text-charcoal mb-2">Personalization Details</h1>
              <p className="text-sm text-text-muted mb-8">Add custom details for items that need personalization.</p>
              {(() => {
                const items = [
                  ...selectedAddons.map((sel) => {
                    const addon = ADDON_CATALOG.find((a) => a.id === sel.serviceId);
                    return addon?.hasPersonalization ? { type: "addon" as const, item: addon, sel } : null;
                  }).filter(Boolean),
                ] as Array<{ type: "addon"; item: AddOnItem; sel: SelectedItem }>;

                if (items.length === 0) {
                  return (
                    <div className="bg-white rounded-2xl border border-border-light p-8 text-center shadow-sm">
                      <div className="w-16 h-16 bg-cream rounded-full flex items-center justify-center mx-auto mb-4"><Check className="text-mocha" size={28} /></div>
                      <h3 className="font-display text-xl font-semibold text-charcoal mb-2">No Personalization Needed</h3>
                      <p className="text-sm text-text-muted">None of your selected items require custom personalization. You can proceed to review.</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-6">
                    {items.map(({ type, item, sel }) => (
                      <div key={item.id} className="bg-white rounded-2xl border border-border-light p-6 shadow-sm">
                        <h3 className="font-semibold text-charcoal mb-4">{item.name}</h3>
                        <div className="space-y-4">
                          {item.personalizationFields?.map((field) => (
                            <div key={field.key}>
                              <label className="block text-sm font-semibold text-charcoal mb-2">{field.label} {field.required && "*"}</label>
                              {field.type === "select" ? (
                                <select value={sel.personalization?.[field.key] || ""} onChange={(e) => updatePersonalization(type, item.id, field.key, e.target.value)} className={selectClass}>
                                  <option value="">Select...</option>
                                  {field.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                              ) : field.type === "textarea" ? (
                                <textarea value={sel.personalization?.[field.key] || ""} onChange={(e) => updatePersonalization(type, item.id, field.key, e.target.value)} placeholder={field.placeholder} rows={3} className={inputClass} />
                              ) : (
                                <input type={field.type} value={sel.personalization?.[field.key] || ""} onChange={(e) => updatePersonalization(type, item.id, field.key, e.target.value)} placeholder={field.placeholder} className={inputClass} />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </section>
          )}

          {/* ═══ STEP 5: Review ═══ */}
          {step === 5 && (
            <section>
              <h1 className="font-display text-2xl md:text-3xl font-semibold text-charcoal mb-2">Review Your Custom Plan</h1>
              <p className="text-sm text-text-muted mb-8">Review all your selections before submitting.</p>
              <div className="space-y-6">
                {/* Event Summary */}
                <div className="bg-white rounded-2xl border border-border-light p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display text-lg font-semibold text-charcoal">Celebration Details</h3>
                    <button type="button" onClick={() => goTo(0)} className="text-xs text-mocha font-semibold hover:text-mocha-dark">Edit</button>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    <div><span className="text-text-muted">Event:</span> <span className="font-medium text-charcoal ml-1">{details.eventType}</span></div>
                    <div><span className="text-text-muted">Child:</span> <span className="font-medium text-charcoal ml-1">{details.childName} ({details.childAge})</span></div>
                    <div><span className="text-text-muted">Date:</span> <span className="font-medium text-charcoal ml-1">{details.eventDate}</span></div>
                    <div><span className="text-text-muted">City:</span> <span className="font-medium text-charcoal ml-1">{details.city}</span></div>
                    <div><span className="text-text-muted">Venue:</span> <span className="font-medium text-charcoal ml-1">{details.venue || "—"}</span></div>
                    <div><span className="text-text-muted">Guests:</span> <span className="font-medium text-charcoal ml-1">{details.guestCount}</span></div>
                    <div><span className="text-text-muted">Budget:</span> <span className="font-medium text-charcoal ml-1">{details.budget || "—"}</span></div>
                  </div>
                </div>
                {/* Theme */}
                <div className="bg-white rounded-2xl border border-border-light p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display text-lg font-semibold text-charcoal">Theme</h3>
                    <button type="button" onClick={() => goTo(1)} className="text-xs text-mocha font-semibold hover:text-mocha-dark">Edit</button>
                  </div>
                  <p className="text-sm font-medium text-charcoal">{themeSlug ? themes.find((t) => t.slug === themeSlug)?.title : customTheme || "Custom Theme"}</p>
                  {customThemeNotes && <p className="text-xs text-text-muted mt-1">Notes: {customThemeNotes}</p>}
                </div>
                {/* Services */}
                <div className="bg-white rounded-2xl border border-border-light p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display text-lg font-semibold text-charcoal">Selected Services</h3>
                    <button type="button" onClick={() => goTo(2)} className="text-xs text-mocha font-semibold hover:text-mocha-dark">Edit</button>
                  </div>
                  {selectedServices.length === 0 ? <p className="text-sm text-text-muted">No services selected.</p> : (
                    <div className="space-y-3">
                      {selectedServices.map((sel) => {
                        const svc = SERVICE_CATALOG.find((s) => s.id === sel.serviceId);
                        if (!svc) return null;
                        const qty = svc.hasQuantity ? Math.max(sel.quantity, details.guestCount) : sel.quantity;
                        return (
                          <div key={sel.serviceId} className="flex items-center justify-between text-sm py-2 border-b border-border-light/50 last:border-0">
                            <div><span className="font-medium text-charcoal">{svc.name}</span>{svc.hasQuantity && <span className="text-text-muted ml-1">x {qty}</span>}</div>
                            <span className="font-semibold text-mocha">{formatPaise(svc.priceInPaise * qty)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                {/* Add-ons */}
                {selectedAddons.length > 0 && (
                  <div className="bg-white rounded-2xl border border-border-light p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-display text-lg font-semibold text-charcoal">Add-ons</h3>
                      <button type="button" onClick={() => goTo(3)} className="text-xs text-mocha font-semibold hover:text-mocha-dark">Edit</button>
                    </div>
                    <div className="space-y-3">
                      {selectedAddons.map((sel) => {
                        const addon = ADDON_CATALOG.find((a) => a.id === sel.serviceId);
                        if (!addon) return null;
                        return (
                          <div key={sel.serviceId} className="flex items-center justify-between text-sm py-2 border-b border-border-light/50 last:border-0">
                            <div><span className="font-medium text-charcoal">{addon.name}</span>{addon.hasQuantity && <span className="text-text-muted ml-1">x {sel.quantity}</span>}</div>
                            <span className="font-semibold text-mocha">{addon.priceInPaise > 0 ? formatPaise(addon.priceInPaise * sel.quantity) : "Price on Request"}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {/* Total */}
                <div className="bg-mocha/5 rounded-2xl border border-mocha/20 p-6">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-lg font-semibold text-charcoal">Estimated Total</span>
                    <span className="font-display text-2xl font-bold text-mocha">{calculateTotal() > 0 ? formatPaise(calculateTotal()) : "Price on Request"}</span>
                  </div>
                  <p className="text-xs text-text-muted mt-2">Final pricing may vary. Our team will confirm before payment.</p>
                </div>
                {/* Contact */}
                <div className="bg-white rounded-2xl border border-border-light p-6 shadow-sm">
                  <h3 className="font-display text-lg font-semibold text-charcoal mb-4">Your Contact Details</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-charcoal mb-2">Full Name *</label>
                      <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Your full name" className={inputClass} />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-charcoal mb-2">Email *</label>
                        <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="your@email.com" className={inputClass} />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-charcoal mb-2">Phone *</label>
                        <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+91 98765 43210" className={inputClass} />
                      </div>
                    </div>
                  </div>
                </div>
                {submitError && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{submitError}</div>}
                <button type="button" onClick={handleSubmit} disabled={submitting} className="btn-primary w-full py-4 text-base font-semibold disabled:opacity-50">
                  {submitting ? <><Loader2 size={18} className="animate-spin" /> Submitting...</> : "Submit My Celebration Plan"}
                </button>
                <p className="text-center text-xs text-text-muted">Our team will review and respond within 24 hours with final pricing.</p>
              </div>
            </section>
          )}

          {/* Navigation */}
          {step < 5 && (
            <div className="flex items-center justify-between mt-10">
              <button type="button" onClick={() => step > 0 && goTo(step - 1)} disabled={step === 0} className="flex items-center gap-2 text-sm font-semibold text-charcoal hover:text-mocha transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                <ArrowLeft size={16} /> Back
              </button>
              <button type="button" onClick={() => canContinue() && goTo(step + 1)} disabled={!canContinue()} className="btn-primary px-8 py-3 text-sm disabled:opacity-40 disabled:cursor-not-allowed">
                Continue <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      </main>

      <StickyPriceSummary selectedServices={selectedServices} selectedAddons={selectedAddons} guestCount={details.guestCount} />
      <WhatsAppFAB />
      <FooterClient />
    </>
  );
}

export default function CustomPlanPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-cream"><Loader2 className="animate-spin text-mocha" size={32} /></div>}>
      <CustomPlanContent />
    </Suspense>
  );
}
