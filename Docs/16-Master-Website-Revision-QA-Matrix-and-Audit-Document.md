# 16 — Master Website Revision QA Matrix & Acceptance Audit Document

**Project:** Vaibhav Celebrations — Website Redevelopment, Booking Platform, E-Commerce & Gift Registry  
**Document Title:** Master Website Revision Brief — Comprehensive QA Verification Matrix & Acceptance Audit  
**Author / Requested By:** Charu Saxena, Founder — Vaibhav Celebrations  
**Prepared For:** Affor Technologies Development Team (Shubham Deshmukh · Vishal · Chaitanya)  
**Request Date:** 25 August 2026  
**Target URL:** `https://vaibhav-celebration-seven.vercel.app/`  
**Overall Priority:** Critical and High items must be verified and completed prior to Phase 1 Go-Live approval.  
**Governing Rule:** *"Make sure everything is checked properly. If anything is missing or unverified, assume it is REJECTED."*

---

## Executive Summary & Strict Acceptance Policy

This document translates the complete **Master Website Revision Brief (25/08/2026)** into an exhaustive, audit-grade verification matrix. It covers every user journey, business calculation, UI/UX specification, admin capability, and production cleanup rule across all 23 sections of the brief.

### Zero-Tolerance Rejection Principle
1. **Binary Pass/Fail:** Every requirement must either pass with verifiable evidence or be marked **REJECTED**.
2. **No Silent Scope Alteration:** Any item tagged **Critical** or **High** cannot be postponed without explicit, written founder sign-off.
3. **Traceability:** Every test case maps to a specific Change Request ID (`CR-01` to `CR-26`).
4. **End-to-End Integrity:** Features tested in isolation do not constitute approval. Only complete customer flows (selection → preview → customization → review → payment/quote → invoice/admin order) qualify for sign-off.

---

## Implementation Status Reconciliation — 16 September 2026

This ledger records the development team's reported position against each Change Request. **Reported status is not the same as audit acceptance.** Every item remains subject to the verification checks in this document; an item is accepted for Phase 1 only when reproducible evidence is attached and the corresponding audit checks are marked Pass.

| CR | Reported status | Reconciled scope decision / evidence required | Audit disposition |
|---|---|---|---|
| `CR-01` | In progress | Responsive layout work is still being completed across the required viewports. | **OPEN — Critical** |
| `CR-02` | Done | Header/footer/logo/favicon and link architecture are reported complete. | **Verification pending — High** |
| `CR-03` | Done | Global typography, spacing, cards, and button consistency are reported complete. | **Verification pending — High** |
| `CR-04` | Done | Homepage themes, package cards, bestseller teaser, and back-to-top behavior are reported complete. | **Verification pending — High** |
| `CR-05` | Done | Primary navigation, dropdowns, mobile drawer, and information architecture are reported complete. | **Verification pending — Critical** |
| `CR-06` | Done | Celebration listing, theme detail pages, active/draft visibility, and milestone route are reported complete. | **Verification pending — High** |
| `CR-07` | Done | Essential, Signature, and Grand naming, pricing disclaimer, and comparison copy are reported complete. | **Verification pending — Critical** |
| `CR-08` | Done | Fixed-package flow persistence and removal of the repeated package-selection step are reported complete. | **Verification pending — Critical** |
| `CR-09` | Dependency / scope clarification | Digital-product preview assets must be supplied or approved. Static placeholder previews may be used only with written approval; previews will not be CMS/admin-managed in the current scope. | **OPEN — Critical** |
| `CR-10` | Done | Gift Registry explanation, discovery, sample wishlist, and inclusion clarity are reported complete. | **Verification pending — Critical** |
| `CR-11` | Dependency / scope clarification | Décor options for all three packages, with 3–6 images per option, must be supplied or approved. The current decision is a static implementation; décor will not be CMS/admin-managed in this scope. | **OPEN — Critical** |
| `CR-12` | Done | Build Your Own is reported decoupled from package tiers and organized by Before/During/After. | **Verification pending — Critical** |
| `CR-13` | Rejected | The requirement is rejected due to insufficient implementation clarity. No assumptions may be made about item cards, add-on conflicts, upgrade pricing, or personalization inputs until clarified and re-approved. | **REJECTED — Critical** |
| `CR-14` | Done | Conditional details, budget guidance, itemized review, and fixed-price versus quote routing are reported complete. | **Verification pending — Critical** |
| `CR-15` | Done | Celebration Shop taxonomy, filters, product routes, product detail data, and standalone purchase flow are reported complete. | **Verification pending — Critical** |
| `CR-16` | Done | Seasonal collections, product assignment, lifecycle controls, and admin management are reported complete. | **Verification pending — Critical** |
| `CR-17` | Done | Wedding popup content is reported removed and the campaign popup is manageable from Admin. | **Verification pending — High** |
| `CR-18` | Done | Events content, typography, fabricated-event cleanup, and coming-soon behavior are reported complete. | **Verification pending — High** |
| `CR-19` | Done | Gallery filters, milestone content, responsive grid, and commercial CTAs are reported complete. | **Verification pending — High** |
| `CR-20` | Done | VC Journal content is reported surfaced through a section at the bottom of the homepage. The audit must also verify the required footer/content-navigation placement and editorial cleanup. | **Verification pending — High** |
| `CR-21` | Done | About Us authenticity, Jaipur positioning, business-model copy, and four values are reported complete. | **Verification pending — Critical** |
| `CR-22` | Done | Testimonials are reported complete. Production evidence must still confirm consent and draft/testimonial isolation. | **Verification pending — Critical** |
| `CR-23` | Done | Universal consultation fields, conditional logic, confirmation feedback, and admin/notification routing are reported complete. | **Verification pending — Critical** |
| `CR-24` | Rejected / changed scope | Guest purchase has been replaced with login-based purchase because Gift Registry access and security require an authenticated customer. This material architecture change requires written approval and budget confirmation. Social login remains out of scope unless separately approved. | **REJECTED as originally specified — Critical** |
| `CR-25` | Done | Razorpay payment states, retry behavior, invoice generation, notifications, and admin order visibility are reported complete. | **Verification pending — Critical** |
| `CR-26` | Done with client-data dependency | Current application content is seed data. Final production content, contact details, assets, testimonials, policies, and business data must be supplied by Charu before production acceptance. | **Verification pending — Critical** |

### Status Rules and Required Follow-Up

1. **Done** means reported complete by the development team; it does not override the Pass/Reject checks below.
2. **CR-01, CR-09, CR-11, CR-13, CR-24, and CR-26 are not launch-clear** based on the status information above.
3. CR-09 and CR-11 require an asset/content handoff and written approval of the static, non-CMS implementation.
4. CR-13 requires a clarification decision and updated acceptance examples before implementation can be approved.
5. CR-24 requires written founder approval for login-based purchase, confirmation of the additional budget, and an updated checkout/security decision. Social login remains a separate scope item.
6. CR-26 requires a final client content handoff followed by a production-content sweep; seed data is not production acceptance evidence.
7. Phase 1 remains **NO-GO** until every Critical item is either verified Pass or explicitly re-scoped through written approval.

## Document Index & Verification Roadmap

| Section | Domain / Journey Area | Associated CRs | Total Verifiable Items | Risk Tier |
|---|---|---|---|---|
| **Section 01** | Document Governance, Rules & Priority Definitions | Governance | 8 checks | High |
| **Section 02** | Master Architecture & 4 Customer Journeys | Master IA | 14 checks | Critical |
| **Section 03** | Global Responsiveness, Brand & Page Components | `CR-01`, `CR-02`, `CR-03` | 24 checks | Critical |
| **Section 04** | Homepage Architecture & Interactions | `CR-04`, Hero Gate | 18 checks | High |
| **Section 05** | Navigation, Celebrations & Theme Pages | `CR-05`, `CR-06` | 22 checks | Critical |
| **Section 06** | Packages Page & Comparison Matrix | `CR-07` | 16 checks | Critical |
| **Section 07** | Fixed Package Customer Journey Flow | `CR-08` | 18 checks | Critical |
| **Section 08** | Fixed Package Customization Screen | `CR-09` | 20 checks | Critical |
| **Section 09** | Gift Registry & Jaipur Décor Logic | `CR-10`, `CR-11` | 22 checks | Critical |
| **Section 10** | Build Your Own — Journey Architecture | `CR-12` | 18 checks | Critical |
| **Section 11** | Build Your Own — Items, Quantities & Add-ons | `CR-13` | 26 checks | Critical |
| **Section 12** | Build Your Own — Form, Budget & Review Logic | `CR-14` | 20 checks | Critical |
| **Section 13** | The Celebration Shop & Product Catalog | `CR-15` | 24 checks | Critical |
| **Section 14** | Festive Collections & Campaign Popups | `CR-16`, `CR-17` | 18 checks | Critical |
| **Section 15** | Events, Gallery & VC Journal | `CR-18`, `CR-19`, `CR-20` | 20 checks | High |
| **Section 16** | About Us, Testimonials & Universal Consultation | `CR-21`, `CR-22`, `CR-23` | 24 checks | Critical |
| **Section 17** | Checkout, Payment Gateway & Manual Fulfillment | `CR-24`, `CR-25` | 28 checks | Critical |
| **Section 18** | CMS & Admin Controls Matrix | Admin Engine | 32 checks | Critical |
| **Section 19** | Content Accuracy & Global Production Cleanup | `CR-26` | 26 checks | Critical |
| **Section 20** | 25 August 2026 Meeting Decisions Audit | Meeting Log | 12 checks | Critical |
| **Section 21** | Screenshot & Visual Reference Cross-Walk | Visual Audit | 10 checks | High |
| **Section 22** | Final Phase 1 Go/No-Go Acceptance Checklist | Master Gate | 15 gates | Critical |
| **Section 23** | Development Team Commitment & Sign-Off Matrix | Delivery Governance | 8 criteria | High |

---

## SECTION 01: Governance, Change-Request Rules & Priorities

### 1.1 Priority Classification Matrix

| Priority Tag | Operational Definition | Compulsory Action | Rejection Consequence |
|---|---|---|---|
| **Critical** | Blocks a commercial customer journey, payment gateway, brand credibility, core pricing logic, or launch readiness. | Must be 100% completed and demonstrated before Phase 1 Go-Live approval. | **Automatic Launch Blocker:** Whole release is rejected if any Critical item fails. |
| **High** | Essential for conversion, visual clarity, content accuracy, CMS autonomy, or cross-device usability. | Must be completed in the current revision round prior to client demo. | **Demo Blocker:** Client sign-off withheld until remediated. |
| **Later / Separate Scope** | High-value enhancement that does not block the MVP launch (e.g., automated courier APIs, social SSO). | Must be formally scoped, estimated in days/cost, and scheduled for Phase 2/3. | If conflated with Phase 1 deliverables, scope creep is rejected. |

### 1.2 Change-Request Audit Standard (6-Point Rule)
Every CR item in this document is evaluated against the 6-point evaluation standard:
1. **Where?** — Exact page, route, modal, or component.
2. **What exists now?** — Current defect, regression, or UI limitation.
3. **What must change?** — Exact functional and architectural delta required.
4. **What should it look like?** — Precise UI layout, typography, and copy strings.
5. **What rules apply?** — Business logic, calculation formulas, constraints, and conditions.
6. **How will we confirm completion?** — Testable, reproducible acceptance checks.

