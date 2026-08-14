"use client";

import { useState, type FormEvent } from "react";
import { Send, HeartHandshake, Gift, Sparkles } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

const celebrationTypes = [
  "Kids' Birthday",
  "Baby Shower",
  "Naming Ceremony",
  "Milestone Celebration",
  "Custom Celebration",
  "Other",
];

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

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1"}/enquiries`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );
      if (!res.ok) throw new Error("Failed");
    } catch {
      // Silently continue
    }

    setLoading(false);
    setSubmitted(true);
  }

  const inputClass =
    "w-full rounded-xl border-b-2 border-border/60 bg-transparent px-4 py-3 text-sm text-charcoal placeholder:text-text-light focus:outline-none focus:border-mocha transition-all duration-300";

  return (
    <section id="enquiry" className="py-20 md:py-28 bg-surface">
      <div className="max-w-6xl mx-auto px-5 md:px-10">
        <ScrollReveal>
          <div className="flex flex-col lg:flex-row bg-white rounded-[2.5rem] border border-border shadow-card overflow-hidden">
            
            {/* Left Side: Info / Branding */}
            <div className="lg:w-5/12 bg-mocha relative p-10 md:p-14 flex flex-col justify-between text-white overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-[80px] -z-0 -translate-y-1/2 translate-x-1/3" />
              <div className="absolute bottom-0 left-0 w-72 h-72 bg-black/20 rounded-full blur-[80px] -z-0 translate-y-1/2 -translate-x-1/3" />
              
              <div className="relative z-10 mb-12">
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-px w-10 bg-white/40" />
                  <p className="text-xs font-bold text-white/80 uppercase tracking-[0.2em]">
                    Get Started
                  </p>
                </div>
                <h2 className="font-display text-3xl md:text-4xl font-semibold mb-6 leading-[1.15]">
                  Let&apos;s Plan Something Beautiful
                </h2>
                <p className="text-white/80 text-sm md:text-base leading-relaxed">
                  Tell us a little about your celebration and we&apos;ll help you
                  find the perfect way to bring it to life.
                </p>
              </div>

              <div className="relative z-10 space-y-8 mt-auto">
                <div className="flex items-start gap-5">
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
                    <HeartHandshake size={20} className="text-white" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm mb-1 tracking-wide">Expert Guidance</h4>
                    <p className="text-xs text-white/70 leading-relaxed">We'll recommend the best themes and packages for your specific needs.</p>
                  </div>
                </div>
                <div className="flex items-start gap-5">
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
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
            <div className="lg:w-7/12 p-8 md:p-12 lg:p-14 relative bg-white">
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
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Row 1: Name + Mobile */}
                  <div className="grid sm:grid-cols-2 gap-8 sm:gap-6">
                    <div className="group">
                      <label className="block text-[10px] font-bold text-charcoal/60 mb-1 uppercase tracking-widest group-focus-within:text-mocha transition-colors">
                        Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        required
                        placeholder="Your full name"
                        className={inputClass}
                      />
                    </div>
                    <div className="group">
                      <label className="block text-[10px] font-bold text-charcoal/60 mb-1 uppercase tracking-widest group-focus-within:text-mocha transition-colors">
                        Mobile / WhatsApp <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="tel"
                        name="mobile"
                        required
                        placeholder="+91 00000 00000"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  {/* Row 2: Celebration Type + Date */}
                  <div className="grid sm:grid-cols-2 gap-8 sm:gap-6">
                    <div className="group">
                      <label className="block text-[10px] font-bold text-charcoal/60 mb-1 uppercase tracking-widest group-focus-within:text-mocha transition-colors">
                        Celebration Type <span className="text-red-400">*</span>
                      </label>
                      <select name="celebrationType" required className={inputClass} defaultValue="">
                        <option value="" disabled hidden>Select type...</option>
                        {celebrationTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="group">
                      <label className="block text-[10px] font-bold text-charcoal/60 mb-1 uppercase tracking-widest group-focus-within:text-mocha transition-colors">
                        Celebration Date
                      </label>
                      <input
                        type="date"
                        name="celebrationDate"
                        className={`${inputClass} text-charcoal/80`}
                      />
                    </div>
                  </div>

                  {/* Row 3: City + Guests */}
                  <div className="grid sm:grid-cols-2 gap-8 sm:gap-6">
                    <div className="group">
                      <label className="block text-[10px] font-bold text-charcoal/60 mb-1 uppercase tracking-widest group-focus-within:text-mocha transition-colors">
                        City <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        name="city"
                        required
                        placeholder="e.g. Jaipur"
                        className={inputClass}
                      />
                    </div>
                    <div className="group">
                      <label className="block text-[10px] font-bold text-charcoal/60 mb-1 uppercase tracking-widest group-focus-within:text-mocha transition-colors">
                        Guests / Kids
                      </label>
                      <input
                        type="number"
                        name="guestCount"
                        min={1}
                        placeholder="e.g. 20"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  {/* Row 4: Theme + Budget */}
                  <div className="grid sm:grid-cols-2 gap-8 sm:gap-6">
                    <div className="group">
                      <label className="block text-[10px] font-bold text-charcoal/60 mb-1 uppercase tracking-widest group-focus-within:text-mocha transition-colors">
                        Theme / Idea
                      </label>
                      <input
                        type="text"
                        name="themeIdea"
                        placeholder="e.g. Space, Princess..."
                        className={inputClass}
                      />
                    </div>
                    <div className="group">
                      <label className="block text-[10px] font-bold text-charcoal/60 mb-1 uppercase tracking-widest group-focus-within:text-mocha transition-colors">
                        Budget Range <span className="font-normal opacity-70">(opt)</span>
                      </label>
                      <select name="budgetRange" className={inputClass} defaultValue="">
                        <option value="" disabled hidden>Select budget...</option>
                        {budgetRanges.map((range) => (
                          <option key={range} value={range}>
                            {range}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Submit */}
                  <div className="pt-8">
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
