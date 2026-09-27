"use client";

import type { ReactNode } from "react";
import { Minus, Plus } from "lucide-react";
import {
  CELEBRATION_TYPES,
  MIN_GUESTS,
  getTodayDateString,
  isDateWithin7Days,
  type AddressForm,
  type Contact,
  type DetailErrors,
  type Details,
} from "./shared";

const inputClass =
  "w-full bg-cream-dark border border-border-light rounded-xl px-4 py-3.5 text-sm text-charcoal outline-none focus:ring-2 focus:ring-mocha/20 focus:border-mocha transition-all placeholder:text-text-light/60";

function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="font-bold text-charcoal uppercase tracking-wider block mb-2 text-xs">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
      {error ? (
        <span role="alert" className="block text-red-600 text-xs font-medium mt-1.5">
          {error}
        </span>
      ) : hint ? (
        <span className="block text-text-muted text-xs mt-1.5">{hint}</span>
      ) : null}
    </label>
  );
}

type Props = {
  details: Details;
  contact: Contact;
  address: AddressForm;
  errors: DetailErrors;
  isAuthenticated: boolean;
  saveAsDefault: boolean;
  onDetails: (patch: Partial<Details>) => void;
  onContact: (patch: Partial<Contact>) => void;
  onAddress: (patch: Partial<AddressForm>) => void;
  onSaveAsDefault: (v: boolean) => void;
};