---

## SECTION 02: Master Architecture & Customer Journeys

The platform consists of four distinct, non-mixing entry routes. Three are independent commercial transaction flows; the fourth is an assisted lead funnel.

```
[ Master Entry Routes ]
   ├── 1. Fixed Packages (Curated Tiers: Essential, Signature, Grand)
  │      └── Journey: Package Selection -> Theme -> Details -> Customize (Limits Applied) -> Décor (Jaipur Only) -> Review -> Authenticated Checkout
   ├── 2. Build Your Own (Unbundled Freedom)
   │      └── Journey: Details -> Theme -> Build (Items: Before/During/After) -> Add-ons -> Personalize -> Review -> Checkout / Final Quote
   ├── 3. The Celebration Shop (Direct E-Commerce)
   │      └── Journey: Shop All / Category / Theme -> Filter -> Product Detail -> Cart -> Direct Checkout (No Package Required)
   └── 4. Complimentary Consultation (Assisted Planning)
          └── Journey: Universal Planning Form -> Conditional Celebration Fields -> Admin Lead / WhatsApp Follow-up
```

### 2.1 Cross-Journey Isolation & Non-Contamination Matrix

| Check ID | Commercial Journey | Strict Rule / Permitted Behavior | Strictly Prohibited Behavior (Auto-Reject) | Verification Check |
|---|---|---|---|---|
| `JR-01` | **Fixed Packages** | Enforces package-specific selection quotas (e.g., "Choose 1 Welcome Item", "Choose 2 Activities", "Choose 1 Return Gift"). | Must NEVER allow unconstrained item addition that violates tier quotas without upgrade fees. | Verify that choosing Signature enforces exact item counts and prevents over-selection. |
| `JR-02` | **Build Your Own** | Must provide 100% item-level freedom. Customers may select 0, 1, or 10+ activities, items, and gifts. | Must NEVER prompt for a package tier (Essential/Signature/Grand) or apply tier quotas. | Verify no tier badges, no tier filters, and no "Choose X" limits appear in custom builder. |
| `JR-03` | **Celebration Shop** | Independent retail purchase journey for standalone gifts, hampers, packaging, and games. | Must NEVER force the user to pick a celebration package, event date, or venue to buy a product. | Add single product (e.g. Space Lunchbox) to cart and verify direct checkout works end-to-end. |
| `JR-04` | **Consultation** | Free 30-minute assisted advisory route for custom milestones, undecided parents, or complex events. | Must NEVER block the user with mandatory child birthday fields when booking for an adult milestone or shower. | Verify form adapts conditionally and does not require product/package selection. |

---

## SECTION 03: Global Responsiveness, Brand & Page Components

### `CR-01` — Responsive Layout & Cross-Device Quality Assurance
* **Priority:** Critical  
* **Target Pages:** All public pages, Builders, Cart, Checkout, Policy pages, and Admin.  
* **Current Defect:** Huge empty gaps on iPad/tablets; sticky action bars overlay footer/links; card headings clip; horizontal scroll on mobile.

#### Responsive Viewport Test Matrix

