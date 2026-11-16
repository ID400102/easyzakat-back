const express = require("express");
const protect = require("../middleware/authMiddleware");
const requireRoles = require("../middleware/requireRoles");
const c = require("../controllers/dashboardController");
const router = express.Router();
router.get("/", c.getPublicDashboard);
router.get("/donor", protect, c.getDonorDashboard);
router.get("/admin", protect, requireRoles("admin", "superadmin"), c.getAdminDashboard);
module.exports = router;
