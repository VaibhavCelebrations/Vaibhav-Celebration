# 03 — Database Schema & Data Model (Phase 1 → Phase 3)

**Owner:** Shubham Deshmukh (Backend)
**Format:** Prisma-style schema (PostgreSQL). This is the authoritative data contract referenced by Document 04 (API) and by all three phase plans.
**Design rule:** The schema below is written **once, for all three phases**, so that Phase 2/3 tables can be migrated in additively without ever altering the shape of Phase 1 tables in a breaking way. Every business-critical table includes `deletedAt` (soft delete, SOW 16) and `createdAt`/`updatedAt` audit timestamps.

---

## 1. Conventions

- Primary keys: `id` — `cuid()` (URL-safe, sortable-enough, no sequential-ID enumeration risk on public-facing IDs).
- Human-facing identifiers (shown to customers) are **separate** from the internal `id`: e.g. `bookingCode` (`VBC-BK-2026-000123`), `orderCode` (`VBC-OR-2026-000456`), `invoiceNumber`. These are generated server-side, sequential-per-year for finance/GST friendliness, but never expose the internal DB primary key pattern.
- Money stored as **integer paise** (`priceInPaise Int`) to avoid floating-point rounding errors — never `Float` for currency.
- All enums are Prisma enums (mapped to Postgres enums) for referential clarity in code review.
- `deletedAt DateTime?` = soft delete marker; a Prisma middleware ("soft-delete guard") auto-filters `deletedAt: null` on all default finds — see Document 09 "Data Access Layer Conventions".

---

## 2. Entity Relationship Overview (textual ERD)

```
AdminUser ──< AuditLog
AdminUser ──< Role (many-to-many via AdminUserRole)

Theme ──< ThemeGalleryImage
Theme ──< ThemePackage (join: which packages are offered under a theme, with theme-specific overrides)
Theme ──< EventLink (optional: event tied to a theme)

Package ──< PackageFeature (deliverable line items + quantities)
Package ──< PackageAddOn (extra paid services, references AddOnService)
Package ──< PackageCustomizationOption ("the extra column" pricing engine)
Package ──< GiftRegistryEligibilityRule

GalleryImage }──< GalleryTag (many-to-many via GalleryImageTag) ──> Theme (optional link)

Customer ──< Booking
Customer ──< ConsultationRequest
Customer ──< Order (Phase 2)
Customer ──< Lead
Customer ──< GiftRegistry (as owner)

Booking ──> Theme, Package
Booking ──< BookingCustomization (selected add-ons/customizations)
Booking ──< Invoice
Booking ──< GiftRegistry (1:1 optional, Phase 3)
Booking ──> BookingCapacityRule (evaluated, not stored FK)

Order (Phase 2) ──< OrderItem ──> Product
Order ──< Invoice
Product ──< ProductVariant / PersonalizationField
Product }──< ProductCategory, Theme (tag-style association)
Product ──< InventoryLedgerEntry

GiftRegistry ──< GiftRegistryItem (external or internal product link)
GiftRegistryItem ──< GiftReservation

Lead ──< ChatbotSession (nullable; leads may come from consultation/contact/chatbot)
ConsultationRequest ──> Customer (optional; may be pre-verification)

Event ──< EventRegistration
BlogPost ──< BlogCategory/BlogTag (many-to-many)
FAQ, Testimonial, Popup, LegalPage, SiteMetadata — standalone CMS content types
```

---

## 3. Phase 1 Schema — Core Platform

### 3.1 Admin, Auth & Audit

```prisma
enum AdminRole {
  SUPER_ADMIN   // full access incl. user management, settings, financial exports
  OPERATIONS    // bookings, customers, leads, calendar, invoices — no settings/user mgmt
  CONTENT_EDITOR // CMS only: themes, packages copy, gallery, blog, FAQs, testimonials, events, popups
}

model AdminUser {
  id            String     @id @default(cuid())
  name          String
  email         String     @unique
  passwordHash  String
  role          AdminRole  @default(OPERATIONS)
  isActive      Boolean    @default(true)
  lastLoginAt   DateTime?
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt
  deletedAt     DateTime?
  auditLogs     AuditLog[]
}

model AuditLog {
  id          String    @id @default(cuid())
  adminUserId String
  adminUser   AdminUser @relation(fields: [adminUserId], references: [id])
  action      String    // e.g. "PACKAGE_UPDATED", "BOOKING_STATUS_CHANGED", "PRODUCT_DELETED"
  entityType  String
  entityId    String
  metadata    Json?     // before/after diff snapshot
  ipAddress   String?
  createdAt   DateTime  @default(now())
}

model GuestVerificationToken {
  id           String    @id @default(cuid())
  referenceCode String   // bookingCode / orderCode / registry ownerCode being accessed
  referenceType String   // "BOOKING" | "ORDER" | "REGISTRY"
  email        String
  otpHash      String
  otpExpiresAt DateTime
  verifiedAt   DateTime?
  attemptCount Int       @default(0)
  createdAt    DateTime  @default(now())
}
```

