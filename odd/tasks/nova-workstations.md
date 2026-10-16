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

- [ ] `NW-01`: Scaffold Next.js App Router project with TypeScript, Tailwind CSS, and Lucide icons.
  - Route: delegated
  - Trigger: Writer trigger (multi-file project initialization)
  - Checks: `npm run build` or Next.js app initialization succeeds.

- [ ] `NW-02`: Database abstraction layer (schema, migrations/init, seed for 12 products, 2 promotions, store settings).
  - Route: delegated
  - Trigger: Writer trigger (schema, repository, seeds)
  - Checks: Seed script executes and populates products, promotions, and settings with 'NovaWorkstations'.

- [ ] `NW-03`: Public e-commerce endpoints (`/products.json`, `/api/products`, `/productos/[slug].json`, `/sitemap.xml`, `/robots.txt`).
  - Route: delegated
  - Trigger: Writer trigger (multiple API route handlers)
  - Checks: GET requests return Shopify-compatible catalog JSON, single product JSON, dynamic sitemap XML, and robots.txt.

- [ ] `NW-04`: Storefront Layout, custom head script injection, attribution tracker, and static info pages.
  - Route: delegated
  - Trigger: Writer trigger (layout, navigation, footer, tracker, static pages)
  - Checks: Root layout renders, `custom_head_script` is injected, attribution cookie is recorded, info pages load.

- [ ] `NW-05`: Storefront Catalog & Product Detail SSR pages (`/`, `/categoria/[slug]`, `/productos/[slug]`).
  - Route: delegated
  - Trigger: Writer trigger (home, category, product detail components)
  - Checks: SSR renders product metadata, specs table, live stock, and inlines `custom_head_jsonld`.

- [ ] `NW-06`: Cart, Coupon Engine & Checkout Flow (`/carrito`, `/checkout`).
  - Route: delegated
  - Trigger: Writer trigger (cart context, coupon validation, checkout submission, order creation)
  - Checks: Persistent cart items, coupon validation applies discounts, 1-click checkout creates `paid` order with attribution data.

- [ ] `NW-07`: Admin Panel (`/admin`, `/admin/productos`, `/admin/promociones`, `/admin/pedidos`, `/admin/ajustes`).
  - Route: delegated
  - Trigger: Writer trigger (admin layout, inline editor, coupon manager, refund processor, webhooks & settings)
  - Checks: Inline product editing updates `updated_at` and fires webhook; order refund updates order status and fires webhook; settings save.

- [ ] `NW-08`: Verification suite and build validation.
  - Route: inline
  - Checks: Typecheck (`npm run build`), unit/integration tests pass.

## Engram Mirror
- Status: Pending (Engram MCP server not detected in current environment).
