const express = require("express");

const {
    createDistribution,
    getDistributions,
    getDistributionById,
    updateDistributionStatus,
    deleteDistribution
} = require("../controllers/distributionController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();


// Créer une distribution
router.post("/", protect, createDistribution);


// Récupérer toutes les distributions
router.get("/", getDistributions);


// Modifier le statut - ADMIN
router.put(
    "/:id/status",
    protect,
    updateDistributionStatus
);


// Récupérer une distribution
router.get("/:id", getDistributionById);


// Annuler une distribution - ADMIN
router.delete(
    "/:id",
    protect,
    deleteDistribution
);


module.exports = router;