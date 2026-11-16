
const crypto = require("crypto");
const Donation = require("../models/Donation");
const Campaign = require("../models/Campaign");

// ==========================================
// CRÉER UN DON
// ==========================================

const createDonation = async (req, res) => {
    try {
        const {
            campaign,
            type,
            amount,
            anonymous,
            paymentMethod,
            guestInfo
        } = req.body;

        if (!type || amount === undefined) {
            return res.status(400).json({
                message: "Le type et le montant du don sont obligatoires"
            });
        }

        const allowedTypes = [
            "zakat",
            "sadaqa",
            "ramadan",
            "urgence_sociale"
        ];

        if (!allowedTypes.includes(type)) {
            return res.status(400).json({
                message: "Type de don invalide"
            });
        }

        const donationAmount = Number(amount);

        if (!Number.isFinite(donationAmount) || donationAmount <= 0) {
            return res.status(400).json({
                message: "Le montant du don doit être supérieur à 0"
            });
        }

        if (campaign) {
            if (!/^[0-9a-fA-F]{24}$/.test(String(campaign))) {
                return res.status(400).json({
                    message: "Identifiant de campagne invalide"
                });
            }

            const existingCampaign = await Campaign.findById(campaign);

            if (!existingCampaign) {
                return res.status(404).json({
                    message: "Campagne introuvable"
                });
            }
        }

        // Vérifier les coordonnées du visiteur
        if (!req.user) {
            if (
                !guestInfo?.firstName?.trim() ||
                !guestInfo?.lastName?.trim() ||
                !guestInfo?.email?.trim() ||
                !guestInfo?.phone?.trim()
            ) {
                return res.status(400).json({
                    message: "Le prénom, le nom, l'email et le téléphone sont obligatoires pour un don sans compte"
                });
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!emailRegex.test(guestInfo.email.trim())) {
                return res.status(400).json({
                    message: "Adresse email invalide"
                });
            }
        }

        // Générer un jeton temporaire pour le visiteur
        let guestPaymentToken = null;
        let guestPaymentTokenHash = null;
        let guestPaymentTokenExpires = null;

        if (!req.user) {
            guestPaymentToken = crypto.randomBytes(32).toString("hex");

            guestPaymentTokenHash = crypto
                .createHash("sha256")
                .update(guestPaymentToken)
                .digest("hex");

            guestPaymentTokenExpires = new Date(
                Date.now() + 30 * 60 * 1000
            );
        }

        // Créer le don
        const donation = await Donation.create({
            donor: req.user ? req.user.id : null,

            guestInfo: req.user
                ? undefined
                : {
                    firstName: guestInfo.firstName.trim(),
                    lastName: guestInfo.lastName.trim(),
                    email: guestInfo.email.trim().toLowerCase(),
                    phone: guestInfo.phone.trim()
                },

            guestPaymentTokenHash,
            guestPaymentTokenExpires,

            campaign: campaign || null,
            type,
            amount: donationAmount,
            anonymous: Boolean(anonymous),
            paymentMethod: paymentMethod || null,
            status: "pending"
        });

        res.status(201).json({
            message: "Don créé avec succès",
            donation,
            guestPaymentToken
        });

    } catch (error) {
        console.error("Erreur création don :", error);

        res.status(500).json({
            message: "Erreur lors de la création du don"
        });
    }
};

// ==========================================
// RÉCUPÉRER TOUS LES DONS
// ==========================================

const getDonations = async (req, res) => {
    try {
        const donations = await Donation.find()
            .populate("donor", "firstName lastName email role")
            .populate("campaign", "name category objective collected status")
            .sort({ createdAt: -1 });

        res.json({
            count: donations.length,
            donations
        });

    } catch (error) {
        console.error("Erreur récupération dons :", error);

        res.status(500).json({
            message: "Erreur lors de la récupération des dons",
            error: error.message
        });
    }
};

// ==========================================
// RÉCUPÉRER MES DONS
// ==========================================

const getMyDonations = async (req, res) => {
    try {
        const donations = await Donation.find({
            donor: req.user.id
        })
            .populate("campaign", "name category objective collected status")
            .sort({ createdAt: -1 });

        res.json({
            count: donations.length,
            donations
        });

    } catch (error) {
        console.error("Erreur récupération de mes dons :", error);

        res.status(500).json({
            message: "Erreur lors de la récupération de vos dons",
            error: error.message
        });
    }
};

// ==========================================
// RÉCUPÉRER UN DON PAR ID
// ==========================================

const getDonationById = async (req, res) => {
    try {
        const donation = await Donation.findById(req.params.id)
            .populate("donor", "firstName lastName email role")
            .populate("campaign", "name category objective collected status");

        if (!donation) {
            return res.status(404).json({
                message: "Don introuvable"
            });
        }

        res.json({
            donation
        });

    } catch (error) {
        console.error("Erreur récupération don :", error);

        res.status(500).json({
            message: "Erreur lors de la récupération du don",
            error: error.message
        });
    }
};

// ==========================================
// MODIFIER LE STATUT D'UN DON
// ==========================================

const updateDonationStatus = async (req, res) => {
    try {
        const { status } = req.body;

        const allowedStatuses = [
            "pending",
            "success",
            "failed"
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                message: "Statut de don invalide"
            });
        }

        const donation = await Donation.findById(req.params.id);

        if (!donation) {
            return res.status(404).json({
                message: "Don introuvable"
            });
        }

        donation.status = status;

        await donation.save();

        res.json({
            message: "Statut de don modifié avec succès",
            donation
        });

    } catch (error) {
        console.error("Erreur modification statut don :", error);

        res.status(500).json({
            message: "Erreur lors de la modification du statut",
            error: error.message
        });
    }
};

// ==========================================
// EXPORT
// ==========================================

module.exports = {
    createDonation,
    getDonations,
    getMyDonations,
    getDonationById,
    updateDonationStatus
};
