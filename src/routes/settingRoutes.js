const express = require("express");
const protect = require("../middleware/authMiddleware");
const requireRoles = require("../middleware/requireRoles");
const c = require("../controllers/settingController");
const router = express.Router();
router.get("/public", c.getPublicSettings);
router.get("/", protect, requireRoles("admin", "superadmin"), c.getSettings);
router.put("/:key", protect, requireRoles("admin", "superadmin"), c.updateSetting);
module.exports = router;
