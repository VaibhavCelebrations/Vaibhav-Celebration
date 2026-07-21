import {
  AdminApiError,
  fetchMe as realFetchMe,
  loginAdmin as realLoginAdmin,
  logoutAdmin as realLogoutAdmin,
  type AdminUser,
} from "@/lib/admin-api-client";
import { delay } from "@/lib/mock/latency";
import { USE_MOCK_DATA } from "./config";

/**
 * dashboard/layout.tsx → AdminSessionProvider → getSession() gates every
 * screen behind auth. Without this mock branch, nothing in the admin panel
 * is viewable without a running, seeded backend on :4000.
 */
const MOCK_ADMIN: AdminUser = {
  id: "admin_mock_super",
  name: "Super Admin",
  email: "admin@vaibhavcelebrations.in",
  role: "SUPER_ADMIN",
};

let mockSignedIn = true; // starts signed in so the shell is viewable with zero setup

async function mockGetSession(): Promise<AdminUser> {
  await delay();
  if (!mockSignedIn) throw new AdminApiError("UNAUTHENTICATED", "Not signed in", 401);
  return MOCK_ADMIN;
}

async function mockLogin(email: string): Promise<{ accessToken: string; admin: AdminUser }> {
  await delay();
  mockSignedIn = true;
  return { accessToken: "mock-token", admin: { ...MOCK_ADMIN, email: email || MOCK_ADMIN.email } };
}

async function mockLogout(): Promise<void> {
  await delay();
  mockSignedIn = false;
}

export const getSession: () => Promise<AdminUser> = USE_MOCK_DATA ? mockGetSession : realFetchMe;
export const login: (email: string, password: string) => Promise<{ accessToken: string; admin: AdminUser }> = USE_MOCK_DATA
  ? (email: string) => mockLogin(email)
  : realLoginAdmin;
export const logout: () => Promise<void> = USE_MOCK_DATA ? mockLogout : realLogoutAdmin;

export type { AdminUser };
