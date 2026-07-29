import { apiFetch } from "@/lib/api-client";
import type { ContactFormPayload } from "./types";

export async function submitContactForm(payload: ContactFormPayload) {
  return apiFetch<{ id: string }>("/leads/contact-form", {
    method: "POST",
    body: payload,
    cache: "no-store",
  });
}

export async function submitConsultation(payload: {
  name: string;
  email: string;
  phone: string;
  eventDate: string;
  childOrEventDetails?: string;
  customRequirements?: string;
}) {
  return apiFetch("/consultations", {
    method: "POST",
    body: payload,
    cache: "no-store",
  });
}
