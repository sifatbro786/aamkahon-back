# Aamkahon backend — working context

Aamkahon Agro (আমকাহন, Rajshahi): wholesale + retail mango and khejurer gur store.
Express 5 + MongoDB/Mongoose, copied from the STR base (Footpath, footpath-backend).
Storefront + admin: sibling repo `amkahon-front` (Next.js 16). Project handover:
`amkahon-front/HANDOVER.md` — read it first.

## Run it

```bash
npm install
npm run dev          # nodemon, PORT=5030
npm start            # plain node (use under pm2 on the VPS)
```

Env names differ from the base on purpose: `MONGODB_URI` (base: MONGO_URI) and
`MAIL_FROM` (base: SMTP_FROM). Code reads the Aamkahon name first and falls back
to the base name. See `.env.example`.

## Changes vs base (mark "base candidate" ones when porting back)

- `import "dotenv/config"` is the first import in server.js. Base called
  dotenv.config() in the body, after imports had already evaluated, so
  emailService read SMTP vars before they existed (worked by import-order luck).
  **Base candidate.**
- SMTP `secure` comes from `SMTP_SECURE` (465 needs true); TLS cert checks are
  on in production. Email accent colours from `MAIL_BRAND_COLOR(_DARK)`. **Base candidate.**
- Category filter walks the tree (`utils/categoryTree.js`). **Base candidate.**
- Removed unused deps: pg, body-parser, node-fetch, express-async-handler
  (heroContentController now uses utils/asyncHandler), cloudinary,
  multer-storage-cloudinary, http-errors, cookie-parser, mongodb. **Base candidate.**
- `npm start` is plain node, not nodemon. **Base candidate.**
- Product.currency default BDT (was USD).
- CORS: origin-less requests are still allowed deliberately. They cannot be a
  browser cross-origin call, and SSLCommerz IPN arrives without Origin, so a
  NODE_ENV gate would 500 the IPN. Comment in server.js.
- No super_admin role. `admin` and `executive` pass the same gates
  (`ADMIN_ROLES`); there is no executive-only route. The owner account is seeded as admin.

## Aamkahon business features (Phase 2)

### Product fields (models/Product.js)
`nameBn`, `unit` (box/pack/jar/kg), `priceVisibility` (show|inquiry|tba),
`wholesale {enabled, minQty, price}`, `minOrderQty`, `availability`
(in_stock|pre_order|out_of_season), `preOrder {expectedDate, advancePercent,
maxQtyPerOrder, note}`, `weight` (kg, per unit). Variants add `wholesalePrice`
and `weight`. **Variant products get wholesale only from variant.wholesalePrice**
(no fallback to product.wholesale.price; pack sizes differ).

### services/lineItemPricing.js is THE line pricer
`priceLines(rawItems)` loads products from the DB and returns priced lines
(unit price with wholesale tier, retailPrice, wholesaleApplied, weightKg,
image, isPreOrder) plus itemsSubtotal / totalWeightKg / advanceBase /
expectedDate. Used by checkout calculate, createOrder and (for display) the
cart. Rules: inquiry/tba and out_of_season are not orderable; pre_order skips
stock but honours maxQtyPerOrder; minOrderQty enforced; a cart cannot mix
pre-order and in-stock lines.

**Security fix (base candidate, critical):** base createOrder priced guest
lines from `guestItems[].price` and the checkout preview did the same for all
guests. Both now price from the DB only. The base repo still has this hole.

### Weight shipping
`ShippingRate.baseWeightKg` + `perKgCharge`:
charge = baseCharge + ceil(max(0, totalKg - baseWeightKg)) * perKgCharge.
perKgCharge 0 = old flat behaviour. Thresholds/coupons still apply.

### Pre-booking flow
Pre-order cart -> paymentMethod forced to SSLCommerz, `orderType: "pre_order"`,
`codOnlinePaymentAmount` = advance (sum of line advance %, scaled by coupon),
`remainingAmount` = the rest incl. shipping. Gateway charges the advance.
Payment success/IPN -> `orderStatus: "Pre-booked"`, NO stock decrement.
Admin moves it to Confirmed later; the existing updateOrderStatus transition
decrements stock then. Payment verification uses `onlineAmountDue(order)`.
Admin list filter: `GET /api/admin/orders?orderType=pre_order`.
Stats include `preBookedOrders`.

