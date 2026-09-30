import { ConsentPurpose } from "@prisma/client";
import type { Request } from "express";
import { prisma } from "../../db/prisma";
import { logger } from "../../lib/logger";
import { currentPolicyVersions } from "../content/legal.service";

export type ConsentSource = "checkout" | "contact-form" | "enquiry-form" | "account";

type ConsentContact = { email?: string | null; phone?: string | null; userId?: string | null };

const cleanEmail = (email?: string | null) => email?.trim().toLowerCase() || null;
const cleanPhone = (phone?: string | null) => phone?.trim() || null;

/** Who made the choice and from where — kept as evidence alongside the choice itself. */
function requestEvidence(req?: Request) {
  if (!req) return { ipAddress: null, userAgent: null };
  return {
    ipAddress: req.ip ?? null,
    userAgent: (req.get("user-agent") ?? "").slice(0, 300) || null,
  };
}

/** Adds one row to the consent log. Rows are never edited: a later row replaces an earlier choice. */
export async function recordMarketingConsent(
  input: ConsentContact & { granted: boolean; source: ConsentSource; orderId?: string | null },
  req?: Request,
) {
  const email = cleanEmail(input.email);
  const phone = cleanPhone(input.phone);
  if (!email && !phone && !input.userId) return null;
  return prisma.consentRecord.create({
    data: {
      purpose: ConsentPurpose.MARKETING,
      granted: input.granted,
      email,
      phone,
      userId: input.userId ?? null,
      source: input.source,
      orderId: input.orderId ?? null,
      ...requestEvidence(req),
    },
  });
}

/** A signed-in customer's current marketing choice: the newest row for their account or email. */
export async function getMarketingConsentForUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  const latest = await prisma.consentRecord.findFirst({
    where: {
      purpose: ConsentPurpose.MARKETING,
      OR: [{ userId }, ...(user?.email ? [{ email: user.email.toLowerCase() }] : [])],
    },
    orderBy: { createdAt: "desc" },
  });
  return { granted: latest?.granted ?? false, updatedAt: latest?.createdAt ?? null };
}

export async function setMarketingConsentForUser(userId: string, granted: boolean, req?: Request) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, phone: true } });
  await recordMarketingConsent({ granted, userId, email: user?.email, phone: user?.phone, source: "account" }, req);
  return getMarketingConsentForUser(userId);
}

/**
 * Called right after an order is created at checkout: stamps when the policies were accepted and
 * which version of each was in force, and logs the optional marketing opt-in.
 * The order already exists and may already be at the payment gateway, so a failure here is logged
 * and never fails the checkout.
 */
export async function recordCheckoutConsents(
  orderId: string,
  input: ConsentContact & { policiesAccepted?: boolean; marketingConsent?: boolean },
  req?: Request,
) {
  try {
    if (input.policiesAccepted) {
      const order = await prisma.order.findUnique({ where: { id: orderId }, select: { policiesAcceptedAt: true } });
      // A retried checkout reuses the pending order; the first acceptance stands.
      if (order && !order.policiesAcceptedAt) {
        await prisma.order.update({
          where: { id: orderId },
          data: { policiesAcceptedAt: new Date(), policyVersions: await currentPolicyVersions() },
        });
      }
    }
    // Only an explicit tick is logged here. An unticked optional box is not a withdrawal.
    if (input.marketingConsent) {
      await recordMarketingConsent({ ...input, granted: true, source: "checkout", orderId }, req);
    }
  } catch (err) {
    logger.error({ err, orderId }, "Failed to record checkout consents");
  }
}