> `GuestVerificationToken` is the single reusable implementation of SOW 4's Order-ID + Email-OTP flow, shared across Booking, Order and Gift Registry access (Document 01 4).

### 3.2 CMS — Themes, Packages, Gallery

```prisma
model Theme {
  id              String     @id @default(cuid())
  title           String
  slug            String     @unique
  shortDescription String
  storyDescription String?   @db.Text   // "Theme Story" per Content & SEO Guide 6
  audienceNote    String?               // "Who is this theme for?"
  heroImageId     String?
  heroImage       MediaAsset? @relation(fields: [heroImageId], references: [id])
  isActive        Boolean    @default(true)
  displayOrder    Int        @default(0)
  seoTitle        String?
  seoDescription  String?
  ogImageId       String?
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt
  deletedAt       DateTime?

  galleryImages   GalleryImage[]        @relation("ThemeGallery")
  packages        ThemePackage[]
  sampleAssets    ThemeSampleAsset[]     // digital invite/video invite/parent brief/countdown/activity-kit previews
  bookings        Booking[]
  products        ProductThemeTag[]     // Phase 2
}

enum SampleAssetType {
  DIGITAL_INVITE
  VIDEO_INVITE
  PARENT_PARTY_BRIEF
  COUNTDOWN_CARD
  ACTIVITY_KIT
  RETURN_GIFT_PREVIEW
  OTHER
}

model ThemeSampleAsset {
  id        String          @id @default(cuid())
  themeId   String
  theme     Theme           @relation(fields: [themeId], references: [id])
  type      SampleAssetType
  title     String
  mediaId   String
  media     MediaAsset      @relation(fields: [mediaId], references: [id])
  description String?
  displayOrder Int          @default(0)
  createdAt DateTime        @default(now())
  deletedAt DateTime?
}

model Package {
  id              String     @id @default(cuid())
  title           String     // "Standard" / "Premium" / "Luxe" (admin-editable)
  slug            String     @unique
  priceInPaise    Int
  tierRank        Int        // 1=entry, 2=middle, 3=top — drives comparison ordering & "Most Popular" default logic
  isRecommended   Boolean    @default(false)   // Premium badge/pip (Meeting 2)
  isActive        Boolean    @default(true)
  isCustomizable  Boolean    @default(true)
  displayOrder    Int        @default(0)
  description     String?    @db.Text
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt
  deletedAt       DateTime?

  features        PackageFeature[]
  addOns          PackageAddOn[]
  customizationOptions PackageCustomizationOption[]
  themeLinks      ThemePackage[]
  giftRegistryRule GiftRegistryEligibilityRule?
  bookings        Booking[]
}

model ThemePackage {
  id          String   @id @default(cuid())
  themeId     String
  theme       Theme    @relation(fields: [themeId], references: [id])
  packageId   String
  package     Package  @relation(fields: [packageId], references: [id])
  priceOverrideInPaise Int?   // optional theme-specific price override
  isActive    Boolean  @default(true)

  @@unique([themeId, packageId])
}

model PackageFeature {
  id            String   @id @default(cuid())
  packageId     String
  package       Package  @relation(fields: [packageId], references: [id])
  label         String   // "Activity Kits", "Countdown Cards", "Digital Invite"...
  quantity      Int      @default(1)
  unit          String?  // "kits", "cards", "pcs"
  sampleAssetType SampleAssetType?  // links to a ThemeSampleAsset "View Sample" preview when rendered per-theme
  displayOrder  Int      @default(0)
  deletedAt     DateTime?
}

model AddOnService {
  id            String   @id @default(cuid())
  title         String
  priceInPaise  Int
  isActive      Boolean  @default(true)
  minQuantity   Int      @default(1)
  maxQuantity   Int?
  createdAt     DateTime @default(now())
  deletedAt     DateTime?

  packageLinks  PackageAddOn[]
}

model PackageAddOn {
  id             String       @id @default(cuid())
  packageId      String
  package        Package      @relation(fields: [packageId], references: [id])
  addOnServiceId String
  addOnService   AddOnService @relation(fields: [addOnServiceId], references: [id])
  isDefaultIncluded Boolean   @default(false)

  @@unique([packageId, addOnServiceId])
}
```

