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
import crypto from "crypto";
import mongoose from "mongoose";

import Category from "../models/Category.js";
import DynamicSection from "../models/DynamicSection.js";
import HeroItem from "../models/Hero.js";
import HeroContent from "../models/HeroContent.js";
import NavbarConfig from "../models/NavbarConfig.js";
import Product from "../models/Product.js";
import Review from "../models/Review.js";
import { ShippingRate } from "../models/ShippingConfig.js";
import User from "../models/User.js";
import {
    CATEGORIES,
    HERO_CONTENT,
    HERO_ITEMS,
    NAV_ITEMS,
    OWNER,
    PRODUCTS,
    REVIEWS,
    SECTIONS,
    SEED_REVIEWERS,
    SHIPPING_RATES,
} from "../seed/data.js";
import { seedId } from "../seed/ids.js";

const RESET = process.argv.includes("--reset");
const RESET_OWNER_PASSWORD = process.argv.includes("--reset-owner-password");
const PURGE_DEMO_REVIEWS = process.argv.includes("--purge-demo-reviews");
// Demo reviews are placeholder copy, not customer reviews. They are never
// seeded into a production database unless explicitly asked for.
const WITH_DEMO_REVIEWS =
    process.argv.includes("--with-demo-reviews") || process.env.NODE_ENV !== "production";
const SEED_REVIEWER_DOMAIN = "@seed.aamkahon.local";
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

async function recomputeRatings(productIds) {
    for (const id of productIds) {
        const [stats] = await Review.aggregate([
            { $match: { product: new mongoose.Types.ObjectId(String(id)), status: "approved" } },
            { $group: { _id: null, avg: { $avg: "$rating" }, n: { $sum: 1 } } },
        ]);
        await Product.updateOne(
            { _id: id },
            { $set: { averageRating: stats ? Math.round(stats.avg * 10) / 10 : 0, numReviews: stats?.n || 0 } },
        );
    }
}

async function seedReviews() {
    const users = [];
    for (const [i, name] of SEED_REVIEWERS.entries()) {
        const email = `reviewer.${i + 1}${SEED_REVIEWER_DOMAIN}`;
        let user = await User.findOne({ email });
        if (!user) {
            // Unguessable password: these accounts exist only to own demo reviews.
            user = await User.create({ name, email, password: crypto.randomBytes(24).toString("hex"), isEmailVerified: true, role: "user" });
        }
        users.push(user);
    }
    const touched = new Set();
    for (const [i, [productKey, who, rating, comment, daysAgo]] of REVIEWS.entries()) {
        const productId = seedId("product", productKey);
        const _id = seedId("review", String(i));
        if ((await Review.exists({ _id })) && !RESET) {
            stats.skipped++;
            continue;
        }
        await Review.findOneAndUpdate(
            { _id },
            { $set: { product: productId, user: users[who]._id, rating, comment, status: "approved", createdAt: new Date(Date.now() - daysAgo * 86400000) } },
            { upsert: true, timestamps: false, setDefaultsOnInsert: true },
        );
        stats.created++;
        touched.add(productId);
    }
    await recomputeRatings([...touched]);
    console.log(`  + ${touched.size ? REVIEWS.length : 0} demo reviews (placeholder copy, replace before launch)`);
}

async function purgeDemoReviews() {
    const seedUsers = await User.find({ email: { $regex: `${SEED_REVIEWER_DOMAIN.replace(/\./g, "\\.")}$` } }).select("_id");
    const ids = seedUsers.map((u) => u._id);
    const productIds = await Review.distinct("product", { user: { $in: ids } });
    const { deletedCount } = await Review.deleteMany({ user: { $in: ids } });
    await User.deleteMany({ _id: { $in: ids } });
    await recomputeRatings(productIds);
    console.log(`Removed ${deletedCount} demo reviews and ${ids.length} seed reviewer accounts.`);
}

async function run() {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) {
        console.error("MONGODB_URI is not set. Check your .env file.");
        process.exit(1);
    }
    await mongoose.connect(uri);
    if (PURGE_DEMO_REVIEWS) {
        try {
            await purgeDemoReviews();
        } finally {
            await mongoose.disconnect();
        }
        return;
    }
    console.log(`Seeding Aamkahon${RESET ? " (reset seeded docs)" : ""}...`);
    try {
        const owner = await seedOwner();
        const categoryIds = await seedCategories();
        await seedProducts(categoryIds);
        await seedSections(owner._id);
        await seedHero();
        await seedNavbar(categoryIds);
        await seedShipping();
        if (WITH_DEMO_REVIEWS) await seedReviews();
        else console.log("  (demo reviews skipped in production; add --with-demo-reviews to include them)");
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
