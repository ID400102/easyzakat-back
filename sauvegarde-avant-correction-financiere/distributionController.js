const Distribution = require("../models/Distribution");
const Beneficiary = require("../models/Beneficiary");
const Organization = require("../models/Organization");
const Donation = require("../models/Donation");
const Campaign = require("../models/Campaign");
const createAudit = require("../utils/createAudit");

const getDistributions = async (req, res) => {
  try {
    const distributions = await Distribution.find().populate("beneficiary", "firstName lastName category amountNeeded amountReceived status").populate("organization", "name status").populate("campaign", "name").populate("createdBy", "firstName lastName").populate("validatedBy", "firstName lastName").sort({ createdAt: -1 });
    res.json({ count: distributions.length, distributions });
  } catch (error) { res.status(500).json({ message: "Erreur lors de la récupération des distributions.", error: error.message }); }
};

const createDistribution = async (req, res) => {
  try {
    const { beneficiary, organization, campaign = null, amount, donationType = "sadaqa", reason = "", method = "cash", proofUrl = "" } = req.body;
    if (!beneficiary || !organization || !Number.isFinite(Number(amount)) || Number(amount) <= 0) return res.status(400).json({ message: "Bénéficiaire, organisation et montant positif sont obligatoires." });
    const [b, o, collected] = await Promise.all([
      Beneficiary.findById(beneficiary), Organization.findById(organization),
      Donation.aggregate([{ $match: { status: "success" } }, { $group: { _id: null, total: { $sum: "$amount" } } }])
    ]);
    if (!b || !b.isActive || b.status !== "approved") return res.status(400).json({ message: "Le bénéficiaire doit être approuvé et actif." });
    if (!o || !o.isActive || o.status !== "approved") return res.status(400).json({ message: "L'organisation doit être approuvée et active." });
    if (String(b.organization) !== String(o._id)) return res.status(400).json({ message: "L'organisation ne correspond pas au dossier du bénéficiaire." });
    if (campaign) {
      const linkedCampaign = await Campaign.findById(campaign);
      if (!linkedCampaign || linkedCampaign.status !== "active") return res.status(400).json({ message: "La campagne associée doit être active." });
    }
    if (Number(amount) > b.amountNeeded - b.amountReceived) return res.status(400).json({ message: "Le montant dépasse le besoin restant du bénéficiaire." });
    const totalCollected = collected[0]?.total || 0;
    const allocated = await Distribution.aggregate([{ $match: { status: { $in: ["approved", "completed"] } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]);
    const available = totalCollected - (allocated[0]?.total || 0);
    if (Number(amount) > available) return res.status(400).json({ message: "Fonds insuffisants pour cette distribution.", availableFunds: Math.max(available, 0) });
    const distribution = await Distribution.create({ beneficiary, organization, campaign, amount: Number(amount), donationType, reason, method, proofUrl, createdBy: req.user.id, status: "pending" });
    await createAudit({ action: "DISTRIBUTION_CREATED", entityType: "Distribution", entityId: distribution._id, user: req.user.id, details: { amount: distribution.amount, status: distribution.status }, ip: req.ip });
    res.status(201).json({ message: "Distribution enregistrée en attente d'autorisation.", distribution });
  } catch (error) { res.status(400).json({ message: "Création de la distribution impossible.", error: error.message }); }
};

const updateDistributionStatus = async (req, res) => {
  try {
    const next = req.body.status;
    if (!["approved", "completed", "cancelled"].includes(next)) return res.status(400).json({ message: "Statut de distribution invalide." });
    const distribution = await Distribution.findById(req.params.id);
    if (!distribution) return res.status(404).json({ message: "Distribution introuvable." });
    const oldStatus = distribution.status;
    if (oldStatus === "completed" || oldStatus === "cancelled") return res.status(409).json({ message: "Cette distribution est déjà clôturée." });
    if (next === "approved" && oldStatus !== "pending") return res.status(409).json({ message: "Seule une distribution en attente peut être autorisée." });
    if (next === "approved") {
      const [collected, allocated] = await Promise.all([
        Donation.aggregate([{ $match: { status: "success" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
        Distribution.aggregate([{ $match: { status: { $in: ["approved", "completed"] }, _id: { $ne: distribution._id } } }, { $group: { _id: null, total: { $sum: "$amount" } } }])
      ]);
      const available = (collected[0]?.total || 0) - (allocated[0]?.total || 0);
      if (distribution.amount > available) return res.status(400).json({ message: "Fonds disponibles insuffisants pour autoriser cette distribution.", availableFunds: Math.max(available, 0) });
    }
    if (next === "completed") {
      if (oldStatus !== "approved") return res.status(409).json({ message: "La distribution doit être autorisée avant sa réalisation." });
      if (!distribution.proofUrl?.trim()) return res.status(400).json({ message: "Ajoutez un justificatif avant de valider la réalisation." });
      const beneficiary = await Beneficiary.findById(distribution.beneficiary);
      if (!beneficiary) return res.status(404).json({ message: "Bénéficiaire introuvable." });
      if (beneficiary.amountReceived + distribution.amount > beneficiary.amountNeeded) return res.status(400).json({ message: "Le montant dépasse le besoin restant." });
      beneficiary.amountReceived += distribution.amount;
      if (beneficiary.amountReceived >= beneficiary.amountNeeded) beneficiary.status = "completed";
      await beneficiary.save();
      distribution.distributedAt = new Date();
      distribution.validatedAt = new Date();
      distribution.validatedBy = req.user.id;
    }
    distribution.status = next;
    await distribution.save();
    await createAudit({ action: "DISTRIBUTION_STATUS_UPDATED", entityType: "Distribution", entityId: distribution._id, user: req.user.id, details: { oldStatus, newStatus: next, amount: distribution.amount }, ip: req.ip });
    res.json({ message: "Statut de la distribution mis à jour.", distribution });
  } catch (error) { res.status(400).json({ message: "Mise à jour de la distribution impossible.", error: error.message }); }
};

const deleteDistribution = async (req, res) => {
  try {
    const distribution = await Distribution.findById(req.params.id);
    if (!distribution) return res.status(404).json({ message: "Distribution introuvable." });
    if (["completed", "cancelled"].includes(distribution.status)) return res.status(409).json({ message: "Une distribution clôturée ne peut pas être annulée." });
    const oldStatus = distribution.status; distribution.status = "cancelled"; await distribution.save();
    await createAudit({ action: "DISTRIBUTION_CANCELLED", entityType: "Distribution", entityId: distribution._id, user: req.user.id, details: { oldStatus }, ip: req.ip });
    res.json({ message: "Distribution annulée.", distribution });
  } catch (error) { res.status(400).json({ message: "Annulation impossible.", error: error.message }); }
};
module.exports = { getDistributions, createDistribution, updateDistributionStatus, deleteDistribution };
