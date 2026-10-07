const express = require("express");

const {
    getAudits,
    getAuditById
} = require("../controllers/auditController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();


// Tous les audits
router.get("/", protect, getAudits);


// Un audit
router.get("/:id", protect, getAuditById);


module.exports = router;