#### 3.2.1 The "Extra Column" Package Customization Engine

Directly implements Meeting 1: *"almost all the options will be same. Just... whether we need to integrate or need to provide this into particular package or not. And for that if there is additional requirement, we will be implementing a column. So in customization for calculation, we will be using that column only."*

```prisma
model PackageCustomizationOption {
  id             String   @id @default(cuid())
  packageId      String
  package        Package  @relation(fields: [packageId], references: [id])
  label          String            // "Extra Return Gift Bag", "Additional Photographer Hour"
  extraPriceInPaise Int            // this IS "the extra column" — the delta charge above base package price
  minQuantity    Int      @default(0)
  maxQuantity    Int?
  isActive       Boolean  @default(true)
  displayOrder   Int      @default(0)
  deletedAt      DateTime?
}
```

This single table is what lets the Admin Panel present the "Fiverr-gig-style" configurator: for every package, admin toggles which `PackageCustomizationOption` rows apply and what their price delta is; frontend renders them as quantity-steppers at customization time; backend sums `basePriceInPaise + Σ(selectedOption.extraPriceInPaise × quantity)` at checkout — this exact formula is the pricing engine referenced across Documents 04 and 05.

### 3.3 Gallery

```prisma
model GalleryImage {
  id           String    @id @default(cuid())
  mediaId      String
  media        MediaAsset @relation(fields: [mediaId], references: [id])
  caption      String?
  altText      String     // mandatory, per Content & SEO Guide 17
  themeId      String?
  theme        Theme?     @relation("ThemeGallery", fields: [themeId], references: [id])
  ctaType      GalleryCtaType @default(NONE)
  ctaTargetSlug String?   // theme slug / package slug / event slug
  isActive     Boolean    @default(true)
  displayOrder Int        @default(0)
  createdAt    DateTime   @default(now())
  deletedAt    DateTime?

  tags         GalleryImageTag[]
}

enum GalleryCtaType { NONE THEME PACKAGE EVENT BOOKING }

model GalleryTag {
  id    String @id @default(cuid())
  name  String @unique
  images GalleryImageTag[]
}

model GalleryImageTag {
  galleryImageId String
  galleryImage   GalleryImage @relation(fields: [galleryImageId], references: [id])
  tagId          String
  tag            GalleryTag   @relation(fields: [tagId], references: [id])

  @@id([galleryImageId, tagId])
}

model MediaAsset {
  id           String   @id @default(cuid())
  url          String   // Cloudflare-hosted URL
  cdnKey       String   // internal object key, for lifecycle/deletion management
  type         String   // "image" | "video" | "pdf"
  altText      String?
  width        Int?
  height       Int?
  sizeBytes    Int?
  uploadedByAdminUserId String?
  createdAt    DateTime @default(now())
  deletedAt    DateTime?
}
```

### 3.4 Testimonials, FAQs, Popups, Legal, SEO Metadata

```prisma
enum TestimonialSubjectType { THEME PACKAGE GENERAL }

model Testimonial {
  id            String   @id @default(cuid())
  customerName  String
  content       String   @db.Text
  rating        Int?     // 1-5; used for Themes (SOW 14.1: ratings on Themes, testimonials-only on Packages)
  subjectType   TestimonialSubjectType
  themeId       String?
  theme         Theme?   @relation(fields: [themeId], references: [id])
  packageId     String?
  package       Package? @relation(fields: [packageId], references: [id])
  isFeatured    Boolean  @default(false)
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  deletedAt     DateTime?
}

model FAQ {
  id           String   @id @default(cuid())
  question     String
  answer       String   @db.Text
  category     String?  // "Booking", "Packages", "Payments", "Events"...
  displayOrder Int      @default(0)
  isActive     Boolean  @default(true)
  deletedAt    DateTime?
}

enum PopupPlacement { HOMEPAGE THEMES_PAGE PACKAGES_PAGE GALLERY_PAGE }

model Popup {
  id           String        @id @default(cuid())
  title        String
  bodyText     String?
  imageId      String?
  ctaLabel     String?
  ctaUrl       String?
  placements   PopupPlacement[]
  triggerAfterSeconds Int    @default(5)   // Meeting 1: "if user does not change a particular page in 4 to 5 seconds"
  linkedEventId String?
  linkedEvent  Event?        @relation(fields: [linkedEventId], references: [id])
  isActive     Boolean       @default(true)
  startsAt     DateTime?
  endsAt       DateTime?
  deletedAt    DateTime?
}

enum LegalPageType { REFUND_POLICY TERMS_OF_SERVICE PRIVACY_POLICY CANCELLATION_POLICY }

model LegalPage {
  id        String        @id @default(cuid())
  type      LegalPageType @unique
  title     String
  bodyHtml  String        @db.Text
  updatedAt DateTime      @updatedAt
  publishedAt DateTime?
}

model SiteMetadata {
  id              String   @id @default(cuid())
  pageKey         String   @unique  // "home", "themes", "gallery", or a dynamic slug key
  metaTitle       String?
  metaDescription String?
  ogImageId       String?
  canonicalUrl    String?
  schemaJsonLd    Json?
  updatedAt       DateTime @updatedAt
}
```

