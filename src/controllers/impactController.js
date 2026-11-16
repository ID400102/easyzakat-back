const Donation = require("../models/Donation");
const Distribution = require("../models/Distribution");
const Beneficiary = require("../models/Beneficiary");
const Organization = require("../models/Organization");
const Campaign = require("../models/Campaign");
const getImpact = async (req, res) => {
  try {
    const [collected, completed, beneficiaries, organizations, campaigns, distributions] = await Promise.all([
      Donation.aggregate([{ $match: { status: "success" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      Distribution.find({ status: "completed" }).populate("beneficiary", "category city region").populate("organization", "city region"),
      Beneficiary.countDocuments({ status: { $in: ["approved", "completed"] }, isActive: true }),
      Organization.countDocuments({ status: "approved", isActive: true }),
      Campaign.countDocuments(),
      Distribution.countDocuments({ status: "completed" })
    ]);
    const totalCollected = collected[0]?.total || 0;
    const totalDistributed = completed.reduce((sum, d) => sum + d.amount, 0);
    const group = (keyFn) => {
      const map = new Map();
      for (const d of completed) { const key = keyFn(d) || "Non précisé"; map.set(key, (map.get(key) || 0) + d.amount); }
      return Array.from(map, ([name, amount]) => ({ name, amount, percentage: totalDistributed ? Number((amount / totalDistributed * 100).toFixed(1)) : 0 })).sort((a,b) => b.amount-a.amount);
    };
    const categoryDistribution = group(d => d.beneficiary?.category);
    const regionalDistribution = group(d => d.beneficiary?.city || d.organization?.city);
    res.json({ impact: { totalCollected, totalDistributed, distributionPercentage: totalCollected ? Number((totalDistributed / totalCollected * 100).toFixed(1)) : 0, beneficiariesCount: beneficiaries, organizationsCount: organizations, campaignsCount: campaigns, activeCampaignsCount: await Campaign.countDocuments({ status: "active" }), distributionsCount: distributions, categoryDistribution, regionalDistribution } });
  } catch (error) { res.status(500).json({ message: "Impossible de récupérer les statistiques d'impact.", error: error.message }); }
};
module.exports = { getImpact };
