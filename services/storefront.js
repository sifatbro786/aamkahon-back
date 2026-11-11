// services/storefront.js
// Active season + its content, shared by the public storefront endpoint, the
// hero endpoint and homepage sections. One small indexed read per request;
// the storefront caches these responses for a minute ("use cache").
import StorefrontSettings, { SEASONS } from "../models/StorefrontSettings.js";

export const getSettingsDoc = async () => {
    // Upsert so a fresh database always has the document (defaults applied).
    return StorefrontSettings.findOneAndUpdate(
        { key: "main" },
        { $setOnInsert: { key: "main" } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();
};

export const getActiveSeason = async () => {
    const doc = await StorefrontSettings.findOne({ key: "main" }).select("activeSeason").lean();
    return SEASONS.includes(doc?.activeSeason) ? doc.activeSeason : "all";
};

/**
 * Season filter for documents tagged with seasons.
 * Untagged (or tagged "all") items always show; tagged items show only in
 * their season. Works for both `season: String` and `seasons: [String]`.
 */
export const seasonMatch = (active, field = "seasons") => ({
    $or: [
        { [field]: { $exists: false } },
        { [field]: { $size: 0 } },
        { [field]: "all" },
        { [field]: active },
    ],
});

/** Same rule for a plain value field (HeroContent.season). */
export const seasonValueMatch = (active) => ({
    $or: [{ season: { $exists: false } }, { season: null }, { season: "all" }, { season: active }],
});
