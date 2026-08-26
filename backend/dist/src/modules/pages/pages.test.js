"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const pages_service_1 = require("./pages.service");
const public_settings_service_1 = require("../settings/public-settings.service");
(0, vitest_1.describe)("pages.service", () => {
    (0, vitest_1.it)("validates page keys", () => {
        (0, vitest_1.expect)((0, pages_service_1.isValidPageKey)("home")).toBe(true);
        (0, vitest_1.expect)((0, pages_service_1.isValidPageKey)("about")).toBe(true);
        (0, vitest_1.expect)((0, pages_service_1.isValidPageKey)("contact")).toBe(true);
        (0, vitest_1.expect)((0, pages_service_1.isValidPageKey)("invalid")).toBe(false);
    });
    (0, vitest_1.it)("provides default sections for all static pages", () => {
        const home = pages_service_1.defaultPageSections.home;
        const about = pages_service_1.defaultPageSections.about;
        const contact = pages_service_1.defaultPageSections.contact;
        (0, vitest_1.expect)(home.hero).toBeDefined();
        (0, vitest_1.expect)(home.hero?.headline).toBe("One Theme. Every Detail. Beautifully Celebrated");
        (0, vitest_1.expect)(home.hero?.headlineAccent).toBe("Beautifully Celebrated");
        (0, vitest_1.expect)(about.values).toBeDefined();
        (0, vitest_1.expect)(contact.formLabels).toBeDefined();
    });
});
(0, vitest_1.describe)("public-settings.service", () => {
    (0, vitest_1.it)("exports getPublicSettings function", () => {
        (0, vitest_1.expect)(typeof public_settings_service_1.getPublicSettings).toBe("function");
    });
});
//# sourceMappingURL=pages.test.js.map