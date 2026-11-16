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

        // Vérification des champs obligatoires
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

        // Vérifier que l'objectif est valide
        if (Number(objective) < 0) {
            return res.status(400).json({
                message: "L'objectif doit être positif"
            });
        }

        // Créer la campagne
        const campaign = await Campaign.create({
            name,
            organization: req.user.id,
            category,
            description,
            objective: Number(objective),
            collected: 0,
            startDate,
            endDate,
            location,
            media,
            impactReport
        });

        res.status(201).json({
            message: "Campagne créée avec succès",
            campaign
        });

    } catch (error) {
        console.error("Erreur création campagne :", error);

        res.status(500).json({
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
        const campaigns = await Campaign.find({ status: "active" })
            .populate("partnerOrganization", "name email status")
            .populate(
                "organization",
                "firstName lastName email role"
            )
            .sort({ createdAt: -1 });

        res.json({
            count: campaigns.length,
            campaigns
        });

    } catch (error) {
        console.error("Erreur récupération campagnes :", error);

        res.status(500).json({
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
        const campaign = await Campaign.findOne({ _id: req.params.id, status: "active" })
            .populate("partnerOrganization", "name email status")
            .populate(
                "organization",
                "firstName lastName email role"
            );

        if (!campaign) {
            return res.status(404).json({
                message: "Campagne introuvable"
            });
        }

        res.json({
            campaign
        });

    } catch (error) {
        res.status(500).json({
            message: "Erreur lors de la récupération de la campagne",
            error: error.message
        });
    }
};


// ==========================================
// MODIFIER UNE CAMPAGNE
// ==========================================

const updateCampaign = async (req, res) => {
    try {
        const campaign = await Campaign.findById(
            req.params.id
        );

        if (!campaign) {
            return res.status(404).json({
                message: "Campagne introuvable"
            });
        }

        // Vérifier que l'utilisateur est le propriétaire
        if (
            campaign.organization.toString() !==
            req.user.id.toString()
        ) {
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

        campaign.name = name ?? campaign.name;
        campaign.category = category ?? campaign.category;
        campaign.description =
            description ?? campaign.description;

        campaign.objective =
            objective !== undefined
                ? Number(objective)
                : campaign.objective;

        campaign.startDate =
            startDate ?? campaign.startDate;

        campaign.endDate =
            endDate ?? campaign.endDate;

        campaign.location =
            location ?? campaign.location;

        campaign.media =
            media ?? campaign.media;

        campaign.impactReport =
            impactReport ?? campaign.impactReport;

        if (status !== undefined && !["admin", "superadmin"].includes(req.user.role)) {
            return res.status(403).json({ message: "Seul EasyZakat peut valider ou publier une campagne." });
        }
        campaign.status = status ?? campaign.status;

        await campaign.save();

        res.json({
            message: "Campagne modifiée avec succès",
            campaign
        });

    } catch (error) {
        console.error("Erreur modification campagne :", error);

        res.status(500).json({
            message: "Erreur lors de la modification de la campagne",
            error: error.message
        });
    }
};


// ==========================================
// SUPPRIMER UNE CAMPAGNE
// ==========================================

const deleteCampaign = async (req, res) => {
    try {
        const campaign = await Campaign.findById(
            req.params.id
        );

        if (!campaign) {
            return res.status(404).json({
                message: "Campagne introuvable"
            });
        }

        // Vérifier que l'utilisateur est le propriétaire
        if (
            campaign.organization.toString() !==
            req.user.id.toString()
        ) {
            return res.status(403).json({
                message: "Vous n'êtes pas autorisé à supprimer cette campagne"
            });
        }

        const Donation = require("../models/Donation");
        const linkedDonations = await Donation.countDocuments({ campaign: campaign._id });
        if (linkedDonations > 0) {
            return res.status(409).json({ message: "Cette campagne possède déjà des dons et ne peut pas être supprimée." });
        }
        await campaign.deleteOne();

        res.json({
            message: "Campagne supprimée avec succès"
        });

    } catch (error) {
        console.error("Erreur suppression campagne :", error);

        res.status(500).json({
            message: "Erreur lors de la suppression de la campagne",
            error: error.message
        });
    }
};


// ==========================================
// EXPORT
// ==========================================

module.exports = {
    createCampaign,
    getCampaigns,
    getCampaignById,
    updateCampaign,
    deleteCampaign
};