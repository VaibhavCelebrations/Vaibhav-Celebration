export type StatusTone = "success" | "warning" | "error" | "info" | "neutral";
export type StatusMeta = { label: string; tone: StatusTone };

function build<K extends string>(map: Record<K, StatusMeta>) {
  return (key: K): StatusMeta => map[key];
}

export const bookingStatus = build({
  SCHEDULED: { label: "Scheduled", tone: "info" },
  CONFIRMED: { label: "Confirmed", tone: "success" },
  IN_PROGRESS: { label: "In Progress", tone: "warning" },
  COMPLETED: { label: "Completed", tone: "neutral" },
  CANCELLED: { label: "Cancelled", tone: "error" },
});

export const paymentStatus = build({
  NOT_REQUIRED: { label: "Not Required", tone: "neutral" },
  PENDING: { label: "Pending", tone: "warning" },
  PAID: { label: "Paid", tone: "success" },
  FAILED: { label: "Failed", tone: "error" },
  REFUNDED: { label: "Refunded", tone: "info" },
  PARTIALLY_REFUNDED: { label: "Partially Refunded", tone: "info" },
});

export const consultationStatus = build({
  PENDING: { label: "Pending", tone: "warning" },
  REVIEWED: { label: "Reviewed", tone: "info" },
  SCHEDULED: { label: "Scheduled", tone: "info" },
  COMPLETED: { label: "Completed", tone: "success" },
  DECLINED: { label: "Declined", tone: "error" },
});

export const leadStatus = build({
  NEW: { label: "New", tone: "info" },
  CONTACTED: { label: "Contacted", tone: "warning" },
  QUALIFIED: { label: "Qualified", tone: "warning" },
  CONVERTED: { label: "Converted", tone: "success" },
  CLOSED_LOST: { label: "Closed-Lost", tone: "error" },
});

export const blogStatus = build({
  DRAFT: { label: "Draft", tone: "neutral" },
  PUBLISHED: { label: "Published", tone: "success" },
  UNPUBLISHED: { label: "Unpublished", tone: "warning" },
});

export const stockStatus = build({
  IN_STOCK: { label: "In Stock", tone: "success" },
  LOW_STOCK: { label: "Low Stock", tone: "warning" },
  OUT_OF_STOCK: { label: "Out of Stock", tone: "error" },
});

export const integrationStatus = build({
  LIVE: { label: "Live", tone: "success" },
  TEST_MODE: { label: "Test Mode", tone: "warning" },
  PENDING: { label: "Pending", tone: "warning" },
  NOT_CONFIGURED: { label: "Not Configured", tone: "neutral" },
  FAILING: { label: "Failing", tone: "error" },
});
