// services/lineItemPricing.js
//
// THE server-side line pricer. Every place that turns "product + options +
// quantity" into money goes through here: checkout preview, order creation and
// the cart's displayed unit price.
//
// WHY this exists: the base build priced guest orders from guestItems[].price,
// i.e. from localStorage, which anyone can edit. The checkout preview did the
// same for every guest. Prices, stock and orderability are now resolved from
// the live Product document only.
import Product from "../models/Product.js";

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Variant identity is the options array (variants are { _id: false }).
 * Same rule as orderController.updateProductStock, which decrements stock:
 * equal length and every {name, value} pair present. Keep the two identical,
 * a mismatch silently skips the stock decrement.
 */
export const findVariantByOptions = (product, options) => {
    if (!product?.hasVariants || !Array.isArray(options) || options.length === 0) return null;
    return (
        product.variants.find(
            (v) =>
                v.options.length === options.length &&
                options.every((o) =>
                    v.options.some((vo) => vo.name === o.name && vo.value === o.value),
                ),
        ) || null
    );
};

/**
 * Unit price for a line. Retail = variant.price / product.price, which the
 * Product pre-save hook already made campaign-aware. Wholesale applies when
 * the line quantity reaches wholesale.minQty. If a campaign pushed retail
 * below the wholesale price, the buyer gets the lower of the two.
 */
export const unitPriceFor = (product, variant, quantity) => {
    const retailRaw = variant && variant.price > 0 ? variant.price : product.price;
    const retail = Number(retailRaw > 0 ? retailRaw : product.basePrice) || 0;

    const w = product.wholesale || {};
    // Variant products take the wholesale price from the variant ONLY. Falling
    // back to product.wholesale.price would price a 20 kg box at the 10 kg
    // box's wholesale rate. minQty / enabled still come from the product.
    const wholesalePrice = variant
        ? Number(variant.wholesalePrice) || 0
        : Number(w.price) || 0;
    const minQty = Number(w.minQty) || 0;
    const tierReached = Boolean(w.enabled && wholesalePrice > 0 && minQty > 0 && quantity >= minQty);
    const unitPrice = tierReached ? Math.min(retail, wholesalePrice) : retail;

    return {
        unitPrice: round2(unitPrice),
        retailPrice: round2(retail),
        wholesalePrice: w.enabled && wholesalePrice > 0 ? round2(wholesalePrice) : null,
        wholesaleMinQty: w.enabled && minQty > 0 ? minQty : null,
        wholesaleApplied: tierReached && wholesalePrice < retail,
    };
};

/**
 * Returns an error string when the line cannot be bought, else null.
 * `stockCheck: false` lets the cart accept a quantity it will clamp later.
 */
export const orderabilityError = (product, variant, quantity, { stockCheck = true } = {}) => {
    if (!product || product.isActive === false) return "This product is no longer available";
    const unit = product.unit || "unit";

    if ((product.priceVisibility || "show") !== "show") {
        return `${product.name} is sold on inquiry. Please send us an inquiry for the price.`;
    }
    const availability = product.availability || "in_stock";
    if (availability === "out_of_season") return `${product.name} is out of season right now`;

    const minOrder = Number(product.minOrderQty) || 1;
    if (quantity < minOrder) return `Minimum order for ${product.name} is ${minOrder} ${unit}`;

    if (availability === "pre_order") {
        const max = Number(product.preOrder?.maxQtyPerOrder) || 0;
        if (max && quantity > max) return `You can pre-book up to ${max} ${unit} of ${product.name}`;
        return null; // stock does not exist yet; that is the point of a pre-booking
    }

    if (stockCheck) {
        const stock = variant ? variant.stock : product.stock;
        if (typeof stock === "number" && quantity > stock) {
            return stock > 0
                ? `Only ${stock} ${unit} of ${product.name} left in stock`
                : `${product.name} is out of stock`;
        }
    }
    return null;
};

const imageFor = (product, variant) => {
    const groups = product.imageGroups || [];
    if (variant?.imageGroupName) {
        const g = groups.find((x) => x.name === variant.imageGroupName);
        if (g?.images?.length) return g.images[0].url;
    }
    const main = groups.find((g) => g.name === "Main") || groups[0];
    return main?.images?.[0]?.url || "";
};

const PRICING_FIELDS =
    "name slug price basePrice stock isActive hasVariants variants imageGroups category " +
    "unit priceVisibility wholesale minOrderQty availability preOrder weight codAllowed";

