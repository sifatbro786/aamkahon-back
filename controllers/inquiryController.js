import mongoose from "mongoose";
import { validationResult } from "express-validator";
import Inquiry from "../models/Inquiry.js";
import Product from "../models/Product.js";
import { sendEmail } from "../services/emailService.js";
import { recordCustomerFromInquiry } from "../services/customerSync.js";
import { escapeRegex } from "../utils/escapeRegex.js";

const STATUSES = ["new", "contacted", "quoted", "converted", "closed"];

// @desc    Submit an inquiry (price on request, availability, wholesale quote)
// @route   POST /api/inquiries
// @access  Public (optional auth, rate limited)
export const createInquiry = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res
                .status(400)
                .json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
        }

        const { type, productId, variantLabel, quantity, name, phone, email, district, message } =
            req.body;

        // Product name/unit come from the DB, never from the client.
        let product = null;
        if (productId) {
            product = await Product.findOne({ _id: productId, isActive: true })
                .select("name unit")
                .lean();
            if (!product) {
                return res.status(404).json({ success: false, message: "Product not found" });
            }
        }

        const inquiry = await Inquiry.create({
            type: type || (product ? "price" : "general"),
            product: product?._id || null,
            productName: product?.name,
            unit: product?.unit,
            variantLabel,
            quantity,
            name,
            phone,
            email,
            district,
            message,
            user: req.user?._id || null,
        });

        recordCustomerFromInquiry(inquiry); // lead book, best effort

        // Best effort: a mail outage must not lose the inquiry, it is already saved.
        const to = process.env.MAIL_TO || process.env.SMTP_USER;
        if (to) {
            sendEmail({
                email: to,
                template: "adminInquiry",
                data: { ...inquiry.toObject(), type: inquiry.type.replace("_", " ") },
            }).catch((e) => console.error("Inquiry email failed:", e.message));
        }

        res.status(201).json({
            success: true,
            message: "Thanks. We will call you shortly.",
            inquiry: { _id: inquiry._id, type: inquiry.type, createdAt: inquiry.createdAt },
        });
    } catch (error) {
        next(error);
    }
};

// @desc    List inquiries
// @route   GET /api/admin/inquiries?status=&type=&search=&page=&limit=
// @access  Admin
export const getInquiries = async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const filter = {};
        if (STATUSES.includes(req.query.status)) filter.status = req.query.status;
        if (typeof req.query.type === "string" && req.query.type) filter.type = req.query.type;
        if (typeof req.query.search === "string" && req.query.search.trim()) {
            const rx = new RegExp(escapeRegex(req.query.search.trim()), "i");
            filter.$or = [{ name: rx }, { phone: rx }, { email: rx }, { productName: rx }];
        }

        const [inquiries, total, counts] = await Promise.all([
            Inquiry.find(filter)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .populate("product", "name slug")
                .populate("adminNotes.addedBy", "name")
                .lean(),
            Inquiry.countDocuments(filter),
            Inquiry.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
        ]);

        res.status(200).json({
            success: true,
            inquiries,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            statusCounts: Object.fromEntries(counts.map((c) => [c._id, c.count])),
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update status / quoted price / add a note
// @route   PATCH /api/admin/inquiries/:id
// @access  Admin
export const updateInquiry = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid inquiry id" });
        }
        const inquiry = await Inquiry.findById(req.params.id);
        if (!inquiry) return res.status(404).json({ success: false, message: "Inquiry not found" });

        const { status, quotedPrice, note } = req.body;
        if (status !== undefined) {
            if (!STATUSES.includes(status)) {
                return res.status(400).json({ success: false, message: "Invalid status" });
            }
            inquiry.status = status;
        }
        if (quotedPrice !== undefined) {
            inquiry.quotedPrice = quotedPrice === null || quotedPrice === "" ? null : Number(quotedPrice);
        }
        if (typeof note === "string" && note.trim()) {
            inquiry.adminNotes.push({ note: note.trim().slice(0, 1000), addedBy: req.user._id });
        }
        await inquiry.save();
        await inquiry.populate("adminNotes.addedBy", "name");

        res.status(200).json({ success: true, inquiry });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete an inquiry
// @route   DELETE /api/admin/inquiries/:id
// @access  Admin
export const deleteInquiry = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid inquiry id" });
        }
        const deleted = await Inquiry.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ success: false, message: "Inquiry not found" });
        res.status(200).json({ success: true, message: "Inquiry deleted" });
    } catch (error) {
        next(error);
    }
};
