const express = require("express");
const c = require("../controllers/zakatController");
const optionalAuth = require("../middleware/optionalAuth");
const protect = require("../middleware/authMiddleware");
const router = express.Router();
router.post("/calculate", optionalAuth, c.calculateZakat);
router.get("/my-calculations", protect, c.getMyCalculations);
module.exports = router;
