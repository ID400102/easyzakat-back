const express = require("express");

const {
    createOrganization,
    getOrganizations,
    getMyOrganization,
    getOrganizationById,
    updateOrganization,
    deleteOrganization,
    updateOrganizationStatus
} = require("../controllers/organizationController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();


// Créer une organisation
router.post("/", protect, createOrganization);


// Récupérer toutes les organisations
router.get("/", getOrganizations);


// Récupérer mon organisation
router.get("/my-organization", protect, getMyOrganization);


// Modifier le statut - ADMIN
router.put(
    "/:id/status",
    protect,
    updateOrganizationStatus
);


// Récupérer une organisation
router.get("/:id", getOrganizationById);


// Modifier une organisation
router.put("/:id", protect, updateOrganization);


// Désactiver une organisation
router.delete("/:id", protect, deleteOrganization);


module.exports = router;