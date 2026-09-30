"use client";

import { useState } from "react";
import {
  Truck,
  ExternalLink,
  ShieldCheck,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  Package,
  Sparkles,
  MessageCircle,
  AlertCircle,
} from "lucide-react";
import type { OrderDto, OrderStatus } from "@/lib/shop-types";
import { whatsappHref } from "@/lib/cms/map-media";
import { envWhatsAppNumber } from "@/lib/business";

interface OrderTrackingCardProps {
  order: OrderDto;
}

interface CarrierInfo {
  name: string;
  partnerBadge: string;
  domainText: string;
}

/**
 * Validates and strictly sanitizes courier tracking URLs.
 * Enforces http/https protocols to eliminate javascript: / data: / XSS vectors.
 */
function sanitizeTrackingUrl(rawUrl?: string | null): string | null {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }
    return parsed.toString();
  } catch {
    // Auto-prefix https if user or admin pasted domain without scheme
    if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(trimmed)) {
      try {
        const parsedWithHttps = new URL(`https://${trimmed}`);
        if (parsedWithHttps.protocol === "https:") {
          return parsedWithHttps.toString();
        }
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Identifies well-known Indian and international logistics partners from tracking URLs
 * to render trusted, enterprise-grade courier branding.
 */
function detectCarrier(url: string | null): CarrierInfo {
  if (!url) {
    return {
      name: "Express Courier Partner",
      partnerBadge: "Verified Logistics",
      domainText: "Carrier Portal",
    };
  }

  const lower = url.toLowerCase();
  if (lower.includes("bluedart")) {
    return { name: "Blue Dart Express", partnerBadge: "Priority Air Express", domainText: "bluedart.com" };
  }
  if (lower.includes("delhivery")) {
    return { name: "Delhivery Logistics", partnerBadge: "Express Surface & Air", domainText: "delhivery.com" };
  }
  if (lower.includes("shiprocket")) {
    return { name: "Shiprocket Fulfillment", partnerBadge: "Express Partner Network", domainText: "shiprocket.co" };
  }
  if (lower.includes("dtdc")) {
    return { name: "DTDC Courier & Cargo", partnerBadge: "Express Logistics", domainText: "dtdc.in" };
  }
  if (lower.includes("indiapost")) {
    return { name: "India Post Speed Post", partnerBadge: "National Postal Service", domainText: "indiapost.gov.in" };
  }
  if (lower.includes("fedex")) {
    return { name: "FedEx Express", partnerBadge: "Global Priority Express", domainText: "fedex.com" };
  }
  if (lower.includes("dhl")) {
    return { name: "DHL Express", partnerBadge: "Worldwide Express", domainText: "dhl.com" };
  }
  if (lower.includes("shadowfax")) {
    return { name: "Shadowfax Express", partnerBadge: "Express Delivery", domainText: "shadowfax.in" };
  }
  if (lower.includes("ekart")) {
    return { name: "Ekart Logistics", partnerBadge: "Express Fulfillment", domainText: "ekartlogistics.com" };
  }

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host.includes("vaibhavcelebrations")) {
      return { name: "Vaibhav Celebrations Delivery", partnerBadge: "In-house Dispatch", domainText: host };
    }
    const formatted = host.split(".")[0];
    const capitalized = formatted.charAt(0).toUpperCase() + formatted.slice(1);
    return {
      name: `${capitalized} Logistics`,
      partnerBadge: "Verified Courier Dispatch",
      domainText: host,
    };
  } catch {
    return {
      name: "Express Courier Partner",
      partnerBadge: "Verified Courier Dispatch",
      domainText: "Carrier Portal",
    };
  }
}

interface TimelineStep {
  key: string;
  label: string;
  subtitle: string;
}

const TIMELINE_STEPS: TimelineStep[] = [
  { key: "PLACED", label: "Order Placed", subtitle: "Received" },
  { key: "PAID", label: "Payment Confirmed", subtitle: "Authorized" },
  { key: "PROCESSING", label: "Preparing Items", subtitle: "In Studio" },
  { key: "SHIPPED", label: "Dispatched", subtitle: "In Transit" },
  { key: "DELIVERED", label: "Delivered", subtitle: "Completed" },
];

function getStepIndex(status: OrderStatus, paymentStatus?: string): number {
  if (status === "DELIVERED") return 4;
  if (status === "SHIPPED") return 3;
  if (status === "PROCESSING" || status === "READY_TO_SHIP") return 2;
  if (status === "PAID" || paymentStatus === "PAID") return 1;
  return 0;
}

