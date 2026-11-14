// routes/admin/heroContentAdminRoutes.js — mounted at /api/admin/hero-content
import express from "express";
import { body } from "express-validator";
import {
    createHeroContent,
    deleteHeroContent,
    getAllHeroContent,
    updateHeroContent,
} from "../../controllers/heroContentController.js";
import { admin, protect } from "../../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect, admin);

// Media/poster/button URLs end up in src/href on the storefront. Allow only a
// site path ("/videos/x.mp4", "/uploads/..") or http(s); this blocks
// javascript:/data: and protocol-relative "//evil" values. "#" is the
// model default for buttonLink, so plain anchors pass too.
const isSafeUrl = (v) => v === "" || /^#/.test(v) || /^\/(?!\/)/.test(v) || /^https?:\/\/[^\s]+$/i.test(v);
const url = (name, max = 500) =>
    body(name).optional().isString().trim().isLength({ max }).custom(isSafeUrl).withMessage(`${name} must be a /path or an http(s) URL`);

// Create needs the required fields; update is a partial patch (reorder sends
// only { order }), so everything there is optional.
const shared = [
    body("title").optional().isString().trim().isLength({ max: 100 }),
    body("subtitle").optional().isString().trim().isLength({ max: 250 }),
    body("buttonText").optional().isString().trim().isLength({ max: 50 }),
    url("buttonLink"),
    body("label").optional().isString().trim().isLength({ max: 40 }),
    body("mediaType").optional().isIn(["video", "image"]),
    url("mediaUrl"),
    url("posterUrl"),
    body("deviceType").optional().isIn(["desktop", "mobile"]),
    body("season").optional().isIn(["all", "mango", "winter"]),
    body("order").optional().isInt({ min: -1000, max: 1000 }).toInt(),
    body("isActive").optional().isBoolean().toBoolean(),
];
const createRules = [
    body("title").exists({ checkFalsy: true }).withMessage("Title is required"),
    body("subtitle").exists({ checkFalsy: true }).withMessage("Subtitle is required"),
    body("mediaUrl").exists({ checkFalsy: true }).withMessage("Media URL is required"),
    body("deviceType").exists({ checkFalsy: true }).withMessage("Device type is required"),
    ...shared,
];

router.route("/").get(getAllHeroContent).post(createRules, createHeroContent);
router.route("/:id").put(shared, updateHeroContent).delete(deleteHeroContent);

export default router;
