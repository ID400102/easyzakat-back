const Payment = require("../models/Payment");
const Receipt = require("../models/Receipt");
const createAudit = require("../utils/createAudit");
const createReceipt = async (req, res) => {
  try {
    const paymentId = req.body.paymentId;
    if (!paymentId) return res.status(400).json({ message: "Identifiant du paiement obligatoire." });
    const payment = await Payment.findById(paymentId).populate("donation");
    if (!payment || !payment.donation) return res.status(404).json({ message: "Paiement introuvable." });
    if (payment.status !== "success") return res.status(409).json({ message: "Le reçu sera disponible après confirmation du paiement." });
    if (payment.donor && (!req.user || (String(payment.donor) !== String(req.user.id) && !["admin", "superadmin"].includes(req.user.role)))) return res.status(403).json({ message: "Accès non autorisé." });
    let receipt = await Receipt.findOne({ payment: payment._id });
    if (!receipt) {
      receipt = await Receipt.create({ payment: payment._id, donation: payment.donation._id, donor: payment.donor || null, receiptNumber: `EZ-${Date.now()}-${String(payment._id).slice(-6).toUpperCase()}`, amount: payment.amount });
      await createAudit({ action: "RECEIPT_CREATED", entityType: "Receipt", entityId: receipt._id, user: req.user?.id || null, details: { payment: payment._id, amount: payment.amount }, ip: req.ip });
    }
    res.status(200).json({ message: "Reçu disponible.", receipt });
  } catch (error) { res.status(400).json({ message: "Création du reçu impossible.", error: error.message }); }
};
module.exports = { createReceipt };