### 3.5 Blog

```prisma
model BlogPost {
  id             String   @id @default(cuid())
  title          String
  slug           String   @unique
  featuredImageId String?
  contentHtml    String   @db.Text
  excerpt        String?
  authorName     String?
  status         BlogStatus @default(DRAFT)
  publishedAt    DateTime?
  seoTitle       String?
  seoDescription String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  deletedAt      DateTime?

  categories     BlogPostCategory[]
  tags           BlogPostTag[]
}

enum BlogStatus { DRAFT PUBLISHED UNPUBLISHED }

model BlogCategory { id String @id @default(cuid()) name String @unique posts BlogPostCategory[] }
model BlogTag      { id String @id @default(cuid()) name String @unique posts BlogPostTag[] }
model BlogPostCategory { blogPostId String; blogPost BlogPost @relation(fields:[blogPostId], references:[id]); categoryId String; category BlogCategory @relation(fields:[categoryId], references:[id]); @@id([blogPostId, categoryId]) }
model BlogPostTag      { blogPostId String; blogPost BlogPost @relation(fields:[blogPostId], references:[id]); tagId String; tag BlogTag @relation(fields:[tagId], references:[id]); @@id([blogPostId, tagId]) }
```

### 3.6 Events / Campaign Landing Pages

```prisma
model Event {
  id              String   @id @default(cuid())
  title           String
  slug            String   @unique
  bannerMediaId   String?
  description     String   @db.Text
  activities      Json?    // structured list [{title, description, icon}]
  ageGroup        String?
  venue           String?
  scheduleStartAt DateTime?
  scheduleEndAt   DateTime?
  isRegistrationOpen Boolean @default(true)
  registrationFeeInPaise Int? // 0/null = free registration
  themeId         String?     // optional link back to a Theme (asset reuse)
  theme           Theme?      @relation(fields: [themeId], references: [id])
  seoTitle        String?
  seoDescription  String?
  isActive        Boolean     @default(true)
  createdAt       DateTime    @default(now())
  deletedAt       DateTime?

  registrations   EventRegistration[]
  popups          Popup[]
}

model EventRegistration {
  id           String   @id @default(cuid())
  eventId      String
  event        Event    @relation(fields: [eventId], references: [id])
  name         String
  email        String
  phone        String
  guestCount   Int?     @default(1)
  notes        String?
  paymentStatus PaymentStatus @default(NOT_REQUIRED)
  amountPaidInPaise Int?
  razorpayOrderId String?
  razorpayPaymentId String?
  createdAt    DateTime @default(now())
  deletedAt    DateTime?
}
```

### 3.7 Customers, Leads, Consultations (CRM Foundation)

