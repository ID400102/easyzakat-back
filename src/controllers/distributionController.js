const Distribution = require("../models/Distribution");
const Beneficiary = require("../models/Beneficiary");
const Organization = require("../models/Organization");
const createAudit = require("../utils/createAudit");


// ==========================================
// CRÉER UNE DISTRIBUTION
// ==========================================
const createDistribution = async (req, res) => {
    try {
        const {
            beneficiary,
            organization,
            campaign,
            amount,
            donationType,
            reason
        } = req.body;

        if (
            !beneficiary ||
            !organization ||
            !amount ||
            !donationType
        ) {
            return res.status(400).json({
                message:
                    "Le bénéficiaire, l'organisation, le montant et le type de don sont obligatoires"
            });
        }

        // Vérifier le bénéficiaire
        const existingBeneficiary =
            await Beneficiary.findById(beneficiary);

        if (!existingBeneficiary) {
            return res.status(404).json({
                message: "Bénéficiaire introuvable"
            });
        }

        if (existingBeneficiary.status !== "approved") {
            return res.status(400).json({
                message: "Le bénéficiaire doit être approuvé"
            });
        }

        // Vérifier l'organisation
        const existingOrganization =
            await Organization.findById(organization);

        if (!existingOrganization) {
            return res.status(404).json({
                message: "Organisation introuvable"
            });
        }

        if (existingOrganization.status !== "approved") {
            return res.status(400).json({
                message: "L'organisation doit être approuvée"
            });
        }

        // Le bénéficiaire doit appartenir à l'organisation
        if (
            existingBeneficiary.organization &&
            existingBeneficiary.organization.toString() !==
                organization
        ) {
            return res.status(400).json({
                message:
                    "Le bénéficiaire n'appartient pas à cette organisation"
            });
        }

        // Vérifier le montant demandé
        const amountNumber = Number(amount);

        if (isNaN(amountNumber) || amountNumber <= 0) {
            return res.status(400).json({
                message: "Le montant doit être supérieur à 0"
            });
        }

        if (
            existingBeneficiary.amountNeeded > 0 &&
            existingBeneficiary.amountReceived + amountNumber >
                existingBeneficiary.amountNeeded
        ) {
            return res.status(400).json({
                message:
                    "Le montant dépasse le besoin restant du bénéficiaire"
            });
        }

        const distribution = await Distribution.create({
            beneficiary,
            organization,
            campaign: campaign || null,
            amount: amountNumber,
            donationType,
            reason: reason || "",
            status: "pending",
            createdBy: req.user.id
        });

        res.status(201).json({
            message: "Distribution créée avec succès",
            distribution
        });

    } catch (error) {
        console.error("Erreur création distribution :", error);

        res.status(500).json({
            message: "Erreur lors de la création de la distribution",
            error: error.message
        });
    }
};


// ==========================================
// RÉCUPÉRER TOUTES LES DISTRIBUTIONS
// ==========================================
const getDistributions = async (req, res) => {
    try {
        const distributions = await Distribution.find()
            .populate(
                "beneficiary",
                "firstName lastName category amountNeeded amountReceived status"
            )
            .populate(
                "organization",
                "name email type status"
            )
            .populate(
                "campaign",
                "name category objective"
            )
            .populate(
                "createdBy",
                "firstName lastName email"
            )
            .sort({ createdAt: -1 });

        res.json({
            count: distributions.length,
            distributions
        });

    } catch (error) {
        console.error(
            "Erreur récupération distributions :",
            error
        );

        res.status(500).json({
            message:
                "Erreur lors de la récupération des distributions",
            error: error.message
        });
    }
};


