const express = require("express");

const {
    createCampaign,
    getCampaigns,
    getCampaignById,
    updateCampaign,
    deleteCampaign
} = require("../controllers/campaignController");

const protect = require("../middleware/authMiddleware");
const requireRoles = require("../middleware/requireRoles");

const router = express.Router();

// Voir toutes les campagnes
router.get("/", getCampaigns);

// Voir une campagne
router.get("/:id", getCampaignById);

// Créer une campagne
router.post("/", protect, requireRoles("organization", "admin", "superadmin"), createCampaign);

// Modifier une campagne
router.put("/:id", protect, requireRoles("organization", "admin", "superadmin"), updateCampaign);

// Supprimer une campagne
router.delete("/:id", protect, requireRoles("organization", "admin", "superadmin"), deleteCampaign);

module.exports = router;