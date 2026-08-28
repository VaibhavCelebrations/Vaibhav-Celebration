"use client";

import { whatsappHref } from "@/lib/cms/map-media";

type WhatsAppFABProps = {
  phone?: string;
};

export function WhatsAppFAB({ phone }: WhatsAppFABProps) {
  const envPhone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.trim();
  const prefillMessage = process.env.NEXT_PUBLIC_WHATSAPP_PREFILL_MESSAGE?.trim() || undefined;
  const href = whatsappHref(phone || envPhone || "", prefillMessage);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#25D366] text-white shadow-lg hover:shadow-xl hover:scale-110 flex items-center justify-center transition-all duration-300"
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.33 4.95L2 22l5.29-1.39a9.9 9.9 0 0 0 4.75 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm5.8 14.03c-.24.68-1.4 1.3-1.93 1.36-.5.06-1.02.27-3.42-.71-2.89-1.19-4.75-4.12-4.9-4.31-.14-.19-1.17-1.56-1.17-2.98 0-1.42.75-2.11 1.02-2.4.27-.29.58-.36.78-.36h.56c.18 0 .42-.03.65.5.24.55.81 1.9.88 2.04.07.14.11.31.02.5-.09.19-.14.31-.28.48-.14.17-.29.37-.42.5-.14.14-.28.29-.12.57.16.28.71 1.17 1.53 1.89 1.05.94 1.94 1.23 2.22 1.37.28.14.44.12.6-.07.16-.19.68-.79.87-1.06.18-.28.36-.23.61-.14.24.09 1.55.73 1.82.86.27.14.45.2.51.32.07.11.07.65-.17 1.33Z"/>
      </svg>
    </a>
  );
}
