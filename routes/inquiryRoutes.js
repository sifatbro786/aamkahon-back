import express from "express";
import { body } from "express-validator";
import { createInquiry } from "../controllers/inquiryController.js";
import { optionalProtect } from "../middlewares/authMiddleware.js";
import { inquiryLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

const inquiryRules = [
    body("type")
        .optional()
        .isIn(["price", "availability", "wholesale", "pre_booking", "general"])
        .withMessage("Invalid inquiry type"),
    body("productId").optional({ values: "falsy" }).isMongoId().withMessage("Invalid product"),
    body("name").trim().notEmpty().withMessage("Name is required").isLength({ max: 120 }),
    // Bangladesh mobile: 01XXXXXXXXX, optional +88 / 88 prefix.
    body("phone")
        .trim()
        .matches(/^(?:\+?88)?01[3-9]\d{8}$/)
        .withMessage("Enter a valid Bangladeshi mobile number"),
    body("email").optional({ values: "falsy" }).trim().isEmail().withMessage("Invalid email").normalizeEmail(),
    body("quantity").optional({ values: "falsy" }).isFloat({ min: 0, max: 1000000 }).toFloat(),
    body("district").optional().trim().isLength({ max: 80 }),
    body("variantLabel").optional().trim().isLength({ max: 120 }),
    body("message").optional().trim().isLength({ max: 2000 }),
];

router.post("/", inquiryLimiter, optionalProtect, inquiryRules, createInquiry);

export default router;
