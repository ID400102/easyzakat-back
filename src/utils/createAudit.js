const Audit = require("../models/Audit");

const createAudit = async ({
    action,
    entityType,
    entityId = null,
    user = null,
    details = {}
}) => {
    try {
        const audit = await Audit.create({
            action,
            entityType,
            entityId,
            user,
            details
        });

        return audit;
    } catch (error) {
        console.error("Erreur création audit :", error);

        // L'audit ne doit pas empêcher l'opération principale
        return null;
    }
};

module.exports = createAudit;