const Donation = require("../models/Donation");
const Distribution = require("../models/Distribution");
const Beneficiary = require("../models/Beneficiary");
const Organization = require("../models/Organization");
const Campaign = require("../models/Campaign");


// ==========================================
// TRANSPARENCE / IMPACT
// ==========================================
const getImpact = async (req, res) => {
    try {
        // ==========================================
        // TOTAL COLLECTÉ
        // ==========================================
        const successfulDonations = await Donation.find({
            status: "success"
        });

        const totalCollected = successfulDonations.reduce(
            (total, donation) => total + donation.amount,
            0
        );

        // ==========================================
        // TOTAL REDISTRIBUÉ
        // ==========================================
        const completedDistributions = await Distribution.find({
            status: "completed"
        });

        const totalDistributed = completedDistributions.reduce(
            (total, distribution) => total + distribution.amount,
            0
        );

        // ==========================================
        // BÉNÉFICIAIRES AIDÉS
        // ==========================================
        const beneficiariesHelped =
            await Beneficiary.countDocuments({
                isActive: true,
                amountReceived: {
                    $gt: 0
                }
            });

        // ==========================================
        // TOTAL DES BÉNÉFICIAIRES
        // ==========================================
        const beneficiariesCount =
            await Beneficiary.countDocuments({
                isActive: true
            });

        // ==========================================
        // ORGANISATIONS PARTENAIRES
        // ==========================================
        const organizationsCount =
            await Organization.countDocuments({
                isActive: true,
                status: "approved"
            });

        // ==========================================
        // CAMPAGNES
        // ==========================================
        const campaignsCount =
            await Campaign.countDocuments();

        // Campagnes actives
        const activeCampaignsCount =
            await Campaign.countDocuments({
                status: "active"
            });

        // ==========================================
        // DISTRIBUTIONS
        // ==========================================
        const distributionsCount =
            await Distribution.countDocuments({
                status: "completed"
            });

        // ==========================================
        // POURCENTAGE REDISTRIBUÉ
        // ==========================================
        let distributionPercentage = 0;

        if (totalCollected > 0) {
            distributionPercentage =
                (totalDistributed / totalCollected) * 100;

            distributionPercentage =
                Math.round(distributionPercentage * 100) / 100;
        }

        // ==========================================
        // IMPACT
        // ==========================================
        res.json({
            message: "Données de transparence récupérées avec succès",

            impact: {
                totalCollected,
                totalDistributed,
                distributionPercentage,

                beneficiariesHelped,
                beneficiariesCount,

                organizationsCount,

                campaignsCount,
                activeCampaignsCount,

                distributionsCount
            }
        });

    } catch (error) {
        console.error(
            "Erreur récupération transparence / impact :",
            error
        );

        res.status(500).json({
            message:
                "Erreur lors de la récupération des données d'impact",
            error: error.message
        });
    }
};


module.exports = {
    getImpact
};