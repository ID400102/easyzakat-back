const Organization = require("../models/Organization");
const createAudit = require("../utils/createAudit");


// ==========================================
// CRÉER UNE ORGANISATION
// ==========================================
const createOrganization = async (req, res) => {
    try {
        const {
            name,
            description,
            email,
            phone,
            address,
            city,
            country,
            type
        } = req.body;

        if (!name || !email) {
            return res.status(400).json({
                message: "Le nom et l'email sont obligatoires"
            });
        }

        const existingOrganization = await Organization.findOne({
            email: email.toLowerCase()
        });

        if (existingOrganization) {
            return res.status(400).json({
                message: "Une organisation avec cet email existe déjà"
            });
        }

        const organization = await Organization.create({
            name,
            description,
            email,
            phone,
            address,
            city,
            country,
            type,
            responsible: req.user.id,
            status: "pending"
        });

        res.status(201).json({
            message: "Organisation créée avec succès",
            organization
        });

    } catch (error) {
        console.error("Erreur création organisation :", error);

        res.status(500).json({
            message: "Erreur lors de la création de l'organisation",
            error: error.message
        });
    }
};


// ==========================================
// RÉCUPÉRER TOUTES LES ORGANISATIONS
// ==========================================
const getOrganizations = async (req, res) => {
    try {
        const organizations = await Organization.find({
            isActive: true
        })
            .populate("responsible", "firstName lastName email")
            .sort({ createdAt: -1 });

        res.json({
            count: organizations.length,
            organizations
        });

    } catch (error) {
        console.error("Erreur récupération organisations :", error);

        res.status(500).json({
            message: "Erreur lors de la récupération des organisations",
            error: error.message
        });
    }
};


// ==========================================
// RÉCUPÉRER MON ORGANISATION
// ==========================================
const getMyOrganization = async (req, res) => {
    try {
        const organization = await Organization.findOne({
            responsible: req.user.id
        }).populate(
            "responsible",
            "firstName lastName email phone"
        );

        if (!organization) {
            return res.status(404).json({
                message: "Aucune organisation trouvée"
            });
        }

        res.json({
            organization
        });

    } catch (error) {
        console.error("Erreur récupération mon organisation :", error);

        res.status(500).json({
            message: "Erreur lors de la récupération de votre organisation",
            error: error.message
        });
    }
};


// ==========================================
// RÉCUPÉRER UNE ORGANISATION PAR ID
// ==========================================
const getOrganizationById = async (req, res) => {
    try {
        const organization = await Organization.findById(req.params.id)
            .populate(
                "responsible",
                "firstName lastName email phone"
            );

        if (!organization) {
            return res.status(404).json({
                message: "Organisation introuvable"
            });
        }

        res.json({
            organization
        });

    } catch (error) {
        console.error("Erreur récupération organisation :", error);

        res.status(500).json({
            message: "Erreur lors de la récupération de l'organisation",
            error: error.message
        });
    }
};


// ==========================================
// MODIFIER UNE ORGANISATION
// ==========================================
const updateOrganization = async (req, res) => {
    try {
        const organization = await Organization.findById(req.params.id);

        if (!organization) {
            return res.status(404).json({
                message: "Organisation introuvable"
            });
        }

        const isOwner =
            organization.responsible &&
            organization.responsible.toString() === req.user.id;

        const isAdmin = [
            "admin",
            "superadmin"
        ].includes(req.user.role);

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                message: "Accès non autorisé"
            });
        }

        const allowedFields = [
            "name",
            "description",
            "email",
            "phone",
            "address",
            "city",
            "country",
            "type"
        ];

        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                organization[field] = req.body[field];
            }
        });

        await organization.save();

        res.json({
            message: "Organisation modifiée avec succès",
            organization
        });

    } catch (error) {
        console.error("Erreur modification organisation :", error);

        res.status(500).json({
            message: "Erreur lors de la modification de l'organisation",
            error: error.message
        });
    }
};


// ==========================================
// SUPPRIMER / DÉSACTIVER UNE ORGANISATION
// ==========================================
const deleteOrganization = async (req, res) => {
    try {
        const organization = await Organization.findById(req.params.id);

        if (!organization) {
            return res.status(404).json({
                message: "Organisation introuvable"
            });
        }

        const isOwner =
            organization.responsible &&
            organization.responsible.toString() === req.user.id;

        const isAdmin = [
            "admin",
            "superadmin"
        ].includes(req.user.role);

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                message: "Accès non autorisé"
            });
        }

        organization.isActive = false;

        await organization.save();

        res.json({
            message: "Organisation désactivée avec succès"
        });

    } catch (error) {
        console.error("Erreur suppression organisation :", error);

        res.status(500).json({
            message: "Erreur lors de la suppression de l'organisation",
            error: error.message
        });
    }
};


// ==========================================
// CHANGER LE STATUT D'UNE ORGANISATION
// ADMIN UNIQUEMENT
// ==========================================
const updateOrganizationStatus = async (req, res) => {
    try {
        const { status } = req.body;

        const allowedStatuses = [
            "pending",
            "approved",
            "rejected",
            "suspended"
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                message: "Statut d'organisation invalide"
            });
        }

        // Vérifier que l'utilisateur est admin
        if (!["admin", "superadmin"].includes(req.user.role)) {
            return res.status(403).json({
                message: "Accès réservé aux administrateurs"
            });
        }

        const organization = await Organization.findById(
            req.params.id
        );

        if (!organization) {
            return res.status(404).json({
                message: "Organisation introuvable"
            });
        }

        organization.status = status;

        await organization.save();
    
        await createAudit({
    action: "ORGANIZATION_STATUS_UPDATED",
    entityType: "Organization",
    entityId: organization._id,
    user: req.user.id,
    details: {
        status
    }
});

        res.json({
            message: "Statut de l'organisation modifié avec succès",
            organization
        });

    } catch (error) {
        console.error(
            "Erreur modification statut organisation :",
            error
        );

        res.status(500).json({
            message: "Erreur lors de la modification du statut",
            error: error.message
        });
    }
};




module.exports = {
    createOrganization,
    getOrganizations,
    getMyOrganization,
    getOrganizationById,
    updateOrganization,
    deleteOrganization,
    updateOrganizationStatus
};