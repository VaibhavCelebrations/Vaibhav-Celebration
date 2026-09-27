"use client";

import type { ReactNode } from "react";
import { Gift, Loader2, MapPin, ShieldCheck } from "lucide-react";
import type { BuilderQuote } from "@/lib/builder-api";
import { CartSummary } from "./CartSummary";
import { formatEventDate, type AddressForm, type Contact, type Details } from "./shared";

function Card({ title, onEdit, children }: { title: string; onEdit?: () => void; children: ReactNode }) {
  return (
    <div className="bg-surface rounded-2xl border border-border-light p-5 md:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-semibold text-charcoal">{title}</h2>
        {onEdit && (
          <button type="button" onClick={onEdit} className="text-xs text-mocha font-semibold hover:text-mocha-dark underline underline-offset-2">
            Edit
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm py-1.5">
      <span className="text-text-muted shrink-0">{label}</span>
      <span className="font-medium text-charcoal text-right">{value}</span>
    </div>
  );
}

type Props = {
  details: Details;
  contact: Contact;
  address: AddressForm;
  themeTitle: string;
  quote: BuilderQuote | null;
  quoteLoading: boolean;
  quoteError: string | null;
  onEdit: (step: number) => void;
  onRemoveChoice: (serviceId: string, sku: string) => void;
  onRemoveGiftRegistry: () => void;
};

export function ReviewStep({
  details,
  contact,
  address,
  themeTitle,
  quote,
  quoteLoading,
  quoteError,
  onEdit,
  onRemoveChoice,
  onRemoveGiftRegistry,
}: Props) {
  const addressLine = [address.line1, address.line2, address.city, address.state, address.pincode, address.country]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(", ");

  return (
    <section className="animate-slide-up">
      <h1 className="font-display text-2xl md:text-3xl font-semibold text-charcoal mb-2">Review your plan</h1>
      <p className="text-sm text-text-muted mb-8">
        Check everything once more. You&apos;ll pay securely on the next page — nothing is charged yet.
      </p>

      <div className="space-y-5">
        <Card title="Your cart" onEdit={() => onEdit(2)}>
          {quoteLoading && !quote ? (
            <div className="flex items-center gap-2 text-text-muted py-6 justify-center text-sm">
              <Loader2 className="animate-spin" size={16} /> Calculating your total…
            </div>
          ) : (
            <CartSummary
              quote={quote}
              loading={quoteLoading}
              error={quoteError}
              grouped
              onRemoveChoice={onRemoveChoice}
              onRemoveGiftRegistry={onRemoveGiftRegistry}
              emptyHint="Go back to Build and pick at least one item."
            />
          )}
        </Card>

        {quote?.giftRegistryIncluded && (
          <div className="flex items-start gap-3 rounded-2xl border border-mocha/20 bg-mocha/5 p-4">
            <Gift size={18} className="text-mocha mt-0.5 shrink-0" />
            <p className="text-sm text-charcoal leading-relaxed">
              <strong>Gift Registry included.</strong> After payment we&apos;ll help you set it up, and the steps are in your
              confirmation email and WhatsApp too.
            </p>
          </div>
        )}

        <Card title="Celebration" onEdit={() => onEdit(0)}>
          <Row label="Type" value={details.eventType} />
          <Row label="Child" value={details.childAge ? `${details.childName} (${details.childAge} yrs)` : details.childName} />
          <Row label="Date" value={formatEventDate(details.eventDate)} />
          <Row label="Children attending" value={String(details.guestCount)} />
          <Row label="Theme" value={themeTitle} />
        </Card>

        <Card title="Delivery & contact" onEdit={() => onEdit(0)}>
          <div className="flex items-start gap-2.5 text-sm text-charcoal mb-3">
            <MapPin size={16} className="text-mocha mt-0.5 shrink-0" />
            <span>{addressLine}</span>
          </div>
          <Row label="Name" value={contact.name} />
          <Row label="Email" value={contact.email} />
          <Row label="Phone" value={contact.phone} />
        </Card>

        <p className="flex items-center justify-center gap-2 text-xs text-text-muted">
          <ShieldCheck size={14} className="text-mocha" /> Secure payment via Razorpay · Invoice sent by email &amp; WhatsApp
        </p>
      </div>
    </section>
  );
}
