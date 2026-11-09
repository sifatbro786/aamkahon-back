// scripts/buildFixtures.js
//
// Builds the static demo dataset for the storefront's NEXT_PUBLIC_DATA_MODE=static
// build (Vercel). Reads seed/data.js, the same source scripts/seed.js writes to
// MongoDB, and emits JSON shaped like the real API responses, with the same
// deterministic ids (seed/ids.js).
//
//   node scripts/buildFixtures.js            # -> ../amkahon-front/data/demo
//   node scripts/buildFixtures.js <outDir>
//
// Shapes mirror the controllers (see CLAUDE.md "Response envelopes"). If you
// change a controller's response, update the matching builder here.
// No database needed.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import {
    CATEGORIES,
    HERO_CONTENT,
    HERO_ITEMS,
    NAV_ITEMS,
    PRODUCTS,
    SECTIONS,
    SHIPPING_RATES,
    SITE,
} from "../seed/data.js";
import { seedId } from "../seed/ids.js";
import { makeSlug } from "../utils/makeSlug.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(process.argv[2] || path.join(__dirname, "../../amkahon-front/data/demo"));
// A fixed timestamp keeps the output byte-stable between runs (clean diffs).
const STAMP = "2026-11-01T00:00:00.000Z";

// Product.pre("save") slug rule.
const productSlug = (name) =>
    name
        .toLowerCase()
        .trim()
        .replace(/[^a-zA-Z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

// ─── Categories ───────────────────────────────────────────────────────────────
const catById = {};
const categories = CATEGORIES.map((c) => {
    const _id = seedId("category", c.key);
    const doc = {
        _id,
        id: _id,
        key: c.key,
        name: c.name,
        slug: makeSlug(c.name),
        description: c.description,
        parentCategory: c.parent ? seedId("category", c.parent) : null,
        isActive: true,
        image: { url: c.image.url, public_id: c.image.public_id },
        level: c.parent ? 1 : 0,
        createdAt: STAMP,
        updatedAt: STAMP,
    };
    catById[_id] = doc;
    return doc;
});
const catRef = (id) => (id ? { _id: id, name: catById[id].name, slug: catById[id].slug } : null);
// /api/categories populates parentCategory with name + slug
const categoriesResponse = {
    success: true,
    count: categories.length,
    total: categories.length,
    data: categories.map(({ key, ...c }) => ({ ...c, parentCategory: catRef(c.parentCategory) })),
};

// getProducts populates category -> parentCategory (two levels)
const populatedCat = (id) => {
    if (!id) return null;
    const c = catById[id];
    return {
        _id: c._id,
        id: c._id,
        name: c.name,
        slug: c.slug,
        parentCategory: c.parentCategory ? { ...catRef(c.parentCategory), parentCategory: null } : null,
    };
};

// ─── Products ─────────────────────────────────────────────────────────────────
const HIDDEN = new Set(["inquiry", "tba"]);
const products = PRODUCTS.map((p) => {
    const _id = seedId("product", p.key);
    const categoryId = seedId("category", p.category);
    const subCategoryId = p.subCategory ? seedId("category", p.subCategory) : null;
    const hidden = HIDDEN.has(p.priceVisibility || "show");
    const basePrice = p.basePrice || 0;
    const variants = (p.variants || []).map((v, i) => ({
        options: v.options,
        basePrice: v.basePrice,
        discountType: "none",
        discountValue: 0,
        // pre-save hook: variant.price = variant.basePrice || product.basePrice
        price: v.basePrice || basePrice,
        stock: v.stock ?? 0,
        imageGroupName: "",
        sku: v.sku || `${p.sku}-${i + 1}`,
        order: v.order ?? i,
        wholesalePrice: v.wholesalePrice ?? null,
        weight: v.weight ?? null,
        campaignPrice: null,
    }));

    const doc = {
        _id,
        id: _id,
        name: p.name,
        slug: productSlug(p.name),
        nameBn: p.nameBn,
        description: p.description,
        bulletPoints: p.bulletPoints || [],
        brand: "Aamkahon",
        sku: p.sku,
        category: populatedCat(categoryId),
        subCategory: populatedCat(subCategoryId),
        basePrice,
        discountType: "none",
        discountValue: 0,
        price: basePrice,
        currency: "BDT",
        isUnderCampaign: false,
        campaignDiscount: { isActive: false, discountType: "none", discountValue: 0 },
        stock: p.stock ?? 0,
        lowStockAlert: 5,
        isFeatured: Boolean(p.isFeatured),
        isActive: true,
        displayOrder: p.displayOrder ?? 0,
        publishDate: STAMP,
        imageGroups: p.imageGroups.map((g) => ({
            name: g.name,
            images: g.images.map((im) => ({ url: im.url, alt: im.alt, public_id: im.public_id })),
        })),
        attributes: p.attributes || [],
        variantOptions: p.variantOptions || [],
        hasVariants: Boolean(p.hasVariants),
        variants,
        averageRating: 0,
        numReviews: 0,
        weight: p.weight ?? 0,
        unit: p.unit || "kg",
        priceVisibility: p.priceVisibility || "show",
        wholesale: p.wholesale
            ? { enabled: Boolean(p.wholesale.enabled), minQty: p.wholesale.minQty ?? null, price: p.wholesale.price ?? null }
            : { enabled: false, minQty: null, price: null },
        minOrderQty: p.minOrderQty || 1,
        availability: p.availability || "in_stock",
        preOrder: p.preOrder
            ? {
                  expectedDate: p.preOrder.expectedDate ? `${p.preOrder.expectedDate}T00:00:00.000Z` : null,
                  advancePercent: p.preOrder.advancePercent ?? 25,
                  maxQtyPerOrder: p.preOrder.maxQtyPerOrder ?? null,
                  note: p.preOrder.note || "",
              }
            : { expectedDate: null, advancePercent: 25, maxQtyPerOrder: null, note: "" },
        purchaseCount: 0,
        viewCount: 0,
        createdAt: STAMP,
        updatedAt: STAMP,
        // resolveCampaignPricing() output (no campaigns in the seed)
        finalPrice: basePrice,
        isUnderValidCampaign: false,
        campaignInfo: null,
        discountAmount: 0,
        isOnSale: false,
    };

    if (hidden) {
        // Same fields middlewares/maskHiddenPrices.js nulls on the live API.
        for (const k of ["price", "basePrice", "finalPrice", "discountAmount", "discountValue", "campaignInfo", "campaignDiscount"]) doc[k] = null;
        doc.wholesale = { ...doc.wholesale, price: null };
        doc.variants = doc.variants.map((v) => ({ ...v, price: null, basePrice: null, wholesalePrice: null, campaignPrice: null, discountValue: null }));
    }
    return doc;
});

const byDisplay = (a, b) => a.displayOrder - b.displayOrder;
products.sort(byDisplay);

// ─── Homepage sections (attribute-based) ──────────────────────────────────────
const sectionsResponse = {
    success: true,
    sections: SECTIONS.map((s) => {
        const items = products
            .filter((p) => p.attributes.some((a) => a.key === s.attributeKey && a.value === s.attributeValue))
            .slice(0, s.productLimit);
        return {
            _id: seedId("section", s.key),
            title: s.title,
            description: s.description,
            attributeKey: s.attributeKey,
            attributeValue: s.attributeValue,
            productLimit: s.productLimit,
            sortBy: s.sortBy,
            sortOrder: s.sortOrder,
            sectionType: "attribute-based",
            isActive: true,
            displayOrder: s.displayOrder,
            showInHomepage: true,
            products: items,
            totalProducts: items.length,
        };
    }),
};

// ─── Hero, navbar, shipping ───────────────────────────────────────────────────
const heroItems = HERO_CONTENT.map(({ key, ...h }) => ({ _id: seedId("heroContent", key), ...h }));
const heroResponse = {
    desktopVideos: heroItems.filter((h) => h.deviceType === "desktop" && h.mediaType === "video").map((h) => h.mediaUrl),
    desktopImages: heroItems.filter((h) => h.deviceType === "desktop" && h.mediaType === "image").map((h) => h.mediaUrl),
    mobileVideos: heroItems.filter((h) => h.deviceType === "mobile" && h.mediaType === "video").map((h) => h.mediaUrl),
    mobileImages: heroItems.filter((h) => h.deviceType === "mobile" && h.mediaType === "image").map((h) => h.mediaUrl),
    items: heroItems,
};
const heroSlidesResponse = {
    success: true,
    message: "Hero items fetched successfully",
    data: HERO_ITEMS.map(({ key, ...h }) => ({ _id: seedId("heroItem", key), ...h, isActive: true })),
    count: HERO_ITEMS.length,
};

const navbarResponse = {
    success: true,
    data: {
        _id: seedId("navbar", "main"),
        logo: { url: "/images/logo.jpg", public_id: "seed/logo" },
        logoUrl: "/",
        cartIcon: true,
        searchIcon: true,
        userIcon: true,
        wishlistIcon: true,
        isActive: true,
        items: NAV_ITEMS.map((n, i) => {
            if (n.type === "category") {
                const id = seedId("category", n.category);
                return { _id: `item-${i}`, name: n.name, type: "category", category: catRef(id), path: `/category/${catById[id].slug}`, order: n.order, isActive: true };
            }
            return { _id: `item-${i}`, name: n.name, type: n.type, path: n.path, customUrl: n.path, order: n.order, isActive: true };
        }),
    },
};

const shippingRatesResponse = {
    success: true,
    rates: SHIPPING_RATES.map((r) => ({
        locationType: r.locationType,
        deliveryType: r.deliveryType,
        baseCharge: r.baseCharge,
        baseWeightKg: r.baseWeightKg,
        perKgCharge: r.perKgCharge,
        freeShippingThreshold: null,
        reducedShippingThreshold: null,
        reducedShippingAmount: null,
    })),
    lowestFreeShippingThreshold: null,
};

// ─── Write ────────────────────────────────────────────────────────────────────
const files = {
    "site.json": SITE,
    "products.json": products,
    "categories.json": categoriesResponse,
    "homepage-sections.json": sectionsResponse,
    "hero.json": heroResponse,
    "hero-items.json": heroSlidesResponse,
    "navbar.json": navbarResponse,
    "shipping-rates.json": shippingRatesResponse,
};

fs.mkdirSync(OUT, { recursive: true });
for (const [name, data] of Object.entries(files)) {
    fs.writeFileSync(path.join(OUT, name), JSON.stringify(data, null, 2) + "\n");
}
console.log(`Wrote ${Object.keys(files).length} fixture files to ${OUT}`);
