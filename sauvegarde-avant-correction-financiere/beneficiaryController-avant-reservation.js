const Beneficiary = require("../models/Beneficiary");
const Organization = require("../models/Organization");
const createAudit = require("../utils/createAudit");

const getBeneficiaries = async (req, res) => {
  try {
    const beneficiaries = await Beneficiary.find().populate("organization", "name email status").populate("createdBy", "firstName lastName").sort({ createdAt: -1 });
    res.json({ count: beneficiaries.length, beneficiaries });
  } catch (error) { res.status(500).json({ message: "Erreur lors de la récupération des bénéficiaires." }); }
};

const createBeneficiary = async (req, res) => {
  try {
    const { firstName, lastName, amountNeeded, organization } = req.body;
    if (!firstName?.trim() || !lastName?.trim() || !organization || !Number.isFinite(Number(amountNeeded)) || Number(amountNeeded) <= 0) return res.status(400).json({ message: "Prénom, nom, organisation et montant nécessaire positif sont obligatoires." });
    const org = await Organization.findById(organization);
    if (!org || !org.isActive || org.status !== "approved") return res.status(400).json({ message: "Le bénéficiaire doit être rattaché à une organisation approuvée et active." });
    const beneficiary = await Beneficiary.create({ ...req.body, amountNeeded: Number(amountNeeded), organization, createdBy: req.user.id, status: "pending" });
    await createAudit({ action: "BENEFICIARY_CREATED", entityType: "Beneficiary", entityId: beneficiary._id, user: req.user.id, details: { status: beneficiary.status, organization }, ip: req.ip });
    res.status(201).json({ message: "Bénéficiaire créé.", beneficiary });
  } catch (error) { res.status(400).json({ message: "Création du bénéficiaire impossible.", error: error.message }); }
};

const updateBeneficiary = async (req, res) => {
  try {
    const beneficiary = await Beneficiary.findById(req.params.id);
    if (!beneficiary) return res.status(404).json({ message: "Bénéficiaire introuvable." });
    const allowed = ["firstName", "lastName", "phone", "email", "address", "city", "country", "category", "description", "amountNeeded", "organization"];
    const before = {};
    for (const key of allowed) if (req.body[key] !== undefined) { before[key] = beneficiary[key]; beneficiary[key] = key === "amountNeeded" ? Number(req.body[key]) : req.body[key]; }
    if (beneficiary.amountNeeded < beneficiary.amountReceived) return res.status(400).json({ message: "Le montant nécessaire ne peut pas être inférieur au montant déjà reçu." });
    if (req.body.organization) {
      const org = await Organization.findById(req.body.organization);
      if (!org || org.status !== "approved" || !org.isActive) return res.status(400).json({ message: "L'organisation doit être approuvée et active." });
    }
    await beneficiary.save();
    await createAudit({ action: "BENEFICIARY_UPDATED", entityType: "Beneficiary", entityId: beneficiary._id, user: req.user.id, details: { changedFields: Object.keys(before) }, ip: req.ip });
    res.json({ message: "Bénéficiaire mis à jour.", beneficiary });
  } catch (error) { res.status(400).json({ message: "Modification du bénéficiaire impossible.", error: error.message }); }
};

const updateBeneficiaryStatus = async (req, res) => {
  try {
    const allowed = ["pending", "approved", "rejected", "completed"];
    if (!allowed.includes(req.body.status)) return res.status(400).json({ message: "Statut du bénéficiaire invalide." });
    const beneficiary = await Beneficiary.findById(req.params.id);
    if (!beneficiary) return res.status(404).json({ message: "Bénéficiaire introuvable." });
    const oldStatus = beneficiary.status; beneficiary.status = req.body.status; await beneficiary.save();
    await createAudit({ action: "BENEFICIARY_STATUS_UPDATED", entityType: "Beneficiary", entityId: beneficiary._id, user: req.user.id, details: { oldStatus, newStatus: beneficiary.status }, ip: req.ip });
    res.json({ message: "Statut du bénéficiaire mis à jour.", beneficiary });
  } catch (error) { res.status(400).json({ message: "Mise à jour du statut impossible.", error: error.message }); }
};

const deleteBeneficiary = async (req, res) => {
  try {
    const beneficiary = await Beneficiary.findById(req.params.id);
    if (!beneficiary) return res.status(404).json({ message: "Bénéficiaire introuvable." });
    beneficiary.isActive = false; await beneficiary.save();
    await createAudit({ action: "BENEFICIARY_DEACTIVATED", entityType: "Beneficiary", entityId: beneficiary._id, user: req.user.id, details: {}, ip: req.ip });
    res.json({ message: "Bénéficiaire désactivé.", beneficiary });
  } catch (error) { res.status(400).json({ message: "Désactivation impossible.", error: error.message }); }
};
module.exports = { getBeneficiaries, createBeneficiary, updateBeneficiary, updateBeneficiaryStatus, deleteBeneficiary };
