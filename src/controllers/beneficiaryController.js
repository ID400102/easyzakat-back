const Beneficiary = require("../models/Beneficiary");
const Organization = require("../models/Organization");
const createAudit = require("../utils/createAudit");


// ==========================================
// CRÉER UN BÉNÉFICIAIRE
// ==========================================
const createBeneficiary = async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            phone,
            email,
            address,
            city,
            country,
            category,
            description,
            amountNeeded,
            organization
        } = req.body;

        // Champs obligatoires
        if (!firstName || !lastName || !category) {
            return res.status(400).json({
                message: "Le prénom, le nom et la catégorie sont obligatoires"
            });
        }

        // Vérifier l'organisation si elle est fournie
        if (organization) {
            const existingOrganization = await Organization.findById(
                organization
            );

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
        }

        const beneficiary = await Beneficiary.create({
            firstName,
            lastName,
            phone,
            email,
            address,
            city,
            country,
            category,
            description,
            amountNeeded: amountNeeded || 0,
            amountReceived: 0,
            organization: organization || null,
            createdBy: req.user.id,
            status: "pending"
        });

        res.status(201).json({
            message: "Bénéficiaire créé avec succès",
            beneficiary
        });

    } catch (error) {
        console.error("Erreur création bénéficiaire :", error);

        res.status(500).json({
            message: "Erreur lors de la création du bénéficiaire",
            error: error.message
        });
    }
};


// ==========================================
// RÉCUPÉRER TOUS LES BÉNÉFICIAIRES
// ==========================================
const getBeneficiaries = async (req, res) => {
    try {
        const beneficiaries = await Beneficiary.find({
            isActive: true
        })
            .populate(
                "organization",
                "name email type status"
            )
            .populate(
                "createdBy",
                "firstName lastName email"
            )
            .sort({ createdAt: -1 });

        res.json({
            count: beneficiaries.length,
            beneficiaries
        });

    } catch (error) {
        console.error("Erreur récupération bénéficiaires :", error);

        res.status(500).json({
            message: "Erreur lors de la récupération des bénéficiaires",
            error: error.message
        });
    }
};


// ==========================================
// RÉCUPÉRER UN BÉNÉFICIAIRE PAR ID
// ==========================================
const getBeneficiaryById = async (req, res) => {
    try {
        const beneficiary = await Beneficiary.findById(req.params.id)
            .populate(
                "organization",
                "name email type status"
            )
            .populate(
                "createdBy",
                "firstName lastName email"
            );

        if (!beneficiary) {
            return res.status(404).json({
                message: "Bénéficiaire introuvable"
            });
        }

        res.json({
            beneficiary
        });

    } catch (error) {
        console.error("Erreur récupération bénéficiaire :", error);

        res.status(500).json({
            message: "Erreur lors de la récupération du bénéficiaire",
            error: error.message
        });
    }
};


// ==========================================
// MODIFIER UN BÉNÉFICIAIRE
// ==========================================
const updateBeneficiary = async (req, res) => {
    try {
        const beneficiary = await Beneficiary.findById(req.params.id);

        if (!beneficiary) {
            return res.status(404).json({
                message: "Bénéficiaire introuvable"
            });
        }

        const isCreator =
            beneficiary.createdBy &&
            beneficiary.createdBy.toString() === req.user.id;

        const isAdmin = [
            "admin",
            "superadmin"
        ].includes(req.user.role);

        if (!isCreator && !isAdmin) {
            return res.status(403).json({
                message: "Accès non autorisé"
            });
        }

        // Vérifier l'organisation si elle est modifiée
        if (req.body.organization) {
            const organization = await Organization.findById(
                req.body.organization
            );

            if (!organization) {
                return res.status(404).json({
                    message: "Organisation introuvable"
                });
            }

            if (organization.status !== "approved") {
                return res.status(400).json({
                    message: "L'organisation doit être approuvée"
                });
            }
        }

        const allowedFields = [
            "firstName",
            "lastName",
            "phone",
            "email",
            "address",
            "city",
            "country",
            "category",
            "description",
            "amountNeeded",
            "organization"
        ];

        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                beneficiary[field] = req.body[field];
            }
        });

        await beneficiary.save();
        await createAudit({
    action: "BENEFICIARY_STATUS_UPDATED",
    entityType: "Beneficiary",
    entityId: beneficiary._id,
    user: req.user.id,
    details: {
        status,
        firstName: beneficiary.firstName,
        lastName: beneficiary.lastName
    }
});

        res.json({
            message: "Bénéficiaire modifié avec succès",
            beneficiary
        });

    } catch (error) {
        console.error("Erreur modification bénéficiaire :", error);

        res.status(500).json({
            message: "Erreur lors de la modification du bénéficiaire",
            error: error.message
        });
    }
};


// ==========================================
// CHANGER LE STATUT D'UN BÉNÉFICIAIRE
// ADMIN UNIQUEMENT
// ==========================================
const updateBeneficiaryStatus = async (req, res) => {
    try {
        const { status } = req.body;

        const allowedStatuses = [
            "pending",
            "approved",
            "rejected",
            "completed"
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                message: "Statut de bénéficiaire invalide"
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

        const beneficiary = await Beneficiary.findById(
            req.params.id
        );

        if (!beneficiary) {
            return res.status(404).json({
                message: "Bénéficiaire introuvable"
            });
        }

        beneficiary.status = status;

        await beneficiary.save();

        res.json({
            message: "Statut du bénéficiaire modifié avec succès",
            beneficiary
        });

    } catch (error) {
        console.error(
            "Erreur modification statut bénéficiaire :",
            error
        );

        res.status(500).json({
            message: "Erreur lors de la modification du statut",
            error: error.message
        });
    }
};


// ==========================================
// DÉSACTIVER UN BÉNÉFICIAIRE
// ==========================================
const deleteBeneficiary = async (req, res) => {
    try {
        const beneficiary = await Beneficiary.findById(req.params.id);

        if (!beneficiary) {
            return res.status(404).json({
                message: "Bénéficiaire introuvable"
            });
        }

        const isCreator =
            beneficiary.createdBy &&
            beneficiary.createdBy.toString() === req.user.id;

        const isAdmin = [
            "admin",
            "superadmin"
        ].includes(req.user.role);

        if (!isCreator && !isAdmin) {
            return res.status(403).json({
                message: "Accès non autorisé"
            });
        }

        beneficiary.isActive = false;

        await beneficiary.save();

        res.json({
            message: "Bénéficiaire désactivé avec succès"
        });

    } catch (error) {
        console.error("Erreur désactivation bénéficiaire :", error);

        res.status(500).json({
            message: "Erreur lors de la désactivation du bénéficiaire",
            error: error.message
        });
    }
};


module.exports = {
    createBeneficiary,
    getBeneficiaries,
    getBeneficiaryById,
    updateBeneficiary,
    updateBeneficiaryStatus,
    deleteBeneficiary
};