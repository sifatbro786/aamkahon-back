import mongoose from "mongoose";

// One document (key "main") holding the storefront's editable content.
// Aamkahon runs on seasons: mango (summer), winter (khejurer gur) and
// all-year. The admin picks the active season; the homepage copy, which
// blocks show, which hero media and which product sections appear all follow
// it. Hero media and sections carry their own `season` tags (HeroContent,
// DynamicSection); this document holds the copy and the block switches.
export const SEASONS = ["mango", "winter", "all"];

const blocksSchema = new mongoose.Schema(
    {
        seasonBoard: { type: Boolean, default: true },
        harvestCalendar: { type: Boolean, default: true },
        wholesaleBand: { type: Boolean, default: true },
        testimonials: { type: Boolean, default: true },
        orchardReels: { type: Boolean, default: true },
        delivery: { type: Boolean, default: true },
        story: { type: Boolean, default: true },
        faq: { type: Boolean, default: true },
    },
    { _id: false },
);

const seasonContentSchema = new mongoose.Schema(
    {
        announcement: { type: String, trim: true, maxlength: 160, default: "" },
        heroEyebrow: { type: String, trim: true, maxlength: 60, default: "" },
        heroTitle: { type: String, trim: true, maxlength: 100, default: "" },
        heroSubtitle: { type: String, trim: true, maxlength: 250, default: "" },
        heroButtonText: { type: String, trim: true, maxlength: 40, default: "" },
        heroButtonLink: { type: String, trim: true, maxlength: 200, default: "" },
        heroSecondaryText: { type: String, trim: true, maxlength: 40, default: "" },
        heroSecondaryLink: { type: String, trim: true, maxlength: 200, default: "" },
        blocks: { type: blocksSchema, default: () => ({}) },
    },
    { _id: false },
);

const storySchema = new mongoose.Schema(
    {
        ownerName: { type: String, trim: true, maxlength: 80, default: "" },
        ownerRole: { type: String, trim: true, maxlength: 80, default: "" },
        ownerPhoto: { type: String, trim: true, maxlength: 300, default: "" },
        ownerPhotoAlt: { type: String, trim: true, maxlength: 160, default: "" },
        // Short pull quote (Bangla or English) and a longer note in the owner's voice.
        quote: { type: String, trim: true, maxlength: 400, default: "" },
        quoteLang: { type: String, enum: ["bn", "en"], default: "bn" },
        note: { type: String, trim: true, maxlength: 2000, default: "" },
        // Small facts beside the portrait, e.g. "Started 2021", "64 districts".
        facts: {
            type: [{ label: { type: String, trim: true, maxlength: 40 }, value: { type: String, trim: true, maxlength: 40 }, _id: false }],
            default: [],
        },
    },
    { _id: false },
);

const storefrontSettingsSchema = new mongoose.Schema(
    {
        key: { type: String, default: "main", unique: true },
        activeSeason: { type: String, enum: SEASONS, default: "all" },
        seasons: {
            mango: { type: seasonContentSchema, default: () => ({}) },
            winter: { type: seasonContentSchema, default: () => ({}) },
            all: { type: seasonContentSchema, default: () => ({}) },
        },
        story: { type: storySchema, default: () => ({}) },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true },
);

export default mongoose.model("StorefrontSettings", storefrontSettingsSchema);