// ==========================================
// RÉCUPÉRER UNE DISTRIBUTION PAR ID
// ==========================================
const getDistributionById = async (req, res) => {
    try {
        const distribution =
            await Distribution.findById(req.params.id)
                .populate("beneficiary")
                .populate("organization")
                .populate("campaign")
                .populate(
                    "createdBy",
                    "firstName lastName email"
                );

        if (!distribution) {
            return res.status(404).json({
                message: "Distribution introuvable"
            });
        }

        res.json({
            distribution
        });

    } catch (error) {
        console.error(
            "Erreur récupération distribution :",
            error
        );

        res.status(500).json({
            message:
                "Erreur lors de la récupération de la distribution",
            error: error.message
        });
    }
};


// ==========================================
// APPROUVER / TERMINER UNE DISTRIBUTION
// ==========================================
const updateDistributionStatus = async (req, res) => {
    try {
        const { status } = req.body;

        const allowedStatuses = [
            "pending",
            "approved",
            "completed",
            "cancelled"
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                message: "Statut de distribution invalide"
            });
        }

        const isAdmin = [
            "admin",
            "superadmin"
        ].includes(req.user.role);

        if (!isAdmin) {
            return res.status(403).json({
                message: "Accès réservé aux administrateurs"
            });
        }

        const distribution =
            await Distribution.findById(req.params.id);

        if (!distribution) {
            return res.status(404).json({
                message: "Distribution introuvable"
            });
        }

        // Lorsque la distribution devient completed,
        // mettre à jour le montant reçu du bénéficiaire.
        if (
            status === "completed" &&
            distribution.status !== "completed"
        ) {
            const beneficiary =
                await Beneficiary.findById(
                    distribution.beneficiary
                );

            if (!beneficiary) {
                return res.status(404).json({
                    message: "Bénéficiaire introuvable"
                });
            }

            if (
                beneficiary.amountNeeded > 0 &&
                beneficiary.amountReceived +
                    distribution.amount >
                    beneficiary.amountNeeded
            ) {
                return res.status(400).json({
                    message:
                        "Le montant dépasse le besoin restant du bénéficiaire"
                });
            }

            beneficiary.amountReceived +=
                distribution.amount;

            if (
                beneficiary.amountNeeded > 0 &&
                beneficiary.amountReceived >=
                    beneficiary.amountNeeded
            ) {
                beneficiary.status = "completed";
            }

            await beneficiary.save();

            await createAudit({
    action: "DISTRIBUTION_STATUS_UPDATED",
    entityType: "Distribution",
    entityId: distribution._id,
    user: req.user.id,
    details: {
        status: distribution.status,
        amount: distribution.amount,
        beneficiary: distribution.beneficiary,
        organization: distribution.organization,
        distributedAt: distribution.distributedAt
    }
});

            distribution.distributedAt = new Date();
        }

        distribution.status = status;

        await distribution.save();

        res.json({
            message:
                "Statut de la distribution modifié avec succès",
            distribution
        });

    } catch (error) {
        console.error(
            "Erreur modification distribution :",
            error
        );

        res.status(500).json({
            message:
                "Erreur lors de la modification de la distribution",
            error: error.message
        });
    }
};


// ==========================================
// ANNULER UNE DISTRIBUTION
// ==========================================
const deleteDistribution = async (req, res) => {
    try {
        const isAdmin = [
            "admin",
            "superadmin"
        ].includes(req.user.role);

        if (!isAdmin) {
            return res.status(403).json({
                message: "Accès réservé aux administrateurs"
            });
        }

        const distribution =
            await Distribution.findById(req.params.id);

        if (!distribution) {
            return res.status(404).json({
                message: "Distribution introuvable"
            });
        }

        if (distribution.status === "completed") {
            return res.status(400).json({
                message:
                    "Une distribution terminée ne peut pas être annulée"
            });
        }

        distribution.status = "cancelled";

        await distribution.save();

        res.json({
            message: "Distribution annulée avec succès",
            distribution
        });

    } catch (error) {
        console.error(
            "Erreur annulation distribution :",
            error
        );

        res.status(500).json({
            message: "Erreur lors de l'annulation",
            error: error.message
        });
    }
};


module.exports = {
    createDistribution,
    getDistributions,
    getDistributionById,
    updateDistributionStatus,
    deleteDistribution
};