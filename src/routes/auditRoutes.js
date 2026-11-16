const express = require("express");
const protect = require("../middleware/authMiddleware");
const requireRoles = require("../middleware/requireRoles");
const { getAudits } = require("../controllers/auditController");
const router = express.Router();
router.use(protect, requireRoles("admin", "superadmin"));
router.get("/", getAudits);
module.exports = router;
