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

  const whatsappPhone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "+919900000000";
  const conciergeUrl = whatsappHref(
    whatsappPhone,
    `Hi Vaibhav Celebrations! I'm inquiring about delivery and tracking for my order #${order.orderCode}.`
  );

  return (
    <section
      aria-label="Order Tracking and Fulfillment"
      className="bg-surface rounded-2xl border border-border-light shadow-soft overflow-hidden"
    >
      {/* Top Header */}
      <div className="bg-cream/40 border-b border-border-light p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                isDelivered
                  ? "bg-emerald-100 text-emerald-800"
                  : isShipped
                    ? "bg-mocha text-white ring-4 ring-mocha/10"
                    : "bg-surface text-mocha border border-border-light"
              }`}
            >
              {isDelivered ? (
                <CheckCircle2 size={22} className="text-emerald-700" />
              ) : isShipped ? (
                <Truck size={22} className="animate-pulse" />
              ) : (
                <Package size={22} />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg sm:text-xl font-bold text-charcoal">
                  {isDelivered
                    ? "Order Delivered"
                    : isShipped
                      ? "Shipment In Transit"
                      : "Order Confirmed & Preparing"}
                </h2>
                {isShipped && (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-text-muted mt-0.5">
                {isDelivered
                  ? "Delivered to your shipping address. We hope your celebration is magical!"
                  : isShipped
                    ? "Dispatched via verified courier partner. Real-time carrier tracking is active."
                    : "Your celebration items are being handpicked, customized, and prepared for dispatch."}
              </p>
            </div>
          </div>

          <div className="shrink-0 self-start sm:self-auto">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                isDelivered
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  : isShipped
                    ? "bg-purple-100 text-purple-900 border border-purple-200"
                    : "bg-blue-50 text-blue-800 border border-blue-100"
              }`}
            >
              {isDelivered ? (
                <>
                  <CheckCircle2 size={13} /> Delivered
                </>
              ) : isShipped ? (
                <>
                  <Truck size={13} /> Dispatched & On The Way
                </>
              ) : (
                <>
                  <Clock size={13} /> In Preparation
                </>
              )}
            </span>
          </div>
        </div>

        {/* Visual Progress Stepper with EXACT vertical line alignment */}
        <div className="mt-7 pt-6 border-t border-border-light/60">
          <div className="relative">
            {/* Background connection bar: strictly at top-[18px], middle of the 36px circle (w-9 h-9) */}
            <div className="hidden sm:block absolute top-[18px] left-[10%] right-[10%] h-[3px] bg-border-light rounded-full -translate-y-1/2 -z-0" />

            {/* Active progress bar: strictly at top-[18px] */}
            <div
              className="hidden sm:block absolute top-[18px] left-[10%] h-[3px] bg-mocha rounded-full transition-all duration-500 -translate-y-1/2 -z-0"
              style={{
                width: `${Math.min(80, (currentStepIndex / 4) * 80)}%`,
              }}
            />

            <ol className="relative z-10 grid grid-cols-2 sm:grid-cols-5 gap-y-4 gap-x-2">
              {TIMELINE_STEPS.map((step, idx) => {
                const isStepCompleted = idx < currentStepIndex;
                const isStepCurrent = idx === currentStepIndex;

                let state = "upcoming";
                if (isStepCompleted) state = "completed";
                else if (isStepCurrent) state = "current";

                return (
                  <li key={step.key} className="flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2">
                    {/* Circle is strictly 36px (w-9 h-9) with solid background so line stays behind */}
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-all duration-300 ${
                        state === "completed"
                          ? "bg-mocha text-white shadow-sm ring-4 ring-mocha/10"
                          : state === "current"
                            ? "bg-mocha text-white ring-4 ring-mocha/20 animate-pulse shadow-sm"
                            : "bg-surface text-text-light border-2 border-border-light"
                      }`}
                    >
                      {state === "completed" ? (
                        <Check size={15} className="stroke-[3]" />
                      ) : state === "current" ? (
                        idx === 3 ? (
                          <Truck size={15} />
                        ) : idx === 4 ? (
                          <CheckCircle2 size={15} />
                        ) : (
                          idx + 1
                        )
                      ) : (
                        idx + 1
                      )}
                    </div>

                    {/* Labels are placed strictly BELOW the circle container */}
                    <div className="min-w-0">
                      <p
                        className={`text-xs font-semibold leading-snug ${
                          state === "current"
                            ? "text-mocha font-bold"
                            : state === "completed"
                              ? "text-charcoal"
                              : "text-text-muted"
                        }`}
                      >
                        {step.label}
                      </p>
                      <p className="text-[11px] text-text-light hidden sm:block mt-0.5">{step.subtitle}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-5 sm:p-6 space-y-6">
        {/* Dispatched / Shipped Details */}
        {isShipped || isDelivered || validTrackingUrl ? (
          <div className="bg-sand/30 rounded-2xl p-5 border border-border-light space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider text-mocha">
                    Logistics Partner
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    <ShieldCheck size={13} className="text-emerald-600" /> {carrier.partnerBadge}
                  </span>
                </div>
                <h3 className="font-display text-lg font-bold text-charcoal">{carrier.name}</h3>
                <p className="text-xs text-text-muted">
                  Official courier portal: <span className="font-mono text-charcoal">{carrier.domainText}</span>
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                {validTrackingUrl ? (
                  <>
                    <a
                      href={validTrackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                      title="Open official courier tracking in new tab"
                    >
                      <Truck size={17} />
                      <span>Track Order</span>
                      <ExternalLink size={14} className="opacity-80" />
                    </a>

                    <button
                      type="button"
                      onClick={handleCopy}
                      title="Copy tracking link to clipboard"
                      className="btn-outline inline-flex items-center gap-1.5 px-3.5 py-3 text-xs font-semibold bg-surface hover:bg-cream border-border-light transition-all"
                    >
                      {copied ? (
                        <>
                          <Check size={14} className="text-emerald-600 stroke-[3]" />
                          <span className="text-emerald-700 font-bold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>Tracking link syncing with courier partner. Check back shortly.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Direct URL destination with security notice */}
            {validTrackingUrl && (
              <div className="pt-3 border-t border-border-light/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-text-muted">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-medium text-charcoal shrink-0">Tracking Link:</span>
                  <a
                    href={validTrackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-mocha hover:underline truncate max-w-md block"
                    title={validTrackingUrl}
                  >
                    {validTrackingUrl}
                  </a>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-text-light shrink-0">
                  <ShieldCheck size={13} className="text-emerald-600" />
                  <span>Opens securely in new tab &middot; Insured Dispatch</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Preparing state when order is paid but not yet shipped */
          <div className="bg-sand/30 rounded-2xl p-5 border border-border-light space-y-3">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-mocha/10 text-mocha flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles size={20} />
              </div>
              <div className="space-y-1">
                <h3 className="font-display text-base font-bold text-charcoal">
                  Celebration Items in Preparation
                </h3>
                <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
                  Your order has been verified and allocated to our curation and packing studio. Once quality checks and customized elements are finalized, your package will be handed over to our express courier partner.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-border-light/70 flex items-center gap-2 text-xs text-mocha font-medium">
              <Clock size={14} className="shrink-0" />
              <span>Real-time courier tracking link will be sent to your WhatsApp & Email once dispatched.</span>
            </div>
          </div>
        )}

        {/* Footer Support & Guarantee */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border-light text-xs text-text-muted">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-mocha shrink-0" />
            <span>All shipments are tamper-sealed and insured against transit damages.</span>
          </div>

          <a
            href={conciergeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-mocha hover:text-mocha-dark font-semibold transition-colors shrink-0"
          >
            <MessageCircle size={14} />
            <span>Need delivery assistance? WhatsApp Concierge</span>
          </a>
        </div>
      </div>
    </section>
  );
}
