const express = require("express");

const {
    createBeneficiary,
    getBeneficiaries,
    getBeneficiaryById,
    updateBeneficiary,
    updateBeneficiaryStatus,
    deleteBeneficiary
} = require("../controllers/beneficiaryController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();


// Créer un bénéficiaire
router.post("/", protect, createBeneficiary);


// Récupérer tous les bénéficiaires
router.get("/", getBeneficiaries);


// Modifier le statut - ADMIN
router.put(
    "/:id/status",
    protect,
    updateBeneficiaryStatus
);


// Récupérer un bénéficiaire
router.get("/:id", getBeneficiaryById);


// Modifier un bénéficiaire
router.put("/:id", protect, updateBeneficiary);


// Désactiver un bénéficiaire
router.delete("/:id", protect, deleteBeneficiary);


module.exports = router;