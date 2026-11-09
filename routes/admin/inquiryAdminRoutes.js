import express from "express";
import { body } from "express-validator";
import {
    deleteInquiry,
    getInquiries,
    updateInquiry,
} from "../../controllers/inquiryController.js";
import { admin, protect } from "../../middlewares/authMiddleware.js";

const router = express.Router();
router.use(protect, admin);

router.get("/", getInquiries);
router.patch(
    "/:id",
    [
        body("status").optional().isIn(["new", "contacted", "quoted", "converted", "closed"]),
        body("quotedPrice").optional({ values: "null" }).isFloat({ min: 0 }),
        body("note").optional().isString().isLength({ max: 1000 }),
    ],
    updateInquiry,
);
router.delete("/:id", deleteInquiry);

export default router;