```prisma
model Customer {
  id           String   @id @default(cuid())
  fullName     String
  email        String
  phone        String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  deletedAt    DateTime?

  // NOTE: intentionally NO passwordHash / auth fields — guest-first model (SOW 4)
  bookings        Booking[]
  orders          Order[]
  consultations   ConsultationRequest[]
  leads           Lead[]
  giftRegistries  GiftRegistry[]
  invoices        Invoice[]
  notes           CustomerNote[]

  @@index([email])
  @@index([phone])
}

model CustomerNote {
  id          String   @id @default(cuid())
  customerId  String
  customer    Customer @relation(fields: [customerId], references: [id])
  authorAdminUserId String
  note        String   @db.Text
  createdAt   DateTime @default(now())
}

enum LeadSource { CHATBOT CONTACT_FORM CONSULTATION EVENT_REGISTRATION NEWSLETTER OTHER }
enum LeadStatus { NEW CONTACTED QUALIFIED CONVERTED CLOSED_LOST }

model Lead {
  id           String     @id @default(cuid())
  customerId   String?
  customer     Customer?  @relation(fields: [customerId], references: [id])
  name         String
  email        String?
  phone        String?
  source       LeadSource
  status       LeadStatus @default(NEW)
  interestArea String?    // "Birthday Party", "Return Gifts", "Custom Celebration"...
  message      String?
  chatbotSessionId String?
  chatbotSession ChatbotSession? @relation(fields: [chatbotSessionId], references: [id])
  createdAt    DateTime   @default(now())
  deletedAt    DateTime?
}

model ChatbotSession {
  id            String   @id @default(cuid())
  path          Json     // ordered list of {questionKey, selectedOptionKey}
  resultTag     String?  // final classification bucket
  createdAt     DateTime @default(now())
  leads         Lead[]
}

enum ConsultationStatus { PENDING REVIEWED SCHEDULED COMPLETED DECLINED }

model ConsultationRequest {
  id              String   @id @default(cuid())
  customerId      String?
  customer        Customer? @relation(fields: [customerId], references: [id])
  name            String
  email           String
  phone           String
  eventDate       DateTime
  childOrEventDetails String?
  customRequirements String? @db.Text
  advanceNoticeDays  Int     // computed at submission = eventDate - now, snapshotted
  belowMinimumNotice Boolean @default(false)  // true if advanceNoticeDays < configured minimum
  status          ConsultationStatus @default(PENDING)
  createdAt       DateTime @default(now())
  deletedAt       DateTime?
}
```

### 3.8 Bookings, Availability & Capacity

```prisma
enum BookingStatus { SCHEDULED CONFIRMED IN_PROGRESS COMPLETED CANCELLED }
enum PaymentStatus { NOT_REQUIRED PENDING PAID FAILED REFUNDED PARTIALLY_REFUNDED }

model Booking {
  id              String   @id @default(cuid())
  bookingCode     String   @unique  // "VBC-BK-2026-000123"
  customerId      String
  customer        Customer @relation(fields: [customerId], references: [id])
  themeId         String
  theme           Theme    @relation(fields: [themeId], references: [id])
  packageId       String
  package         Package  @relation(fields: [packageId], references: [id])
  eventDate       DateTime @db.Date
  status          BookingStatus @default(SCHEDULED)
  paymentStatus   PaymentStatus @default(PENDING)
  basePriceInPaise Int
  customizationTotalInPaise Int @default(0)
  gstInPaise      Int      @default(0)
  totalPriceInPaise Int
  razorpayOrderId String?
  razorpayPaymentId String?
  guestEmail      String
  guestPhone      String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  deletedAt       DateTime?

  customizations  BookingCustomization[]
  invoice         Invoice?
  giftRegistry    GiftRegistry?

  @@index([eventDate])
  @@index([bookingCode])
}

model BookingCustomization {
  id             String   @id @default(cuid())
  bookingId      String
  booking        Booking  @relation(fields: [bookingId], references: [id])
  optionId       String
  option         PackageCustomizationOption @relation(fields: [optionId], references: [id])
  quantity       Int
  unitPriceInPaise Int    // snapshot of extraPriceInPaise at time of booking (price history integrity)
}

model BookingCapacityRule {
  id             String   @id @default(cuid())
  scope          CapacityScope @default(GLOBAL_DEFAULT)
  specificDate   DateTime? @db.Date   // set only when scope = SPECIFIC_DATE
  maxBookingsPerDay Int
  isBlocked      Boolean  @default(false)  // fully blocked/unavailable date
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

enum CapacityScope { GLOBAL_DEFAULT SPECIFIC_DATE }
```

**Overbooking-prevention query pattern** (implemented as a serializable transaction at the API layer, see Document 04 "Booking Availability & Locking"):
```sql
SELECT COUNT(*) FROM "Booking"
WHERE "eventDate" = :requestedDate AND "deletedAt" IS NULL AND status != 'CANCELLED';
-- compare against BookingCapacityRule for that date (specific override, else GLOBAL_DEFAULT)
```

### 3.9 Consultation Minimum Advance-Notice Configuration

```prisma
model OperationalSetting {
  id     String @id @default(cuid())
  key    String @unique   // "MIN_CONSULTATION_ADVANCE_DAYS", "DEFAULT_GST_PERCENT", "GIFT_REGISTRY_VALIDITY_DAYS", "OUT_OF_STOCK_AUTO_FLAG_DAYS", "ECOM_MAX_QTY_PER_PRODUCT"
  value  String            // stored as string, parsed per key's known type
  updatedAt DateTime @updatedAt
}
```