### Hidden prices
`middlewares/maskHiddenPrices.js` on /api/products/* (and wishlist) nulls
price fields for inquiry/tba products. Admins (optionalProtect) are exempt
because the admin edit form reads GET /api/products/:id.

### Inquiries
- `POST /api/inquiries` (public, inquiryLimiter 5/15min, optional auth)
  body `{type?, productId?, variantLabel?, quantity?, name, phone (BD mobile),
  email?, district?, message?}` -> `201 { success, message, inquiry: {_id, type, createdAt} }`.
  Emails MAIL_TO (escaped HTML, best effort).
- `GET /api/admin/inquiries?status&type&search&page&limit` ->
  `{ success, inquiries, total, totalPages, currentPage, statusCounts }`
- `PATCH /api/admin/inquiries/:id {status?, quotedPrice?, note?}` -> `{ success, inquiry }`
- `DELETE /api/admin/inquiries/:id`
Statuses: new, contacted, quoted, converted, closed.

### POST /api/checkout/calculate response additions
`data.lines[]` ({product, name, variant, quantity, unit, unitPrice,
retailPrice, wholesaleApplied, wholesalePrice, wholesaleMinQty, lineTotal,
weightKg}), `isPreOrder`, `advanceAmount`, `expectedDate`, `totalWeightKg`,
`shippingBreakdown {flatCharge, totalWeightKg, extraWeightKg, perKgCharge,
weightCharge, totalShipping}`. `paymentMethod` echoes the effective one
(SSLCommerz for pre-orders). Invalid coupons no longer fail the preview;
`couponMessage` says why.

### Seed
`npm run seed` (create missing only) / `-- --reset` (overwrite seeded docs) /
`-- --reset-owner-password`. Content lives in `seed/data.js`; ids are
deterministic (`seed/ids.js`) so the static demo fixtures share them.
`npm run seed:all` = districts + seed. Owner: solaimanislamsifat@gmail.com, role admin.

## Phase 6 additions (2026-11-11)

- **Delivery options** `services/deliveryOptions.js` (`resolveDeliveryOptions`, `checkDeliveryChoice`):
  a type is offered when an active ShippingRate exists for (locationType, deliveryType); Courier
  also needs an active CourierBranch for the district with >= 1 branch. Used by validate-location,
  checkout calculate and createOrder. `courierBranch` must be one of the configured branches.
  `isHomeDeliveryOnly` no longer exists. Order.shippingAddress.addressLine1 is required unless Courier.
- **Customers** `models/Customer.js`, `controllers/admin/customerController.js`,
  `/api/admin/customers`:
  - `GET /` `?search&tag&source&district&optIn&sort&page&limit` ->
    `{ success, customers, total, totalPages, currentPage, tags, sourceCounts }`
  - `POST /` -> 201 `{ success, customer }` | 409 duplicate phone; `PATCH /:id`; `DELETE /:id`
  - `POST /import` `{ rows:[{rowNumber?, phone, name?, email?, district?, address?, tags?}], tags?, mode: skip|update, batch? }`
    (max 2000 rows/request) -> `{ success, batch, received, inserted, updated, unchanged, invalid, duplicatesInFile, errors }`
  - `GET /export` -> text/csv (UTF-8 BOM; opted-out excluded unless `optIn` given; cells escaped against CSV injection)
  Phone identity: `utils/phone.js normalizeBdPhone` -> "01XXXXXXXXX". Orders and inquiries
  upsert customers (`services/customerSync.js`, best effort, after commit). Backfill:
  `npm run sync:customers`.
- **Online only products**: `Product.codAllowed` (default true). `priceLines` returns
  `codAvailable`; calculate/createOrder force SSLCommerz when false; calculate response has
  `codAvailable`. Cart populate selects include it.

## Shape of the thing

```
server.js          33 route modules mounted; middleware order is load-bearing
controllers/       business logic (some files are 1000+ lines)
  admin/           admin-only controllers
models/            19 Mongoose models
routes/            public routes
  admin/           admin routes, all behind protect + admin
services/          pricingService, productCampaignService, emailService
middlewares/       auth, rate limiting, sanitize, upload, error
utils/             apiFeatures, asyncHandler, escapeRegex, makeSlug, districts
```

### Middleware order in server.js is deliberate

```
compression -> helmet(CORP cross-origin) -> /uploads static -> cors
  -> body parsers -> sanitizeRequest -> hpp -> globalApiLimiter -> routes
```

`sanitizeRequest` MUST come before `hpp`. Express 5 made `req.query` a
getter-only accessor, so both `express-mongo-sanitize`'s bundled middleware and
`hpp` throw when they try to assign to it. Our sanitizer redefines `req.query`
as a writable data property, which is what lets `hpp` work at all. See
`middlewares/sanitize.js` for the verified behaviour.

---

## Traps. Read before touching these areas.

### 1. Variants have no id

`variantSchema` is declared `{ _id: false }`. The ONLY thing identifying a
variant is its `options: [{name, value}]` array.

`orderController.updateProductStock` matches a cart/order line back to a variant
by comparing those option pairs. **A mismatch does not throw** — it logs a
warning and leaves stock untouched. So a bug here sells inventory that never
gets deducted, silently. The frontend mirrors this rule in
`src/lib/store/variants.js`; keep the two in agreement.

### 2. Price is decided server side, always

`createOrder` recomputes shipping, tax, discount, COD split and total through
`services/pricingService.js` and **ignores any price in the request body**.
`POST /api/checkout/calculate` exists so the UI can *display* the same numbers,
not so the client can decide them. Never start trusting a client price.

`variant.price` is computed and persisted by the `Product` pre-save hook,
campaigns included. Read it; do not recompute it.

### 3. COD is not a gateway bypass

`Order.paymentMethod` is `enum: ["COD", "SSLCommerz"]`. Both return a
`redirectUrl` from `createOrder`. COD charges delivery + COD fee online up front
(`codOnlinePaymentAmount`) and collects the item total on delivery
(`remainingAmount`). bKash and Nagad are not separate methods; SSLCommerz
aggregates them inside its hosted page.

### 4. A signed-in order comes from the server cart

`createOrder` builds a signed-in user's order from the **server Cart** and
ignores items in the body. Only guests may pass `guestItems`. And `Cart.user` is
required + unique, so there is no server-side guest cart. That is why
`POST /api/cart/merge` exists and why the frontend cart is dual-mode.

### 5. Guest orders are protected by a capability token

`Order.guestAccessToken` (48 hex chars, `select: false`). `GET /api/orders/:id`
returns a guest order only with a matching `?token=` / `x-order-token`, or to an
admin. Order numbers are sequential (`ORD` + `YYMMDD` + `NNNN`), so without this
the whole day's guest PII was walkable. Legacy guest orders predating the patch
have no token and are admin-only by design.

### 6. `updatedBy: "system"` silently vanishes

`statusHistory.updatedBy` is an ObjectId ref. Passing the string `"system"` does
not throw: Mongoose records a cast failure, and `save({ validateBeforeSave: false })`
(used throughout the payment flow) discards it, so the field saves as `undefined`.
Omit it for system entries instead. **Fixed** (swept): all `addedBy: "system"`
and `updatedBy: "system"` in `paymentController` and `orderController` now omit
the field. Keep it omitted for any new system-generated note or status entry.

### 7. Response envelopes are inconsistent

There is no single convention. Verify before consuming:

| Endpoint | Shape |
|---|---|
| `/api/products` | `{ success, products, total, totalPages, currentPage }` |
| `/api/products/featured` | `{ success, products }` |
| `/api/products/homepage-sections` | `{ success, sections: [{...,products}] }` |
| `/api/categories` | `{ success, count, total, data }` |
| `/api/hero-items` | `{ success, data }` |
| `/api/hero` | **bare object**, no envelope |
| `/api/admin/hero-content` | **bare array**, no envelope |
| `/api/reviews/product/:id` | `{ success, reviews, ratingStats, ... }` |
| A+ content admin | `{ success, aplusContents, pagination }` (`pages`, not `totalPages`) |

### 8. Campaign pricing — one resolver, applied everywhere (was: inconsistent)

**Fixed.** `resolveCampaignPricing(productObj)` in `productController.js` is now
THE single source of truth for `finalPrice` / `isUnderValidCampaign` /
`campaignInfo` / `discountAmount` / `isOnSale`. `getProducts`,
`getFeaturedProducts` and `getHomepageSections` all route through it, so a
featured/section product inside a live campaign shows the campaign price
everywhere. It reads the embedded `campaignDiscount` subdoc + `isUnderCampaign`,
so any new list endpoint MUST select those two fields and spread the resolver's
result. Do not reintroduce a per-endpoint discount block. `getProductBySlug`
still has its own inline copy (single-doc path) — fold it in if you touch it.

### 9. Category filtering does not walk the tree

**Fixed in Aamkahon (base candidate):** `getProducts` and `getProductsByAttributes`
now resolve the category (id or slug) plus all descendants via
`utils/categoryTree.js`.
Original problem: Browsing a parent category misses everything filed under
its children. The frontend has `collectSubtreeIds()` ready in
`src/lib/store/categoryTree.js`; widening needs this endpoint to accept a list.

### 10. Route ordering

Literal routes must be declared before `/:param` siblings, or Express matches the
literal as a param. Currently relied on by:
`/api/orders/track`, `/api/cart/merge`, `/api/reviews/featured`,
`/api/admin/products/low-stock`, `/api/checkout/shipping-rates`.

---

## Known open issues (inherited)

- `save({ validateBeforeSave: false })` in the payment flow.
- Campaign cron runs in-process every minute with no lock. Run ONE instance
  (pm2 fork mode, not cluster) until a lock exists.
- `console.log` of PII / IPN bodies; needs a redacting logger.
- User.shippingAddress vs Order.shippingAddress schemas differ.
- No tests.

## Status

See `amkahon-front/HANDOVER.md`.
