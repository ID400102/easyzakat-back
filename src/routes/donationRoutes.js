
const express = require("express");
const c = require("../controllers/donationController");
const protect = require("../middleware/authMiddleware");
const optionalAuth = require("../middleware/optionalAuth");

const router = express.Router();

// Créer un don (utilisateur connecté ou invité)
router.post("/", optionalAuth, c.createDonation);

// Consulter tous les dons : administration uniquement
router.get("/", protect, (req, res, next) => {
  if (!["admin", "superadmin"].includes(req.user.role)) {
    return res.status(403).json({
      message: "Accès réservé aux administrateurs."
    });
  }
  next();
}, c.getDonations);

// Dons de l'utilisateur connecté
router.get("/my-donations", protect, c.getMyDonations);

// Consulter un don
router.get("/:id", protect, c.getDonationById);

// Le statut est géré par le webhook de paiement
router.put("/:id/status", protect, c.updateDonationStatus);

module.exports = router;
