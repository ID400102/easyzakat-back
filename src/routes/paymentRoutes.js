
const express = require("express");

const {
    createPayment,
    getMyPayments,
    getAdminRecentPayments,
    getPaymentById,
    updatePaymentStatus,
    paymentWebhook
} = require("../controllers/paymentController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

// ==========================================
// CRÉER UN PAIEMENT
// ==========================================

router.post("/", (req, res, next) => {
    const token = req.headers.authorization;

    if (token) {
        return protect(req, res, next);
    }

    next();
}, createPayment);


// ==========================================
// WEBHOOK DU PRESTATAIRE
// ==========================================

router.post("/webhook", paymentWebhook);


// ==========================================
// RÉCUPÉRER MES PAIEMENTS
// ==========================================

router.get("/my-payments", protect, getMyPayments);


// ==========================================
// PAIEMENTS RÉCENTS DE L'ADMINISTRATEUR
// ==========================================

router.get(
    "/admin/recent",
    protect,
    getAdminRecentPayments
);


// ==========================================
// RÉCUPÉRER UN PAIEMENT PAR SON ID
// ==========================================

router.get("/:id", protect, getPaymentById);


// ==========================================
// MODIFIER LE STATUT
// ==========================================

router.put("/:id/status", protect, updatePaymentStatus);


module.exports = router;
