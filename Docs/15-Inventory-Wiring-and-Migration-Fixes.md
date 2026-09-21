# 15 — Inventory Wiring & Migration Fixes

**Status:** Merged to `develop` — 2026-09-08
**Scope:** `backend/` (Prisma migrations, inventory API, build config), `admin/` (lint)
**Commits:** `86291f9` (admin lint), `a08c8ff` → merge `77e4a1b` (inventory wiring), `9a2d800` → merge `bde573f` (drop dead models)

## Summary

An end-to-end smoke test of `develop` against a fresh PostgreSQL database (not a
developer's `db push`-ed one) surfaced three deployment blockers plus a batch of
admin lint debt. All are fixed and merged. Nothing about the running app's
behaviour changed for features that already worked — these changes make the
inventory feature actually function and make a clean deploy reproducible.

---

## 1. Admin ESLint debt — `86291f9`

`npx eslint .` in `admin/` reported 52 problems (38 errors). CI only runs
`npm run typecheck`, so this never blocked the pipeline, but `npm run lint` was
unusable.

**Real fixes**

| File | Change |
|---|---|
| `src/app/dashboard/crm/orders/OrdersScreen.tsx` | Replaced 15 `any` with `Order` / `OrderItem` / `OrderRow` types + an `errMessage()` helper |
| `src/app/dashboard/inventory/warehouses/page.tsx` | Typed 3 `catch` clauses instead of `any` |
| `src/components/AdminShell.tsx` | Initial open nav-section is now a lazy `useState` initializer instead of a `pathname` effect (same behaviour: opens the matching section on load, then follows the user's clicks) — removes an `exhaustive-deps` warning |
| `src/components/ui/use-dismissable.ts` | `onCloseRef.current = onClose` moved into an effect (was a ref write during render) |
| 5 files | Deleted dead imports; removed the unused `getAuthHeaders` helper in `UploadDialog.tsx` |
| 2 theme screens | Bare `catch` where the error is unused |
| `MediaPicker.tsx` | Escaped an apostrophe; removed 2 stale `eslint-disable` directives |

**Config decision — `admin/eslint.config.mjs`**

- `react-hooks/set-state-in-effect` → **off**. This rule (new in
  `eslint-plugin-react-hooks` v6, shipped with Next 16 / React 19) fired on 18
  sites, every one a standard pattern: SSR mount flags, the `setLoading(true)`
  data-fetch pattern, prop→state sync. None are bugs. Revisit if data fetching
  moves to a library / `use()`.
- `@typescript-eslint/no-unused-vars` → now ignores `_`-prefixed args/vars and
  object-rest siblings (standard convention).

---

## 2. Schema ↔ migration drift — migrations `20260908120000`, `20260908130000`

`schema.prisma` contained the **entire inventory feature** with **no migration**
creating it. `prisma migrate deploy` produced a database that crashed on any
product or order query (`column "unit" does not exist`), and the seed failed
outright. It only worked on developer machines because someone had run
`prisma db push` locally.

Objects that were in the schema but not in any migration:

- Tables: `Supplier`, `Warehouse`, `PurchaseOrder`, `PurchaseOrderItem`
- Columns: `Product.unit` / `barcode` / `purchasePriceInPaise` / `supplierId`,
  `Order.emailSendError`, `User.defaultAddress`
- Enum `PurchaseOrderStatus`; `AdminRole` += `WAREHOUSE_STAFF`, `SALES_STAFF`,
  `MANAGER`

**Fix:** `backend/prisma/migrations/20260908120000_add_inventory_management/`
— generated with `prisma migrate diff`, then verified with a fresh
`migrate deploy` + seed.

`InventoryStock` and `InventoryTransaction` were also in the schema but **no code
references them** (the feature runs on the pre-existing `InventoryRecord` /
`InventoryLedgerEntry` models). Migration `20260908120000` created them to match
the schema at that moment; migration
`20260908130000_drop_unused_inventory_models` then removes the models and drops
the tables.

After both migrations, `prisma migrate diff --from-migrations
--to-schema-datamodel` reports **"No difference detected."**

### Deploying these two migrations

- **Fresh database** — `prisma migrate deploy` runs everything in order. No
  special step.
- **A database previously synced with `prisma db push`** (inventory tables
  already exist) — migration `20260908120000`'s `CREATE TABLE` would collide.
  Run once, on that environment:

  ```bash
  npx prisma migrate resolve --applied 20260908120000_add_inventory_management
  npx prisma migrate deploy
  ```

  `resolve` records the migration as applied without running its SQL;
  `migrate deploy` then applies `20260908130000` (which drops the two dead
  tables — they exist from the `db push`).

This is per-environment. Whoever deploys must know how that environment's
database was built.

---

## 3. Inventory API was never mounted — `backend/src/app.ts`

`src/modules/inventory/inventory.routes.ts` exported `adminSuppliersRouter`,
`adminWarehousesRouter`, `adminPurchaseOrdersRouter`, and
`src/modules/inventory/reports.routes.ts` exported
`adminInventoryReportsRouter` — but **nothing imported them into `app.ts`**.
Every `/admin/suppliers`, `/admin/warehouses`, `/admin/purchase-orders`, and
inventory-reports request returned 404, so the admin panel's entire Inventory
section loaded but could not talk to the backend.

**Fix:** mounted all four under the admin router group:

```
/api/v1/admin/suppliers          → adminSuppliersRouter
/api/v1/admin/warehouses         → adminWarehousesRouter
/api/v1/admin/purchase-orders    → adminPurchaseOrdersRouter
/api/v1/admin/inventory-reports  → adminInventoryReportsRouter   (/valuation, /low-stock)
```

Each router already applies `requireAdmin` + `requireRoles` internally.

### New endpoint — `GET /api/v1/admin/products/inventory/stats`

The admin inventory dashboard calls this for its stat cards and there was no
backend for it. Implemented as `getInventoryStats()` in
`src/modules/catalog/inventory.service.ts`, routed on `adminProductsRouter`.
Returns:

```json
{ "totalProducts": 15, "inStock": 15, "lowStock": 0, "outOfStock": 0, "totalValueInPaise": 0 }
```

`totalValueInPaise` is `Σ (purchasePriceInPaise × quantityAvailable)` over
products that have an `InventoryRecord`.

---

## 4. `npm start` was broken after a clean build — `backend/package.json`

`tsconfig.json` includes `prisma/seed.ts` with `rootDir: "."`, so `tsc` emits
`dist/src/server.js` (not `dist/server.js`). `package.json` `start` and `main`
pointed at `dist/server.js`, so `npm start` failed with `MODULE_NOT_FOUND` after
`npm run build`.

**Fix:** repointed both to `dist/src/server.js`.

---

## Verification performed

Against a fresh PostgreSQL database (Docker `postgres:16`):

- `prisma migrate deploy` — all migrations apply clean, in order
- `prisma db seed` — succeeds (previously crashed on `Product.unit`)
- `prisma migrate diff` (migrations ↔ schema) — no difference
- `npm run build` + `npm start` — server boots from `dist/src/server.js`
- Admin login issues a JWT; `/admin/me` works
- All 6 inventory endpoints return 200; `inventory/stats` payload shape correct
- Supplier + warehouse **create → list → delete** round-trip works
- Every admin inventory page (`/dashboard/inventory`, `/suppliers`,
  `/warehouses`, `/purchases`, `/stock`, `/reports`) renders 200 against the
  live API
- Frontend `next build` clean; all public pages 200
- `backend` and `admin` `tsc --noEmit` clean; `admin` `eslint` clean

## Known gaps / follow-ups

- `dist/src/server.js` is accurate but ugly. A cleaner fix is `rootDir: "src"` +
  dropping `prisma/seed.ts` from `tsconfig` `include` (seed runs via `tsx`, never
  needs compiling) — deferred because it changes what `npm run typecheck` / CI
  covers.
- The `AdminRole` migration adds three enum values in one statement. Fine on
  PostgreSQL 16; would need splitting for PG ≤ 11.
- `Product` model in `schema.prisma` has odd indentation left over from the
  drift being appended mid-model — cosmetic, `prisma validate` passes.
