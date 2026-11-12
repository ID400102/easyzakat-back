
const Campaign = require("../models/Campaign");

// ==========================================
// CRÉER UNE CAMPAGNE
// ==========================================

const createCampaign = async (req, res) => {
    try {
        const {
            name,
            category,
            description,
            objective,
            startDate,
            endDate,
            location,
            media,
            impactReport
        } = req.body;

        if (
            !name ||
            !category ||
            !description ||
            objective === undefined ||
            !startDate ||
            !endDate
        ) {
            return res.status(400).json({
                message: "Veuillez remplir tous les champs obligatoires"
            });
        }

        const validCategories = [
            "zakat",
            "sadaqa",
            "ramadan",
            "urgence_sociale"
        ];

        if (!validCategories.includes(category)) {
            return res.status(400).json({
                message: "Catégorie de campagne invalide"
            });
        }

        const amount = Number(objective);

        if (!Number.isFinite(amount) || amount < 0) {
            return res.status(400).json({
                message: "L'objectif doit être un nombre positif"
            });
        }

        const campaign = await Campaign.create({
            name,
            organization: req.user.id,
            category,
            description,
            objective: amount,
            collected: 0,
            startDate,
            endDate,
            location,
            media,
            impactReport
        });

        return res.status(201).json({
            message: "Campagne créée avec succès",
            campaign
        });

    } catch (error) {
        console.error("Erreur création campagne :", error);

        return res.status(500).json({
            message: "Erreur lors de la création de la campagne",
            error: error.message
        });
    }
};


// ==========================================
// RÉCUPÉRER TOUTES LES CAMPAGNES
// ==========================================

const getCampaigns = async (req, res) => {
    try {
        const campaigns = await Campaign.find()
            .populate(
                "organization",
                "firstName lastName email role"
            )
            .sort({ createdAt: -1 });

        return res.json({
            count: campaigns.length,
            campaigns
        });

    } catch (error) {
        console.error("Erreur récupération campagnes :", error);

        return res.status(500).json({
            message: "Erreur lors de la récupération des campagnes",
            error: error.message
        });
    }
};


// ==========================================
// RÉCUPÉRER UNE CAMPAGNE
// ==========================================

const getCampaignById = async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id)
            .populate(
                "organization",
                "firstName lastName email role"
            );

        if (!campaign) {
            return res.status(404).json({
                message: "Campagne introuvable"
            });
        }

        return res.json({
            campaign
        });

    } catch (error) {
        console.error("Erreur récupération campagne :", error);

        return res.status(500).json({
            message: "Erreur lors de la récupération de la campagne",
            error: error.message
        });
    }
};


// ==========================================
// MODIFIER UNE CAMPAGNE
// PROPRIÉTAIRE OU ADMINISTRATEUR
// ==========================================

const updateCampaign = async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id);

        if (!campaign) {
            return res.status(404).json({
                message: "Campagne introuvable"
            });
        }

        // Vérifier les droits
        const isOwner =
            campaign.organization &&
            campaign.organization.toString() ===
                req.user.id.toString();

        const isAdmin = [
            "admin",
            "superadmin"
        ].includes(req.user.role);

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                message: "Vous n'êtes pas autorisé à modifier cette campagne"
            });
        }

        const {
            name,
            category,
            description,
            objective,
            startDate,
            endDate,
            location,
            media,
            impactReport,
            status
        } = req.body;

        const validCategories = [
            "zakat",
            "sadaqa",
            "ramadan",
            "urgence_sociale"
        ];

        const validStatuses = [
            "draft",
            "validation",
            "active",
            "terminated"
        ];

        if (
            category !== undefined &&
            !validCategories.includes(category)
        ) {
            return res.status(400).json({
                message: "Catégorie de campagne invalide"
            });
        }

        if (
            status !== undefined &&
            !validStatuses.includes(status)
        ) {
            return res.status(400).json({
                message: "Statut de campagne invalide"
            });
        }

        if (name !== undefined) campaign.name = name;
        if (category !== undefined) campaign.category = category;
        if (description !== undefined) campaign.description = description;

        if (objective !== undefined) {
            const amount = Number(objective);

            if (!Number.isFinite(amount) || amount < 0) {
                return res.status(400).json({
                    message: "Objectif invalide"
                });
            }

            campaign.objective = amount;
        }

        if (startDate !== undefined) campaign.startDate = startDate;
        if (endDate !== undefined) campaign.endDate = endDate;
        if (location !== undefined) campaign.location = location;
        if (media !== undefined) campaign.media = media;
        if (impactReport !== undefined) campaign.impactReport = impactReport;
        if (status !== undefined) campaign.status = status;

        await campaign.save();

        return res.json({
            message: "Campagne modifiée avec succès",
            campaign
        });

    } catch (error) {
        console.error("Erreur modification campagne :", error);

        return res.status(500).json({
            message: "Erreur lors de la modification de la campagne",
            error: error.message
        });
    }
};


// ==========================================
// SUPPRIMER UNE CAMPAGNE
// PROPRIÉTAIRE OU ADMINISTRATEUR
// ==========================================

const deleteCampaign = async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id);

        if (!campaign) {
            return res.status(404).json({
                message: "Campagne introuvable"
            });
        }

        // Vérifier les droits
        const isOwner =
            campaign.organization &&
            campaign.organization.toString() ===
                req.user.id.toString();

        const isAdmin = [
            "admin",
            "superadmin"
        ].includes(req.user.role);

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                message: "Vous n'êtes pas autorisé à supprimer cette campagne"
            });
        }

        await campaign.deleteOne();

        return res.json({
            message: "Campagne supprimée avec succès"
        });

    } catch (error) {
        console.error("Erreur suppression campagne :", error);

        return res.status(500).json({
            message: "Erreur lors de la suppression de la campagne",
            error: error.message
        });
    }
};


// ==========================================
// EXPORTS
// ==========================================

module.exports = {
    createCampaign,
    getCampaigns,
    getCampaignById,
    updateCampaign,
    deleteCampaign
};