/**
 * Price a list of raw lines.
 * @param {Array<{productId?, product?, variant?: {options}, options?, quantity}>} rawItems
 * @returns {Promise<{ok:false,status,message,errors} | {ok:true, lines, itemsSubtotal,
 *   totalWeightKg, isPreOrder, advanceBase, expectedDate}>}
 */
export const priceLines = async (rawItems, { session = null, stockCheck = true } = {}) => {
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
        return { ok: false, status: 400, message: "No items to price", errors: [] };
    }

    const normalized = rawItems.map((it) => {
        const productRef = it.product && typeof it.product === "object" ? it.product._id : it.product;
        return {
            productId: String(it.productId || productRef || ""),
            options: it.variant?.options || it.options || [],
            quantity: parseInt(it.quantity, 10),
        };
    });

    const ids = [...new Set(normalized.map((n) => n.productId).filter((id) => /^[a-f\d]{24}$/i.test(id)))];
    const products = await Product.find({ _id: { $in: ids } })
        .select(PRICING_FIELDS)
        .session(session)
        .lean();
    const byId = new Map(products.map((p) => [String(p._id), p]));

    const errors = [];
    const lines = [];

    for (const n of normalized) {
        const product = byId.get(n.productId);
        if (!product) {
            errors.push("A product in your cart no longer exists");
            continue;
        }
        if (!Number.isFinite(n.quantity) || n.quantity < 1) {
            errors.push(`Invalid quantity for ${product.name}`);
            continue;
        }

        let variant = null;
        if (product.hasVariants) {
            variant = findVariantByOptions(product, n.options);
            if (!variant) {
                errors.push(`Please choose a valid option for ${product.name}`);
                continue;
            }
        }

        const err = orderabilityError(product, variant, n.quantity, { stockCheck });
        if (err) {
            errors.push(err);
            continue;
        }

        const price = unitPriceFor(product, variant, n.quantity);
        const unitWeight = variant?.weight > 0 ? variant.weight : Number(product.weight) || 0;
        const displayName = variant ? variant.options.map((o) => o.value).join(" / ") : "";
        const isPreOrder = product.availability === "pre_order";

        lines.push({
            product: product._id,
            name: displayName ? `${product.name} (${displayName})` : product.name,
            variant: variant
                ? { options: variant.options.map(({ name, value }) => ({ name, value })), displayName, sku: variant.sku }
                : undefined,
            quantity: n.quantity,
            price: price.unitPrice,
            retailPrice: price.retailPrice,
            wholesaleApplied: price.wholesaleApplied,
            wholesalePrice: price.wholesalePrice,
            wholesaleMinQty: price.wholesaleMinQty,
            lineTotal: round2(price.unitPrice * n.quantity),
            unit: product.unit || "kg",
            weightKg: round2(unitWeight * n.quantity),
            image: imageFor(product, variant),
            category: product.category,
            isPreOrder,
            codAllowed: product.codAllowed !== false,
            advancePercent: isPreOrder ? Number(product.preOrder?.advancePercent ?? 25) : 0,
            expectedDate: isPreOrder ? product.preOrder?.expectedDate || null : null,
        });
    }

    if (errors.length) {
        return { ok: false, status: 400, message: errors[0], errors };
    }

    const preCount = lines.filter((l) => l.isPreOrder).length;
    if (preCount > 0 && preCount < lines.length) {
        // Pre-bookings pay an advance and wait for the harvest; regular items
        // ship now. One order cannot do both, so they check out separately.
        const msg = "Pre-booking items must be checked out separately from in-stock items";
        return { ok: false, status: 400, message: msg, errors: [msg] };
    }

    const isPreOrder = preCount > 0;
    const expectedDates = lines.map((l) => l.expectedDate).filter(Boolean).map((d) => new Date(d));

    return {
        ok: true,
        lines,
        itemsSubtotal: round2(lines.reduce((a, l) => a + l.lineTotal, 0)),
        totalWeightKg: round2(lines.reduce((a, l) => a + l.weightKg, 0)),
        isPreOrder,
        // COD needs every line to allow it (and is never offered for pre-bookings).
        codAvailable: !isPreOrder && lines.every((l) => l.codAllowed),
        // Sum of each line's own advance share, before any coupon.
        advanceBase: isPreOrder
            ? round2(lines.reduce((a, l) => a + (l.lineTotal * l.advancePercent) / 100, 0))
            : 0,
        // Latest harvest date among the lines: the order ships when all of it can.
        expectedDate: expectedDates.length ? new Date(Math.max(...expectedDates)) : null,
    };
};
