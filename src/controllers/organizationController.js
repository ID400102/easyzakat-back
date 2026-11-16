const Organization = require("../models/Organization");
const createAudit = require("../utils/createAudit");

const getOrganizations = async (req, res) => {
  try {
    const organizations = await Organization.find().populate("responsible", "firstName lastName email").sort({ createdAt: -1 });
    res.json({ count: organizations.length, organizations });
  } catch (error) { res.status(500).json({ message: "Erreur lors de la récupération des organisations." }); }
};

const createOrganization = async (req, res) => {
  try {
    const { name, email, description = "", phone = "", address = "", city = "", country = "Sénégal", type = "association" } = req.body;
    if (!name?.trim() || !email?.trim()) return res.status(400).json({ message: "Le nom et l'email de l'organisation sont obligatoires." });
    const organization = await Organization.create({ name, email, description, phone, address, city, country, type, responsible: req.user.id, status: "pending" });
    await createAudit({ action: "ORGANIZATION_CREATED", entityType: "Organization", entityId: organization._id, user: req.user.id, details: { name: organization.name, status: organization.status }, ip: req.ip });
    res.status(201).json({ message: "Organisation créée.", organization });
  } catch (error) { res.status(error.code === 11000 ? 409 : 400).json({ message: error.code === 11000 ? "Cet email est déjà associé à une organisation." : "Création de l'organisation impossible.", error: error.message }); }
};

const updateOrganization = async (req, res) => {
  try {
    const organization = await Organization.findById(req.params.id);
    if (!organization) return res.status(404).json({ message: "Organisation introuvable." });
    const allowed = ["name", "description", "email", "phone", "address", "city", "country", "type"];
    const before = {};
    for (const key of allowed) if (req.body[key] !== undefined) { before[key] = organization[key]; organization[key] = req.body[key]; }
    await organization.save();
    await createAudit({ action: "ORGANIZATION_UPDATED", entityType: "Organization", entityId: organization._id, user: req.user.id, details: { before, after: Object.fromEntries(Object.keys(before).map(k => [k, organization[k]])) }, ip: req.ip });
    res.json({ message: "Organisation mise à jour.", organization });
  } catch (error) { res.status(400).json({ message: "Modification de l'organisation impossible.", error: error.message }); }
};

const updateOrganizationStatus = async (req, res) => {
  try {
    const allowed = ["pending", "approved", "rejected", "suspended"];
    if (!allowed.includes(req.body.status)) return res.status(400).json({ message: "Statut d'organisation invalide." });
    const organization = await Organization.findById(req.params.id);
    if (!organization) return res.status(404).json({ message: "Organisation introuvable." });
    const oldStatus = organization.status; organization.status = req.body.status; await organization.save();
    await createAudit({ action: "ORGANIZATION_STATUS_UPDATED", entityType: "Organization", entityId: organization._id, user: req.user.id, details: { oldStatus, newStatus: organization.status }, ip: req.ip });
    res.json({ message: "Statut mis à jour.", organization });
  } catch (error) { res.status(400).json({ message: "Mise à jour du statut impossible.", error: error.message }); }
};

const deleteOrganization = async (req, res) => {
  try {
    const organization = await Organization.findById(req.params.id);
    if (!organization) return res.status(404).json({ message: "Organisation introuvable." });
    organization.isActive = false; await organization.save();
    await createAudit({ action: "ORGANIZATION_DEACTIVATED", entityType: "Organization", entityId: organization._id, user: req.user.id, details: { name: organization.name }, ip: req.ip });
    res.json({ message: "Organisation désactivée.", organization });
  } catch (error) { res.status(400).json({ message: "Désactivation impossible.", error: error.message }); }
};
module.exports = { getOrganizations, createOrganization, updateOrganization, updateOrganizationStatus, deleteOrganization };
