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

export async function updateProfile(input: { name?: string; phone?: string }): Promise<User> {
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
