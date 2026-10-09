const Payment = require("../models/Payment");
const Donation = require("../models/Donation");
const generatePaymentReference = require("../utils/generateReference");
const createAudit = require("../utils/createAudit");


// ==========================================
// CRÉER UN PAIEMENT
// ==========================================
const createPayment = async (req, res) => {
    try {
        const { donation, provider, fees } = req.body;
        const allowedProviders = [
  "wave",
  "orange_money",
  "free_money",
  "card",
  "bank_transfer",
];

if (!allowedProviders.includes(provider)) {
  return res.status(400).json({
    message: "Moyen de paiement non pris en charge",
    provider,
    allowedProviders,
  });
}

        if (!donation || !provider) {
            return res.status(400).json({
                message: "Le don et le moyen de paiement sont obligatoires"
            });
        }

        // Vérifier que le don existe
        const existingDonation = await Donation.findById(donation);

        if (!existingDonation) {
            return res.status(404).json({
                message: "Don introuvable"
            });
        }

        // Vérifier que le don appartient à l'utilisateur connecté
        if (existingDonation.donor.toString() !== req.user.id) {
            return res.status(403).json({
                message: "Vous ne pouvez pas payer ce don"
            });
        }

        // Générer la référence interne EasyZakat
        const transactionReference = generatePaymentReference();

        // Créer le paiement
        const payment = await Payment.create({
            donation: existingDonation._id,
            donor: req.user.id,
            amount: existingDonation.amount,
            provider,
            fees: fees || 0,
            status: "initiated",
            transactionReference
        });

        res.status(201).json({
            message: "Paiement créé avec succès",
            payment
        });

    } catch (error) {
        console.error("Erreur création paiement :", error);

        res.status(500).json({
            message: "Erreur lors de la création du paiement",
            error: error.message
        });
    }
};


// ==========================================
// RÉCUPÉRER MES PAIEMENTS
// ==========================================
const getMyPayments = async (req, res) => {
    try {
        const payments = await Payment.find({
            donor: req.user.id
        })
            .populate("donation")
            .sort({ createdAt: -1 });

        res.json({
            count: payments.length,
            payments
        });

    } catch (error) {
        console.error("Erreur récupération paiements :", error);

        res.status(500).json({
            message: "Erreur lors de la récupération des paiements",
            error: error.message
        });
    }
};


// ==========================================
// RÉCUPÉRER UN PAIEMENT PAR SON ID
// ==========================================
const getPaymentById = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id)
            .populate("donation")
            .populate("donor", "firstName lastName email");

        if (!payment) {
            return res.status(404).json({
                message: "Paiement introuvable"
            });
        }

        // Vérifier que le paiement appartient à l'utilisateur connecté
        if (payment.donor._id.toString() !== req.user.id) {
            return res.status(403).json({
                message: "Accès non autorisé"
            });
        }

        res.json({
            payment
        });

    } catch (error) {
        console.error("Erreur récupération paiement :", error);

        res.status(500).json({
            message: "Erreur lors de la récupération du paiement",
            error: error.message
        });
    }
};


// ==========================================
// MODIFIER LE STATUT D'UN PAIEMENT
// ==========================================
const updatePaymentStatus = async (req, res) => {
    try {
        const { status, transactionReference } = req.body;

        const allowedStatuses = [
            "initiated",
            "pending",
            "success",
            "failed"
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                message: "Statut de paiement invalide"
            });
        }

        const payment = await Payment.findById(req.params.id);

        if (!payment) {
            return res.status(404).json({
                message: "Paiement introuvable"
            });
        }

        if (payment.donor.toString() !== req.user.id) {
            return res.status(403).json({
                message: "Accès non autorisé"
            });
        }

        payment.status = status;

        if (transactionReference) {
            payment.transactionReference = transactionReference;
        }

        await payment.save();

        // Synchroniser le statut du don
        const donation = await Donation.findById(payment.donation);

        if (donation) {
            if (status === "success") {
                donation.status = "success";
            } else if (status === "failed") {
                donation.status = "failed";
            } else {
                donation.status = "pending";
            }

            if (transactionReference) {
                donation.transactionReference = transactionReference;
            }

            await donation.save();
        }

        res.json({
            message: "Statut du paiement modifié avec succès",
            payment
        });

    } catch (error) {
        console.error("Erreur modification paiement :", error);

        res.status(500).json({
            message: "Erreur lors de la modification du paiement",
            error: error.message
        });
    }
};


// ==========================================
// WEBHOOK PAIEMENT
// ==========================================
const paymentWebhook = async (req, res) => {
    try {
        const {
            transactionReference,
            providerReference,
            status
        } = req.body;

        if (!transactionReference || !status) {
            return res.status(400).json({
                message: "La référence et le statut sont obligatoires"
            });
        }

        const allowedStatuses = [
            "pending",
            "success",
            "failed"
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                message: "Statut de paiement invalide"
            });
        }

        // Rechercher le paiement avec la référence EasyZakat
        const payment = await Payment.findOne({
            transactionReference
        });

        if (!payment) {
            return res.status(404).json({
                message: "Paiement introuvable"
            });
        }

        // Éviter de traiter deux fois un paiement terminé
        if (
            payment.status === "success" ||
            payment.status === "failed"
        ) {
            return res.json({
                message: "Paiement déjà traité",
                payment
            });
        }

        // Mettre à jour le paiement
        payment.status = status;

        if (providerReference) {
            payment.providerReference = providerReference;
        }

        await payment.save();

        await createAudit({
    action: "PAYMENT_STATUS_UPDATED",
    entityType: "Payment",
    entityId: payment._id,
    user: payment.donor,
    details: {
        status: payment.status,
        amount: payment.amount,
        provider: payment.provider,
        transactionReference: payment.transactionReference,
        providerReference: payment.providerReference
    }
});

        // Synchroniser la Donation
        const donation = await Donation.findById(payment.donation);

        if (donation) {

            if (status === "success") {
                donation.status = "success";
            } else if (status === "failed") {
                donation.status = "failed";
            } else {
                donation.status = "pending";
            }

            donation.transactionReference =
                payment.transactionReference;

            donation.paymentMethod =
                payment.provider;

            await donation.save();
        }

        res.json({
            message: "Webhook traité avec succès",
            payment
        });

    } catch (error) {
        console.error("Erreur webhook :", error);

        res.status(500).json({
            message: "Erreur lors du traitement du webhook",
            error: error.message
        });
    }
};


// ==========================================
// EXPORTS
// ==========================================
module.exports = {
    createPayment,
    getMyPayments,
    getPaymentById,
    updatePaymentStatus,
    paymentWebhook
};