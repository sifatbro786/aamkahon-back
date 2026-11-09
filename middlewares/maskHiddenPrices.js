// Strips price data from public product responses when a product's
// priceVisibility is "inquiry" or "tba".
//
// WHY at the router level: a hidden price must not leak through ANY public
// product endpoint (list, featured, sections, related, slug, by id...). Patching
// each of the ~12 handlers would miss the next one someone adds. Admins are
// exempt because the admin edit form loads products through the public
// GET /api/products/:id and would otherwise save the masked nulls back.
const ADMIN_ROLES = ["admin", "executive"];
const HIDDEN = new Set(["inquiry", "tba"]);
const PRICE_KEYS = [
    "price",
    "basePrice",
    "finalPrice",
    "discountAmount",
    "discountValue",
    "campaignInfo",
    "campaignDiscount",
    "originalDiscount",
];
const VARIANT_PRICE_KEYS = ["price", "basePrice", "wholesalePrice", "campaignPrice", "discountValue"];

const maskProduct = (p) => {
    for (const k of PRICE_KEYS) if (k in p) p[k] = null;
    if (p.wholesale && typeof p.wholesale === "object") p.wholesale = { ...p.wholesale, price: null };
    if (Array.isArray(p.variants)) {
        p.variants = p.variants.map((v) => {
            const copy = { ...v };
            for (const k of VARIANT_PRICE_KEYS) if (k in copy) copy[k] = null;
            return copy;
        });
    }
    p.isOnSale = false;
};

const walk = (node, depth = 0) => {
    if (!node || typeof node !== "object" || depth > 6) return;
    if (Array.isArray(node)) {
        for (const item of node) walk(item, depth + 1);
        return;
    }
    if (typeof node.priceVisibility === "string" && HIDDEN.has(node.priceVisibility)) {
        maskProduct(node);
        return;
    }
    for (const key of Object.keys(node)) {
        const v = node[key];
        if (v && typeof v === "object" && !(v instanceof Date)) walk(v, depth + 1);
    }
};

export const maskHiddenPrices = (req, res, next) => {
    if (req.user && ADMIN_ROLES.includes(req.user.role)) return next();
    const originalJson = res.json.bind(res);
    res.json = (body) => {
        // Round-trip turns Mongoose docs / ObjectIds into plain JSON first, so
        // the walk sees exactly what the client would.
        const plain = body && typeof body === "object" ? JSON.parse(JSON.stringify(body)) : body;
        walk(plain);
        return originalJson(plain);
    };
    next();
};