A single generic key/value settings table intentionally avoids hardcoding client-tunable business rules (GST %, minimum consultation notice, capacity defaults, registry validity, e-commerce quantity caps, out-of-stock auto-flag window) directly in code — every one of these numbers was explicitly called out across the meetings as "to be confirmed/configured," so the schema treats them as **data**, not constants.

### 3.10 Invoices

```prisma
enum InvoiceLinkedType { BOOKING ORDER EVENT_REGISTRATION }

model Invoice {
  id              String   @id @default(cuid())
  invoiceNumber   String   @unique  // sequential per financial year, e.g. "VBC/2026-27/000045"
  linkedType      InvoiceLinkedType
  bookingId       String?  @unique
  booking         Booking? @relation(fields: [bookingId], references: [id])
  orderId         String?  @unique
  order           Order?   @relation(fields: [orderId], references: [id])
  customerId      String
  customer        Customer @relation(fields: [customerId], references: [id])
  subtotalInPaise Int
  gstInPaise      Int
  totalInPaise    Int
  pdfUrl          String?   // Cloudflare-hosted generated PDF
  emailSentAt     DateTime?
  whatsappSentAt  DateTime?
  whatsappSendStatus String? // "SENT" | "FAILED" | "SKIPPED_NO_API"
  issuedAt        DateTime @default(now())
  deletedAt       DateTime?

  @@index([issuedAt])
}
```

Bulk export (SOW 13) is a read-only query over this table filtered by date range — no additional schema needed, implemented as an API + Admin UI feature (Document 04, Document 08).

---

## 4. Phase 2 Schema — Independent E-Commerce (Additive)

```prisma
model ProductCategory {
  id    String @id @default(cuid())
  name  String @unique   // "Return Gifts", "Activity Kits", "Personalized Gifts", "Stationery"...
  slug  String @unique
  products ProductCategoryTag[]
}

model Product {
  id              String   @id @default(cuid())
  title           String
  slug            String   @unique
  sku             String   @unique
  description     String   @db.Text
  priceInPaise    Int
  isActive        Boolean  @default(true)
  minOrderQuantity Int     @default(1)
  maxOrderQuantity Int?    // enforced against OperationalSetting default cap if null
  addedToInventoryAt DateTime @default(now())  // drives the "stale listing" auto out-of-stock flag
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  deletedAt       DateTime?

  images          ProductImage[]
  categories      ProductCategoryTag[]
  themeTags       ProductThemeTag[]
  personalizationFields ProductPersonalizationField[]
  inventory       InventoryRecord?
  orderItems      OrderItem[]
  giftRegistryItems GiftRegistryItem[] @relation("InternalProductLink")
}

model ProductImage {
  id        String @id @default(cuid())
  productId String
  product   Product @relation(fields: [productId], references: [id])
  mediaId   String
  media     MediaAsset @relation(fields: [mediaId], references: [id])
  displayOrder Int @default(0)
}

model ProductCategoryTag {
  productId  String
  product    Product         @relation(fields: [productId], references: [id])
  categoryId String
  category   ProductCategory @relation(fields: [categoryId], references: [id])
  @@id([productId, categoryId])
}

model ProductThemeTag {
  productId String
  product   Product @relation(fields: [productId], references: [id])
  themeId   String
  theme     Theme   @relation(fields: [themeId], references: [id])
  @@id([productId, themeId])
}

model ProductPersonalizationField {
  id         String @id @default(cuid())
  productId  String
  product    Product @relation(fields: [productId], references: [id])
  fieldKey   String   // "childName", "age", "customText"
  label      String
  fieldType  String   // "text" | "number" | "shortText"
  isRequired Boolean  @default(false)
  maxLength  Int?
}

enum StockStatusFlag { IN_STOCK LOW_STOCK OUT_OF_STOCK STALE_AUTO_FLAGGED }

model InventoryRecord {
  id                String   @id @default(cuid())
  productId         String   @unique
  product           Product  @relation(fields: [productId], references: [id])
  quantityAvailable Int
  lowStockThreshold Int      @default(10)   // drives "Only X left" messaging (Meeting 2)
  statusFlag        StockStatusFlag @default(IN_STOCK)
  lastRestockedAt   DateTime?
  updatedAt         DateTime @updatedAt

  ledgerEntries      InventoryLedgerEntry[]
}

enum InventoryLedgerReason { RESTOCK SALE MANUAL_ADJUSTMENT RETURN AUTO_FLAG_STALE }

model InventoryLedgerEntry {
  id            String   @id @default(cuid())
  inventoryRecordId String
  inventoryRecord InventoryRecord @relation(fields: [inventoryRecordId], references: [id])
  changeQuantity Int     // negative on sale, positive on restock
  reason        InventoryLedgerReason
  orderItemId   String?
  createdAt     DateTime @default(now())
}

enum OrderStatus { PENDING_PAYMENT PAID PROCESSING SHIPPED DELIVERED CANCELLED REFUNDED }

model Order {
  id             String   @id @default(cuid())
  orderCode      String   @unique  // "VBC-OR-2026-000456"
  customerId     String
  customer       Customer @relation(fields: [customerId], references: [id])
  status         OrderStatus @default(PENDING_PAYMENT)
  subtotalInPaise Int
  gstInPaise      Int
  totalInPaise    Int
  shippingAddress Json    // {line1, line2, city, state, pincode, country}
  guestEmail      String
  guestPhone      String
  razorpayOrderId String?
  razorpayPaymentId String?
  linkedBookingId String?  // optional cross-link when purchased alongside/via a package customization flow
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  deletedAt       DateTime?

  items           OrderItem[]
  invoice         Invoice?

  @@index([orderCode])
}

model OrderItem {
  id                String   @id @default(cuid())
  orderId           String
  order             Order    @relation(fields: [orderId], references: [id])
  productId         String
  product           Product  @relation(fields: [productId], references: [id])
  quantity          Int
  unitPriceInPaise  Int      // price snapshot at purchase time
  personalizationValues Json? // {childName: "Aarav", age: "5"}
  inventoryLedgerEntryId String?
}
```