export function OrderTrackingCard({ order }: OrderTrackingCardProps) {
  const [copied, setCopied] = useState(false);

  // If order is cancelled or refunded without previous dispatch, do not render tracking card
  if (order.status === "CANCELLED" || order.status === "REFUNDED") {
    return null;
  }

  const isPaid =
    order.paymentStatus === "PAID" ||
    order.status === "PAID" ||
    order.status === "PROCESSING" ||
    order.status === "READY_TO_SHIP" ||
    order.status === "SHIPPED" ||
    order.status === "DELIVERED";

  // Only show fulfillment card for confirmed/paid orders or orders having trackingUrl
  if (!isPaid && !order.trackingUrl) {
    return null;
  }

  const validTrackingUrl = sanitizeTrackingUrl(order.trackingUrl);
  const carrier = detectCarrier(validTrackingUrl);
  const currentStepIndex = getStepIndex(order.status, order.paymentStatus);
  const isShipped = order.status === "SHIPPED";
  const isDelivered = order.status === "DELIVERED";

  const handleCopy = async () => {
    if (!validTrackingUrl) return;
    try {
      await navigator.clipboard.writeText(validTrackingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {
      // Ignore copy error
    }
  };

  const whatsappPhone = envWhatsAppNumber();
  const conciergeUrl = whatsappHref(
    whatsappPhone,
    `Hi Vaibhav Celebrations! I'm inquiring about delivery and tracking for my order #${order.orderCode}.`
  );

  const statusTitle = isDelivered ? "Order Delivered" : isShipped ? "Shipment In Transit" : "Order Confirmed & Preparing";
  const statusText = isDelivered
    ? "Delivered to your shipping address. We hope your celebration is magical!"
    : isShipped
      ? "Dispatched via our courier partner. Use the tracking link below for live updates."
      : "Your celebration items are being handpicked, customised and prepared for dispatch.";

  return (
    <section
      aria-label="Order Tracking and Fulfillment"
      className="@container bg-surface rounded-2xl border border-border-light shadow-soft overflow-hidden"
    >
      {/* Header */}
      <div className="bg-cream/40 border-b border-border-light p-5 @md:p-6">
        <div className="flex items-start gap-3.5">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
              isDelivered
                ? "bg-emerald-100 text-emerald-700"
                : isShipped
                  ? "bg-mocha text-white ring-4 ring-mocha/10"
                  : "bg-surface text-mocha border border-border-light"
            }`}
          >
            {isDelivered ? <CheckCircle2 size={22} /> : isShipped ? <Truck size={22} /> : <Package size={22} />}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <h2 className="font-display text-lg @md:text-xl font-bold text-charcoal">{statusTitle}</h2>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider whitespace-nowrap ${
                  isDelivered
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : isShipped
                      ? "bg-mocha/10 text-mocha border border-mocha/20"
                      : "bg-amber-50 text-amber-800 border border-amber-200"
                }`}
              >
                {isDelivered ? (
                  <>
                    <CheckCircle2 size={12} /> Delivered
                  </>
                ) : isShipped ? (
                  <>
                    <Truck size={12} /> On The Way
                  </>
                ) : (
                  <>
                    <Clock size={12} /> In Preparation
                  </>
                )}
              </span>
            </div>
            <p className="text-sm text-text-muted mt-1 leading-relaxed">{statusText}</p>
          </div>
        </div>

        {/* Progress stepper — vertical on narrow cards, horizontal once the card itself is wide enough */}
        <div className="mt-6 pt-6 border-t border-border-light/60">
          <div className="relative">
            <div className="hidden @md:block absolute top-[18px] left-[10%] right-[10%] h-[3px] bg-border-light rounded-full -translate-y-1/2" />
            <div
              className="hidden @md:block absolute top-[18px] left-[10%] h-[3px] bg-mocha rounded-full transition-all duration-500 -translate-y-1/2"
              style={{ width: `${(currentStepIndex / 4) * 80}%` }}
            />

            <ol className="relative grid grid-cols-1 @md:grid-cols-5 gap-3 @md:gap-2">
              {TIMELINE_STEPS.map((step, idx) => {
                const state =
                  idx < currentStepIndex || (isDelivered && idx === currentStepIndex)
                    ? "completed"
                    : idx === currentStepIndex
                      ? "current"
                      : "upcoming";

                return (
                  <li key={step.key} className="flex @md:flex-col items-center @md:text-center gap-3 @md:gap-2">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                        state === "completed"
                          ? "bg-mocha text-white ring-4 ring-mocha/10"
                          : state === "current"
                            ? "bg-surface text-mocha border-2 border-mocha ring-4 ring-mocha/15"
                            : "bg-surface text-text-light border-2 border-border-light"
                      }`}
                    >
                      {state === "completed" ? (
                        <Check size={15} className="stroke-[3]" />
                      ) : state === "current" && idx === 3 ? (
                        <Truck size={15} />
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <div className="min-w-0">
                      <p
                        className={`text-xs leading-snug ${
                          state === "current"
                            ? "text-mocha font-bold"
                            : state === "completed"
                              ? "text-charcoal font-semibold"
                              : "text-text-muted font-medium"
                        }`}
                      >
                        {step.label}
                      </p>
                      <p className="text-[11px] text-text-light mt-0.5">{step.subtitle}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 @md:p-6 space-y-5">
        {isShipped || isDelivered || validTrackingUrl ? (
          <div className="rounded-2xl border border-border-light bg-sand/30 p-4 @md:p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-mocha/10 text-mocha flex items-center justify-center shrink-0">
                <Truck size={19} />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-mocha">Logistics Partner</span>
                  <span className="inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <ShieldCheck size={12} className="text-emerald-600" /> {carrier.partnerBadge}
                  </span>
                </div>
                <h3 className="font-display text-lg font-bold text-charcoal leading-tight">{carrier.name}</h3>
                <p className="text-xs text-text-muted truncate">
                  Courier portal: <span className="font-mono text-charcoal">{carrier.domainText}</span>
                </p>
              </div>
            </div>

            {validTrackingUrl ? (
              <>
                <div className="grid grid-cols-1 @sm:grid-cols-[1fr_auto] gap-2.5">
                  <a
                    href={validTrackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold"
                    title="Open courier tracking in a new tab"
                  >
                    <Truck size={17} />
                    <span>Track Order</span>
                    <ExternalLink size={14} className="opacity-80" />
                  </a>
                  <button
                    type="button"
                    onClick={handleCopy}
                    title="Copy tracking link to clipboard"
                    className="btn-outline inline-flex items-center justify-center gap-1.5 px-4 py-3 text-sm font-semibold bg-surface"
                  >
                    {copied ? (
                      <>
                        <Check size={15} className="text-emerald-600 stroke-[3]" />
                        <span className="text-emerald-700">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={15} />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="rounded-xl bg-surface border border-border-light px-3.5 py-2.5 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium text-charcoal shrink-0">Tracking link</span>
                    <a
                      href={validTrackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-mocha hover:underline truncate min-w-0"
                      title={validTrackingUrl}
                    >
                      {validTrackingUrl}
                    </a>
                  </div>
                  <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-text-light">
                    <ShieldCheck size={12} className="text-emerald-600 shrink-0" />
                    Opens securely in a new tab · Insured dispatch
                  </p>
                </div>
              </>
            ) : (
              <div className="flex items-start gap-2 px-3.5 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                <AlertCircle size={15} className="shrink-0 mt-px" />
                <span>Tracking link is syncing with the courier partner. Please check back shortly.</span>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-border-light bg-sand/30 p-4 @md:p-5 space-y-3">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-mocha/10 text-mocha flex items-center justify-center shrink-0">
                <Sparkles size={20} />
              </div>
              <div className="space-y-1">
                <h3 className="font-display text-base font-bold text-charcoal">Celebration Items in Preparation</h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  Your order has been verified and allocated to our curation and packing studio. Once quality checks
                  and customised elements are finalised, it will be handed over to our courier partner.
                </p>
              </div>
            </div>
            <div className="pt-3 border-t border-border-light/70 flex items-start gap-2 text-xs text-mocha font-medium">
              <Clock size={14} className="shrink-0 mt-px" />
              <span>The courier tracking link will be sent to your WhatsApp &amp; email once dispatched.</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex flex-col @lg:flex-row @lg:items-center justify-between gap-3 pt-4 border-t border-border-light text-xs text-text-muted">
          <div className="flex items-start gap-2">
            <ShieldCheck size={14} className="text-mocha shrink-0 mt-px" />
            <span>All shipments are tamper-sealed and insured against transit damage.</span>
          </div>
          <a
            href={conciergeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 self-start @lg:self-auto rounded-full border border-mocha/20 bg-mocha/5 px-3 py-1.5 text-mocha hover:bg-mocha/10 font-semibold transition-colors shrink-0"
          >
            <MessageCircle size={14} />
            <span>Delivery help on WhatsApp</span>
          </a>
        </div>
      </div>
    </section>
  );
}
