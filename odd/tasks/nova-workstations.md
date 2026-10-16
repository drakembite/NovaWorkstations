# Feature: NovaWorkstations E-Commerce Platform

- **Objective**: Build the complete NovaWorkstations e-commerce web platform using Next.js App Router, TypeScript, Tailwind CSS, and a resilient database layer (PostgreSQL / SQLite fallback).
- **Scope**: Storefront SSR, Public APIs (Shopify-compatible catalog, dynamic sitemap, robots.txt), Cart & Checkout with attribution tracking (`utm_*`, `aic_*`, `referrer`), Admin Panel for inline product updates, promotions, orders & refund handling, and outgoing webhooks.
- **Constraints**:
  - Store name is **NovaWorkstations** (replacing legacy references).
  - First-run zero-config execution (`npm run dev`) with automatic local database fallback.
  - Full SSR for public storefront pages.
  - Outgoing webhooks for `product.updated`, `order.paid`, `order.refunded`.
  - Silent first-party attribution tracking cookie.

## Tasks

- [x] `NW-01`: Scaffold Next.js App Router project with TypeScript, Tailwind CSS, and Lucide icons.
  - Route: delegated (570cd242)
  - Trigger: Writer trigger (multi-file project initialization)
  - Evidence: Commit 8897eec ("chore(scaffold): initialize Next.js App Router with TypeScript and Tailwind CSS")
  - Checks: TypeScript config verified, Tailwind setup ready.

- [x] `NW-02`: Database abstraction layer (schema, migrations/init, seed for 12 products, 2 promotions, store settings).
  - Route: delegated (67b35c66)
  - Trigger: Writer trigger (schema, repository, seeds)
  - Evidence: Commit b6a9fab ("feat(db): implement resilient database abstraction layer with seeds and webhooks")
  - Checks: `npm test` verified seed loading, CRUD operations, and webhook dispatching.

- [x] `NW-03`: Public e-commerce endpoints (`/products.json`, `/api/products`, `/productos/[slug].json`, `/sitemap.xml`, `/robots.txt`).
  - Route: delegated (f1e2db7f)
  - Trigger: Writer trigger (multiple API route handlers)
  - Evidence: Commit 686861e ("feat(api): implement public e-commerce endpoints, sitemap, and robots.txt")
  - Checks: GET requests return Shopify-compatible catalog JSON, single product JSON, dynamic sitemap XML, and robots.txt (`npm test` & `next build` pass).

- [x] `NW-04`: Storefront Layout, custom head script injection, attribution tracker, and static info pages.
  - Route: delegated (6264a17b)
  - Trigger: Writer trigger (layout, navigation, footer, tracker, static pages)
  - Evidence: Commit b95e0e6 ("feat(storefront): implement layout, attribution tracker, and informational pages")
  - Checks: Root layout renders, `custom_head_script` injection verified, attribution cookies recorded with legacy fallback, static info pages (`/envios-y-entregas`, `/devoluciones-y-garantia`, `/promociones`) render with 100% test & build pass (`npm test` & `next build`).

- [x] `NW-05`: Storefront Catalog & Product Detail SSR pages (`/`, `/categoria/[slug]`, `/productos/[slug]`).
  - Route: delegated (d13d30f2)
  - Trigger: Writer trigger (home, category, product detail components)
  - Evidence: Commit 99990f0 ("feat(storefront): implement catalog, category, and product detail SSR views")
  - Checks: Home page hero banner, category pills, featured & deals grids, category dynamic SSR with slug normalization & empty states, product detail SSR with breadcrumbs, specs table, live stock, AddToCartButton, and inlined JSON-LD verified with 100% test & build pass (`npm test` & `next build`).

- [x] `NW-06`: Cart, Coupon Engine & Checkout Flow (`/carrito`, `/checkout`).
  - Route: delegated (cd4a24af)
  - Trigger: Writer trigger (cart context, coupon validation, checkout submission, order creation)
  - Evidence: Commit ccf5dd8 ("feat(checkout): implement persistent cart, coupon validation, and 1-click checkout")
  - Checks: Persistent cart items with cookie sync, coupon validation endpoint with min purchase & category constraints, 1-click checkout creating paid order with silent attribution fallback (`npm test` & `next build` 100% pass).

- [ ] `NW-07`: Admin Panel (`/admin`, `/admin/productos`, `/admin/promociones`, `/admin/pedidos`, `/admin/ajustes`).
  - Route: delegated
  - Trigger: Writer trigger (admin layout, inline editor, coupon manager, refund processor, webhooks & settings)
  - Checks: Inline product editing updates `updated_at` and fires webhook; order refund updates order status and fires webhook; settings save.

- [ ] `NW-08`: Verification suite and build validation.
  - Route: inline
  - Checks: Typecheck (`npm run build`), unit/integration tests pass.

## Engram Mirror
- Status: Pending (Engram MCP server not detected in current environment).