**Cross-linking with Package Customization (SOW 24):** implemented by allowing `PackageCustomizationOption` (Phase 1 table) to optionally reference a `Product.id` (nullable FK added in a Phase-2 migration: `linkedProductId`). This lets Admin surface e-commerce products *inside* the booking customization step without duplicating catalog data — a good example of "build once, extend additively."

---

## 5. Phase 3 Schema — Gift Registry (Additive)

```prisma
enum RegistryStatus { ACTIVE EXPIRED ARCHIVED }

model GiftRegistry {
  id             String   @id @default(cuid())
  registryCode   String   @unique          // public identifier used in the private URL
  passwordHash   String                     // owner-settable; system-generated default at creation
  ownerCustomerId String
  ownerCustomer   Customer @relation(fields: [ownerCustomerId], references: [id])
  bookingId      String?  @unique
  booking        Booking? @relation(fields: [bookingId], references: [id])
  childOrPersonName String?
  celebrationDetails String? @db.Text
  photoMediaId   String?
  shippingAddress Json?
  status         RegistryStatus @default(ACTIVE)
  activatedAt    DateTime @default(now())
  expiresAt      DateTime                    // activatedAt + OperationalSetting("GIFT_REGISTRY_VALIDITY_DAYS")
  createdAt      DateTime @default(now())
  deletedAt      DateTime?

  items          GiftRegistryItem[]

  @@index([registryCode])
  @@index([expiresAt])
}

enum GiftLinkSourceType { EXTERNAL_LINK INTERNAL_PRODUCT }
enum GiftItemStatus { AVAILABLE RESERVED PURCHASED }

model GiftRegistryItem {
  id                String   @id @default(cuid())
  registryId        String
  registry          GiftRegistry @relation(fields: [registryId], references: [id])
  sourceType        GiftLinkSourceType
  externalUrl       String?
  extractedTitle    String?
  extractedImageUrl String?
  extractedPrice    String?              // stored as text; external prices aren't guaranteed structured
  metadataFetchStatus String?            // "SUCCESS" | "PARTIAL" | "FAILED" | "MANUAL"
  manualTitle       String?              // fallback if auto-extraction fails (SOW 29)
  manualImageMediaId String?
  internalProductId String?
  internalProduct   Product? @relation("InternalProductLink", fields: [internalProductId], references: [id])
  status            GiftItemStatus @default(AVAILABLE)
  displayOrder      Int      @default(0)
  createdAt         DateTime @default(now())
  deletedAt         DateTime?

  reservations      GiftReservation[]
}

model GiftReservation {
  id             String   @id @default(cuid())
  registryItemId String
  registryItem   GiftRegistryItem @relation(fields: [registryItemId], references: [id])
  guestName      String?
  guestContact   String?          // optional, self-reported by the confirming guest
  confirmedAt    DateTime @default(now())
  isReversed     Boolean  @default(false)  // owner can undo an incorrect confirmation (SOW 29 "edit the section")
}
```

