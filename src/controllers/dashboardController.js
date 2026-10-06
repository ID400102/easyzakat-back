const Donation = require("../models/Donation");
const Payment = require("../models/Payment");
const Receipt = require("../models/Receipt");

// ==========================================
// DASHBOARD DU DONNEUR
// ==========================================
const getDonorDashboard = async (req, res) => {
    try {
        const donorId = req.user.id;

        // Tous les dons du donneur
        const donations = await Donation.find({
            donor: donorId
        })
            .populate("campaign", "name category")
            .sort({ createdAt: -1 });

        // Tous les paiements du donneur
        const payments = await Payment.find({
            donor: donorId
        })
            .populate("donation")
            .sort({ createdAt: -1 });

        // Tous les reçus du donneur
        const receipts = await Receipt.find({
            donor: donorId
        })
            .sort({ createdAt: -1 });

        // Total des dons réussis
        const successfulDonations = donations.filter(
            (donation) => donation.status === "success"
        );

        const totalDonated = successfulDonations.reduce(
            (total, donation) => total + donation.amount,
            0
        );

        // Nombre de paiements réussis
        const successfulPayments = payments.filter(
            (payment) => payment.status === "success"
        );

        // Paiements en attente
        const pendingPayments = payments.filter(
            (payment) =>
                payment.status === "initiated" ||
                payment.status === "pending"
        );

        res.json({
            summary: {
                totalDonated,
                donationsCount: donations.length,
                successfulDonationsCount:
                    successfulDonations.length,
                paymentsCount: payments.length,
                successfulPaymentsCount:
                    successfulPayments.length,
                pendingPaymentsCount:
                    pendingPayments.length,
                receiptsCount: receipts.length
            },

            recentDonations: donations.slice(0, 5),

            recentPayments: payments.slice(0, 5),

            recentReceipts: receipts.slice(0, 5)
        });

    } catch (error) {
        console.error("Erreur dashboard donneur :", error);

        res.status(500).json({
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
        // Vérifier que l'utilisateur est admin
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
            (total, donation) => total + donation.amount,
            0
        );

        // ==========================================
        // STATISTIQUES DES PAIEMENTS
        // ==========================================
        const successfulPayments = await Payment.find({
            status: "success"
        });

        const totalPayments = successfulPayments.reduce(
            (total, payment) => total + payment.amount,
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
                (total, distribution) =>
                    total + distribution.amount,
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
        // RÉSULTAT
        // ==========================================
        res.json({
            summary: {
                totalDonated,
                donationsCount:
                    successfulDonations.length,

                totalPayments,
                successfulPaymentsCount:
                    successfulPayments.length,

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

        res.status(500).json({
            message:
                "Erreur lors de la récupération du dashboard administrateur",
            error: error.message
        });
    }
};

module.exports = {
    getDonorDashboard,
    getAdminDashboard
};