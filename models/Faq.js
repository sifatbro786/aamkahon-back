import mongoose from "mongoose";

// Storefront FAQ. `seasons` empty = always shown; otherwise only while one of
// those seasons is active (e.g. pre-booking questions in mango season).
const faqSchema = new mongoose.Schema(
    {
        question: { type: String, required: true, trim: true, maxlength: 200 },
        // Plain text; line breaks are kept on render. Never HTML.
        answer: { type: String, required: true, trim: true, maxlength: 2000 },
        seasons: { type: [{ type: String, enum: ["mango", "winter", "all"] }], default: [] },
        showOnHomepage: { type: Boolean, default: true },
        order: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true },
);

faqSchema.index({ isActive: 1, order: 1 });

export default mongoose.model("Faq", faqSchema);
