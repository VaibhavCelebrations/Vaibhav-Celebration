import { describe, expect, it } from "vitest";
import { mapMetaWebhookStatus, mergeStatus } from "./status";

describe("mergeStatus", () => {
  it("adopts the incoming status when there is no current status", () => {
    expect(mergeStatus(null, "SENT")).toBe("SENT");
    expect(mergeStatus(undefined, "PENDING")).toBe("PENDING");
  });

  it("advances PENDING -> SENT -> DELIVERED -> READ in order", () => {
    expect(mergeStatus("PENDING", "SENT")).toBe("SENT");
    expect(mergeStatus("SENT", "DELIVERED")).toBe("DELIVERED");
    expect(mergeStatus("DELIVERED", "READ")).toBe("READ");
  });

  it("never regresses READ back to a lower status from a late webhook", () => {
    expect(mergeStatus("READ", "SENT")).toBe("READ");
    expect(mergeStatus("READ", "DELIVERED")).toBe("READ");
  });

  it("never regresses DELIVERED back to SENT", () => {
    expect(mergeStatus("DELIVERED", "SENT")).toBe("DELIVERED");
  });

  it("treats an equal status as a no-op (idempotent duplicate webhook delivery)", () => {
    expect(mergeStatus("DELIVERED", "DELIVERED")).toBe("DELIVERED");
  });

  it("allows FAILED to be recorded from PENDING", () => {
    expect(mergeStatus("PENDING", "FAILED")).toBe("FAILED");
  });

  it("does not let a stray FAILED regress an already-DELIVERED message", () => {
    expect(mergeStatus("DELIVERED", "FAILED")).toBe("DELIVERED");
  });

  it("treats an unknown/legacy stored status string as rank -1 (incoming always wins)", () => {
    expect(mergeStatus("SOME_LEGACY_VALUE", "SENT")).toBe("SENT");
  });

  it("ranks SIMULATED_SENT the same as SENT so mock sends still progress to DELIVERED/READ", () => {
    expect(mergeStatus("SIMULATED_SENT", "DELIVERED")).toBe("DELIVERED");
    expect(mergeStatus("DELIVERED", "SIMULATED_SENT")).toBe("DELIVERED");
  });
});

describe("mapMetaWebhookStatus", () => {
  it("maps known Meta status strings", () => {
    expect(mapMetaWebhookStatus("sent")).toBe("SENT");
    expect(mapMetaWebhookStatus("delivered")).toBe("DELIVERED");
    expect(mapMetaWebhookStatus("read")).toBe("READ");
    expect(mapMetaWebhookStatus("failed")).toBe("FAILED");
  });

  it("defaults an unknown status string to SENT (safe, non-regressing)", () => {
    expect(mapMetaWebhookStatus("some_future_event")).toBe("SENT");
  });
});
