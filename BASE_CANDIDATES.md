# Changes to carry back into the Footpath base

Ordered by priority. "Generic" = no Aamkahon-specific logic, port as-is.

## Critical (security / money)
1. **Server-side line pricing** (`services/lineItemPricing.js`, used by createOrder, checkout calculate and the cart).
   The base prices guest orders and the guest checkout preview from `guestItems[].price` (client controlled):
   a guest can order anything for 1 BDT. Port `priceLines` + the createOrder/calculate changes. Generic
   (wholesale / pre-order fields are optional and default off).
2. **`import "dotenv/config"` first in server.js.** Base calls dotenv.config() after imports evaluate, so
   emailService reads SMTP vars before they exist (works only by import order luck). Generic.
3. **`app.set("trust proxy", 1)` in production.** Without it every visitor behind nginx shares one IP for the
   rate limiters. Generic.

4. **Public reviews leaked reviewer emails.** `GET /api/reviews/product/:id` populated `user` with
   "name email". Now "name" only. Generic.

## Correctness
4. Checkout calculate rewritten on top of `computeOrderTotals` (no duplicated shipping/COD/tax maths); an invalid
   coupon no longer fails the preview. Generic.
5. Category filter walks the tree (`utils/categoryTree.js`, id or slug). Generic.
6. SMTP `secure` from `SMTP_SECURE` (port 465 hangs with secure:false), TLS checks on in production, brand colour
   from env. Generic.
7. `GET /api/hero` also returns `items` (title/subtitle/button), so admin edits reach the storefront. Generic.
8. `findVariantByOptions` requires equal option count (base `every()` matched a subset, e.g. [] matched any variant).
9. `npm start` = plain node (nodemon was the production start command). Unused deps removed.

## Correctness (2026-11-11)
- Data-driven delivery options (`services/deliveryOptions.js`): removes the hard coded
  "Dhaka = home delivery only" rule and validates courierBranch against the admin list
  (base accepted any string). Generic.

## Optional features (configurable, off by default)
- Customer / lead book with CSV import/export (`models/Customer.js`, customerController,
  `utils/phone.js`, customerSync). Generic for any BD store.
- `Product.codAllowed` (online-only products). Generic.
10. Weight-based shipping: `ShippingRate.baseWeightKg` + `perKgCharge` (0 = old flat behaviour) + admin fields.
11. Price visibility (`show|inquiry|tba`) + `maskHiddenPrices` middleware + Inquiry module (model, public route
    with limiter, admin inbox).
12. Wholesale tier (`wholesale {enabled,minQty,price}`, `variant.wholesalePrice`), `minOrderQty`, `unit`.
13. Pre-booking (`availability`, `preOrder`, `orderType: pre_order`, status `Pre-booked`, advance through the
    COD split fields, no stock change until Confirmed).
14. Seed as data (`seed/data.js` + deterministic ids) and `scripts/buildFixtures.js` for a static demo build.

## Frontend (Next.js storefronts)
- `admin/router.js` shim: runs the Vite admin inside Next with zero routing rewrites.
- `lib/demo/emulator.js`: static demo mode for any client (storefront + admin read only).
- Fonts self-hosted from npm (no Google Fonts network at build).
