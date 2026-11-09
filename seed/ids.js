import crypto from "crypto";

// Deterministic ObjectId per seed key. The DB seed and the static demo
// fixtures derive the same ids from the same keys, so links and cart lines
// built against the demo resolve against a freshly seeded database too.
export const seedId = (kind, key) =>
    crypto.createHash("md5").update(`aamkahon:${kind}:${key}`).digest("hex").slice(0, 24);
