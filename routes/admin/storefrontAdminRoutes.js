import express from "express";
import { createFaq, deleteFaq, getSettings, listFaqs, reorderFaqs, updateFaq, updateSettings } from "../../controllers/storefrontController.js";
import { admin, protect } from "../../middlewares/authMiddleware.js";

// Mounted at /api/admin/storefront and /api/admin/faqs (see server.js).
export const settingsRouter = express.Router();
settingsRouter.use(protect, admin);
settingsRouter.get("/", getSettings);
settingsRouter.put("/", updateSettings);

export const faqRouter = express.Router();
faqRouter.use(protect, admin);
faqRouter.get("/", listFaqs);
faqRouter.post("/", createFaq);
faqRouter.put("/reorder", reorderFaqs); // literal before /:id
faqRouter.put("/:id", updateFaq);
faqRouter.delete("/:id", deleteFaq);
