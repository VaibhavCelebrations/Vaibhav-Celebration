"use client";

import { useState } from "react";
import { submitContactForm } from "@/lib/cms/leads";
import type { ContactFormLabels } from "@/lib/cms/types";

type ContactFormProps = {
  submitLabel?: string;
  fieldLabels?: ContactFormLabels;
};

export function ContactForm({
  submitLabel = "Send Message",
  fieldLabels,
}: ContactFormProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setError("");

    const form = e.currentTarget;
    const data = new FormData(form);
    const firstName = String(data.get("firstName") ?? "").trim();
    const lastName = String(data.get("lastName") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    const interest = String(data.get("interest") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();

    try {
      await submitContactForm({
        name: [firstName, lastName].filter(Boolean).join(" "),
        email: email || undefined,
        phone: phone || undefined,
        interestArea: interest || undefined,
        message: message || undefined,
      });
      setStatus("success");
      form.reset();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="grid sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label htmlFor="contact-first-name" className="block text-sm font-semibold text-charcoal">
            {fieldLabels?.name ?? "First Name"}
          </label>
          <input
            id="contact-first-name"
            name="firstName"
            type="text"
            required
            className="w-full border-b-2 border-border-light bg-transparent px-0 py-2 text-charcoal placeholder:text-text-light focus:outline-none focus:border-mocha transition-colors rounded-none"
            placeholder="Enter your first name"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="contact-last-name" className="block text-sm font-semibold text-charcoal">Last Name</label>
          <input
            id="contact-last-name"
            name="lastName"
            type="text"
            className="w-full border-b-2 border-border-light bg-transparent px-0 py-2 text-charcoal placeholder:text-text-light focus:outline-none focus:border-mocha transition-colors rounded-none"
            placeholder="Enter your last name"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label htmlFor="contact-email" className="block text-sm font-semibold text-charcoal">
            {fieldLabels?.email ?? "Email Address"}
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            className="w-full border-b-2 border-border-light bg-transparent px-0 py-2 text-charcoal placeholder:text-text-light focus:outline-none focus:border-mocha transition-colors rounded-none"
            placeholder="Enter your email address"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="contact-phone" className="block text-sm font-semibold text-charcoal">
            {fieldLabels?.phone ?? "Phone Number"}
          </label>
          <input
            id="contact-phone"
            name="phone"
            type="tel"
            className="w-full border-b-2 border-border-light bg-transparent px-0 py-2 text-charcoal placeholder:text-text-light focus:outline-none focus:border-mocha transition-colors rounded-none"
            placeholder="Enter your phone number"
          />
        </div>
      </div>

      <div className="space-y-2 pt-2">
        <label className="block text-sm font-semibold text-charcoal">What are you interested in?</label>
        <div className="flex flex-wrap gap-3 mt-3">
          {[
            { value: "Birthday Theme", label: "Birthday Theme" },
            { value: "Milestone Event", label: "Milestone Event" },
            { value: "Custom Query", label: "Custom Query" },
          ].map((option, i) => (
            <label key={option.value} className="cursor-pointer">
              <input type="radio" name="interest" value={option.value} className="peer sr-only" defaultChecked={i === 0} />
              <span className="inline-block px-5 py-2.5 rounded-full border border-border text-sm text-text-muted peer-checked:border-mocha peer-checked:bg-mocha/5 peer-checked:text-mocha transition-all">
                {option.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2 pt-2">
        <label htmlFor="contact-message" className="block text-sm font-semibold text-charcoal">
          {fieldLabels?.message ?? "Message"}
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows={3}
          className="w-full border-b-2 border-border-light bg-transparent px-0 py-2 text-charcoal placeholder:text-text-light focus:outline-none focus:border-mocha transition-colors rounded-none resize-none"
          placeholder="Write your message here..."
        />
      </div>

      {status === "success" && (
        <p className="text-sm text-mocha font-medium">Thank you! We&apos;ll get back to you within 24 hours.</p>
      )}
      {status === "error" && <p className="text-sm text-red-600">{error}</p>}

      <div className="pt-6 text-right">
        <button
          type="submit"
          disabled={status === "loading"}
          className="btn-primary px-10 py-4 rounded-full shadow-lg hover:shadow-xl transition-all disabled:opacity-60"
        >
          {status === "loading" ? "Sending..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
