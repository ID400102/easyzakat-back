const mongoose = require("mongoose");
const Campaign = require("../models/Campaign");
const Organization = require("../models/Organization");
const createAudit = require("../utils/createAudit");

const getCampaigns = async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) filter.$or = [{ name: new RegExp(search, "i") }, { description: new RegExp(search, "i") }];
    const campaigns = await Campaign.find(filter).populate("organization", "firstName lastName email role").populate("partnerOrganization", "name email status").sort({ createdAt: -1 });
    res.json({ count: campaigns.length, campaigns });
  } catch (error) { res.status(500).json({ message: "Erreur lors de la récupération des campagnes.", error: error.message }); }
};

const createCampaign = async (req, res) => {
  try {
    const { name, category, description, objective, startDate, endDate, location, media = "", impactReport = "", partnerOrganization, socialObjective = "", region = "", department = "", commune = "" } = req.body;
    if (!name?.trim() || !category || !description?.trim() || !Number.isFinite(Number(objective)) || Number(objective) <= 0 || !startDate || !endDate || !partnerOrganization) return res.status(400).json({ message: "Nom, catégorie, description, objectif positif et dates sont obligatoires." });
    if (!new Date(startDate).getTime() || !new Date(endDate).getTime() || new Date(endDate) < new Date(startDate)) return res.status(400).json({ message: "Les dates de la campagne sont invalides." });
    if (partnerOrganization) {
      if (!mongoose.isValidObjectId(partnerOrganization)) return res.status(400).json({ message: "Organisation partenaire invalide." });
      const org = await Organization.findById(partnerOrganization);
      if (!org || org.status !== "approved" || !org.isActive) return res.status(400).json({ message: "La campagne doit être rattachée à une organisation approuvée et active." });
    }
    const campaign = await Campaign.create({ name, organization: req.user.id, partnerOrganization: partnerOrganization || null, category, description, objective: Number(objective), startDate, endDate, location, media, impactReport, socialObjective, region, department, commune, status: "draft" });
    await createAudit({ action: "CAMPAIGN_CREATED", entityType: "Campaign", entityId: campaign._id, user: req.user.id, details: { name: campaign.name, partnerOrganization: campaign.partnerOrganization }, ip: req.ip });
    res.status(201).json({ message: "Campagne créée.", campaign });
  } catch (error) { res.status(400).json({ message: "Création de la campagne impossible.", error: error.message }); }
};

const updateCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: "Campagne introuvable." });
    const fields = ["name", "category", "description", "objective", "startDate", "endDate", "location", "media", "impactReport", "status", "partnerOrganization", "socialObjective", "region", "department", "commune"];
    const before = {};
    for (const field of fields) if (req.body[field] !== undefined) { before[field] = campaign[field]; campaign[field] = field === "objective" ? Number(req.body[field]) : req.body[field]; }
    if (campaign.objective <= 0 || new Date(campaign.endDate) < new Date(campaign.startDate)) return res.status(400).json({ message: "Objectif ou période de campagne invalide." });
    if (campaign.partnerOrganization) {
      const org = await Organization.findById(campaign.partnerOrganization);
      if (!org || org.status !== "approved" || !org.isActive) return res.status(400).json({ message: "L'organisation partenaire doit être approuvée et active." });
    }
    await campaign.save();
    await createAudit({ action: "CAMPAIGN_UPDATED", entityType: "Campaign", entityId: campaign._id, user: req.user.id, details: { changedFields: Object.keys(before) }, ip: req.ip });
    res.json({ message: "Campagne mise à jour.", campaign });
  } catch (error) { res.status(400).json({ message: "Modification de la campagne impossible.", error: error.message }); }
};

const deleteCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: "Campagne introuvable." });
    const Donation = require("../models/Donation");
    const linkedDonations = await Donation.countDocuments({ campaign: campaign._id });
    if (linkedDonations) return res.status(409).json({ message: "Cette campagne possède déjà des dons. Elle ne peut pas être supprimée ; passez-la au statut terminée." });
    await campaign.deleteOne();
    await createAudit({ action: "CAMPAIGN_DELETED", entityType: "Campaign", entityId: campaign._id, user: req.user.id, details: { name: campaign.name }, ip: req.ip });
    res.json({ message: "Campagne supprimée." });
  } catch (error) { res.status(400).json({ message: "Suppression de la campagne impossible.", error: error.message }); }
};
module.exports = { getCampaigns, createCampaign, updateCampaign, deleteCampaign };
