// scripts/seed.js
//
// Seeds Aamkahon demo content from seed/data.js.
//
//   npm run seed            # create whatever is missing, never touch existing docs
//   npm run seed -- --reset # overwrite every SEEDED doc (matched by its fixed id)
//   npm run seed -- --reset-owner-password   # set the owner password back to seed value
//
// Safe on production by default: existing documents (including anything the
// admin edited) are skipped, and nothing that the seed did not create is ever
// deleted. Districts/upazilas are a separate script: npm run seed:districts.
import "dotenv/config";
import mongoose from "mongoose";

import Category from "../models/Category.js";
import DynamicSection from "../models/DynamicSection.js";
import HeroItem from "../models/Hero.js";
import HeroContent from "../models/HeroContent.js";
import NavbarConfig from "../models/NavbarConfig.js";
import Product from "../models/Product.js";
import { ShippingRate } from "../models/ShippingConfig.js";
import User from "../models/User.js";
import {
    CATEGORIES,
    HERO_CONTENT,
    HERO_ITEMS,
    NAV_ITEMS,
    OWNER,
    PRODUCTS,
    SECTIONS,
    SHIPPING_RATES,
} from "../seed/data.js";
import { seedId } from "../seed/ids.js";

const RESET = process.argv.includes("--reset");
const RESET_OWNER_PASSWORD = process.argv.includes("--reset-owner-password");
const stats = { created: 0, updated: 0, skipped: 0 };

/** Create-or-skip (or overwrite with --reset) a doc with a fixed _id, via save() so hooks run. */
async function upsertById(Model, _id, data, label) {
    let doc = await Model.findById(_id);
    if (doc && !RESET) {
        stats.skipped++;
        return doc;
    }
    const isNew = !doc;
    if (!doc) doc = new Model({ _id });
    doc.set(data);
    await doc.save();
    stats[isNew ? "created" : "updated"]++;
    console.log(`  ${isNew ? "+" : "~"} ${label}`);
    return doc;
}

async function seedOwner() {
    let user = await User.findOne({ email: OWNER.email }).select("+password");
    if (!user) {
        user = new User({ name: OWNER.name, email: OWNER.email, password: OWNER.password });
        console.log(`  + owner ${OWNER.email}`);
    } else if (RESET_OWNER_PASSWORD) {
        user.password = OWNER.password;
        console.log(`  ~ owner password reset`);
    }
    user.role = OWNER.role;
    user.isEmailVerified = true;
    user.status = "active";
    await user.save();
    return user;
}

async function seedCategories() {
    const ids = {};
    // Parents first, so children can point at them (level/path hooks need the parent).
    const ordered = [...CATEGORIES.filter((c) => !c.parent), ...CATEGORIES.filter((c) => c.parent)];
    for (const c of ordered) {
        const _id = seedId("category", c.key);
        ids[c.key] = _id;
        const { key, parent, ...data } = c;
        await upsertById(
            Category,
            _id,
            { ...data, parentCategory: parent ? ids[parent] : null, isActive: true },
            `category ${c.name}`,
        );
    }
    return ids;
}

async function seedProducts(categoryIds) {
    for (const p of PRODUCTS) {
        const { key, category, subCategory, ...data } = p;
        const variants = (data.variants || []).map((v, i) => ({
            ...v,
            sku: v.sku || `${p.sku}-${i + 1}`,
        }));
        await upsertById(
            Product,
            seedId("product", key),
            {
                ...data,
                variants,
                category: categoryIds[category],
                subCategory: subCategory ? categoryIds[subCategory] : undefined,
                currency: "BDT",
                isActive: true,
                preOrder: data.preOrder
                    ? { ...data.preOrder, expectedDate: data.preOrder.expectedDate ? new Date(data.preOrder.expectedDate) : null }
                    : undefined,
            },
            `product ${p.name}`,
        );
    }
}

async function seedSections(ownerId) {
    for (const s of SECTIONS) {
        const { key, ...data } = s;
        await upsertById(
            DynamicSection,
            seedId("section", key),
            { ...data, sectionType: "attribute-based", isActive: true, showInHomepage: true, createdBy: ownerId },
            `section ${s.title}`,
        );
    }
}

async function seedHero() {
    for (const h of HERO_CONTENT) {
        const { key, ...data } = h;
        await upsertById(HeroContent, seedId("heroContent", key), { ...data, isActive: true }, `hero media ${h.deviceType}`);
    }
    for (const h of HERO_ITEMS) {
        const { key, ...data } = h;
        await upsertById(HeroItem, seedId("heroItem", key), { ...data, isActive: true }, `hero slide ${h.title}`);
    }
}

async function seedNavbar(categoryIds) {
    const items = NAV_ITEMS.map((n) => {
        if (n.type === "category") {
            const cat = CATEGORIES.find((c) => c.key === n.category);
            return {
                name: n.name,
                type: "category",
                category: categoryIds[n.category],
                path: `/category/${cat.key}`,
                order: n.order,
                isActive: true,
            };
        }
        return { name: n.name, type: n.type, path: n.path, customUrl: n.path, order: n.order, isActive: true };
    });
    const _id = seedId("navbar", "main");
    // Only one active navbar config may exist; deactivate others when (re)seeding it.
    const before = stats.created + stats.updated;
    await upsertById(
        NavbarConfig,
        _id,
        { logo: { url: "/images/logo.jpg", public_id: "seed/logo" }, logoUrl: "/", items, cartIcon: true, searchIcon: true, userIcon: true, wishlistIcon: true, isActive: true },
        "navbar",
    );
    if (stats.created + stats.updated > before) {
        await NavbarConfig.updateMany({ _id: { $ne: _id } }, { $set: { isActive: false } });
    }
}

async function seedShipping() {
    for (const r of SHIPPING_RATES) {
        const existing = await ShippingRate.findOne({ locationType: r.locationType, deliveryType: r.deliveryType });
        if (existing && !RESET) {
            stats.skipped++;
            continue;
        }
        if (existing) {
            existing.set(r);
            await existing.save();
            stats.updated++;
        } else {
            await ShippingRate.create(r);
            stats.created++;
        }
        console.log(`  ${existing ? "~" : "+"} shipping ${r.locationType} / ${r.deliveryType}`);
    }
}

async function run() {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) {
        console.error("MONGODB_URI is not set. Check your .env file.");
        process.exit(1);
    }
    await mongoose.connect(uri);
    console.log(`Seeding Aamkahon${RESET ? " (reset seeded docs)" : ""}...`);
    try {
        const owner = await seedOwner();
        const categoryIds = await seedCategories();
        await seedProducts(categoryIds);
        await seedSections(owner._id);
        await seedHero();
        await seedNavbar(categoryIds);
        await seedShipping();
        console.log(`\nDone. created ${stats.created}, updated ${stats.updated}, skipped ${stats.skipped}.`);
        if (stats.skipped && !RESET) console.log("Existing docs were left alone. Use --reset to overwrite seeded ones.");
    } catch (err) {
        console.error("Seed failed:", err.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}

run();