| Check ID | Viewport Category | Screen Width(s) | Specific Acceptance Criteria | Rejection Condition |
|---|---|---|---|---|
| `CR01-M1` | Mobile Small | **360 px** | No horizontal scrolling; single-column cards; all buttons full-width; sticky bars fit within viewport. | Any horizontal overflow (>0px) or clipped text. |
| `CR01-M2` | Mobile Standard | **375 px & 390 px** | Header hamburger menu operates smoothly; font scales remain balanced; no line wrapping breaks layout. | Tap targets < 44x44px; hamburger menu fails to open/close. |
| `CR01-M3` | Mobile Large | **430 px** (iPhone Pro Max) | Hero text wraps cleanly; image aspect ratios preserved without distortion; bottom nav bar cleared. | Unexplained vertical blank gaps > 40px. |
| `CR01-T1` | Tablet Portrait | **768 px** (iPad Mini/Air) | Section min-heights adapt to content; 2-column card layouts where appropriate; no giant white spaces. | Blank gap between sections > 80px. |
| `CR01-T2` | Tablet Standard | **820 px / 834 px** (iPad 10th/11") | Comparison matrix scrolls horizontally or collapses into readable cards; sticky bar stops before footer. | Sticky total bar covers footer links or social icons. |
| `CR01-T3` | Tablet Landscape | **1024 px** (iPad Pro) | Navigation transitions cleanly; multi-column builders maintain equal height cards; no overlapping buttons. | Navigation menu wraps into awkward multi-line layout. |
| `CR01-D1` | Desktop Standard | **1280 px & 1366 px** | Standard container widths (max-w-7xl); balanced whitespace; readable typography hierarchy. | Content touching browser edges without gutter padding. |
| `CR01-D2` | Desktop Large | **1440 px & 1920 px** | Fluid containers maintain aesthetic max-width; hero background images scale gracefully without pixelation. | Sections stretching infinitely with distorted media. |

### `CR-02` — Brand Logo Lock-Up & Reusable Footer Architecture
* **Priority:** High  
* **Target Pages:** Global Header Navigation & Global Footer across every route.  
* **Current Defect:** Header logo too small (tagline illegible); footer logo unreadable; footer background blends into page body; inconsistent footer links.

#### Brand & Footer Verification Matrix

| Check ID | Component | Requirement & Visual Specification | Exact Acceptance Criteria | Pass/Reject |
|---|---|---|---|---|
| `CR02-01` | **Header Logo** | Compact lock-up containing **only** the original VC monogram mark + "Vaibhav Celebrations" typography. | **NO tiny tagline** in header. Clear, crisp rendering on retina displays. Height between 40px–48px. | Must be clearly legible on 360px mobile without blurring. |
| `CR02-02` | **Footer Logo** | Full original brand logo, including complete legible tagline in original brand colors. | Full logo scaled to readable dimension (min width 180px–220px). Never cropped or distorted. | If tagline is illegible or logo is stretched -> **REJECTED**. |
| `CR02-03` | **Favicon** | High-resolution VC monogram icon. | Monogram mark clearly visible on dark/light browser tabs (`favicon.ico`, `apple-touch-icon`). | Default framework/Vercel favicon present -> **REJECTED**. |
| `CR02-04` | **Footer Background** | Visually distinct background color clearly demarcated from page body canvas. | High-contrast luxury container (e.g., warm deep neutral or contrasting brand tone) with visible border-t. | If footer merges seamlessly into body background -> **REJECTED**. |
| `CR02-05` | **Footer Link Architecture** | Exactly 4 structured columns:  <br>1. **Explore:** Celebrations, Packages, Themes, Milestone Celebrations, VC Journal  <br>2. **Shop:** The Celebration Shop, Return Gifts, Activities, Gift Bags, Personalized  <br>3. **Helpful:** How It Works, Gift Registry, FAQs, About Us, Contact & Consultation  <br>4. **Policies:** Privacy Policy, Terms of Service, Shipping & Delivery, Cancellation & Refund | Identical link structure and working URLs on every single route without exception. | Any broken link, missing category, or missing legal link -> **REJECTED**. |

### `CR-03` — Global Typography, Spacing & Component Consistency
* **Priority:** High  
* **Target Pages:** Sitewide design system token consistency.  
* **Current Defect:** Inconsistent heading scales across Events, Gallery, About; cramped price-to-text spacing; oversized hero headings on legacy pages.

#### Design System Token Audit

| Token Category | Approved Standard | Implementation Rule | Audit Check |
|---|---|---|---|
| **Typography Pairing** | Luxury Editorial Serif (H1, H2, H3) + Clean Geometric Sans-Serif (Body, Badges, Buttons, Inputs). | Font family applied globally via CSS variables. No generic Times or Arial fallbacks. | Inspect CSS variables on all pages. |
| **Heading Scale Reference** | Packages Section Desktop Heading Scale is the official sitewide baseline. | Reduce oversized headings on Events and Gallery to match Packages benchmark. | Verify H1/H2 font sizes match design tokens. |
| **Component Spacing** | Uniform vertical section padding (`py-12 md:py-20 lg:py-24`). | Remove arbitrary margins, negative margins, and inline height hacks. | Zero ad-hoc vertical inline gaps. |
| **Card System** | Standardized border radius (`rounded-xl` or `rounded-2xl`), subtle luxury border (`border-stone-200/60`), equal height flex columns. | All cards in a row have identical heights; buttons pinned to bottom. | Cards do not shift height erratically. |
| **Button Hierarchy** | **Primary:** Solid luxury brand tone with smooth hover state.  <br>**Secondary:** Elegant outline button with crisp border.  <br>**Ghost:** Text link with directional arrow icon. | Consistent button padding (`px-6 py-3`), clear focus ring, no clipped text. | Consistent button styling across all routes. |

---

## SECTION 04: Homepage Change Requests

### Approved Hero Lock (No Design Reopening)
* **Approved Direction:** "One Theme. Every Detail. Beautifully Celebrated."
* **Primary CTAs:** "Explore Celebrations" (`/celebrations`) & "Build Your Celebration" (`/custom-plan` or builder entry).
* **Aesthetic Standard:** Warm cream / pastel luxury palette.
* **Governance Rule:** Do NOT alter hero copy, layout, or concept. Only responsive alignment, contrast, and spacing adjustments permitted.

### `CR-04` — Homepage Themes, Package Cards, Bestseller Teaser & Back-to-Top
* **Priority:** High  
* **Target Page:** Homepage (`/`)

#### Homepage Component Verification Table

| Check ID | Feature / Component | Specification & Business Logic | Acceptance Criteria | Pass/Reject |
|---|---|---|---|---|
| `CR04-01` | **Featured Theme Tiles** | Display 4 to 6 active featured themes simultaneously:  <br>1. Space  <br>2. Cocomelon  <br>3. Princess  <br>4. Jungle Safari  <br>5. Dinosaur  <br>+ "Other / Request Custom Theme" card. | All 5 launch themes visible with high-res photography. "Request Custom Theme" links to Consultation. | Only 3 themes displayed or custom theme card missing -> **REJECTED**. |
| `CR04-02` | **CMS Theme Ordering** | Admin toggle to feature/unfeature themes and set drag-and-drop or numerical display order (`display_order`). | Changing theme order in Admin reflects immediately on homepage without code deployment. | Hardcoded homepage themes in frontend -> **REJECTED**. |
| `CR04-03` | **Package Card Layout** | Generous whitespace between base price and descriptive inclusions copy. Equal card heights with aligned bottom CTAs. | Pricing readable at a glance; starting price disclaimer visible; CTA buttons perfectly aligned. | Misaligned buttons or cramped pricing typography -> **REJECTED**. |
| `CR04-04` | **"Need Only Return Gifts?" Teaser** | Curated Bestseller grid pulling real products tagged `is_bestseller = true` or `is_featured = true` in Admin. | Displays 4–8 curated bestseller products directly linking to shop product pages. | Hardcoded dummy products or empty shop teaser -> **REJECTED**. |
| `CR04-05` | **Bestseller Card Data Elements** | Each product card MUST display all 6 elements:  <br>1. High-res product thumbnail  <br>2. Official product title  <br>3. Price basis (e.g. `₹250 / piece`)  <br>4. Minimum Order Quantity (MOQ, e.g. `Min: 10`)  <br>5. Theme badge (e.g. `Space Theme`)  <br>6. Personalization badge (`Personalization Available` or `Standard`). | Every card renders all 6 data fields accurately without overflow. | Any card missing MOQ, price basis, or personalization status -> **REJECTED**. |
| `CR04-06` | **Back to Top Button** | Floating circular icon button near bottom-right of viewport. | Appears only after scrolling down > 400px. Smoothly scrolls to top on click (`scroll-behavior: smooth`). | Button visible at top of page or jumps abruptly -> **REJECTED**. |
| `CR04-07` | **Floating Button Z-Index & Offsets** | Positioned with proper offset so it NEVER collides with or covers:  <br>- Floating WhatsApp support button  <br>- Sticky estimated total / cart bar  <br>- Footer links. | Button sits cleanly stacked above or beside WhatsApp widget (e.g., bottom-24 right-6). Accessible aria-label included. | Button overlaps WhatsApp widget or obscures mobile CTA -> **REJECTED**. |

---

## SECTION 05: Navigation, Celebrations and Theme Pages

### `CR-05` — Primary Navigation & Information Architecture
* **Priority:** Critical  
* **Target Pages:** Global Desktop Navbar, Mobile Navigation Drawer, Tablet Menu.  
* **Current Defect:** Mixed catalog under "Shop Return Gifts"; Playdates misplaced under Celebrations; Milestone Celebrations & VC Journal buried.

```
[ Primary Navigation Architecture ]
├── 1. Home (/)
├── 2. Celebrations (/celebrations)
│      ├── Kids' Birthdays
│      ├── Baby Shower
│      ├── Naming Ceremony
│      ├── Milestone Celebrations
│      └── Custom Celebrations
├── 3. Packages (/packages)
│      ├── Essential
│      ├── Signature (Most Loved)
│      └── Grand
├── 4. Shop (/shop -> "The Celebration Shop")
│      ├── Shop All
│      ├── Return Gifts
│      ├── Activities & Games
│      ├── Welcome Details
│      ├── Gift Bags & Packaging
│      ├── Thank-You Tags
│      ├── Personalized Products
│      ├── Festive & Occasion Gifting
│      └── Shop by Theme
├── 5. Events (/events) [Playdates, Seasonal Workshops, Hosted Experiences]
├── 6. Gallery (/gallery)
├── 7. About Us (/about)
└── 8. Plan My Celebration [CTA Button] (/consultation)
```

#### Navigation Acceptance Checks

| Check ID | Menu Element | Required Routing & Behavior | Failure / Rejection Condition |
|---|---|---|---|
| `CR05-01` | **Desktop Navigation Links** | All 8 top-level items present in exact order with responsive breakpoints. | Any menu item missing, mislabeled, or wrapping into double lines on desktop. |
| `CR05-02` | **Celebrations Dropdown** | 5 sub-routes: Kids' Birthdays, Baby Shower, Naming Ceremony, Milestone Celebrations, Custom Celebrations. | Playdates or retail products listed under Celebrations. |
| `CR05-03` | **Shop Sub-Navigation** | Displays 9 distinct category destinations under "Shop" umbrella. Main shop heading reads **"The Celebration Shop"**. | Menu heading says "Shop Return Gifts" or opens uncategorized mixed page. |
| `CR05-04` | **Events Distinction** | Dedicated route for workshops and playdates. Explicitly separated from family celebration services. | Playdates placed inside Celebrations menu. |
| `CR05-05` | **VC Journal Discovery** | Accessible via Explore/Helpful footer menu and sitewide content navigation. | Journal link completely absent or only accessible via URL entry. |
| `CR05-06` | **Mobile Navigation Drawer** | Smooth slide-over drawer with expandable accordion dropdowns for Celebrations and Shop. Full touch targets (min 48px). | Sub-menus impossible to expand on touch devices; drawer background transparent. |

### `CR-06` — Celebration Listing & Theme-Detail Pages
* **Priority:** High  
* **Target Pages:** `/celebrations`, `/themes`, `/themes/[slug]`, `/celebrations/milestones`

#### Theme & Celebration Listing Verification

| Check ID | Requirement | Technical & Visual Details | Verification Test |
|---|---|---|---|
| `CR06-01` | **Theme Title Truncation** | CSS text truncation rules with multi-line support (`line-clamp-2`). Titles must not clip awkwardly on 360px–768px. | Inspect 20+ character theme names (e.g. "Space Astronaut Adventure") across all test viewports. |
| `CR06-02` | **Core Launch Themes** | Launch catalog must feature: Space, Cocomelon, Princess, Jungle Safari, Dinosaur, plus extensible CMS schema. | Verify all 5 themes exist in database with rich assets, descriptions, and tags. |
| `CR06-03` | **Draft vs. Active Visibility** | Only themes marked `status = 'ACTIVE'` appear on public frontend. Draft themes accessible only in Admin preview. | Set a test theme to Draft; confirm it disappears from `/themes` immediately. |
| `CR06-04` | **Theme Detail Page Structure** | Every theme page must explain:  <br>- Concept & Creative Story  <br>- Recommended Age Group & Audience  <br>- **Before-During-After** element breakdown  <br>- Eligible Package Tiers  <br>- Sample Welcome Items, Activities, and Return Gifts. | Navigate to `/themes/space`. Verify all 5 content sections are present and fully populated. |
| `CR06-05` | **Commercial Action CTAs** | 3 clear conversion buttons on every theme page:  <br>1. **Explore Packages** (pre-selects this theme in package flow)  <br>2. **Build Your Own** (pre-selects this theme in custom plan)  <br>3. **Book a Consultation** (pre-fills theme in form). | Click each CTA; verify intended destination and pre-filled theme context. |
| `CR06-06` | **Milestone Celebrations Page** | Dedicated service page for adult birthdays, anniversaries, and life milestones. First featured showcase: **Newspaper Theme 70th Birthday**. | Verify route `/celebrations/milestones` exists with editorial showcase layout. |

---

## SECTION 06: Packages Page and Package Comparison

### `CR-07` — Standardized Package Naming, Pricing & Comparison Matrix
* **Priority:** Critical  
* **Target Pages:** `/packages`, `/packages/[slug]`, Package Comparison Table sitewide.  
* **Current Defect:** Main page uses Essential/Signature/Grand, but later screens revert to legacy Standard/Premium/Luxe; starting price ambiguity; wrong gift packaging comparison copy.

#### 1. Package Naming Strict Enforcement
* **Customer-Facing Tier Names:** **Essential** | **Signature** | **Grand**
* **Badge Requirement:** **Signature** must be permanently highlighted as **"Most Loved"** or **"Recommended"**.
* **STRICT REJECTION CRITERIA:** If the words **"Standard"**, **"Premium"**, or **"Luxe"** appear in ANY customer-facing heading, badge, review screen, invoice, or confirmation email, the build is **IMMEDIATELY REJECTED**. (Legacy names may only exist as internal backend database enum values).

#### 2. Pricing Transparency Disclaimer
* **Mandatory Copy String:**  
  `"Final price depends on guest count and selected inclusions."`
* **Placement:** Immediately adjacent to or below every displayed starting price (e.g. `Starting from ₹15,000*`).

#### 3. Exact Gift Packaging Comparison Row
The package comparison matrix must use the **exact approved wording** below:

| Feature Row | Essential Package | Signature Package ("Most Loved") | Grand Package |
|---|---|---|---|
| **Gift Packaging** | **Simple Gift Packaging** | **Theme Gift Bag** | **Personalized Theme Gift Bag** |
| *Wording Definition* | Standard protective wrapping/box | Custom theme-branded tote/bag | Custom theme bag printed/tagged with the celebrated person's name |

#### Package Comparison Matrix Verification Checklist

| Check ID | Verification Item | Expected Output | Status |
|---|---|---|---|
| `CR07-01` | Package Cards Hierarchy | 3 distinct cards (Essential, Signature, Grand). Signature visually elevated with "Most Loved" badge. | [ ] Pass / [ ] Reject |
| `CR07-02` | Legacy Tier Name Purge | Zero instances of "Standard", "Premium", "Luxe" across `/packages` and sub-pages. | [ ] Pass / [ ] Reject |
| `CR07-03` | Price Transparency Copy | Disclaimer string present below all starting prices. | [ ] Pass / [ ] Reject |
| `CR07-04` | Comparison Matrix Grid | Structured matrix with clear checkmarks (✓), cross marks (—), and specific quantities. | [ ] Pass / [ ] Reject |
| `CR07-05` | Gift Packaging Row Audit | Exact strings: "Simple Gift Packaging", "Theme Gift Bag", "Personalized Theme Gift Bag". | [ ] Pass / [ ] Reject |
| `CR07-06` | Mobile Comparison UX | Matrix collapses gracefully into an interactive tabbed comparison or swipeable card stack on mobile. | [ ] Pass / [ ] Reject |

---

## SECTION 07: Fixed Package Customer Journey

### `CR-08` — Single Package Selection & Progress Persistence
* **Priority:** Critical  
* **Target Pages:** `/packages/build`, Multi-Step Fixed Package Flow.  
* **Current Defect:** Customer selects Signature, chooses theme, and is presented with a second, confusing package selection screen showing old tier names. Back/Edit erases valid inputs.

```
[ Fixed Package Journey Flow ]
[Packages Page] -> Select Tier (e.g., Signature)
      ↓
[Step 1: Theme] -> Choose Theme (Space, Princess, etc.)
      ↓
[Step 2: Details] -> Child/Person Name, Age/Milestone, Event Date, Guest Count, City
      ↓
[Step 3: Customize] -> Visual Digital Inclusions, Welcome Items (Pick 1), Activities (Pick 2), Return Gifts (Pick 1)
      ↓
[Step 4: Décor] -> [Jaipur? Yes -> Pick 1 Décor Option or Skip] / [Outside Jaipur? Skip Décor automatically]
      ↓
[Step 5: Review] -> Complete Itemized Breakdown, Price Calculation, Authenticated Checkout CTA
      ↓
[Step 6: Checkout] -> Login -> Contact & Address -> Razorpay Payment -> Confirmed Booking & Invoice
```

#### Fixed Package Flow Verification Matrix

| Check ID | Step / Action | Required System Behavior | Acceptance Check |
|---|---|---|---|
| `CR08-01` | **Initial Tier Selection** | Clicking "Select Signature" routes directly to Theme or Details step with `packageId=signature` stored in URL/state. | Package ID accurately captured in application state. |
| `CR08-02` | **Eliminate 2nd Package Screen** | The flow MUST NOT ask the customer to pick a package again. The second package selection step is **COMPLETELY DELETED**. | Verify Step 2 does not display any package selection cards. |
| `CR08-03` | **State Persistence** | Selected package, theme, date, city, guest count, and customized items persist across all steps. | Refresh browser on Step 3; all previous selections remain populated. |
| `CR08-04` | **Non-Destructive Back/Edit** | Clicking "Back" or clicking a previous step in the stepper breadcrumb does NOT erase downstream valid choices. | Navigate Step 3 -> Step 1 -> change theme -> return to Step 3. Date, city, and guest count preserved. |
| `CR08-05` | **Step Sequence & Stepper Labels** | Breadcrumb navigation matches Figure 3: `Theme` → `Details` → `Customize` → `Décor` → `Review`. | Stepper labels match sequence exactly. |
| `CR08-06` | **Review Consistency** | Review screen, checkout summary, invoice, and email confirm the exact package chosen at entry. | No tier mismatch between entry and final invoice. |

---

## SECTION 08: Fixed Package Customization Screen

### `CR-09` — Visual Previews, Selection Limits & Product Personalization
* **Priority:** Critical  
* **Target Pages:** `/packages/build/customize`  
* **Current Defect:** Digital inclusions listed as text only; physical items use generic placeholder icons; personalization shown on non-personalizable items (e.g. Space Mini Backpack).

#### 1. Digital Inclusions Visual Preview Requirements
Every included digital deliverable must display a high-resolution visual thumbnail preview and a "View Preview" modal:
1. **Digital / Animated Video Invite:** Thumbnail of animated template with sample play button.
2. **Milestone / Countdown Cards:** Visual sample set for WhatsApp status/stories.
3. **Parent Party Brief:** Formatted preview of the logistics & schedule cheat-sheet.
4. **WhatsApp Profile Display Picture (DP):** Circular branded theme badge preview.
5. **Theme Concept Sheet:** Visual design moodboard preview.
6. **Gift Registry Access:** Branded digital wishlist invitation mockup.
7. **Digital Keepsake / Certificate:** Sample completion award preview.

#### 2. Physical Item Quick-View Modal (7 Mandatory Fields)
Clicking "View Details" or "Quick View" on any physical welcome item, activity kit, or return gift must launch a modal displaying:
* **Image Gallery:** 3 to 5 zoomable real photographs (no 3D placeholder icons).
* **Official Title:** Product name matching inventory SKU.
* **Product Description:** High-quality description of contents and materials.
* **Dimensions & Materials:** Accurate specifications (e.g., "Cotton canvas, 25cm x 30cm").
* **Age Suitability:** Recommended age bracket (e.g., "Suitable for ages 4–8").
* **Pricing Basis:** Unit price and minimum quantity if added beyond package quota.
* **Personalization Capability:** Clearly indicates if eligible or standard only.

#### 3. Package Limits Enforcement & Personalization UX

| Check ID | Feature Rule | Exact Logic & Copy Implementation | Pass/Reject Criteria |
|---|---|---|---|
| `CR09-01` | **Quota Enforcement** | Display clear rule badges above item groups:  <br>- Welcome Items: *"Choose 1 included in your package"*  <br>- Activities: *"Choose 2 included in your package"*  <br>- Return Gifts: *"Choose 1 included in your package"*. | Checkbox / radio logic disables remaining items once quota is met, or marks additional items as paid add-ons. |
| `CR09-02` | **Continue Button Validation** | "Continue to Décor" button remains **disabled** until all required mandatory choices meet package quota. | If customer can click Continue with 0 activities selected -> **REJECTED**. |
| `CR09-03` | **Personalization Flag** | "Personalization Available" badge appears ONLY if `is_personalizable = true` in Admin product settings. | Space Mini Backpack must NOT show personalization badge until enabled in Admin. |
| `CR09-04` | **Personalization Prompt Copy** | Eligible products display exact prompt:  <br>`"Personalization Available — Would you like to personalize this product?"`  <br>Options: `[ Yes, I’d like personalization ]` / `[ No, keep it standard ]`. | Copy matches brief verbatim. |
| `CR09-05` | **MVP Name Collection Notice** | When "Yes" is selected, display MVP explanation copy:  <br>`"After your booking is confirmed, our team will contact you on WhatsApp to collect names, text and other personalization details."` | Informs user clearly without forcing long CSV/name list input. |
| `CR09-06` | **Admin Order Transmission** | Personalization selection adds appropriate fee (if configured) and passes `requires_personalization = true` to the order payload. | Admin order view displays highlighted personalization pending flag. |

---

## SECTION 09: Gift Registry and Jaipur Décor Logic

### `CR-10` — Gift Registry Child-Friendly Explanation & Visual Discovery
* **Priority:** Critical  
* **Target Pages:** Package Builder, Build Your Own, `/registry`, `/registry/sample`  
* **Current Defect:** "Gift Registry Access" presented with zero explanation; text-only list without imagery gives guests no discovery experience.

#### Gift Registry Acceptance Matrix

| Check ID | Required Element | Exact Specification & Content | Verification Test |
|---|---|---|---|
| `CR10-01` | **Registry Section Heading** | `"Make Their Wishlist Part of the Celebration"` | Verify heading text in builder and registry landing. |
| `CR10-02` | **Core Value Proposition Copy** | `"Create a special gift wishlist for your child or the person being celebrated, then share it privately with family and friends. Guests can explore the selected gifts and choose something they’ll genuinely love — making gifting easier, more thoughtful and less repetitive."` | Verify exact copy rendering without grammatical cuts. |
| `CR10-03` | **How It Works (3 Steps)** | Visual 3-step timeline:  <br>1. **Create Their Wishlist:** Pick curated gifts from shop or add custom links.  <br>2. **Share It Privately:** Share private password-protected link via WhatsApp/invite.  <br>3. **Celebrate Thoughtful Gifting:** Guests reserve gifts; duplicates prevented in real time. | 3 illustrated steps render responsively across devices. |
| `CR10-04` | **"View Sample Wishlist"** | Interactive modal or live sample route (`/registry/sample`) showing a populated registry with real product photos, prices, reserved states, and reserve buttons. | Open sample registry; verify real imagery and functional reservation demo modal. |
| `CR10-05` | **Commercial Inclusions Clarity** | Explicitly state whether registry is **Included Free** (Signature & Grand), a **Paid Add-on** (Essential / Custom), or standalone. | User is never surprised by an unexpected fee. |

### `CR-11` — City-Based Décor Branching Logic (Jaipur vs. Outside Jaipur)
* **Priority:** Critical  
* **Target Pages:** Fixed Package Step 4 (Décor) and Review Step.  
* **Current Defect:** Non-Jaipur customers blocked or shown Jaipur-only physical décor options; pricing and venue caveats missing.

```
[ City Branching Algorithm - Step 4 ]
                      [Customer Selects City]
                                 │
                ┌────────────────┴────────────────┐
                ▼                                 ▼
         [City == "Jaipur"]              [City != "Jaipur"]
                │                                 │
   • Show 2-3 Theme Décor Options        • Hide On-Ground Décor & Coordination
   • Display 3-6 Venue Photos            • Automatically Skip Step with Notice:
   • Show Add / Skip Décor Toggle          "Physical décor is exclusive to Jaipur.
   • Display Venue Adaptation Caveat      Your Package includes the Décor
   • Add Selected Décor Fee to Total       Guidance Document for local setups."
                │                        • Retain all entered data intact
                │                        • Zero Décor Charges Added
                └────────────────┬────────────────┘
                                 ▼
                     [Proceed to Step 5: Review]
```

#### City-Based Décor Verification Table

| Check ID | Scenario | System Behavior & Validation | Pass/Reject |
|---|---|---|---|
| `CR11-01` | **Jaipur Customer** | Displays 2–3 theme-matched décor packages with 3–6 real photographs, list of physical inclusions/exclusions, starting price, approximate dimensions, and venue suitability notes. | [ ] Pass / [ ] Reject |
| `CR11-02` | **Venue Adaptation Caveat** | Displays mandatory note: *"Reference visuals represent past setups; final setup may adapt gracefully to your venue size and layout."* | [ ] Pass / [ ] Reject |
| `CR11-03` | **Jaipur Skip Option** | Prominent option: `[ Skip Décor — I only want the Celebration Package ]`. Selecting skip adds ₹0 to total. | [ ] Pass / [ ] Reject |
| `CR11-04` | **Outside-Jaipur Customer** | Selecting Delhi, Mumbai, or any non-Jaipur city automatically **hides** on-ground décor and On-Day Coordination. | [ ] Pass / [ ] Reject |
| `CR11-05` | **Outside-Jaipur Guidance** | Confirms: *"Décor Guidance Document remains included — our stylists provide your local decorator with exact placement diagrams and specs."* | [ ] Pass / [ ] Reject |
| `CR11-06` | **Zero Data Loss** | Switching city from Jaipur to Delhi does not erase child name, guest count, or customized items. Total updates cleanly. | [ ] Pass / [ ] Reject |

---

## SECTION 10: Build Your Own Celebration — Correct Journey

### `CR-12` — Decouple Custom Plan from Package Tiers & Tier Badges
* **Priority:** Critical  
* **Target Pages:** `/custom-plan`, `/custom-plan/build`, Custom Celebration Engine.  
* **Current Defect:** Custom builder displays "By Package Tier", Standard/Premium/Luxe badges, and generic bundle services like "Children Activities (2 Activities)". Behaves like a fixed package clone instead of a flexible custom builder.

#### 1. Journey Architecture & Stepper

```
[ Build Your Own Stepper Sequence ]
Step 1: Details  -> Celebration Type, Child/Person Name, Event Date, Guest Count, City, Budget
Step 2: Theme    -> Select Approved Theme (Space, Princess, etc.) or "Custom Theme"
Step 3: Build    -> Select Individual Items (Grouped: Before, During, After Celebration)
Step 4: Add-ons  -> High-Value Enhancements (Registry, Photography, Cake, Décor Guidance)
Step 5: Personalize -> Product-Specific Names/Sizes & MVP WhatsApp Prompt
Step 6: Review   -> Itemized Audit, Budget Comparison, Proceed to Checkout / Quote
```

#### 2. Complete Purge of Package Tiers & Bundles

| Check ID | Requirement | Architectural & UI Mandate | Acceptance Check |
|---|---|---|---|
| `CR12-01` | **Subtitle Replacement** | Replace existing subtitle with exact copy:  <br>`"Choose the details you love and build a celebration that fits your theme, guests and budget."` | Verify exact string on `/custom-plan`. |
| `CR12-02` | **Purge "By Package Tier"** | Remove all tabs, toggles, or filters labeled "By Package Tier" or "By Journey". | No tier-based filtering controls exist. |
| `CR12-03` | **Purge Tier Badges** | Zero badges displaying "Standard", "Premium", "Luxe", "Essential", "Signature", or "Grand" inside the Build step. | No tier tags appear on individual product cards. |
| `CR12-04` | **Purge Generic Bundles** | Remove generic bundle items like *"Children Activities (2 Activities)"* or *"Return Gift Sourcing"*. | All items are concrete, tangible products. |
| `CR12-05` | **Item Grouping Standard** | Group all selectable items into 3 clear temporal categories:  <br>1. **Before the Celebration** (Invites, countdown cards, teaser videos, gift registry)  <br>2. **During the Celebration** (Welcome badges, headgear, activity kits, games, table styling)  <br>3. **After the Celebration** (Return gifts, thank-you tags, keepsake bags, highlight photos). | Items structured cleanly under these 3 headers. |
| `CR12-06` | **Unrestricted Selection Freedom** | User can choose ANY combination: 0 activities, 1 activity, or 5 activities; 0 return gifts or 50 lunchboxes. No tier caps. | Add 4 different activities; system allows all 4 without warning or block. |

---

## SECTION 11: Build Your Own — Items, Quantities & Add-ons

### Pricing & Quantity Calculation Engine
Each item in Build Your Own must follow its real commercial pricing model:

| Item Category | Quantity / Pricing Formula | Real Business Example | Live Cart / Calculation Behavior |
|---|---|---|---|
| **Welcome Items** | Default = Participating Children Count. Allow user to adjust quantity upwards. | 10 Space Badges @ ₹80 = ₹800 | Auto-fills 10 based on guest count; allows manual increase to 15. |
| **Return Gifts** | Default = Guest/Child Count. Enforce product's Minimum Order Quantity (MOQ). | 10 Space Lunchboxes @ ₹250 = ₹2,500 (MOQ = 10) | Prevents user from decrementing below MOQ (10). |
| **Gift Bags & Tags** | Synchronizes automatically with selected return gift quantity unless manually overridden. | 10 Theme Gift Bags @ ₹60 = ₹600 | Changing gift quantity from 10 to 12 updates gift bags to 12. |
| **Individual Activity Kits** | Priced per participating child. Scaled by child count. | 10 Astronaut Headgear Kits @ ₹120 = ₹1,200 | Price = Unit Price × Child Count. |
| **Group Activity Sets** | Fixed price per set/game, regardless of child count. | 1 Space Bingo Game Set (serves up to 20 kids) = ₹950 | Quantity = 1. Price remains fixed even if guest count changes. |
| **Digital Items** | One fixed price per digital design asset. | 1 Animated Video Invite = ₹1,500 | Quantity fixed at 1. |
| **Edited Photographs** | Fixed bundle quantity and fixed package price. | 3 Professional Highlight Pictures = ₹1,200 | Fixed bundle price. |
| **Custom / Bespoke Item** | **Price on Request (POR)**. Unpriced placeholder. | Handcrafted Theme Keepsake Box = "Quote on Request" | Price displayed as `Quote on Request`. Routes order to quotation workflow. |

### `CR-13` — Item Cards, Add-on Conflicts & Personalization Rules
* **Priority:** Critical  
* **Target Pages:** `/custom-plan/build`, `/custom-plan/addons`, `/custom-plan/personalize`  
* **Current Defect:** Selections lack thumbnail images; add-ons allow duplicate purchases of items already selected in Build; screen requires long comma-separated guest name lists.

#### Verification Matrix for Product Cards & Add-ons

| Check ID | Verification Rule | System Behavior & Validation | Pass/Reject |
|---|---|---|---|
| `CR13-01` | **Complete Item Cards** | Every item card in Build displays: Thumbnail photo, official SKU name, short description, unit price, MOQ, personalization badge, "View Details" link, and Add/Remove button. | [ ] Pass / [ ] Reject |
| `CR13-02` | **De-duplication / Conflict Engine** | If an item (e.g. Digital Animated Invite or Gift Registry) is selected in Step 3 (Build), it is automatically **hidden or disabled** in Step 4 (Add-ons). | [ ] Pass / [ ] Reject |
| `CR13-03` | **Upgrade Price Differential** | If a customer replaces a standard item with a luxury variant (e.g. Standard Bag -> Personalized Bag), system labels it as **"Upgrade"** and charges ONLY the net price difference. | [ ] Pass / [ ] Reject |
| `CR13-04` | **Product Personalization Toggle** | Personalization is controlled per-product via Admin. Only products flagged `is_personalizable = true` display personalization options. | [ ] Pass / [ ] Reject |
| `CR13-05` | **Single-Item Personalization Input** | Where practical, collect simple single inputs (e.g., Birthday Child T-shirt size `[ 4-5Y ]` and Printed Name `[ Aarav ]`). | [ ] Pass / [ ] Reject |
| `CR13-06` | **Purge Bulk Comma-Separated Lists** | Remove mandatory multi-guest comma-separated text boxes in MVP. Use post-booking WhatsApp notification flow for bulk guest names. | [ ] Pass / [ ] Reject |
| `CR13-07` | **Reactive Running Total** | The running total bar updates immediately (< 50ms) whenever quantity, upgrade, or personalization is toggled. | [ ] Pass / [ ] Reject |

---

## SECTION 12: Build Your Own — Details, Budget, Review & Quote

### `CR-14` — Conditional Form Logic, Budget Thresholds & Split Checkout
* **Priority:** Critical  
* **Target Pages:** `/custom-plan/details`, `/custom-plan/review`  
* **Current Defect:** Naming Ceremony forces Child's Age; budget is captured but ignored; review displays unpriced POR items inside a "payable total".

#### 1. Celebration Type Conditional Form Matrix

| Celebration Type Selected | Relevant Form Fields Displayed | Irrelevant Fields Suppressed | Validation Rule |
|---|---|---|---|
| **Kids' Birthday / 1st Birthday** | Child's Name, Child's Age Turning, Gender, Date, City, Guest Count, Kids Count. | Baby ceremony fields suppressed. | Age Turning (1–16) is mandatory. |
| **Naming Ceremony** | Baby's Name (or "Baby of..."), Parents' Names, Ceremony Date, City, Guest Count. | **Child's Age Turning SUPPRESSED**. | Do NOT force age field. |
| **Milestone Celebration** | Person Being Celebrated, Milestone / Age (e.g. "70th Birthday", "25th Anniversary"), Date, City. | Kids birthday fields suppressed. | Milestone title mandatory. |
| **Baby Shower** | Mother-to-be Name, Host Name, Date, City, Guest Count. | Child's Age Turning suppressed. | Clean shower fields only. |
| **Custom Celebration / Other** | Event Title, Host Name, Concept Notes, Date, City, Expected Attendance. | Child-specific fields suppressed. | General event fields. |

#### 2. Budget Guidance Engine
* If the calculated total exceeds the user's entered budget, display a gentle, non-blocking notification:  
  `"Your selections total ₹24,500, which is ₹4,500 above your preferred budget of ₹20,000."`
* **Three Mandatory Action Options:**
  1. `[ Review & Adjust Selections ]` -> Takes user back to Build step to trim items.
  2. `[ Continue Anyway ]` -> Acknowledges overage and proceeds to Review.
  3. `[ Help Me Optimize ]` -> Triggers WhatsApp consultation modal with selections attached.
* **Strict Rule:** Budget overage must **NEVER** silently delete selections or block checkout.

#### 3. Transparent Itemized Review & Split Checkout Engine

```
[ Step 6: Review Screen Calculation Check ]
+ Base Selected Items (Itemized by Name, Qty, Unit Price)
+ Customization & Personalization Fees
+ Selected Décor Option (Jaipur Only)
+ Applicable Shipping / Delivery Fee
+ Applicable GST (18% / Configured Tax Rate)
─────────────────────────────────────────────────
= Subtotal & Grand Total

[ Branching Action Check ]
├── Case A: All Items Have Fixed Confirmed Prices
│     └── Primary CTA: [ Proceed to Secure Checkout ] -> Enters Payment Gateway
└── Case B: Any Selected Item is "Price on Request" (POR)
      └── Primary CTA: [ Submit for Final Quote ] -> Creates Pending Quote in Admin & Dispatches WhatsApp
      └── Prohibited: MUST NOT display estimate as a confirmed payable transaction!
```

#### Acceptance Checklist for CR-14

| Check ID | Verification Item | Expected System Behavior | Audit Status |
|---|---|---|---|
| `CR14-01` | Conditional Field Rendering | Selecting "Naming Ceremony" hides Child's Age field immediately. | [ ] Pass / [ ] Reject |
| `CR14-02` | Budget Guidance Alerts | Overage triggers 3 action buttons without blocking or erasing data. | [ ] Pass / [ ] Reject |
| `CR14-03` | Itemized Review Line Items | Review lists every single SKU, quantity, unit price, personalization, and tax. | [ ] Pass / [ ] Reject |
| `CR14-04` | Split Action Routing | If 1+ POR items exist, button changes to "Submit for Final Quote". Direct checkout disabled. | [ ] Pass / [ ] Reject |

---

## SECTION 13: The Celebration Shop & Product Pages

### `CR-15` — Shop Architecture, Multi-Faceted Filters & Route Integrity
* **Priority:** Critical  
* **Target Pages:** `/shop`, `/shop/[category]`, `/products/[slug]`  
* **Current Defect:** Mixed catalog; broken route for Space Thank-You Tag; products lack specifications and lead times; inability to purchase single items without a package.

#### 1. Category Navigation & Taxonomy
* **Landing Page Title:** **"The Celebration Shop"**
* **9 Standard Categories:**
  1. `Shop All` (`/shop`)
  2. `Return Gifts` (`/shop/return-gifts`)
  3. `Activities & Games` (`/shop/activities-games`)
  4. `Welcome Details` (`/shop/welcome-details`)
  5. `Gift Bags & Packaging` (`/shop/gift-bags-packaging`)
  6. `Thank-You Tags` (`/shop/thank-you-tags`)
  7. `Personalized Products` (`/shop/personalized-products`)
  8. `Festive & Occasion Gifting` (`/shop/festive-gifting`)
  9. `Shop by Theme` (`/shop/themes`)

#### 2. Multi-Faceted Filter Engine
The shop catalog must provide working faceted filters:
* **Theme:** Space, Cocomelon, Princess, Jungle Safari, Dinosaur, General / All.
* **Occasion:** Birthday, Baby Shower, Naming Ceremony, Milestone, Festive.
* **Age Suitability:** 1–3 Years, 4–6 Years, 7–10 Years, 11+ Years, All Ages.
* **Price Range:** Slider / Range brackets (Under ₹200, ₹200–₹500, ₹500–₹1,000, ₹1,000+).
* **Capabilities & Flags:** Personalizable (`Yes`/`No`), In Stock, Bestseller, Made to Order, New Arrival.
* **Minimum Quantity (MOQ):** Single Pieces (`MOQ = 1`), Packs (`MOQ = 10+`).

#### 3. Complete Product Card & Detail Specifications
Every product detail page (`/products/[slug]`) must render:
* High-resolution zoomable image carousel (min 3 real photos; zero placeholder icons).
* Official product title, SKU code, and category breadcrumb.
* Transparent price basis (e.g. `₹220 per piece`).
* Minimum Order Quantity (`MOQ: 10 units`).
* Clear stock status (`In Stock` / `Made to Order` / `Lead Time: 5-7 working days`).
* Theme and age suitability tags.
* Full description: dimensions, materials, and safety guidelines.
* Working "Add to Cart" button with reactive quantity selector respecting MOQ.

#### Shop Verification Matrix

| Check ID | Verification Item | Target Check | Pass/Reject |
|---|---|---|---|
| `CR15-01` | **Landing Page H1** | Heading reads "The Celebration Shop" (not "Shop Return Gifts"). | [ ] Pass / [ ] Reject |
| `CR15-02` | **Category Filter Accuracy** | Clicking "Thank-You Tags" shows ONLY thank-you tags. | [ ] Pass / [ ] Reject |
| `CR15-03` | **Fix Space Thank-You Tag** | Navigate to `/products/space-thank-you-tags`. Page must load with photos, price, MOQ, and Add to Cart. Zero blank screens. | [ ] Pass / [ ] Reject |
| `CR15-04` | **Route Audit Across Catalog** | Run automated crawler across all published product URLs. Zero 404s, zero 500s, zero blank templates. | [ ] Pass / [ ] Reject |
| `CR15-05` | **Standalone Single Purchase** | Add 1 product to cart -> proceed to checkout -> pay. Flow completes without asking for event date or package. | [ ] Pass / [ ] Reject |

---

## SECTION 14: Festive Collections & Campaign Popups

### `CR-16` — Seasonal Collections Engine with Admin Archival & Yearly Reuse
* **Priority:** Critical  
* **Target Pages:** `/shop/festive-gifting`, `/collections/[slug]`, Admin Collections Manager  
* **Current Defect:** Mixed products in festive list; admin cannot hide/show categories seasonally; search/assign products failed in live demo.

#### Seasonal Collection Specification Matrix

| Collection Name | Dedicated URL Slug | Expected Season / Dates | Specific Collection Requirements |
|---|---|---|---|
| **Navratri & Kanjak Gifts** | `/collections/navratri-kanjak` | September – October | Kanjak gift packs, traditional return favors, custom packaging. |
| **Rakhi Hampers & Gifts** | `/collections/rakhi-hampers` | July – August | Sibling hampers, theme rakhis, personalized sweet/gift boxes. |
| **Diwali Gifting & Hampers** | `/collections/diwali-gifting` | October – November | Luxury festive hampers, celebration boxes, corporate/family gifts. |
| **Teacher’s Day Hampers** | `/collections/teachers-day` | August – September | Thank-you stationery, personalized mugs, appreciation gifts. |
| **Christmas & New Year** | `/collections/christmas-celebration`| December – January | Secret Santa gifts, activity kits, holiday hampers. |

#### Admin Lifecycle & Feature Verification

| Check ID | Requirement | Admin & Frontend Behavior | Acceptance Test |
|---|---|---|---|
| `CR16-01` | **Collection Status Lifecycle** | 3 states: `DRAFT`, `ACTIVE`, `ARCHIVED`. | Toggling to `ARCHIVED` immediately hides collection from shop navigation and homepage. |
| `CR16-02` | **Yearly Reuse without Data Loss** | Archiving a collection retains all product associations, images, and descriptions. Next year, admin updates dates and toggles to `ACTIVE`. | Deactivating Navratri does not delete products. Reactivating restores collection cleanly. |
| `CR16-03` | **Product Assignment Engine** | Fix product search and multi-select assignment bug in Admin panel. | Search "Space", select 3 products, save collection. Frontend displays exactly those 3 products. |
| `CR16-04` | **Collection Banners & Deadlines** | Each collection has custom hero banner, order cutoff date (e.g. "Order by Oct 20 for Diwali delivery"), and delivery notes. | Frontend renders banner and cutoff alert banner. |

### `CR-17` — Purge Wedding Popup & Implement CMS Campaign Popup
* **Priority:** High  
* **Target Pages:** Sitewide Promotional Modal  
* **Current Defect:** A wedding-related popup appears on the website, completely contradicting the brand focus.

#### Campaign Popup Audit Matrix

| Check ID | Audit Parameter | Exact Requirement | Failure Condition |
|---|---|---|---|
| `CR17-01` | **Purge Wedding Content** | Delete wedding popup component, assets, and triggers from codebase. | Any wedding popup or bridal reference appearing sitewide -> **REJECTED**. |
| `CR17-02` | **CMS Campaign Controls** | Admin manages popup: Title, body copy, desktop/mobile banner image, CTA label, CTA destination URL, and Active toggle. | Changes in Admin reflect on website within cache revalidation window (<60s). |
| `CR17-03` | **Date-Bound Scheduling** | Admin sets Start Date & End Date. Popup auto-activates and auto-expires. | Popup displays outside scheduled date window. |
| `CR17-04` | **Frequency Capping** | Limit popup frequency to **once per session** via `sessionStorage` or 24-hour cookie. | Popup re-opening on every page navigation. |
| `CR17-05` | **Target Page Rules** | Option to target specific routes (e.g. Homepage only or Shop only). | Popup triggering during checkout or cart flow. |

---

## SECTION 15: Events, Gallery and VC Journal

### `CR-18` — Events Page Content, Typography & Coming Soon State
* **Priority:** High  
* **Target Pages:** `/events`, `/events/[slug]`  
* **Current Defect:** Oversized headings; demo/fake events like "Bridal Preview" or "Open Day" visible.

#### Events Verification Table

| Check ID | Verification Rule | System Behavior | Status |
|---|---|---|---|
| `CR18-01` | **Typography Scale** | Standardize Events page H1/H2 to match global responsive typography tokens. | [ ] Pass / [ ] Reject |
| `CR18-02` | **Purge Fabricated Events** | Delete demo events ("Bridal Preview", "Open Day", "Wedding Expo"). | [ ] Pass / [ ] Reject |
| `CR18-03` | **Polished "Coming Soon" State** | When 0 events are active, display an elegant branded state:  <br>`"Exciting Playdates & Workshops Coming Soon"` + Newsletter / WhatsApp notify form. | [ ] Pass / [ ] Reject |
| `CR18-04` | **Real Event Card Data** | Event cards must show: Title, date/time, venue/city, age suitability, experience overview, ticket price, and "Register Now" CTA. | [ ] Pass / [ ] Reject |
| `CR18-05` | **Playdates Categorization** | Hosted workshops and playdates stay strictly within `/events`. | [ ] Pass / [ ] Reject |

### `CR-19` — Gallery Filters, Milestone Category & Commercial CTAs
* **Priority:** High  
* **Target Pages:** `/gallery`  
* **Current Defect:** Only children's birthday categories; milestone celebrations missing; gallery lacks conversion links.

#### Gallery Verification Table

| Check ID | Verification Rule | System Behavior | Status |
|---|---|---|---|
| `CR19-01` | **Celebration Type Filters** | Filter bar includes: `All`, `Kids' Birthdays`, `Naming Ceremony`, `Milestone Celebrations`, `Baby Showers`. | [ ] Pass / [ ] Reject |
| `CR19-02` | **Milestone Proof of Concept** | Create slot for **Newspaper Theme 70th Birthday** under Milestone Celebrations. | [ ] Pass / [ ] Reject |
| `CR19-03` | **Grid Responsiveness** | Balanced photo grid without distorted crops or excessive blank vertical gaps on tablet/mobile. | [ ] Pass / [ ] Reject |
| `CR19-04` | **Commercial Conversion CTAs** | Clicking a gallery story displays modal or footer with:  <br>`"Love this celebration?"`  <br>`[ Explore This Theme ]` · `[ Explore Packages ]` · `[ Plan a Similar Celebration ]`. | [ ] Pass / [ ] Reject |

### `CR-20` — VC Journal Discoverability & Editorial Cleanliness
* **Priority:** High  
* **Target Pages:** `/journal`, `/journal/[slug]`  
* **Current Defect:** Hard to find from navigation; wedding template articles like "Top 10 Wedding Trends for 2026" present; oversized headings.

#### VC Journal Verification Table

| Check ID | Verification Rule | System Behavior | Status |
|---|---|---|---|
| `CR20-01` | **Navigation Placement** | Linked in Footer under Explore and accessible via content sub-nav. Featured articles teaser on homepage. | [ ] Pass / [ ] Reject |
| `CR20-02` | **Purge Wedding Articles** | Permanently remove all wedding, bridal, and generic template blog posts from database and CMS. | [ ] Pass / [ ] Reject |
| `CR20-03` | **Approved Editorial Scope** | Articles focus solely on: Celebration planning guides, parenting party tips, theme deep dives, and gifting ideas. | [ ] Pass / [ ] Reject |
| `CR20-04` | **Article Card Data** | Each card displays: Cover photo, category badge, article title, short excerpt, publication date, and "Read More" link. | [ ] Pass / [ ] Reject |
| `CR20-05` | **Internal Conversion Links** | Every article contains contextual links leading directly to relevant themes, packages, or shop items. | [ ] Pass / [ ] Reject |

---

## SECTION 16: About Us, Testimonials and Consultation

### `CR-21` — About Us Brand Authenticity & "What We Stand For" Values
* **Priority:** Critical  
* **Target Page:** `/about`  
* **Current Defect:** Claims Faridabad farmhouse or Jaipur venue ownership; misrepresents business model; missing 4th value card.

#### About Us Content & Verification Matrix

| Section Element | Accurate Approved Content | Strictly Prohibited Copy (Auto-Reject) | Verification Check |
|---|---|---|---|
| **Headquarters & Origin** | Founded and based in **Jaipur, Rajasthan**. | Mention of Jaipur headquarters or Faridabad base. | Verify Jaipur location prominently stated. |
| **Business Model** | Curators of complete themed celebrations, bespoke digital details, and shippable party products across India. On-ground décor execution is **currently Jaipur-only**. | Claims of owning party venues, banquets, farmhouses, or physical retail showrooms. | Verify no venue ownership claims exist. |
| **Our Story** | Concise, authentic founder narrative by Charu Saxena focusing on thoughtful details and joyful family milestones. | Fabricated corporate history or generic corporate filler. | Review founder story copy. |
| **What We Stand For (4 Core Values)** | **1. Thoughtful Personalization:** Every child and milestone is unique.  <br>**2. Meaningful Quality:** Curated materials that feel premium and safe.  <br>**3. Reliable Coordination:** Stress-free planning and transparent delivery.  <br>**4. Joyful Experiences:** Creating memories that families cherish. | Showing only 3 values or repetitive generic claims. | Verify all 4 value cards render with distinct icons and copy. |

### `CR-22` — Authentic Testimonials Policy
* **Priority:** Critical  
* **Target Pages:** Homepage, `/about`, Sitewide Testimonial Sliders  
* **Current Defect:** Placeholder or fabricated reviews with stock photography.

#### Testimonials Verification Standard

| Check ID | Standard / Policy | Requirement | Verification Check |
|---|---|---|---|
| `CR22-01` | **Zero Fabricated Reviews** | Every public review must be from a genuine client with verifiable consent. | Audit database `testimonials` table; confirm all active rows have client consent. |
| `CR22-02` | **Attribution Structure** | Each testimonial card displays: Parent's First Name, Celebration & Theme, City, and Real Event Photograph (where permitted). | Verify cards conform to standard attribution layout. |
| `CR22-03` | **Draft Status Isolation** | Placeholder reviews used during staging must be flagged `is_draft = true` and hidden from production builds. | Run query `SELECT * FROM testimonials WHERE is_active = true`; verify zero dummy text. |

### `CR-23` — Universal Consultation Form with Conditional Logic
* **Priority:** Critical  
* **Target Pages:** `/consultation`, Homepage Planning Section  
* **Current Defect:** Form is exclusively child-birthday oriented; forces Child's Age on adult milestones; lacks confirmation feedback.

#### Universal Consultation Form Specification

```
[ Universal Consultation Form Architecture ]
Heading: "Let's Plan Something Beautiful"
Subheading: "Tell us about the person, milestone or moment you’re celebrating, and we’ll help bring every detail together."
Service Badge: "Complimentary 30-minute consultation"

[ Core Universal Fields ]
1. Full Name (Mandatory)
2. WhatsApp Number / Phone (Mandatory, with +91 validation)
3. Email Address (Mandatory)
4. Celebration Type (Dropdown: Kids' Birthday | 1st Birthday | Baby Shower | Naming Ceremony | Milestone Celebration | Custom Celebration | Other)
5. Event Date (DatePicker with "Date Not Fixed Yet" checkbox)
6. Celebration City (Dropdown: Jaipur | Jaipur | Mumbai | Bangalore | Other)
7. Guest Count (Estimated total guests)
8. Theme / Concept Idea (Text input with "I'm Not Sure Yet — Help Me Choose" toggle)
9. Estimated Budget Bracket (Optional dropdown)
10. Special Notes / Vision (Optional textarea)

[ Conditional Fields ]
├── If Kids' Birthday / 1st Birthday -> Child's Name & Age Turning
├── If Naming Ceremony               -> Baby / Family Name (No Age)
├── If Milestone Celebration         -> Person Celebrated & Milestone (e.g. 50th Anniversary)
└── If Baby Shower                   -> Mother-to-be Name
```

#### Consultation Acceptance Checks

| Check ID | Field / Behavior | Acceptance Check | Status |
|---|---|---|---|
| `CR23-01` | Header & Value Copy | Exact heading, subheading, and "Complimentary 30-minute consultation" badge rendered. | [ ] Pass / [ ] Reject |
| `CR23-02` | Conditional Field Toggling | Selecting "Milestone Celebration" replaces Child Name/Age with Person Celebrated/Milestone. | [ ] Pass / [ ] Reject |
| `CR23-03` | "Not Sure Yet" Option | User can submit inquiry without entering a locked theme. | [ ] Pass / [ ] Reject |
| `CR23-04` | Submission State & Feedback | Successful submission displays warm confirmation modal:  <br>`"Thank You! We've received your celebration details. Our team will contact you on WhatsApp within 24 hours."` | [ ] Pass / [ ] Reject |
| `CR23-05` | Admin & WhatsApp Routing | Form payload creates lead in Admin CRM and fires notification to business WhatsApp/email. | [ ] Pass / [ ] Reject |

---

## SECTION 17: Checkout, Payment, Invoice, Orders and Shipping

### `CR-24` — Approved Purchase Authentication Change: Login-Based Purchase
* **Priority:** Critical  
* **Target Pages:** `/cart`, `/checkout`  
* **Reported decision:** Guest purchase has been rejected for the current implementation. Purchase now requires customer login because Gift Registry access and security require an authenticated customer identity. This is a scope and architecture change from the original audit requirement and requires written founder approval plus budget confirmation.
* **Social login:** Google/Facebook login remains out of scope and must be discussed and approved separately.

#### Checkout Authentication Policy Matrix

| Authentication Option | Status in Scope | Placement & Priority | Architectural Implementation |
|---|---|---|---|
| **Continue as Guest** | **Rejected for current scope** | Not available | Rejected because Gift Registry access and security require an authenticated customer identity. |
| **Log In / Create Account** | **Mandatory for purchase** | Primary checkout gate | Customer authenticates before purchase; the authenticated identity is linked to the order and eligible Gift Registry access. |
| **Social Login (Google/FB)** | **Out of scope / discussion required** | Suppressed from current release | Requires separate scope, estimate, budget, and written approval before implementation. |

### `CR-25` — Payment Gateway State Machine, Retry & Invoice Engine
* **Priority:** Critical  
* **Target Pages:** `/checkout`, `/payment/status`, `/orders/[id]`, Invoice PDF/HTML  
* **Current Defect:** Test gateway demoed but backend order portal failed; payment retry lacks idempotency; risk of duplicate orders.

```
[ Payment State Machine & Recovery Flow ]
                    [Customer Clicks "Pay Now"]
                                 │
                   [Create Pending Order in DB]
                   [Initialize Razorpay Session]
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
      [Payment Succeeded]               [Payment Failed / Cancelled]
                 │                               │
    • Mark Order: "PAID"               • Keep Order: "PAYMENT_PENDING"
    • Generate Invoice #               • Retain Cart & Form Selections
    • Send WhatsApp & Email Receipt    • Display Retry Modal:
    • Trigger Admin Notification         "Payment was not completed.
    • Route to Order Confirmation         Your celebration details are saved."
                                       • Primary CTA: [ Retry Payment ]
                                       • Secondary CTA: [ Pay via UPI / NetBanking ]
                                       • Prevents Duplicate Order Creation
```

#### End-to-End Payment & Invoicing Acceptance Table

| Check ID | Verification Area | Exact System Behavior | Pass/Reject |
|---|---|---|---|
| `CR25-01` | **Payment Modes Supported** | UPI (GPay, PhonePe, Paytm, QR), Credit/Debit Cards, NetBanking via Razorpay. | [ ] Pass / [ ] Reject |
| `CR25-02` | **Failed Payment Recovery** | On transaction failure, user is redirected to clean recovery screen. Cart remains 100% intact. | [ ] Pass / [ ] Reject |
| `CR25-03` | **Idempotent Retry** | Clicking "Retry Payment" reuses the same pending order ID; never creates duplicate database rows. | [ ] Pass / [ ] Reject |
| `CR25-04` | **Comprehensive Invoice Data** | Generated invoice MUST display all fields:  <br>1. Branded VC Header with Jaipur Registered Address & GSTIN  <br>2. Unique Invoice Number & Order ID  <br>3. Customer Name, Phone, Email, Delivery Address  <br>4. Itemized line items with quantities, unit prices, personalization fees  <br>5. Subtotal, Delivery/Shipping charges, GST breakdown, and Grand Total  <br>6. Payment method and Transaction ID. | [ ] Pass / [ ] Reject |
| `CR25-05` | **Backend Order Portal** | Admin panel orders view displays paid order with all line items, customer details, and payment ID immediately (< 2s). | [ ] Pass / [ ] Reject |
| `CR25-06` | **Production Gateway Audit** | Verify Razorpay production keys (`rzp_live_...`) are configured in environment variables prior to launch. | [ ] Pass / [ ] Reject |

### MVP 6-Step Manual Fulfillment Workflow
Manual courier tracking is approved for MVP. Automation via Shiprocket API is deferred to Phase 2.

```
[ MVP Order Lifecycle ]
1. ORDER PLACED   ──> Customer receives booking/order confirmation via WhatsApp & Email.
2. PREPARING      ──> Admin reviews items, personalization requirements, and updates status.
3. READY TO SHIP  ──> Team packages physical items, prints label and invoice.
4. DISPATCHED     ──> Admin pastes manual courier tracking URL & courier partner name.
5. NOTIFICATION   ──> System automatically triggers WhatsApp/Email dispatch alert with tracking link.
6. DELIVERED      ──> Admin marks order delivered upon courier confirmation.
```

---

## SECTION 18: CMS & Admin Controls Matrix

Charu Saxena must have complete operational independence to update changing business content without requiring developer code commits.

| Functional Module | Minimum Administrative Capabilities | Acceptance Demonstration Test | Audit Status |
|---|---|---|---|
| **1. Themes Manager** | Create, edit, soft-delete themes; upload moodboard images; set display order; toggle `is_active` and `is_featured_homepage`. | Reorder themes in Admin; verify homepage theme order updates without code changes. | [ ] Pass / [ ] Reject |
| **2. Packages Manager** | Edit package display names, starting prices, inclusion bullet points, quota limits, and "Most Loved" badge toggle. | Update Signature package starting price; confirm new price displays on `/packages` and in builder. | [ ] Pass / [ ] Reject |
| **3. Products & Inventory** | Add/edit products; upload photo galleries; assign theme, occasion, category; set unit price, MOQ, stock count, lead time, and `is_personalizable`. | Toggle personalization on a test product; verify personalization prompt appears on frontend. | [ ] Pass / [ ] Reject |
| **4. Festive Collections** | Create collections; assign products; set start/end dates; upload collection banner; toggle `DRAFT`, `ACTIVE`, `ARCHIVED`. | Archive "Navratri" collection; verify it disappears from shop navigation immediately. | [ ] Pass / [ ] Reject |
| **5. Events Manager** | Create events; set dates, venue, capacity, pricing, booking links; toggle publish/unpublish; manage "Coming Soon" state. | Unpublish all events; verify frontend displays polished "Coming Soon" state. | [ ] Pass / [ ] Reject |
| **6. VC Journal CMS** | Rich-text editorial creation; category tagging; cover photo upload; SEO meta fields; publish date; related products linker. | Publish celebration planning article; verify it appears in `/journal` with working product links. | [ ] Pass / [ ] Reject |
| **7. Campaign Popup** | Set title, copy, desktop/mobile images, CTA link, start/end dates, page targets, frequency cap, and active toggle. | Switch active campaign from Rakhi to Diwali; verify popup renders new creative on homepage. | [ ] Pass / [ ] Reject |
| **8. Business Settings** | Single master record: Jaipur address, phone, WhatsApp number, support email, operating hours, Instagram/FB links. | Change WhatsApp support number; confirm header, footer, and floating button update sitewide. | [ ] Pass / [ ] Reject |
| **9. Order Fulfillment** | Filter orders by status; view customer details, line items, personalization flags; update fulfillment stage; input tracking URL. | Paste dummy BlueDart tracking link; confirm automated WhatsApp notification fires to customer. | [ ] Pass / [ ] Reject |
| **10. SEO & Legal CMS** | Edit meta titles/descriptions per page; edit FAQs; update Terms, Privacy, Shipping, and Cancellation policy markdown. | Edit Privacy Policy text; verify update reflects immediately on `/privacy-policy`. | [ ] Pass / [ ] Reject |

---

## SECTION 19: Content Accuracy & Production Cleanup

### `CR-26` — Global Content Sweep & Purge of Legacy Placeholders
* **Priority:** Critical  
* **Target:** Complete Frontend repository, Backend database, CMS entries, Seed files, and Environment configs.  
* **Current Defect:** Legacy references to Faridabad farmhouse, Jaipur, dummy phone numbers (`9876543210`), broken WhatsApp links, wedding/bridal copy, fake FAQs.

#### Global Blacklist & Replacement Matrix

| Category | Blacklisted / Prohibited Content | Required Replacement / Verified Content | Verification Method |
|---|---|---|---|
| **Location & Service Area** | "Faridabad", "Farmhouse", "Jaipur venue", "Showroom in Delhi", "Farmhouse party lawn". | **Jaipur, Rajasthan** headquarters. Pan-India shipping for celebration boxes/gifts; on-ground décor execution **Jaipur-only**. | Ripgrep repository for `Faridabad` and `Farmhouse`. Result must be 0 matches. |
| **Event Category** | "Wedding", "Bridal", "Bride-to-be", "Groom", "Sangeet", "Wedding Trends 2026", "Bridal Preview". | **Birthdays, 1st Birthdays, Baby Showers, Naming Ceremonies, Milestone Celebrations, Festive Gifting**. | Ripgrep codebase for `wedding` and `bridal` in customer-facing content. |
| **Contact Numbers** | Dummy numbers (`9876543210`, `1234567890`, `+91 00000 00000`). | Official Vaibhav Celebrations business phone & WhatsApp number configured via environment variables. | Click every phone/WhatsApp link; verify valid connection. |
| **Social Links** | Dead links (`#`, `javascript:void(0)`), template Instagram handles. | Official active Instagram and Facebook profiles for Vaibhav Celebrations. | Click social icons in header and footer; verify destination. |
| **Legal Policies** | Placeholder "Lorem Ipsum" policies, generic eCommerce templates mentioning foreign jurisdictions. | Legally reviewed, customized policies:  <br>1. **Privacy Policy**  <br>2. **Terms of Service**  <br>3. **Shipping & Delivery Policy**  <br>4. **Cancellation & Refund Policy**. | Read all 4 policy pages; confirm real company name, Jaipur jurisdiction, and clear terms. |
| **Broken Routes & Assets** | Blank pages (e.g. Space Thank-You Tag), missing product images, console 404 errors. | Zero broken links, zero missing image assets, zero unhandled runtime errors. | Run automated crawler across all routes and assets. |

---

## SECTION 20: 25 August 2026 Meeting Decisions Audit Log

This table documents the 10 binding agreements reached during the live journey demonstration on 25 August 2026:

| # | Discussion Topic | Agreed Decision & Architectural Mandate | Associated CR | Audit Status |
|---|---|---|---|---|
| **1** | **Jaipur Décor** | Retain Add-or-Skip toggle. Expand visual options to 2–3 per theme with starting prices and venue adaptation caveat. | `CR-11` | [ ] Approved |
| **2** | **Outside-Jaipur Flow** | Non-Jaipur customers skip on-ground décor automatically without data loss. Décor guidance document remains included. | `CR-11` | [ ] Approved |
| **3** | **Repeated Package Step** | Completely eliminate the second package selection step in the fixed builder. Persist chosen tier from entry. | `CR-08` | [ ] Approved |
| **4** | **Build Your Own Decoupling** | Remove package tiers, tier badges, and generic bundles. Implement true item-level selection grouped by Before/During/After. | `CR-12` | [ ] Approved |
| **5** | **Personalization Model** | Treat personalization as a per-product admin capability, not a generic standalone bucket. Use post-booking WhatsApp for bulk names. | `CR-09`, `CR-13` | [ ] Approved |
| **6** | **Festive Collections** | Charu requires separate collections with hide/show/archive controls. Team to provide scope and timeline clarity. | `CR-16` | [ ] Action Req. |
| **7** | **Social Authentication** | Google/Facebook login estimated at 5–10 days. Defer to Later Scope to protect launch. Login-based purchase is the current checkout decision; social login requires separate discussion and approval. | `CR-24` | [ ] Approved |
| **8** | **Payment & Invoicing** | Retain UPI/card gateway, failed payment retry from same pending order, and comprehensive itemized invoice. | `CR-25` | [ ] Approved |
| **9** | **Backend Portal Issue** | Fix product search and order access crash demonstrated during meeting. Must be proven in next walkthrough. | `CR-16`, `CR-25` | [ ] Blocker |
| **10** | **Independent Shop Purchase** | Standalone retail products must be purchasable without selecting a celebration package or event date. | `CR-15` | [ ] Approved |

---

## SECTION 21: Screenshot & Visual Reference Cross-Walk

The development team must reference the client-supplied screenshot bundles when resolving each CR group:

| Reference Group | Supplied Screen Evidence | Target Change Requests | Key Visual Defect Addressed |
|---|---|---|---|
| **Group 1: Homepage & Navigation** | Homepage full-page, Themes listing, Package cards, Footer, iPad responsive gaps. | `CR-01`, `CR-02`, `CR-03`, `CR-04`, `CR-05` | iPad blank vertical space; small logos; navigation clutter; missing bestseller cards. |
| **Group 2: Fixed Package Builder** | Package comparison matrix, repeated package selection screen, customize step. | `CR-07`, `CR-08`, `CR-09` | Redundant Standard/Premium/Luxe screen; missing digital previews; gift icons. |
| **Group 3: Décor & City Logic** | Décor selection step, Outside-Jaipur city selection screen. | `CR-10`, `CR-11` | Missing décor specs; non-Jaipur customers seeing irrelevant physical décor options. |
| **Group 4: Build Your Own** | Custom Plan Details, Theme, Build, Add-ons, Personalize, Review screens (8 screens). | `CR-12`, `CR-13`, `CR-14` | Package-tier badges in custom plan; generic bundles; comma-separated name input. |
| **Group 5: Shop & Festive** | Shop landing, category tabs, Space Thank-You Tag blank screen, festive collection. | `CR-15`, `CR-16`, `CR-17` | Blank product page; mixed festive products; wedding campaign popup. |
| **Group 6: Content & Consultation** | Events listing, Gallery grid, About Us page, Consultation form, Journal articles. | `CR-18`, `CR-19`, `CR-20`, `CR-21`, `CR-22`, `CR-23` | Oversized headings; wedding blog posts; Faridabad claims; birthday-only consultation. |
| **Group 7: Checkout & Admin** | Payment gateway modal, pending order screen, invoice PDF, admin order error. | `CR-24`, `CR-25`, `CR-26` | Forced login wall; admin portal crash; invoice data omissions. |

---

## SECTION 22: Final Phase 1 Go/No-Go Acceptance Checklist

Before Phase 1 launch approval is granted, the development team and Charu Saxena must execute an end-to-end verification walkthrough. Every gate below is **MANDATORY**:

- [ ] **Gate 01: Cross-Device Responsiveness**  
  Zero unexplained blank vertical gaps, zero clipped headings, zero overlapping sticky bars across Mobile (360, 375, 390, 430px), Tablet (768, 820, 1024px), and Desktop (1280, 1440, 1920px).
- [ ] **Gate 02: Approved Hero Lock**  
  Hero retains approved copy ("One Theme. Every Detail. Beautifully Celebrated.") and pastel/cream aesthetic without layout regressions.
- [ ] **Gate 03: Brand & Reusable Footer**  
  Compact logo in header (no tagline), full readable logo in footer, distinct footer background, and all 4 link columns working sitewide.
- [ ] **Gate 04: Navigation Clarity**  
  Primary navigation clearly separates Celebrations, Packages, Shop ("The Celebration Shop"), Events, Gallery, and About Us.
- [ ] **Gate 05: Package Tier Standardization**  
  Only "Essential", "Signature", and "Grand" visible sitewide. Starting price disclaimer present. Gift packaging comparison row uses exact approved copy.
- [ ] **Gate 06: Fixed Package Flow De-duplication**  
  Selecting Signature routes directly through Theme -> Details -> Customize -> Décor -> Review without ever repeating package selection.
- [ ] **Gate 07: Visual Customization Previews**  
  All digital deliverables show visual previews. Physical items feature real photos and Quick-View modal with 7 mandatory fields. Selection quotas enforced.
- [ ] **Gate 08: City-Based Décor Branching**  
  Jaipur users can select or skip 2–3 visual décor options. Non-Jaipur users automatically skip décor with zero data loss and ₹0 décor fee.
- [ ] **Gate 09: Build Your Own Unbundled Freedom**  
  Custom plan contains zero package tiers, zero tier badges, and zero generic bundles. Items grouped by Before/During/After with independent quantities.
- [ ] **Gate 10: Accurate Pricing & Personalization**  
  Quantities scale per pricing rules (welcome items per child, group games fixed, gifts respecting MOQ). Personalization flag reaches admin order.
- [ ] **Gate 11: Standalone E-Commerce Shop**  
  Faceted filters work. Broken product routes (Space Thank-You Tag) fixed. Single product can be bought directly without a celebration package.
- [ ] **Gate 12: Festive Collections & Campaign Popup**  
  Admin can create, archive, and reactivate seasonal collections. Wedding popup purged; CMS campaign popup operational with frequency capping.
- [ ] **Gate 13: Content Accuracy & Editorial Integrity**  
  Events, Gallery, and Journal contain zero wedding or fake content. Coming Soon state operational when no events are active.
- [ ] **Gate 14: Universal Consultation Engine**  
  Form dynamically adapts to all 7 celebration types. Child's age hidden for adult milestones and naming ceremonies. Confirmation modal works.
- [ ] **Gate 15: Authenticated Checkout, Payment & Invoicing**  
  Login-based purchase is operational and approved in writing for the current scope. Gift Registry access is tied to the authenticated customer identity. Failed payments retry safely without duplicates. Itemized invoice generated. Admin order portal operates without errors. Social login remains excluded unless separately approved.

---

## SECTION 23: Development Team Response & Governance Sign-Off

The development team must formally respond to this document by referencing specific CR IDs, assigning responsible owners, and committing to demonstration dates:

| Response Dimension | Development Team Commitment / Status | Responsible Lead | Target Delivery Date |
|---|---|---|---|
| **Critical Items Acceptance** | All Critical items (`CR-01`, `CR-05`, `CR-07`, `CR-08`, `CR-09`, `CR-10`, `CR-11`, `CR-12`, `CR-13`, `CR-14`, `CR-15`, `CR-16`, `CR-21`, `CR-22`, `CR-23`, `CR-24`, `CR-25`, `CR-26`) accepted for current release. | Shubham Deshmukh / Vishal | [Date] |
| **High Items Acceptance** | All High items (`CR-02`, `CR-03`, `CR-04`, `CR-06`, `CR-17`, `CR-18`, `CR-19`, `CR-20`) accepted for current release. | Vishal / Chaitanya | [Date] |
| **Scope Adjustments** | Social login (Google/FB) formally tagged as Later / Separate Scope (Phase 2). | Shubham Deshmukh | Phase 2 |
| **Backend / Admin Portal Fix** | Root-cause resolution of product search & order access crash demonstrated in staging. | Shubham Deshmukh | [Date] |
| **Updated Staging Preview URL** | Deployed on Vercel with clean build and passing automated checks. | Team | [Date & Time] |
| **End-to-End Client Demonstration** | Live walkthrough of all 4 customer journeys with Charu Saxena. | Full Team | [Date & Time] |

---

### Final Acceptance Sign-Off

*By signing below, both parties agree that Phase 1 Go-Live is governed strictly by the criteria in this document. Any unfulfilled item constitutes grounds for withholding approval.*

**For Vaibhav Celebrations:**  
Name: **Charu Saxena**  
Title: Founder, Vaibhav Celebrations  
Signature: ___________________________ Date: ______________

**For Affor Technologies:**  
Name: **Shubham Deshmukh**  
Title: Project Lead & Backend Architect, Affor Technologies  
Signature: ___________________________ Date: ______________
