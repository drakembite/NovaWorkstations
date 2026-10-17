# Feature: NovaWorkstations outbound buy links and store fixes

- **Created**: 2026-10-17. Branch `feat/outbound-links-and-fixes` (from `main`, tree clean at c93b33d).
- **Objective**: Turn NovaWorkstations into a demo store that sends each product to a real store where it can be bought (direct outbound links, no cart, no payments), and fix the readability, security and honesty problems found by the Kanon project's review (2026-10-17).
- **Why**: Kanon measures whether AI assistants cite a store that publishes a prepared data layer versus an identical control store. The demo never sells, so a cart adds nothing; the template defects (canonical, titles, og:type, breadcrumbs) hurt readability for both arms equally and must be fixed symmetrically; an unauthenticated orders endpoint leaks customer data.
- **Hard constraint**: the 12 seed products keep their titles, categories, prices, codes and descriptions EXACTLY (docs/specs/3 of the Kanon repo: the mess is intentional: expired promo text, mixed categories, invalid EANs, empty GTIN/MPN). Only ADD fields. The currency stays USD until the user decides.
- **Not in scope**: PEN migration, DB persistence redesign (data/db.json drift, /tmp on Vercel: flagged only), deleting database tables, pushing, deploying, PRs.
- **TDD**: ENABLED (session configuration "Strict TDD Mode: enabled"). Runner: `npm test` (tsx scripts in `scripts/`; individual: `npm run test:<name>`). Never run a build.
- **Delivery**: one work-unit commit per task on this branch; no push.

## Tasks

- [ ] **NL-1** Find a real store page for each of the 12 products (research, read-only). Output: a table sku -> store name, product URL, evidence the page shows that product, date checked. No affiliate parameters. Route: delegated research.
- [x] **NL-2** (DONE 2026-10-17 in e8c0c3e; parent re-ran `npm test`: 8 suites pass, `npx tsc --noEmit` 0; writer mutation checks killed) Security: authenticate `GET /api/orders` (and any other unauthenticated route that returns customer data); remove the hardcoded fallback `ADMIN_SESSION_SECRET` (fail closed in production, explicit dev-only fallback). Route: delegated writer. Check: auth tests.
- [x] **NL-3** (DONE 2026-10-17 in 96b6c12; same verification; seed file has no diff) Template fixes (symmetric, no data changes): self canonical on product, category and static pages; title without the duplicated suffix; `og:type` product on product pages; BreadcrumbList JSON-LD on product pages; remove the fake `SearchAction`; add `currency` to `/products.json` and the product JSON. Route: delegated writer. Check: SSR tests.
- [x] **NL-4** (DONE 2026-10-17 in 733a436, 0d7853e, 0c6409d; parent re-ran `npm test`: 11 suites pass, `npx tsc --noEmit` 0; seed diff is additive only; 6 of 12 products linked, the other 6 await NL-1b; writer mutation checks all caught) Outbound links: new `buy_url` and `buy_store` fields (seed, DB schema/JSON, admin editor, `/products.json`, product JSON, JSON-LD `offers.url`), a visible "Comprar en <store>" button on product page and cards (`rel="nofollow noopener noreferrer"`, `target="_blank"`), a demo disclosure (this store sells nothing; the button leads to a third-party store), first-party click attribution (beacon to an API route that stores the inbound attribution cookie with the sku and target; the link itself stays a plain visible `href`), and removal of the cart and the simulated checkout (UI, `lib/cart.ts`, `/api/orders`, coupon validation endpoint, order/refund admin, menu and footer links) without destructive DB migrations. Route: delegated writer, after NL-1 and NL-2.
- [ ] **NL-5** Honest copy: remove or qualify site-wide claims ("Despacho 24h", "12 Meses garantía", "Factura o Boleta con RUC") that contradict a demo store; static pages state the demo status; `/promociones` hardcoded event statuses computed from the dates instead of typed labels. Route: delegated writer.

## Acceptance
- `npm test` green for the remaining suites; removed features have their tests removed with them.
- The 12 products in `/products.json` are identical to the seed except for the added fields.
- No `/carrito`, `/checkout` or order API remains reachable.

## Progress
- 2026-10-17: NL-2 and NL-3 done. Known gaps left by NL-2: `ADMIN_USERNAME` and `ADMIN_PASSWORD` are hardcoded in `src/lib/auth.ts`; `ADMIN_TOKEN` in `.env.example` is unused; `/api/promotions/validate` stays public (coupon check; goes away with the cart in NL-4). `npm run lint` is unusable (no ESLint config, `next lint` opens an interactive prompt). Concern from NL-3 to fix with NL-4: `getSiteUrl()` falls back to `https://novaworkstations.com` when `NEXT_PUBLIC_SITE_URL` is unset, while the store is deployed at `https://planiaula.com`; the old layout fallback was planiaula.com. Fix the fallback and tell the user to set the variable in Vercel.
- 2026-10-17: NL-4 done. Left for NL-5: `src/app/page.tsx:146` 'Factura y Boleta Electrónica'; 'Despacho 24h', '12 Meses garantía' and free-shipping claims in footer, navbar and product page; shipping/returns pages still say 'pedido'; seed promotion descriptions still say 'en el carrito'; stock text 'En Stock (N unidades disponibles)'; `@novaworkstations.com` emails on returns page and footer. The deployed site needs `NEXT_PUBLIC_SITE_URL=https://planiaula.com` set in Vercel. JSON backfill reruns at each cold start (a cleared link returns until the seed changes).
- 2026-10-17: Engram mirror pending (project not known to Engram; not guessed).
- 2026-10-17: document created.
