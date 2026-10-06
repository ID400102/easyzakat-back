const express = require("express");

const {
    createReceipt,
    getMyReceipts,
    getReceiptById
} = require("../controllers/receiptController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", protect, createReceipt);

router.get("/my-receipts", protect, getMyReceipts);

router.get("/:id", protect, getReceiptById);

module.exports = router;