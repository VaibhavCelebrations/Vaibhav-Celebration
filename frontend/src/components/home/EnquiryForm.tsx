"use client";

import { useState, type FormEvent } from "react";
import { Send, HeartHandshake, Gift, Sparkles } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { submitContactForm } from "@/lib/cms/leads";

const celebrationTypes = ["Kids' Birthday", "Custom Celebration", "Other"];

const budgetRanges = [
  "Under ₹5,000",
  "₹5,000 – ₹10,000",
  "₹10,000 – ₹25,000",
  "₹25,000 – ₹50,000",
  "₹50,000+",
];

export function EnquiryForm() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPhoneError(null);

    const form = new FormData(e.currentTarget);
    const field = (name: string) => String(form.get(name) ?? "").trim();
    const phone = field("mobile");
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 13) {
      setPhoneError("Enter a valid mobile number, e.g. 98765 43210");
      return;
    }

    // The lead endpoint takes one free-text message; the celebration details go into it, labelled.
    const details = [
      ["Celebration date", field("celebrationDate")],
      ["City", field("city")],
      ["Guests / kids", field("guestCount")],
      ["Theme / idea", field("themeIdea")],
      ["Budget", field("budgetRange")],
      ["Marketing updates", form.get("marketingConsent") ? "Yes" : "No"],
    ]
      .filter(([, value]) => value)
      .map(([label, value]) => `${label}: ${value}`)
      .join("\n");

    setLoading(true);
    try {
      await submitContactForm({
        name: field("name"),
        phone,
        interestArea: field("celebrationType") || undefined,
        message: details || undefined,
      });
      setSubmitted(true);
    } catch {
      // Never claim success for an enquiry that did not reach the team.
      setError("We couldn't send your enquiry. Please check your connection and try again, or message us on WhatsApp.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border-b-2 border-border/60 bg-transparent px-4 py-3 text-sm text-charcoal placeholder:text-text-light focus:outline-none focus:border-mocha transition-all duration-300";

  return (
    <section id="enquiry" className="py-12 md:py-28 bg-surface">
      <div className="max-w-6xl mx-auto px-5 md:px-10">
        <ScrollReveal>
          <div className="flex flex-col lg:flex-row bg-white rounded-[2.5rem] border border-border shadow-card overflow-hidden">
            
            {/* Left Side: Info / Branding */}
            <div className="lg:w-5/12 bg-mocha relative p-7 md:p-14 flex flex-col justify-between text-white overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-[80px] -z-0 -translate-y-1/2 translate-x-1/3" />
              <div className="absolute bottom-0 left-0 w-72 h-72 bg-black/20 rounded-full blur-[80px] -z-0 translate-y-1/2 -translate-x-1/3" />
              
              <div className="relative z-10 mb-6 md:mb-12">
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-px w-10 bg-white/40" />
                  <p className="text-xs font-bold text-white/80 uppercase tracking-[0.2em]">
                    Get Started
                  </p>
                </div>
                <h2 className="font-display text-2xl md:text-4xl font-semibold mb-4 md:mb-6 leading-[1.15]">
                  Let&apos;s Plan Something Beautiful
                </h2>
                <p className="text-white/80 text-sm md:text-base leading-relaxed">
                  Tell us a little about your celebration and we&apos;ll help you
                  find the perfect way to bring it to life.
                </p>
              </div>

              <div className="relative z-10 space-y-5 md:space-y-8 mt-auto">
                <div className="flex items-start gap-5">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
                    <HeartHandshake size={20} className="text-white" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm mb-1 tracking-wide">Expert Guidance</h4>
                    <p className="text-xs text-white/70 leading-relaxed">We'll recommend the best themes and packages for your specific needs.</p>
                  </div>
                </div>
                <div className="flex items-start gap-5">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
                    <Sparkles size={20} className="text-white" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm mb-1 tracking-wide">Personalized Touch</h4>
                    <p className="text-xs text-white/70 leading-relaxed">Every tiny detail will be customized to match your child's unique story.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side: Form */}
            <div className="lg:w-7/12 p-6 md:p-12 lg:p-14 relative bg-white">
              {submitted ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                  <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mb-6">
                    <Send size={32} className="text-green-600" />
                  </div>
                  <h3 className="font-display text-2xl md:text-3xl font-semibold text-charcoal mb-4">
                    Thank You!
                  </h3>
                  <p className="text-text-muted text-base max-w-sm mx-auto leading-relaxed">
                    We&apos;ve received your details. Our celebration team will
                    reach out to you shortly to start planning something magical.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
                  {/* Row 1: Name + Mobile */}
                  <div className="grid sm:grid-cols-2 gap-5 sm:gap-6">
                    <div className="group">
                      <label htmlFor="enq-name" className="block text-xs font-bold text-charcoal/75 mb-1 uppercase tracking-widest group-focus-within:text-mocha transition-colors">
                        Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        id="enq-name"
                        type="text"
                        autoComplete="name"
                        name="name"
                        required
                        placeholder="Your full name"
                        className={inputClass}
                      />
                    </div>
                    <div className="group">
                      <label htmlFor="enq-mobile" className="block text-xs font-bold text-charcoal/75 mb-1 uppercase tracking-widest group-focus-within:text-mocha transition-colors">
                        Mobile / WhatsApp <span className="text-red-400">*</span>
                      </label>
                      <input
                        id="enq-mobile"
                        type="tel"
                        name="mobile"
                        required
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="10-digit mobile number"
                        aria-invalid={Boolean(phoneError)}
                        aria-describedby={phoneError ? "enq-mobile-error" : undefined}
                        className={inputClass}
                      />
                      {phoneError && (
                        <p id="enq-mobile-error" role="alert" className="mt-1.5 text-xs font-medium text-danger">
                          {phoneError}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Celebration Type + Date */}
                  <div className="grid sm:grid-cols-2 gap-5 sm:gap-6">
                    <div className="group">
                      <label htmlFor="enq-type" className="block text-xs font-bold text-charcoal/75 mb-1 uppercase tracking-widest group-focus-within:text-mocha transition-colors">
                        Celebration Type <span className="text-red-400">*</span>
                      </label>
                      <select id="enq-type" name="celebrationType" required className={inputClass} defaultValue="">
                        <option value="" disabled hidden>Select type...</option>
                        {celebrationTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="group">
                      <label htmlFor="enq-date" className="block text-xs font-bold text-charcoal/75 mb-1 uppercase tracking-widest group-focus-within:text-mocha transition-colors">
                        Celebration Date
                      </label>
                      <input
                        id="enq-date"
                        type="date"
                        name="celebrationDate"
                        min={new Date().toISOString().split("T")[0]}
                        className={`${inputClass} text-charcoal/80`}
                      />
                    </div>
                  </div>

                  {/* Row 3: City + Guests */}
                  <div className="grid sm:grid-cols-2 gap-5 sm:gap-6">
                    <div className="group">
                      <label htmlFor="enq-city" className="block text-xs font-bold text-charcoal/75 mb-1 uppercase tracking-widest group-focus-within:text-mocha transition-colors">
                        City <span className="text-red-400">*</span>
                      </label>
                      <input
                        id="enq-city"
                        type="text"
                        name="city"
                        required
                        placeholder="e.g. Jaipur"
                        className={inputClass}
                      />
                    </div>
                    <div className="group">
                      <label htmlFor="enq-guests" className="block text-xs font-bold text-charcoal/75 mb-1 uppercase tracking-widest group-focus-within:text-mocha transition-colors">
                        Guests / Kids
                      </label>
                      <input
                        id="enq-guests"
                        type="number"
                        name="guestCount"
                        min={1}
                        placeholder="e.g. 20"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  {/* Row 4: Theme + Budget */}
                  <div className="grid sm:grid-cols-2 gap-5 sm:gap-6">
                    <div className="group">
                      <label htmlFor="enq-theme" className="block text-xs font-bold text-charcoal/75 mb-1 uppercase tracking-widest group-focus-within:text-mocha transition-colors">
                        Theme / Idea
                      </label>
                      <input
                        id="enq-theme"
                        type="text"
                        name="themeIdea"
                        placeholder="e.g. Space, Princess..."
                        className={inputClass}
                      />
                    </div>
                    <div className="group">
                      <label htmlFor="enq-budget" className="block text-xs font-bold text-charcoal/75 mb-1 uppercase tracking-widest group-focus-within:text-mocha transition-colors">
                        Budget Range <span className="font-normal opacity-70">(opt)</span>
                      </label>
                      <select id="enq-budget" name="budgetRange" className={inputClass} defaultValue="">
                        <option value="" disabled hidden>Select budget...</option>
                        {budgetRanges.map((range) => (
                          <option key={range} value={range}>
                            {range}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Privacy Consent */}
                  <div className="pt-2">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        name="privacyConsent"
                        required
                        className="mt-1 w-4 h-4 rounded border-border-light text-mocha focus:ring-mocha shrink-0"
                      />
                      <span className="text-xs text-charcoal/70 leading-relaxed">
                        I agree to the processing of my personal data as described in the{" "}
                        <a href="/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-mocha underline hover:text-mocha-dark">
                          Privacy Policy
                        </a>
                        . I understand that Vaibhav Celebrations will use my information to respond to my enquiry. <span className="text-red-400">*</span>
                      </span>
                    </label>
                  </div>

                  {/* Optional Marketing Consent */}
                  <div>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        name="marketingConsent"
                        className="mt-1 w-4 h-4 rounded border-border-light text-mocha focus:ring-mocha shrink-0"
                      />
                      <span className="text-xs text-charcoal/70 leading-relaxed">
                        I would like to receive promotional offers, updates, and celebration ideas via WhatsApp/email. (Optional - you can unsubscribe anytime)
                      </span>
                    </label>
                  </div>

                  {/* Submit */}
                  <div className="pt-4 md:pt-8">
                    {error && (
                      <p role="alert" className="mb-4 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm font-medium text-danger">
                        {error}
                      </p>
                    )}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full btn-primary text-sm font-bold px-8 py-4 rounded-xl uppercase tracking-wider transition-all duration-300 disabled:opacity-60 flex items-center justify-center gap-3 hover:shadow-lg hover:-translate-y-1 group"
                    >
                      {loading ? (
                        "Sending..."
                      ) : (
                        <>
                          Submit Enquiry
                          <Send size={16} className="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
