const express = require("express");

const {
    getDonorDashboard,
    getAdminDashboard
} = require("../controllers/dashboardController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();


// ==========================================
// DASHBOARD DONNEUR
// ==========================================
router.get(
    "/donor",
    protect,
    getDonorDashboard
);


// ==========================================
// DASHBOARD ADMIN
// ==========================================
router.get(
    "/admin",
    protect,
    getAdminDashboard
);


module.exports = router;