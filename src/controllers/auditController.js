const Audit = require("../models/Audit");


// ==========================================
// RÉCUPÉRER TOUS LES AUDITS
// ADMIN UNIQUEMENT
// ==========================================
const getAudits = async (req, res) => {
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

        const audits = await Audit.find()
            .populate(
                "user",
                "firstName lastName email role"
            )
            .sort({ createdAt: -1 });

        res.json({
            count: audits.length,
            audits
        });

    } catch (error) {
        console.error("Erreur récupération audits :", error);

        res.status(500).json({
            message: "Erreur lors de la récupération des audits",
            error: error.message
        });
    }
};


// ==========================================
// RÉCUPÉRER UN AUDIT PAR ID
// ADMIN UNIQUEMENT
// ==========================================
const getAuditById = async (req, res) => {
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

        const audit = await Audit.findById(req.params.id)
            .populate(
                "user",
                "firstName lastName email role"
            );

        if (!audit) {
            return res.status(404).json({
                message: "Audit introuvable"
            });
        }

        res.json({
            audit
        });

    } catch (error) {
        console.error("Erreur récupération audit :", error);

        res.status(500).json({
            message: "Erreur lors de la récupération de l'audit",
            error: error.message
        });
    }
};


module.exports = {
    getAudits,
    getAuditById
};