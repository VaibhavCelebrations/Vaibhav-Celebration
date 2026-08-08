/* ===================================================================
   Loads the Razorpay Checkout.js SDK once and caches the promise.
   The actual order + amount are created/confirmed entirely server-side
   (see shop-api.createShopOrder) — this only opens the payment widget.
   =================================================================== */

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  handler: (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => void;
  modal?: { ondismiss?: () => void };
}

let loadPromise: Promise<boolean> | null = null;

export function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
  return loadPromise;
}

export function openRazorpayCheckout(options: RazorpayOptions): boolean {
  if (typeof window === "undefined" || !window.Razorpay) return false;
  const instance = new window.Razorpay(options);
  instance.open();
  return true;
}
