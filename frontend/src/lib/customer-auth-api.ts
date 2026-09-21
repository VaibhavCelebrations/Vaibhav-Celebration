/* ===================================================================
   Customer Auth API — thin client for /customer/auth/*.
   Access + session tokens are httpOnly cookies set by the backend;
   this module never reads or writes them directly.
   =================================================================== */

import { apiFetch, ApiClientError } from "./api-client";
import type { User } from "./ecom-types";

const BASE = "/customer/auth";

export { ApiClientError };

export async function signup(input: { name: string; email: string; phone?: string; password: string }): Promise<User> {
  const res = await apiFetch<{ user: User }>(`${BASE}/signup`, { method: "POST", body: input });
  return res.user;
}

export async function login(input: { email: string; password: string; rememberMe?: boolean }): Promise<User> {
  const res = await apiFetch<{ user: User }>(`${BASE}/login`, { method: "POST", body: input });
  return res.user;
}

export async function fetchCurrentUser(): Promise<User> {
  return apiFetch<User>(`${BASE}/me`);
}

export async function logout(): Promise<void> {
  await apiFetch(`${BASE}/logout`, { method: "POST" });
}

export async function logoutAll(): Promise<void> {
  await apiFetch(`${BASE}/logout-all`, { method: "POST" });
}

export async function updateProfile(input: { name?: string; phone?: string; defaultAddress?: import("./shop-types").ShippingAddress | null }): Promise<User> {
  return apiFetch<User>(`${BASE}/me`, { method: "PATCH", body: input });
}

export async function changePassword(input: { currentPassword: string; newPassword: string }): Promise<void> {
  await apiFetch(`${BASE}/password/change`, { method: "POST", body: input });
}

export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`${BASE}/password/forgot`, { method: "POST", body: { email } });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await apiFetch(`${BASE}/password/reset`, { method: "POST", body: { token, newPassword } });
}

export async function verifyEmail(token: string): Promise<void> {
  await apiFetch(`${BASE}/email/verify`, { method: "POST", body: { token } });
}

export type OtpRequestResponse = {
  success: boolean;
  message: string;
  devOtp?: string;
};

export type OtpVerifyResponse = {
  success: boolean;
  message: string;
  user: User;
};

/** Request WhatsApp OTP code for customer phone verification. */
export async function requestPhoneOtp(phone: string): Promise<OtpRequestResponse> {
  return apiFetch<OtpRequestResponse>(`${BASE}/phone/otp/request`, { method: "POST", body: { phone } });
}

/** Verify WhatsApp 6-digit OTP code for customer phone number. */
export async function verifyPhoneOtp(phone: string, otp: string): Promise<OtpVerifyResponse> {
  return apiFetch<OtpVerifyResponse>(`${BASE}/phone/otp/verify`, { method: "POST", body: { phone, otp } });
}

/** Request email OTP code for unverified customer email. */
export async function requestEmailOtp(): Promise<OtpRequestResponse> {
  return apiFetch<OtpRequestResponse>(`${BASE}/email/otp/request`, { method: "POST" });
}

/** Verify email 6-digit OTP code for customer email. */
export async function verifyEmailOtp(otp: string): Promise<OtpVerifyResponse> {
  return apiFetch<OtpVerifyResponse>(`${BASE}/email/otp/verify`, { method: "POST", body: { otp } });
}

/** Request email change OTP code sent to the new email address. */
export async function requestEmailChangeOtp(newEmail: string): Promise<OtpRequestResponse> {
  return apiFetch<OtpRequestResponse>(`${BASE}/email/change/request`, { method: "POST", body: { newEmail } });
}

/** Verify email change 6-digit OTP code and update user email. */
export async function verifyEmailChangeOtp(newEmail: string, otp: string): Promise<OtpVerifyResponse> {
  return apiFetch<OtpVerifyResponse>(`${BASE}/email/change/verify`, { method: "POST", body: { newEmail, otp } });
}

/** Guest checkout — send OTP to a new email (fails with EMAIL_EXISTS if account already exists). */
export async function requestGuestCheckoutOtp(email: string): Promise<{
  sent: boolean;
  expiresInMinutes: number;
  devOtp?: string;
}> {
  return apiFetch(`${BASE}/guest-checkout/request-otp`, { method: "POST", body: { email } });
}

/** Guest checkout — verify OTP, create account, set session cookies, return user. */
export async function verifyGuestCheckoutOtp(input: {
  email: string;
  otp: string;
  name: string;
  phone: string;
  defaultAddress?: {
    fullName: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
}): Promise<User> {
  const res = await apiFetch<{ user: User }>(`${BASE}/guest-checkout/verify-otp`, {
    method: "POST",
    body: input,
  });
  return res.user;
}

/** Extracts a friendly message from a zod VALIDATION_ERROR, falling back to the top-level message. */
export function friendlyAuthError(err: unknown): string {
  if (err instanceof ApiClientError) {
    if (err.code === "VALIDATION_ERROR" && err.details && typeof err.details === "object") {
      const details = err.details as { fieldErrors?: Record<string, string[]> };
      const firstField = details.fieldErrors && Object.values(details.fieldErrors).find((v) => v?.length);
      if (firstField?.[0]) return firstField[0];
    }
    return err.message;
  }
  return "Something went wrong. Please try again.";
}
