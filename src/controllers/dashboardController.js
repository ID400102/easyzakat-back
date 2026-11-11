
const Donation = require("../models/Donation");
const Payment = require("../models/Payment");
const Receipt = require("../models/Receipt");

// ==========================================
// DASHBOARD DU DONNEUR
// ==========================================
const getDonorDashboard = async (req, res) => {
    try {
        // Identifiant du donneur connecté
        const donorId = req.user.id;

        if (!donorId) {
            return res.status(401).json({
                message: "Utilisateur non authentifié"
            });
        }

        // Récupérer uniquement les dons de ce donneur
        const donations = await Donation.find({
            donor: donorId
        })
            .populate("campaign", "name category")
            .sort({ createdAt: -1 });

        // Récupérer uniquement les paiements de ce donneur
        const payments = await Payment.find({
            donor: donorId
        })
            .populate("donation")
            .sort({ createdAt: -1 });

        // Récupérer uniquement les reçus de ce donneur
        const receipts = await Receipt.find({
            donor: donorId
        }).sort({ createdAt: -1 });

        // ==========================================
        // STATISTIQUES DES DONS
        // ==========================================

        // Tous les dons enregistrés, même en attente
        const totalDonated = donations.reduce(
            (total, donation) => {
                return total + Number(donation.amount || 0);
            },
            0
        );

        // Dons réellement confirmés
        const successfulDonations = donations.filter(
            (donation) => donation.status === "success"
        );

        const totalCollected = successfulDonations.reduce(
            (total, donation) => {
                return total + Number(donation.amount || 0);
            },
            0
        );

        // Dons en attente
        const pendingDonations = donations.filter(
            (donation) => donation.status === "pending"
        );

        // ==========================================
        // STATISTIQUES DES PAIEMENTS
        // ==========================================

        // Paiements réussis
        const successfulPayments = payments.filter(
            (payment) => payment.status === "success"
        );

        // Paiements en attente ou initiés
        const pendingPayments = payments.filter(
            (payment) =>
                payment.status === "initiated" ||
                payment.status === "pending"
        );

        // ==========================================
        // RÉPONSE DU DASHBOARD DONNEUR
        // ==========================================

        return res.status(200).json({
            success: true,

            summary: {
                // Total des dons enregistrés
                totalDonated,

                // Total réellement encaissé
                totalCollected,

                // Nombre de dons
                donationsCount: donations.length,

                // Dons confirmés
                successfulDonationsCount: successfulDonations.length,

                // Dons en attente
                pendingDonationsCount: pendingDonations.length,

                // Statistiques des paiements
                paymentsCount: payments.length,
                successfulPaymentsCount: successfulPayments.length,
                pendingPaymentsCount: pendingPayments.length,

                // Nombre de reçus
                receiptsCount: receipts.length
            },

            // Cinq derniers dons
            recentDonations: donations.slice(0, 5),

            // Cinq derniers paiements
            recentPayments: payments.slice(0, 5),

            // Cinq derniers reçus
            recentReceipts: receipts.slice(0, 5)
        });

    } catch (error) {
        console.error("Erreur dashboard donneur :", error);

        return res.status(500).json({
            success: false,
            message: "Erreur lors de la récupération du dashboard",
            error: error.message
        });
    }
};


// ==========================================
// DASHBOARD ADMINISTRATEUR
// ==========================================
const getAdminDashboard = async (req, res) => {
    try {
        // Vérifier que l'utilisateur est administrateur
        const isAdmin = [
            "admin",
            "superadmin"
        ].includes(req.user.role);

        if (!isAdmin) {
            return res.status(403).json({
                message: "Accès réservé aux administrateurs"
            });
        }

        // Importer les modèles nécessaires
        const Organization = require("../models/Organization");
        const Beneficiary = require("../models/Beneficiary");
        const Distribution = require("../models/Distribution");

        // ==========================================
        // STATISTIQUES DES DONS
        // ==========================================

        const successfulDonations = await Donation.find({
            status: "success"
        });

        const totalDonated = successfulDonations.reduce(
            (total, donation) => {
                return total + Number(donation.amount || 0);
            },
            0
        );

        // ==========================================
        // STATISTIQUES DES PAIEMENTS
        // ==========================================

        const successfulPayments = await Payment.find({
            status: "success"
        });

        const totalPayments = successfulPayments.reduce(
            (total, payment) => {
                return total + Number(payment.amount || 0);
            },
            0
        );

        const pendingPayments = await Payment.countDocuments({
            status: {
                $in: ["initiated", "pending"]
            }
        });

        const failedPayments = await Payment.countDocuments({
            status: "failed"
        });

        // ==========================================
        // ORGANISATIONS
        // ==========================================

        const organizationsCount =
            await Organization.countDocuments({
                isActive: true
            });

        const approvedOrganizations =
            await Organization.countDocuments({
                isActive: true,
                status: "approved"
            });

        const pendingOrganizations =
            await Organization.countDocuments({
                isActive: true,
                status: "pending"
            });

        // ==========================================
        // BÉNÉFICIAIRES
        // ==========================================

        const beneficiariesCount =
            await Beneficiary.countDocuments({
                isActive: true
            });

        const approvedBeneficiaries =
            await Beneficiary.countDocuments({
                isActive: true,
                status: "approved"
            });

        const pendingBeneficiaries =
            await Beneficiary.countDocuments({
                isActive: true,
                status: "pending"
            });

        // ==========================================
        // DISTRIBUTIONS
        // ==========================================

        const distributionsCount =
            await Distribution.countDocuments();

        const completedDistributions =
            await Distribution.find({
                status: "completed"
            });

        const totalDistributed =
            completedDistributions.reduce(
                (total, distribution) => {
                    return total + Number(distribution.amount || 0);
                },
                0
            );

        const pendingDistributions =
            await Distribution.countDocuments({
                status: "pending"
            });

        // ==========================================
        // REÇUS
        // ==========================================

        const receiptsCount =
            await Receipt.countDocuments();

        // ==========================================
        // RÉSULTAT ADMINISTRATEUR
        // ==========================================

        return res.status(200).json({
            success: true,

            summary: {
                totalDonated,
                donationsCount: successfulDonations.length,

                totalPayments,
                successfulPaymentsCount: successfulPayments.length,

                pendingPayments,
                failedPayments,

                organizationsCount,
                approvedOrganizations,
                pendingOrganizations,

                beneficiariesCount,
                approvedBeneficiaries,
                pendingBeneficiaries,

                distributionsCount,
                totalDistributed,
                pendingDistributions,

                receiptsCount
            }
        });

    } catch (error) {
        console.error(
            "Erreur dashboard administrateur :",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Erreur lors de la récupération du dashboard administrateur",
            error: error.message
        });
    }
};


// ==========================================
// EXPORTS
// ==========================================

module.exports = {
    getDonorDashboard,
    getAdminDashboard
};
