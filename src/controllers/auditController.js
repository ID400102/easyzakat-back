const Audit = require("../models/Audit");
const getAudits = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const [audits, total] = await Promise.all([Audit.find().populate("user", "firstName lastName email role").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), Audit.countDocuments()]);
    res.json({ count: audits.length, total, page, pages: Math.ceil(total / limit), audits });
  } catch (error) { res.status(500).json({ message: "Erreur lors de la récupération du journal d'audit.", error: error.message }); }
};
module.exports = { getAudits };