export function DetailsStep({
  details,
  contact,
  address,
  errors,
  isAuthenticated,
  saveAsDefault,
  onDetails,
  onContact,
  onAddress,
  onSaveAsDefault,
}: Props) {
  const setGuests = (n: number) => onDetails({ guestCount: Math.max(1, Math.floor(n) || 1) });

  return (
    <section className="animate-slide-up">
      <h1 className="font-display text-2xl md:text-3xl font-semibold text-charcoal mb-2">Tell us about your celebration</h1>
      <p className="text-sm text-text-muted mb-8">
        A few details so we can price your plan and deliver everything to the right place.
      </p>

      <div className="bg-surface rounded-3xl border border-border-light p-6 md:p-8 shadow-sm space-y-8">
        {/* Celebration */}
        <div className="space-y-6">
          <div>
            <span className="block text-xs font-bold text-charcoal uppercase tracking-wider mb-3">
              Type of celebration <span className="text-red-500">*</span>
            </span>
            <div className="grid grid-cols-2 gap-3 max-w-sm" role="radiogroup" aria-label="Type of celebration">
              {CELEBRATION_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  role="radio"
                  aria-checked={details.eventType === type}
                  onClick={() => onDetails({ eventType: type })}
                  className={`rounded-xl border py-3.5 text-sm font-semibold transition-all ${
                    details.eventType === type
                      ? "border-mocha bg-mocha/5 text-mocha shadow-sm"
                      : "border-border-light text-charcoal hover:border-mocha/40 bg-surface"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            {errors.eventType && <p role="alert" className="text-red-600 text-xs font-medium mt-1.5">{errors.eventType}</p>}
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <Field label="Child's name" required error={errors.childName}>
              <input
                type="text"
                value={details.childName}
                onChange={(e) => onDetails({ childName: e.target.value })}
                placeholder="Enter child's name"
                className={inputClass}
              />
            </Field>
            <Field label="Child's age">
              <input
                type="text"
                inputMode="numeric"
                value={details.childAge}
                onChange={(e) => onDetails({ childAge: e.target.value.replace(/\D/g, "").slice(0, 2) })}
                placeholder="e.g. 5"
                className={inputClass}
              />
            </Field>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <Field label="Celebration date" required error={errors.eventDate}>
              <input
                type="date"
                value={details.eventDate}
                min={getTodayDateString()}
                onChange={(e) => onDetails({ eventDate: e.target.value })}
                className={inputClass}
              />
              {isDateWithin7Days(details.eventDate) && !errors.eventDate && (
                <span className="block text-amber-700 text-xs font-medium mt-2 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                  Orders must be placed at least 7 days before the celebration date.
                </span>
              )}
            </Field>
            <div>
              <span className="block text-xs font-bold text-charcoal uppercase tracking-wider mb-2">
                Number of children <span className="text-red-500">*</span>
              </span>
              <div className="flex items-center bg-cream-dark rounded-xl border border-border-light overflow-hidden h-[50px] w-44">
                <button
                  type="button"
                  aria-label="Decrease number of children"
                  onClick={() => setGuests(details.guestCount - 1)}
                  className="w-12 h-full flex items-center justify-center text-charcoal hover:bg-mocha/10 transition-colors"
                >
                  <Minus size={16} />
                </button>
                <input
                  type="number"
                  min={1}
                  aria-label="Number of children"
                  value={details.guestCount}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!Number.isNaN(v)) setGuests(v);
                  }}
                  className="flex-1 min-w-0 text-center font-display text-lg font-bold text-charcoal bg-transparent border-none outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  aria-label="Increase number of children"
                  onClick={() => setGuests(details.guestCount + 1)}
                  className="w-12 h-full flex items-center justify-center text-charcoal hover:bg-mocha/10 transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
              {errors.guestCount ? (
                <p role="alert" className="text-red-600 text-xs font-medium mt-1.5">{errors.guestCount}</p>
              ) : (
                <p className="text-text-muted text-xs mt-1.5">Minimum {MIN_GUESTS} children per booking</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 md:gap-12 pt-8 border-t border-border-light">
          {/* Contact */}
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-charcoal">Contact information</h2>
            <Field label="Your name" required error={errors.name}>
              <input
                type="text"
                autoComplete="name"
                value={contact.name}
                onChange={(e) => onContact({ name: e.target.value })}
                placeholder="Jane Doe"
                className={inputClass}
              />
            </Field>
            <Field label="Email address" required error={errors.email} hint="Your order confirmation and invoice are sent here">
              <input
                type="email"
                autoComplete="email"
                value={contact.email}
                onChange={(e) => onContact({ email: e.target.value })}
                placeholder="jane@example.com"
                className={inputClass}
              />
            </Field>
            <Field label="Phone number" required error={errors.phone} hint="We also send WhatsApp updates to this number">
              <input
                type="tel"
                autoComplete="tel"
                value={contact.phone}
                onChange={(e) => onContact({ phone: e.target.value })}
                placeholder="+91 98765 43210"
                className={inputClass}
              />
            </Field>
          </div>

          {/* Delivery address */}
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-charcoal">Delivery address</h2>
            <Field label="Address line 1" required error={errors.line1}>
              <input
                type="text"
                autoComplete="address-line1"
                value={address.line1}
                onChange={(e) => onAddress({ line1: e.target.value })}
                placeholder="Flat / House No. / Building"
                className={inputClass}
              />
            </Field>
            <Field label="Address line 2">
              <input
                type="text"
                autoComplete="address-line2"
                value={address.line2}
                onChange={(e) => onAddress({ line2: e.target.value })}
                placeholder="Locality / Area / Street"
                className={inputClass}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="City" required error={errors.city}>
                <input
                  type="text"
                  autoComplete="address-level2"
                  value={address.city}
                  onChange={(e) => onAddress({ city: e.target.value })}
                  placeholder="City"
                  className={inputClass}
                />
              </Field>
              <Field label="State" required error={errors.state}>
                <input
                  type="text"
                  autoComplete="address-level1"
                  value={address.state}
                  onChange={(e) => onAddress({ state: e.target.value })}
                  placeholder="State"
                  className={inputClass}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Country" required error={errors.country}>
                <input
                  type="text"
                  autoComplete="country-name"
                  value={address.country}
                  onChange={(e) => onAddress({ country: e.target.value })}
                  placeholder="India"
                  className={inputClass}
                />
              </Field>
              <Field label="Pincode" required error={errors.pincode}>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  value={address.pincode}
                  onChange={(e) => onAddress({ pincode: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                  placeholder="302001"
                  className={inputClass}
                />
              </Field>
            </div>

            {isAuthenticated && (
              <label className="flex items-center gap-3 bg-cream/40 p-3 rounded-xl border border-border-light cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveAsDefault}
                  onChange={(e) => onSaveAsDefault(e.target.checked)}
                  className="w-4 h-4 rounded border-border-light accent-mocha"
                />
                <span className="text-sm text-charcoal font-medium">Save as my default delivery address</span>
              </label>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
