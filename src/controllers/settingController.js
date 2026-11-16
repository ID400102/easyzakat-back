const Setting = require("../models/Setting");
const createAudit = require("../utils/createAudit");
const DEFAULTS = [
  { key: "nisab", label: "Nisab (FCFA)", category: "religious", value: 500000 },
  { key: "zakatRate", label: "Taux de Zakat (%)", category: "religious", value: 2.5 },
  { key: "currency", label: "Devise", category: "general", value: "XOF" }
];
const getSettings = async (req, res) => {
  try {
    for (const item of DEFAULTS) await Setting.updateOne({ key: item.key }, { $setOnInsert: item }, { upsert: true });
    const settings = await Setting.find().sort({ category: 1, key: 1 });
    res.json({ count: settings.length, settings });
  } catch (error) { res.status(500).json({ message: "Erreur lors du chargement des paramètres.", error: error.message }); }
};
const getPublicSettings = async (req, res) => {
  try {
    for (const item of DEFAULTS) await Setting.updateOne({ key: item.key }, { $setOnInsert: item }, { upsert: true });
    const settings = await Setting.find({ key: { $in: ["nisab", "zakatRate", "currency"] } }).select("key value");
    res.json({ settings: Object.fromEntries(settings.map(s => [s.key, s.value])) });
  } catch (error) { res.status(500).json({ message: "Paramètres indisponibles." }); }
};
const updateSetting = async (req, res) => {
  try {
    const { value } = req.body;
    if (value === undefined || value === null || value === "") return res.status(400).json({ message: "Une valeur est obligatoire." });
    const setting = await Setting.findOne({ key: req.params.key });
    if (!setting) return res.status(404).json({ message: "Paramètre introuvable." });
    if (["nisab", "zakatRate"].includes(setting.key) && (!Number.isFinite(Number(value)) || Number(value) <= 0)) return res.status(400).json({ message: "La valeur doit être un nombre positif." });
    const oldValue = setting.value; setting.value = ["nisab", "zakatRate"].includes(setting.key) ? Number(value) : value; setting.updatedBy = req.user.id; await setting.save();
    await createAudit({ action: "SETTING_UPDATED", entityType: "Setting", entityId: setting._id, user: req.user.id, details: { key: setting.key, oldValue, newValue: setting.value }, ip: req.ip });
    res.json({ message: "Paramètre mis à jour.", setting });
  } catch (error) { res.status(400).json({ message: "Mise à jour impossible.", error: error.message }); }
};
module.exports = { getSettings, getPublicSettings, updateSetting };
