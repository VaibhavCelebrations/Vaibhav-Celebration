import { describe, expect, it } from "vitest";
import { isValidPageKey, defaultPageSections } from "./pages.service";
import { getPublicSettings } from "../settings/public-settings.service";

describe("pages.service", () => {
  it("validates page keys", () => {
    expect(isValidPageKey("home")).toBe(true);
    expect(isValidPageKey("about")).toBe(true);
    expect(isValidPageKey("contact")).toBe(true);
    expect(isValidPageKey("invalid")).toBe(false);
  });

  it("provides default sections for all static pages", () => {
    const home = defaultPageSections.home as { hero?: unknown };
    const about = defaultPageSections.about as { values?: unknown };
    const contact = defaultPageSections.contact as { formLabels?: unknown };
    expect(home.hero).toBeDefined();
    expect(about.values).toBeDefined();
    expect(contact.formLabels).toBeDefined();
  });
});

describe("public-settings.service", () => {
  it("exports getPublicSettings function", () => {
    expect(typeof getPublicSettings).toBe("function");
  });
});
