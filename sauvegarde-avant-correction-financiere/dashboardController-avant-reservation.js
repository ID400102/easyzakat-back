const Donation = require("../models/Donation");
const Payment = require("../models/Payment");
const Campaign = require("../models/Campaign");
const Organization = require("../models/Organization");
const Beneficiary = require("../models/Beneficiary");
const Distribution = require("../models/Distribution");
const User = require("../models/User");

const getAdminDashboard = async (req, res) => {
  try {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const [collectedAgg, distributedAgg, monthly, paymentMethods, paymentCounts, campaigns, organizations, beneficiaries, donors, recentPayments, distributionTotalCount] = await Promise.all([
      Donation.aggregate([{ $match: { status: "success" } }, { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }]),
      Distribution.aggregate([{ $match: { status: "completed" } }, { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }]),
      Donation.aggregate([{ $match: { status: "success", createdAt: { $gte: yearStart } } }, { $group: { _id: { $month: "$createdAt" }, total: { $sum: "$amount" }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      Payment.aggregate([{ $match: { status: "success" } }, { $group: { _id: "$provider", count: { $sum: 1 }, amount: { $sum: "$amount" } } }]),
      Payment.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Campaign.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Organization.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Beneficiary.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      User.countDocuments({ role: "donor" }),
      Payment.find().populate("donation", "anonymous guestInfo campaign").populate("donor", "firstName lastName email").sort({ createdAt: -1 }).limit(8),
      Distribution.countDocuments()
    ]);
    const totalCollected = collectedAgg[0]?.total || 0;
    const totalDistributed = distributedAgg[0]?.total || 0;
    const countBy = (rows, key) => rows.find(x => x._id === key)?.count || 0;
    const monthlyCollections = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, total: monthly.find(x => x._id === i + 1)?.total || 0, amount: monthly.find(x => x._id === i + 1)?.total || 0, count: monthly.find(x => x._id === i + 1)?.count || 0 }));
    const successfulPaymentCount = paymentMethods.reduce((sum, item) => sum + item.count, 0);
    const groupedMethods = paymentMethods.reduce((acc, item) => {
      const method = ["wave", "orange_money", "free_money"].includes(item._id) ? "mobile_money" : item._id;
      const current = acc.get(method) || { method, count: 0, amount: 0, providers: [] };
      current.count += item.count; current.amount += item.amount; current.providers.push(item._id); acc.set(method, current); return acc;
    }, new Map());
    const paymentMethodDistribution = Array.from(groupedMethods.values()).map(item => ({ ...item, percentage: successfulPaymentCount ? Number((item.count / successfulPaymentCount * 100).toFixed(1)) : 0 }));
    const summary = {
      totalDonated: totalCollected,
      totalCollected,
      totalDistributed,
      availableFunds: Math.max(0, totalCollected - totalDistributed),
      redistributionRate: totalCollected ? Number((totalDistributed / totalCollected * 100).toFixed(1)) : 0,
      successfulDonations: collectedAgg[0]?.count || 0,
      pendingPayments: countBy(paymentCounts, "initiated") + countBy(paymentCounts, "pending"),
      failedPayments: countBy(paymentCounts, "failed"),
      successfulPayments: countBy(paymentCounts, "success"),
      totalDonors: donors,
      activeCampaigns: countBy(campaigns, "active"),
      totalCampaigns: campaigns.reduce((n, x) => n + x.count, 0),
      totalOrganizations: organizations.reduce((n, x) => n + x.count, 0),
      approvedOrganizations: countBy(organizations, "approved"),
      pendingOrganizations: countBy(organizations, "pending"),
      totalBeneficiaries: beneficiaries.reduce((n, x) => n + x.count, 0),
      approvedBeneficiaries: countBy(beneficiaries, "approved"),
      pendingBeneficiaries: countBy(beneficiaries, "pending"),
      completedDistributions: distributedAgg[0]?.count || 0,
      pendingDistributions: countBy(await Distribution.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]), "pending"),
      organizationsCount: organizations.reduce((n, x) => n + x.count, 0),
      beneficiariesCount: beneficiaries.reduce((n, x) => n + x.count, 0),
      distributionsCount: distributionTotalCount
    };
    res.json({ summary, monthlyCollections, paymentMethodDistribution, recentPayments });
  } catch (error) { res.status(500).json({ message: "Erreur lors du chargement du tableau de bord.", error: error.message }); }
};

const getPublicDashboard = async (req, res) => {
  try {
    const [donations, donationCount, beneficiariesCount, organizationsCount] = await Promise.all([
      Donation.aggregate([{ $match: { status: "success" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      Donation.countDocuments({ status: "success" }),
      Beneficiary.countDocuments({ status: { $in: ["approved", "completed"] } }),
      Organization.countDocuments({ status: "approved", isActive: true })
    ]);
    res.json({ totalDonated: donations[0]?.total || 0, donationsCount: donationCount, beneficiariesCount, organizationsCount });
  } catch (error) { res.status(500).json({ message: "Statistiques publiques indisponibles." }); }
};

const getDonorDashboard = async (req, res) => {
  try {
    const [donations, donationTotal, paymentsCount, receiptsCount] = await Promise.all([
      Donation.find({ donor: req.user.id }).populate("campaign", "name").sort({ createdAt: -1 }).limit(5),
      Donation.aggregate([{ $match: { donor: new (require("mongoose").Types.ObjectId)(String(req.user.id)), status: "success" } }, { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }]),
      Payment.countDocuments({ donor: req.user.id }),
      require("../models/Receipt").countDocuments({ donor: req.user.id })
    ]);
    res.json({ summary: { totalDonated: donationTotal[0]?.total || 0, donationsCount: donationTotal[0]?.count || 0, paymentsCount, receiptsCount }, recentDonations: donations });
  } catch (error) { res.status(500).json({ message: "Erreur lors du chargement de votre tableau de bord." }); }
};
module.exports = { getAdminDashboard, getPublicDashboard, getDonorDashboard };
