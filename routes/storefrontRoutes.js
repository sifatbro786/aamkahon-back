import express from "express";
import { getPublicFaqs, getStorefront } from "../controllers/storefrontController.js";

const router = express.Router();
router.get("/faqs", getPublicFaqs);
router.get("/", getStorefront);
export default router;
