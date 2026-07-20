# 10 — Content Strategy, SEO & Analytics Implementation Guide

**Owner:** Vishal (technical implementation), Client/Marketing (content authorship + keyword input), Shubham (server-side verification/schema data)
**Source Document:** Content & SEO Guide v1.0 (Vaibhav Celebrations) — this document is its **engineering translation**: every content-strategy idea in the source guide is mapped here to a concrete CMS field, component, or technical SEO implementation task.
**Governs:** SOW 17 (SEO & Analytics)

---

## 1. Purpose

The Content & SEO Guide v1.0 is a content/marketing document. It does not, by itself, tell a developer what field to build or what JSON-LD to output. This document closes that gap so Vishal (and Chaitanya, for admin-side metadata fields) can implement it directly, and so the client's own marketing efforts (she is a digital marketer, per Meeting 1) have a CMS that actually supports the strategy she wants to execute.

---

## 2. Content Philosophy → Component Implication

> "VAIBHAV Celebrations is not selling Return Gifts, Invitations, Activities, Decorations. It is selling Memories... every page should evoke emotions before presenting products or services."

**Implementation implication:** every templated page (Homepage, Theme, Package, Event, Blog) follows the same **hero-first storytelling section order** before any commerce UI appears:

```
Hero (Emotion) → Problem → Solution → Benefits → Social Proof → Call To Action
```

This section order is encoded as the literal component order in each Next.js page template (Document 05 4.2), not left to page-by-page improvisation — this is how "brand voice consistency" becomes an engineering guarantee rather than a hope.

