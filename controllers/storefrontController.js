// controllers/storefrontController.js
// Season-driven homepage content + FAQ.
import mongoose from "mongoose";
import Faq from "../models/Faq.js";
import StorefrontSettings, { SEASONS } from "../models/StorefrontSettings.js";
import { getSettingsDoc, seasonMatch } from "../services/storefront.js";

const COPY_FIELDS = {
    announcement: 160,
    heroEyebrow: 60,
    heroTitle: 100,
    heroSubtitle: 250,
    heroButtonText: 40,
    heroButtonLink: 200,
    heroSecondaryText: 40,
    heroSecondaryLink: 200,
};
const BLOCKS = ["seasonBoard", "harvestCalendar", "wholesaleBand", "testimonials", "orchardReels", "delivery", "story", "faq"];
const STORY_FIELDS = { ownerName: 80, ownerRole: 80, ownerPhoto: 300, ownerPhotoAlt: 160, quote: 400, note: 2000 };

// Links typed by the admin end up in <a href>. Only site paths and http(s).
const safeLink = (v) => (typeof v === "string" && (/^\/(?!\/)/.test(v.trim()) || /^https?:\/\//i.test(v.trim())) ? v.trim() : "");
const text = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : undefined);

// ── Public ───────────────────────────────────────────────────────────────────

// @route GET /api/storefront
// -> { success, activeSeason, content: {announcement, hero*, blocks}, story }
export const getStorefront = async (req, res, next) => {
    try {
        const doc = await getSettingsDoc();
        const active = SEASONS.includes(doc.activeSeason) ? doc.activeSeason : "all";
        res.status(200).json({
            success: true,
            activeSeason: active,
            content: doc.seasons?.[active] || {},
            story: doc.story || {},
        });
    } catch (error) {
        next(error);
    }
};

// @route GET /api/storefront/faqs?homepage=true
// -> { success, faqs: [{_id, question, answer}] }  (active season only)
export const getPublicFaqs = async (req, res, next) => {
    try {
        const doc = await getSettingsDoc();
        const filter = { isActive: true, ...seasonMatch(doc.activeSeason || "all") };
        if (req.query.homepage === "true") filter.showOnHomepage = true;
        const faqs = await Faq.find(filter).sort({ order: 1, createdAt: 1 }).select("question answer").lean();
        res.status(200).json({ success: true, faqs });
    } catch (error) {
        next(error);
    }
};

// ── Admin ────────────────────────────────────────────────────────────────────

// @route GET /api/admin/storefront -> { success, settings }
export const getSettings = async (req, res, next) => {
    try {
        res.status(200).json({ success: true, settings: await getSettingsDoc() });
    } catch (error) {
        next(error);
    }
};

// @route PUT /api/admin/storefront
// body { activeSeason?, seasons?: { mango|winter|all: { ...copy, blocks: {...} } }, story?: {...} }
// Only listed fields are written ($set on dotted paths), so a partial save
// never wipes the other seasons. -> { success, settings }
export const updateSettings = async (req, res, next) => {
    try {
        const set = {};
        const { activeSeason, seasons, story } = req.body;

        if (activeSeason !== undefined) {
            if (!SEASONS.includes(activeSeason)) return res.status(400).json({ success: false, message: "Invalid season" });
            set.activeSeason = activeSeason;
        }
        if (seasons && typeof seasons === "object") {
            for (const s of SEASONS) {
                const c = seasons[s];
                if (!c || typeof c !== "object") continue;
                for (const [f, max] of Object.entries(COPY_FIELDS)) {
                    if (c[f] === undefined) continue;
                    set[`seasons.${s}.${f}`] = f.endsWith("Link") ? safeLink(c[f]) : text(c[f], max);
                }
                if (c.blocks && typeof c.blocks === "object") {
                    for (const b of BLOCKS) if (c.blocks[b] !== undefined) set[`seasons.${s}.blocks.${b}`] = Boolean(c.blocks[b]);
                }
            }
        }
        if (story && typeof story === "object") {
            for (const [f, max] of Object.entries(STORY_FIELDS)) {
                if (story[f] === undefined) continue;
                set[`story.${f}`] = f === "ownerPhoto" ? (safeLink(story[f]) || "") : text(story[f], max);
            }
            if (story.quoteLang !== undefined) set["story.quoteLang"] = story.quoteLang === "en" ? "en" : "bn";
            if (Array.isArray(story.facts)) {
                set["story.facts"] = story.facts
                    .slice(0, 6)
                    .map((x) => ({ label: text(x?.label, 40) || "", value: text(x?.value, 40) || "" }))
                    .filter((x) => x.label || x.value);
            }
        }
        if (!Object.keys(set).length) return res.status(400).json({ success: false, message: "Nothing to save" });
        set.updatedBy = req.user._id;

        const settings = await StorefrontSettings.findOneAndUpdate(
            { key: "main" },
            { $set: set },
            { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
        ).lean();
        res.status(200).json({ success: true, settings });
    } catch (error) {
        next(error);
    }
};

const faqBody = (b) => {
    const out = {};
    if (b.question !== undefined) out.question = text(b.question, 200);
    if (b.answer !== undefined) out.answer = text(b.answer, 2000);
    if (Array.isArray(b.seasons)) out.seasons = [...new Set(b.seasons.filter((s) => SEASONS.includes(s)))];
    if (b.showOnHomepage !== undefined) out.showOnHomepage = Boolean(b.showOnHomepage);
    if (b.isActive !== undefined) out.isActive = Boolean(b.isActive);
    if (b.order !== undefined && Number.isFinite(Number(b.order))) out.order = Number(b.order);
    return out;
};

// @route GET /api/admin/faqs -> { success, faqs }
export const listFaqs = async (req, res, next) => {
    try {
        res.status(200).json({ success: true, faqs: await Faq.find().sort({ order: 1, createdAt: 1 }).lean() });
    } catch (error) {
        next(error);
    }
};

// @route POST /api/admin/faqs -> 201 { success, faq }
export const createFaq = async (req, res, next) => {
    try {
        const data = faqBody(req.body);
        if (!data.question || !data.answer) return res.status(400).json({ success: false, message: "Question and answer are required" });
        if (data.order === undefined) data.order = ((await Faq.findOne().sort({ order: -1 }).select("order").lean())?.order ?? -1) + 1;
        const faq = await Faq.create(data);
        res.status(201).json({ success: true, faq });
    } catch (error) {
        next(error);
    }
};

// @route PUT /api/admin/faqs/:id -> { success, faq }
export const updateFaq = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, message: "Invalid id" });
        const data = faqBody(req.body);
        if (data.question === "" || data.answer === "") return res.status(400).json({ success: false, message: "Question and answer cannot be empty" });
        const faq = await Faq.findByIdAndUpdate(req.params.id, { $set: data }, { new: true, runValidators: true });
        if (!faq) return res.status(404).json({ success: false, message: "FAQ not found" });
        res.status(200).json({ success: true, faq });
    } catch (error) {
        next(error);
    }
};

// @route PUT /api/admin/faqs/reorder  body { ids: [id, id, ...] } -> { success }
export const reorderFaqs = async (req, res, next) => {
    try {
        const ids = Array.isArray(req.body.ids) ? req.body.ids.filter((id) => mongoose.Types.ObjectId.isValid(id)) : [];
        if (!ids.length) return res.status(400).json({ success: false, message: "No ids" });
        await Faq.bulkWrite(ids.map((id, i) => ({ updateOne: { filter: { _id: id }, update: { $set: { order: i } } } })));
        res.status(200).json({ success: true });
    } catch (error) {
        next(error);
    }
};

// @route DELETE /api/admin/faqs/:id
export const deleteFaq = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, message: "Invalid id" });
        const faq = await Faq.findByIdAndDelete(req.params.id);
        if (!faq) return res.status(404).json({ success: false, message: "FAQ not found" });
        res.status(200).json({ success: true, message: "FAQ deleted" });
    } catch (error) {
        next(error);
    }
};
