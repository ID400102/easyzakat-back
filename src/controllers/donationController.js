const crypto = require("crypto");
const Donation = require("../models/Donation");
const Campaign = require("../models/Campaign");
const createAudit = require("../utils/createAudit");

const createDonation = async (req, res) => {
  try {
    const { campaign = null, type, amount, anonymous = false, paymentMethod = null, guestInfo = {} } = req.body;
    const value = Number(amount);
    if (!type || !["zakat", "sadaqa", "ramadan", "urgence_sociale"].includes(type)) return res.status(400).json({ message: "Type de don invalide." });
    if (!Number.isFinite(value) || value <= 0) return res.status(400).json({ message: "Le montant du don doit être supérieur à zéro." });
    if (campaign) {
      const c = await Campaign.findById(campaign);
      if (!c || c.status !== "active") return res.status(400).json({ message: "La campagne sélectionnée n'est pas disponible." });
    }
    let guestPaymentToken = null;
    const data = { donor: req.user?.id || null, campaign, type, amount: value, anonymous: Boolean(anonymous), paymentMethod, status: "pending" };
    if (!req.user) {
      const { firstName = "", lastName = "", email = "", phone = "", city = "" } = guestInfo;
      if (!firstName.trim() || !lastName.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !phone.trim()) return res.status(400).json({ message: "Les coordonnées du donateur invité sont obligatoires et doivent être valides." });
      guestPaymentToken = crypto.randomBytes(32).toString("hex");
      data.guestInfo = { firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim().toLowerCase(), phone: phone.trim(), city: String(city || "").trim() };
      data.guestPaymentTokenHash = crypto.createHash("sha256").update(guestPaymentToken).digest("hex");
      data.guestPaymentTokenExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
    }
    const donation = await Donation.create(data);
    await createAudit({ action: "DONATION_CREATED", entityType: "Donation", entityId: donation._id, user: req.user?.id || null, details: { amount: value, type, anonymous: Boolean(anonymous), guest: !req.user }, ip: req.ip });
    res.status(201).json({ message: "Don créé. Le paiement reste en attente de confirmation.", donation, ...(guestPaymentToken ? { guestPaymentToken } : {}) });
  } catch (error) { res.status(400).json({ message: "Création du don impossible.", error: error.message }); }
};

const getDonations = async (req, res) => {
  try {
    const donations = await Donation.find().populate("donor", "firstName lastName email role").populate("campaign", "name category objective collected status").sort({ createdAt: -1 });
    res.json({ count: donations.length, donations });
  } catch (error) { res.status(500).json({ message: "Erreur lors de la récupération des dons.", error: error.message }); }
};
const getMyDonations = async (req, res) => {
  try {
    const donations = await Donation.find({ donor: req.user.id }).populate("campaign", "name category").sort({ createdAt: -1 });
    res.json({ count: donations.length, donations });
  } catch (error) { res.status(500).json({ message: "Erreur lors de la récupération de vos dons." }); }
};
const getDonationById = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id).populate("campaign", "name category");
    if (!donation) return res.status(404).json({ message: "Don introuvable." });
    if (!req.user) return res.status(401).json({ message: "Connectez-vous pour consulter ce don." });
    const isAdmin = ["admin", "superadmin"].includes(req.user.role);
    if (!isAdmin && (!donation.donor || String(donation.donor) !== String(req.user.id))) return res.status(403).json({ message: "Accès non autorisé." });
    res.json({ donation });
  } catch (error) { res.status(400).json({ message: "Lecture du don impossible." }); }
};
const updateDonationStatus = async (req, res) => res.status(403).json({ message: "Le statut d'un don est mis à jour uniquement après confirmation du paiement par le webhook du prestataire." });
module.exports = { createDonation, getDonations, getMyDonations, getDonationById, updateDonationStatus };
