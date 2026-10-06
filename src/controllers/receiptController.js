const Receipt = require("../models/Receipt");
const Payment = require("../models/Payment");
const Donation = require("../models/Donation");
const generateReceiptNumber = require("../utils/generateReceiptNumber");
const createAudit = require("../utils/createAudit");


// ==========================================
// CRÉER UN REÇU À PARTIR D'UN PAIEMENT
// ==========================================
const createReceipt = async (req, res) => {
    try {
        const { paymentId } = req.body;

        if (!paymentId) {
            return res.status(400).json({
                message: "L'identifiant du paiement est obligatoire"
            });
        }

        // Rechercher le paiement
        const payment = await Payment.findById(paymentId);

        if (!payment) {
            return res.status(404).json({
                message: "Paiement introuvable"
            });
        }

        // Vérifier que le paiement appartient à l'utilisateur
        if (payment.donor.toString() !== req.user.id) {
            return res.status(403).json({
                message: "Accès non autorisé"
            });
        }

        // Le reçu doit être créé uniquement après un paiement réussi
        if (payment.status !== "success") {
            return res.status(400).json({
                message: "Le reçu ne peut être créé que pour un paiement réussi"
            });
        }

        // Vérifier si un reçu existe déjà
        const existingReceipt = await Receipt.findOne({
            payment: payment._id
        });

        if (existingReceipt) {
            return res.status(200).json({
                message: "Le reçu existe déjà",
                receipt: existingReceipt
            });
        }

        // Rechercher le don
        const donation = await Donation.findById(payment.donation);

        if (!donation) {
            return res.status(404).json({
                message: "Don introuvable"
            });
        }

        // Générer le numéro du reçu
        const receiptNumber = generateReceiptNumber();

        // Créer le reçu
        const receipt = await Receipt.create({
            receiptNumber,
            payment: payment._id,
            donation: donation._id,
            donor: payment.donor,
            amount: payment.amount,
            donationType: donation.type,
            paymentMethod: payment.provider,
            transactionReference: payment.transactionReference,
            status: "success"

        });

        await createAudit({
    action: "RECEIPT_CREATED",
    entityType: "Receipt",
    entityId: receipt._id,
    user: payment.donor,
    details: {
        receiptNumber: receipt.receiptNumber,
        amount: receipt.amount,
        donationType: receipt.donationType,
        paymentMethod: receipt.paymentMethod,
        transactionReference: receipt.transactionReference
    }
});

        res.status(201).json({
            message: "Reçu créé avec succès",
            receipt
        });

    } catch (error) {
        console.error("Erreur création reçu :", error);

        res.status(500).json({
            message: "Erreur lors de la création du reçu",
            error: error.message
        });
    }
};


// ==========================================
// RÉCUPÉRER MES REÇUS
// ==========================================
const getMyReceipts = async (req, res) => {
    try {
        const receipts = await Receipt.find({
            donor: req.user.id
        })
            .populate("payment")
            .populate("donation")
            .sort({ createdAt: -1 });

        res.json({
            count: receipts.length,
            receipts
        });

    } catch (error) {
        console.error("Erreur récupération reçus :", error);

        res.status(500).json({
            message: "Erreur lors de la récupération des reçus",
            error: error.message
        });
    }
};


// ==========================================
// RÉCUPÉRER UN REÇU PAR SON ID
// ==========================================
const getReceiptById = async (req, res) => {
    try {
        const receipt = await Receipt.findById(req.params.id)
            .populate("payment")
            .populate("donation")
            .populate("donor", "firstName lastName email");

        if (!receipt) {
            return res.status(404).json({
                message: "Reçu introuvable"
            });
        }

        // Vérifier que le reçu appartient au donneur
        if (receipt.donor._id.toString() !== req.user.id) {
            return res.status(403).json({
                message: "Accès non autorisé"
            });
        }

        res.json({
            receipt
        });

    } catch (error) {
        console.error("Erreur récupération reçu :", error);

        res.status(500).json({
            message: "Erreur lors de la récupération du reçu",
            error: error.message
        });
    }
};


module.exports = {
    createReceipt,
    getMyReceipts,
    getReceiptById
};