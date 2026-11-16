const crypto = require("crypto");
const Payment = require("../models/Payment");
const Donation = require("../models/Donation");
const Campaign = require("../models/Campaign");
const Receipt = require("../models/Receipt");
const createAudit = require("../utils/createAudit");
const safeEqual = (a, b) => { const x = Buffer.from(String(a || "")); const y = Buffer.from(String(b || "")); return x.length === y.length && crypto.timingSafeEqual(x, y); };

const createPayment = async (req, res) => {
  try {
    const { donation: donationId, provider, guestPaymentToken } = req.body;
    const allowed = ["wave", "orange_money", "free_money", "card", "bank_transfer"];
    if (!donationId || !allowed.includes(provider)) return res.status(400).json({ message: "Le don et un moyen de paiement valide sont obligatoires." });
    const donation = await Donation.findById(donationId);
    if (!donation) return res.status(404).json({ message: "Don introuvable." });
    if (donation.status !== "pending") return res.status(409).json({ message: "Ce don a déjà été traité." });
    if (donation.donor) {
      if (!req.user || String(donation.donor) !== String(req.user.id)) return res.status(403).json({ message: "Vous ne pouvez pas payer ce don." });
    } else {
      const hash = crypto.createHash("sha256").update(String(guestPaymentToken || "")).digest("hex");
      if (!guestPaymentToken || !donation.guestPaymentTokenHash || !safeEqual(hash, donation.guestPaymentTokenHash) || !donation.guestPaymentTokenExpiresAt || donation.guestPaymentTokenExpiresAt < new Date()) return res.status(403).json({ message: "Jeton de paiement invité invalide ou expiré." });
    }
    const existing = await Payment.findOne({ donation: donation._id, status: { $in: ["initiated", "pending", "success"] } });
    if (existing) return res.status(409).json({ message: "Un paiement existe déjà pour ce don.", payment: existing });
    const reference = `EZ-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const payment = await Payment.create({ donation: donation._id, donor: donation.donor || null, amount: donation.amount, provider, fees: 0, status: "initiated", transactionReference: reference, guestPaymentTokenHash: donation.guestPaymentTokenHash || "" });
    donation.paymentMethod = provider; donation.transactionReference = reference; await donation.save();
    await createAudit({ action: "PAYMENT_INITIATED", entityType: "Payment", entityId: payment._id, user: req.user?.id || null, details: { amount: payment.amount, provider, reference }, ip: req.ip });
    res.status(201).json({ message: "Paiement initié. En attente de confirmation du prestataire.", payment });
  } catch (error) { res.status(400).json({ message: "Création du paiement impossible.", error: error.message }); }
};
const getMyPayments = async (req, res) => {
  try { const payments = await Payment.find({ donor: req.user.id }).populate("donation").sort({ createdAt: -1 }); res.json({ count: payments.length, payments }); }
  catch (error) { res.status(500).json({ message: "Erreur lors de la récupération des paiements." }); }
};
const getAdminPayments = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1); const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 100));
    const filter = {}; if (req.query.status) filter.status = req.query.status; if (req.query.provider) filter.provider = req.query.provider;
    const [payments, total] = await Promise.all([Payment.find(filter).populate("donation").populate("donor", "firstName lastName email").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), Payment.countDocuments(filter)]);
    res.json({ count: payments.length, total, page, pages: Math.ceil(total / limit), payments });
  } catch (error) { res.status(500).json({ message: "Erreur lors de la récupération des paiements." }); }
};
const getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id).populate("donation").populate("donor", "firstName lastName email");
    if (!payment) return res.status(404).json({ message: "Paiement introuvable." });
    if (!["admin", "superadmin"].includes(req.user.role) && (!payment.donor || String(payment.donor._id) !== String(req.user.id))) return res.status(403).json({ message: "Accès non autorisé." });
    res.json({ payment });
  } catch (error) { res.status(400).json({ message: "Lecture du paiement impossible." }); }
};
const updatePaymentStatus = async (req, res) => res.status(403).json({ message: "Le statut d'un paiement ne peut pas être modifié depuis l'interface. Il doit être confirmé par le webhook sécurisé du prestataire." });
const paymentWebhook = async (req, res) => {
  try {
    const secret = process.env.PAYMENT_WEBHOOK_SECRET;
    if (!secret || !safeEqual(req.headers["x-webhook-secret"], secret)) return res.status(401).json({ message: "Signature webhook invalide." });
    const { transactionReference, providerReference, status } = req.body;
    if (!transactionReference || !["success", "failed", "pending"].includes(status)) return res.status(400).json({ message: "Données webhook invalides." });
    const payment = await Payment.findOne({ transactionReference });
    if (!payment) return res.status(404).json({ message: "Paiement introuvable." });
    if (["success", "failed"].includes(payment.status)) return res.json({ message: "Paiement déjà finalisé.", payment });
    payment.status = status; payment.providerReference = providerReference || payment.providerReference; if (status === "success") payment.confirmedAt = new Date(); await payment.save();
    const donation = await Donation.findById(payment.donation);
    if (donation) {
      const previousDonationStatus = donation.status;
      donation.status = status === "success" ? "success" : status === "failed" ? "failed" : "pending";
      await donation.save();
      if (status === "success" && previousDonationStatus !== "success" && donation.campaign) {
        await Campaign.updateOne({ _id: donation.campaign }, { $inc: { collected: donation.amount } });
      }
      if (status === "success") {
        await Receipt.updateOne(
          { payment: payment._id },
          { $setOnInsert: { payment: payment._id, donation: donation._id, donor: payment.donor || null, receiptNumber: `EZ-${Date.now()}-${String(payment._id).slice(-6).toUpperCase()}`, amount: payment.amount, issuedAt: new Date() } },
          { upsert: true }
        );
      }
    }
    await createAudit({ action: `PAYMENT_${status.toUpperCase()}`, entityType: "Payment", entityId: payment._id, user: null, details: { transactionReference, providerReference, amount: payment.amount }, ip: req.ip });
    res.json({ message: "Webhook traité.", payment });
  } catch (error) { res.status(500).json({ message: "Traitement du webhook impossible.", error: error.message }); }
};
module.exports = { createPayment, getMyPayments, getPaymentById, updatePaymentStatus, getAdminPayments, paymentWebhook };
