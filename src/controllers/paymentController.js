
const crypto = require("crypto");
const Payment = require("../models/Payment");
const Donation = require("../models/Donation");
const generatePaymentReference = require("../utils/generateReference");
const createAudit = require("../utils/createAudit");

// ==========================================
// CRÉER UN PAIEMENT
// ==========================================

const createPayment = async (req, res) => {
    try {
        const { donation, provider, fees, guestPaymentToken } = req.body;

        const allowedProviders = [
            "wave",
            "orange_money",
            "free_money",
            "card",
            "bank_transfer"
        ];

        if (!donation || !provider) {
            return res.status(400).json({
                message: "Le don et le moyen de paiement sont obligatoires"
            });
        }

        if (!allowedProviders.includes(provider)) {
            return res.status(400).json({
                message: "Moyen de paiement non pris en charge"
            });
        }

        const existingDonation = await Donation.findById(donation)
            .select("+guestPaymentTokenHash +guestPaymentTokenExpires");

        if (!existingDonation) {
            return res.status(404).json({
                message: "Don introuvable"
            });
        }

        // Vérifier l'accès au don
        if (req.user) {
            if (
                !existingDonation.donor ||
                existingDonation.donor.toString() !== req.user.id
            ) {
                return res.status(403).json({
                    message: "Vous ne pouvez pas payer ce don"
                });
            }
        } else {
            if (
                !guestPaymentToken ||
                !existingDonation.guestPaymentTokenHash ||
                !existingDonation.guestPaymentTokenExpires
            ) {
                return res.status(401).json({
                    message: "Jeton de paiement invité manquant ou invalide"
                });
            }

            if (existingDonation.guestPaymentTokenExpires < new Date()) {
                return res.status(401).json({
                    message: "Votre autorisation de paiement a expiré"
                });
            }

            const tokenHash = crypto
                .createHash("sha256")
                .update(guestPaymentToken)
                .digest("hex");

            const expected = Buffer.from(
                existingDonation.guestPaymentTokenHash,
                "hex"
            );

            const received = Buffer.from(tokenHash, "hex");

            if (
                expected.length !== received.length ||
                !crypto.timingSafeEqual(expected, received)
            ) {
                return res.status(403).json({
                    message: "Jeton de paiement invalide"
                });
            }
        }

        if (existingDonation.status !== "pending") {
            return res.status(400).json({
                message: "Ce don ne peut plus être payé"
            });
        }

        // Vérifier les frais
        const paymentFees = Number(fees || 0);

        if (!Number.isFinite(paymentFees) || paymentFees < 0) {
            return res.status(400).json({
                message: "Montant des frais invalide"
            });
        }

        // Générer la référence EasyZakat
        const transactionReference = generatePaymentReference();

        // Créer le paiement
        const payment = await Payment.create({
            donation: existingDonation._id,
            donor: existingDonation.donor || null,
            amount: existingDonation.amount,
            provider,
            fees: paymentFees,
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
            message: "Erreur lors de la création du paiement"
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
            message: "Erreur lors de la récupération des paiements"
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

        if (
            !req.user ||
            !payment.donor ||
            payment.donor._id.toString() !== req.user.id
        ) {
            return res.status(403).json({
                message: "Accès non autorisé"
            });
        }

        res.json({ payment });

    } catch (error) {
        console.error("Erreur récupération paiement :", error);

        res.status(500).json({
            message: "Erreur lors de la récupération du paiement"
        });
    }
};

// ==========================================
// MODIFIER LE STATUT D'UN PAIEMENT
// ==========================================

const updatePaymentStatus = async (req, res) => {
    return res.status(403).json({
        message: "Le statut doit être confirmé par le prestataire de paiement"
    });
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

        const payment = await Payment.findOne({
            transactionReference
        });

        if (!payment) {
            return res.status(404).json({
                message: "Paiement introuvable"
            });
        }

        if (
            payment.status === "success" ||
            payment.status === "failed"
        ) {
            return res.json({
                message: "Paiement déjà traité"
            });
        }

        payment.status = status;

        if (providerReference) {
            payment.providerReference = providerReference;
        }

        await payment.save();

        const donation = await Donation.findById(payment.donation);

        if (donation) {
            donation.status = status === "success"
                ? "success"
                : status === "failed"
                    ? "failed"
                    : "pending";

            donation.transactionReference =
                payment.transactionReference;

            donation.paymentMethod = payment.provider;

            await donation.save();
        }

        // Journaliser uniquement si une fonction d'audit accepte
        // les utilisateurs invités (donor peut être null).
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

        res.json({
            message: "Webhook traité avec succès",
            payment
        });

    } catch (error) {
        console.error("Erreur webhook :", error);

        res.status(500).json({
            message: "Erreur lors du traitement du webhook"
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