**Expiry job (Document 02 12, Document 07):** a scheduled job runs at least daily: `UPDATE GiftRegistry SET status='EXPIRED' WHERE status='ACTIVE' AND expiresAt < now()`. Soft-delete/archival of expired registries follows the same `deletedAt` convention and the client-configured retention approach (SOW 32).

**Gift Registry eligibility (Document 01 6):**
```prisma
model GiftRegistryEligibilityRule {
  id         String  @id @default(cuid())
  packageId  String  @unique
  package    Package @relation(fields: [packageId], references: [id])
  isIncluded Boolean @default(false)   // true for Premium/Luxe by default configuration
  upgradeAddOnServiceId String?         // optional AddOnService a Standard customer can purchase to unlock registry
}
```

---

## 6. Cross-Cutting Concerns

### 6.1 Soft Delete Middleware
All Prisma queries pass through a middleware that:
- Rewrites `findMany`/`findFirst`/`count` to inject `deletedAt: null` unless explicitly overridden with `includeDeleted: true` (admin-only "trash" views, e.g. for restoring an accidentally deleted product).
- Rewrites `delete`/`deleteMany` calls into `update({ deletedAt: new Date() })` for every model listed as soft-deletable (all models above except pure lookup tables like `GalleryTag`, `ProductCategory`, `BlogCategory`, `BlogTag`, `OperationalSetting`).

### 6.2 Money Handling
- All currency fields are `Int` (paise). A shared `formatCurrency(paise)` utility exists in both backend and frontend/admin (duplicated intentionally as a tiny pure function, not worth a shared npm package at this scale) to render `₹` values consistently.
- GST is computed server-side only, using `OperationalSetting("DEFAULT_GST_PERCENT")`, never trusted from client input.

### 6.3 Human-Readable Code Generation
- `bookingCode`, `orderCode`, `invoiceNumber`, `registryCode` are generated via a `SequenceCounter` table (per year, per type) to guarantee gap-free-enough, human-readable, sortable codes without relying on the internal `cuid()`.

```prisma
model SequenceCounter {
  id       String @id @default(cuid())
  key      String @unique  // "BOOKING-2026", "ORDER-2026", "INVOICE-2026-27"
  lastValue Int   @default(0)
}
```

### 6.4 Indexing Strategy
Beyond the explicit `@@index` calls above, add indexes on: `Booking.status`, `Order.status`, `Lead.status`, `GiftRegistryItem.status`, `Product.isActive`, and any foreign key not already indexed by Prisma's default relation index — reviewed as part of Document 09's performance checklist before each phase's go-live.

---

## 7. Migration Sequencing

| Migration Batch | Phase | Tables Introduced |
|---|---|---|
| `0001_init_admin_auth` | 1 | AdminUser, AuditLog, GuestVerificationToken, SequenceCounter, OperationalSetting |
| `0002_cms_core` | 1 | Theme, ThemeSampleAsset, Package, ThemePackage, PackageFeature, AddOnService, PackageAddOn, PackageCustomizationOption, GalleryImage, GalleryTag, GalleryImageTag, MediaAsset |
| `0003_content_types` | 1 | Testimonial, FAQ, Popup, LegalPage, SiteMetadata, BlogPost + taxonomy, Event, EventRegistration |
| `0004_crm_core` | 1 | Customer, CustomerNote, Lead, ChatbotSession, ConsultationRequest |
| `0005_booking_engine` | 1 | Booking, BookingCustomization, BookingCapacityRule |
| `0006_invoicing` | 1 | Invoice |
| `0007_ecommerce_catalog` | 2 | ProductCategory, Product, ProductImage, ProductCategoryTag, ProductThemeTag, ProductPersonalizationField |
| `0008_ecommerce_inventory_orders` | 2 | InventoryRecord, InventoryLedgerEntry, Order, OrderItem + `PackageCustomizationOption.linkedProductId` (alter) |
| `0009_gift_registry` | 3 | GiftRegistry, GiftRegistryItem, GiftReservation, GiftRegistryEligibilityRule |

This sequencing is repeated verbatim in Documents 05/06/07 as the "Data Layer" task for each phase's first sprint, so the backend developer always knows exactly which migration batch unblocks which feature work.
