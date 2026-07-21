"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQAccordionProps {
  items: FAQItem[];
  className?: string;
}

export function FAQAccordion({ items, className = "" }: FAQAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className={`space-y-3 ${className}`}>
      {items.map((item, idx) => {
        const isOpen = openIndex === idx;
        return (
          <div key={idx} className="bg-surface rounded-xl border border-border overflow-hidden transition-premium">
            <button onClick={() => setOpenIndex(isOpen ? null : idx)} className="w-full flex items-center justify-between px-6 py-5 text-left group" aria-expanded={isOpen}>
              <span className="font-display text-base text-charcoal font-semibold pr-4 group-hover:text-mocha transition-colors">{item.question}</span>
              <ChevronDown size={18} className={`shrink-0 text-mocha transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
            </button>
            <div className={`overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}`}>
              <div className="px-6 pb-5 text-sm text-text-muted leading-relaxed">{item.answer}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
