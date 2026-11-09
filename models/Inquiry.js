import mongoose from "mongoose";

// Price / availability / wholesale / general inquiries from the storefront.
// Products with priceVisibility "inquiry" or "tba" can only be bought this way,
// and bulk buyers use it to ask for a quote.
const inquirySchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ["price", "availability", "wholesale", "pre_booking", "general"],
            default: "price",
            index: true,
        },
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
        // Snapshots, so the inbox stays readable after a product is renamed/deleted.
        productName: { type: String, trim: true },
        variantLabel: { type: String, trim: true },
        quantity: { type: Number, min: 0 },
        unit: { type: String, trim: true },

        name: { type: String, required: true, trim: true, maxlength: 120 },
        phone: { type: String, required: true, trim: true, maxlength: 20 },
        email: { type: String, trim: true, lowercase: true, maxlength: 160 },
        district: { type: String, trim: true, maxlength: 80 },
        message: { type: String, trim: true, maxlength: 2000 },

        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

        status: {
            type: String,
            enum: ["new", "contacted", "quoted", "converted", "closed"],
            default: "new",
            index: true,
        },
        // Admin's quoted unit price, recorded for follow-up; never used for checkout.
        quotedPrice: { type: Number, min: 0, default: null },
        adminNotes: [
            {
                note: { type: String, required: true, trim: true },
                addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                addedAt: { type: Date, default: Date.now },
                _id: false,
            },
        ],
    },
    { timestamps: true },
);

inquirySchema.index({ createdAt: -1 });

export default mongoose.model("Inquiry", inquirySchema);