**Brand voice tokens** (Premium, Elegant, Warm, Trustworthy, Creative, Helpful, Inspirational, Professional) are operationalized as: a shared design system (soft shadows, generous whitespace, warm color palette from the client's brand seminar, tasteful motion/micro-interactions) rather than a copy-editing checklist alone — UI/UX carries as much of the "premium feel" as the words do.

---

## 3. Page-by-Page Content Structure → CMS Field Mapping

### 3.1 Homepage (Content & SEO Guide 5)
| Content Block | CMS Source |
|---|---|
| Hero Banner (headline + sub-heading + CTAs) | `SiteMetadata`/dedicated homepage content fields (small, homepage-specific content block — recommend a lightweight `HomepageContent` singleton row rather than overloading `SiteMetadata`) |
| Why Vaibhav Celebrations | Static/CMS-editable rich text block |
| Featured Themes | Pulled live from `Theme` (admin marks `isFeatured` or top-N by `displayOrder`) |
| Featured Packages | Pulled live from `Package` |
| Upcoming Events | Pulled live from `Event` where `scheduleStartAt >= now()` |
| Testimonials | Pulled live from `Testimonial` where `isFeatured = true` |
| Instagram Feed | Client-side embed widget (Instagram Basic Display or a simple embeddable feed widget) — no backend storage needed |
| Final CTA | Static content block |

### 3.2 Theme Page (Content & SEO Guide 6) — maps directly onto SOW 5.2
`Hero Banner → Theme Story → Who is this theme for? → Gallery → What's Included? → Sample Deliverables → Packages → FAQs → CTA` — every one of these fields already exists on the `Theme` model (Document 03 3.2: `storyDescription`, `audienceNote`, `galleryImages`, `ThemeSampleAsset[]`, `ThemePackage[]`) plus a themed FAQ filter (`FAQ.category` or a theme-linked FAQ join if the client wants theme-specific FAQs — flagged as a Phase 1.x nice-to-have if generic FAQs aren't sufficient).

### 3.3 Package Content (Content & SEO Guide 7)
`Who is it for? → What's included? → Why choose this? → Customization options → Pricing → FAQs → CTA` — maps to `Package.description`, `PackageFeature[]`, `PackageCustomizationOption[]`, `priceInPaise`.

### 3.4 Sample Deliverable Content (Content & SEO Guide 8)
Each `ThemeSampleAsset` renders as: Image/Video → Description → Benefits (short static copy per type, can be a shared template string per `SampleAssetType` rather than per-asset authored copy, to reduce content-authoring burden) → Personalization note where relevant → CTA.

### 3.5 Event Page (Content & SEO Guide 9) — maps directly onto SOW 10
`Hero → Event Description → Activities → Age Group → Venue → Schedule → Gallery → Registration → FAQ → CTA` — every field exists on the `Event` model (Document 03 3.6).

### 3.6 Blog (Content & SEO Guide 10–11)
Categories seeded exactly as listed in the guide: Birthday Planning, Theme Ideas, Party Games, Return Gifts, Kids Activities, Parenting, Celebration Ideas, Festivals, DIY, Budget Planning (seeded as `BlogCategory` rows at launch). Post structure `Title → Hero Image → Introduction → Table of Contents → Main Sections → Tips → FAQs → Conclusion → CTA → Related Blogs` is a frontend template concern (rich-text content authored freely within this template shell; ToC can be auto-generated client-side from heading elements rather than manually authored, reducing editorial overhead).

---

## 4. Local SEO Strategy (Content & SEO Guide 12)

Target sequence: **Jaipur → Rajasthan → India.**

**Implementation now (Phase 1):**
- `Organization`/`LocalBusiness` JSON-LD on homepage with accurate NAP (Name, Address, Phone) and `areaServed` set appropriately.
- Google Business Profile (GMB) — client explicitly self-manages this (Meeting 1: *"I'm a digital marketer... I can do that on my own"*), Affor Technologies assists only with the technical pin-pointing challenge if asked.
- Google Search Console + sitemap submission.

**Future (documented now, not built now, per SOW 17's exclusion of "ongoing SEO campaigns"):** dedicated location-intent pages (e.g., "Birthday Planner in Jaipur," "Kids Birthday Themes Jaipur") are a **content/marketing** initiative the client can execute via the Blog module or a future dedicated Landing Page content type — the CMS is built flexibly enough (via `BlogPost`/`Event`/general `SiteMetadata`) to support this later without new engineering, but authoring these pages is not a Phase 1–3 development task.

---

## 5. Keyword Strategy (Content & SEO Guide 13) — Operational Notes

- Primary/secondary/long-tail keyword lists from the source guide are **content inputs**, not code — Vishal ensures the CMS's SEO title/description fields exist everywhere a page needs them (7 below) so the client and Affor Technologies can jointly apply these keywords (Meeting 1: *"we can both work on that part"*) without any developer bottleneck once Phase 1 ships.
- Recommendation carried over from the Content & SEO Guide's own "Product Manager's Strategic Recommendations": build **Content Clusters** (a Pillar Page like "Kids Birthday Parties" linking out to Theme/Package/Blog supporting pages) — technically this just means disciplined internal linking (9 below) and a homepage/blog-index structure that surfaces pillar content prominently; no special "cluster" schema is required.

---

## 6. Technical SEO Checklist (Content & SEO Guide 22) — Engineering Tasks

| Item | Implementation |
|---|---|
| XML Sitemap | Next.js dynamic `sitemap.xml` route, aggregating Themes/Packages/Gallery/Blog/Events/static pages, regenerated on-demand via the same publish-triggered revalidation used for ISR (Document 02 3.1) |
| Robots.txt | Public site: allow-all with sitemap reference. Admin subdomain: **disallow all**, unconditionally |
| Canonical URLs | Set per-page from `SiteMetadata.canonicalUrl` (falls back to the request's own resolved URL if unset) |
| Structured Data | See 8 below |
| Breadcrumbs | Rendered UI component + matching `BreadcrumbList` JSON-LD on Theme/Package/Blog/Event/Product detail pages |
| Open Graph | `og:title`, `og:description`, `og:image`, `og:type` on every templated page, sourced from `SiteMetadata`/per-entity SEO fields, falling back sensibly (entity title/description) if unset |
| Twitter Cards | `summary_large_image` card type mirroring OG data |
| Image Optimization | Next.js `<Image>` + Cloudflare WebP pipeline (Document 09 5.1) |
| Lazy Loading | Default Next.js `<Image>` lazy-loading below the fold; explicit `priority` only on true above-the-fold hero images |
| Core Web Vitals | Tracked via Lighthouse CI spot-checks pre-launch + real-user monitoring via GA4/Web Vitals reporting post-launch |
| HTTPS | Enforced by Vercel/Cloudflare by default; HSTS header confirmed present |

---

## 7. CMS SEO Field Requirements (Content & SEO Guide 28 "Content Governance")

Every new content entity (Theme, Package, Blog Post, Event) must expose, at minimum, in its Admin edit screen:
- Meta title
- Meta description
- URL slug (auto-suggested, editable)
- Hero/featured image (with mandatory-ish alt text, Document 09 3.3-adjacent UX warning)
- Internal links (encouraged via the rich-text editor's native link tooling — no special schema needed, an editorial discipline documented in Document 11's content workflow)

This is already fully reflected in the `Theme`, `Package`, `BlogPost`, `Event` models (Document 03) via their `seoTitle`/`seoDescription`/slug/hero-image fields — **no schema gap exists**; the task is purely front-end form + validation (soft-required, not hard-blocking, to avoid frustrating a content editor mid-edit) plus an SEO-review step in the editorial workflow (11 below).

---

## 8. Schema (JSON-LD) Strategy (Content & SEO Guide 21) — Concrete Output Per Page Type

| Page Type | Schema Types Emitted |
|---|---|
| Homepage | `Organization`, `LocalBusiness`, `WebSite` (with `SearchAction` if an internal search exists) |
| Blog Post | `Article`, `FAQPage` (if the post has an FAQ section), `BreadcrumbList` |
| Event Page | `Event` (with `startDate`, `endDate`, `location`, `offers` if paid registration) |
| Product Detail (Phase 2) | `Product` (with `Offer`, `AggregateRating` if reviews exist) |
| Testimonials-bearing pages | `Review`/`AggregateRating` where testimonials are shown |
| Theme/Package pages | `BreadcrumbList`, and optionally `Product`-adjacent structured data if the client wants packages to appear as bookable "services"/products in rich results (evaluate against Google's guidelines for service schema before implementing, to avoid a rich-results penalty for mismatched schema) |

Example (Event schema, illustrative):
```json
{
  "@context": "https://schema.org",
  "@type": "Event",
  "name": "Monsoon Magic Kids Play Date",
  "startDate": "2026-08-02T16:00:00+05:30",
  "endDate": "2026-08-02T19:00:00+05:30",
  "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
  "location": { "@type": "Place", "name": "Vaibhav Celebrations Venue", "address": "..." },
  "image": ["https://cdn.vaibhavcelebrations.in/events/monsoon-magic.webp"],
  "organizer": { "@type": "Organization", "name": "Vaibhav Celebrations" }
}
```
All JSON-LD builders live in `frontend/src/lib/seo/` (Document 02 3.1) as small, testable pure functions taking a CMS entity and returning a schema object — never hand-written inline JSON scattered through page components.

---

## 9. Internal Linking Strategy (Content & SEO Guide 20)

`Homepage → Themes → Packages → Booking → Blogs → Contact`, plus the Gallery-to-Theme tag-based navigation already specified in SOW 5.3/Document 03 3.3. Engineering tasks:
- Related-content modules on Theme pages (linked Packages, related Gallery images) and Blog posts (Related Blogs by shared category/tag) — implemented as straightforward queries, not a recommendation engine.
- Breadcrumbs (6 above) double as internal links.
- Footer sitewide links to key pillar pages (Themes index, Packages index, Blog index, Contact, Legal pages).

---

## 10. Image & Video Guidelines (Content & SEO Guide 17–18)

- **Images:** original, high-resolution, bright/minimal/luxury aesthetic (a content/photography guideline for the client, enforced at the CMS layer only via mandatory alt text + automatic WebP conversion + compression on upload).
- **Videos:** 30–90 second cap, subtitles + brand logo + CTA baked into the video asset itself (a production/content guideline, not a platform feature) — the platform's job is simply to host/serve these efficiently (Cloudflare Stream or direct MP4 delivery via CDN, decided based on video volume once Phase 1 sample assets are in hand).

---

## 11. Content Governance & Approval Workflow (Content & SEO Guide 27)

```
Content Draft → SEO Review → Brand Review → Founder Approval → Upload (Admin CMS) → Quality Check → Publish → Index in GSC → Performance Monitoring
```
**Engineering support for this workflow:** the CMS's `BlogStatus`/`isActive` fields directly support a Draft → Published pipeline; a lightweight **"Draft Preview" link** (a signed, unlisted preview URL for a not-yet-published Theme/Package/Blog/Event) is a valuable Phase 1.x addition that lets the client/founder review content before it's public — flagged as a nice-to-have enhancement, not a hard MVP requirement, but cheap to add given ISR/preview-mode support already exists natively in Next.js.

---

## 12. Analytics & KPIs (Content & SEO Guide 26)

| KPI | Source |
|---|---|
| Organic Traffic | GA4 |
| Keyword Rankings | Google Search Console (manual/periodic review — no rank-tracking subscription in scope) |
| Conversion Rate, Form Submissions | GA4 custom events (booking completed, consultation submitted, lead captured, event registration completed — Document 05 9) |
| Consultation Bookings, Event Registrations | Also visible directly in Admin CRM (Document 08 6) — the client does not need to leave the Admin Panel to see these core numbers day-to-day |
| Bounce Rate, Avg. Session Duration, CTR, Returning Visitors | GA4 standard reports |

**Marketing integration (Content & SEO Guide 28):** every ad campaign landing page (the Event Page template, SOW 10) supports UTM parameter pass-through (captured and stored on `EventRegistration`/`Lead` records where relevant) + Meta Pixel + GA4 conversion events out of the box — this is exactly the destination-page capability the client described wanting for her Google/Facebook ad campaigns in Meeting 1.

---

## 13. EEAT & Trust Signals (Content & SEO Guide, Product Manager's Recommendation #5)

Engineering enablers for Experience/Expertise/Authoritativeness/Trustworthiness, so the client's own content efforts have the right platform hooks:
- Real testimonials with ratings (already modeled, `Testimonial`).
- Author attribution on blog posts (`BlogPost.authorName` — consider extending to a small `Author` entity with bio/photo in a later iteration if the client wants named-author EEAT signals; flagged as a Phase 1.x enhancement, not a blocker).
- Original photography emphasis is a content-sourcing responsibility (client-provided assets per SOW 39), not a platform feature — the CMS simply needs to make high-quality image display effortless, which it already does via the Media Library + Cloudflare pipeline.

---

## 14. Editorial Calendar (Content & SEO Guide 24) — Not a Platform Feature, a Process

Weekly (1 Blog, 1 Theme Spotlight, 1 Customer Story) and Monthly (1 Seasonal Landing Page, 1 Event Announcement, 1 Ultimate Guide) cadences are a **client/marketing operating rhythm**, fully supported by the existing Blog/Theme/Event CMS modules with zero additional engineering — captured here so the development team understands *why* the CMS needs to feel fast and low-friction for frequent, small content updates (reinforcing the "operational speed over bespoke polish" principle from Document 08 1, applied here specifically to content-authoring velocity).
