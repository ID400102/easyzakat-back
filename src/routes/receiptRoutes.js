const express = require("express");
const optionalAuth = require("../middleware/optionalAuth");
const { createReceipt } = require("../controllers/receiptController");
const router = express.Router();
router.post("/", optionalAuth, createReceipt);
module.exports = router;
