const Audit = require("../models/Audit");
const createAudit = async ({ action, entityType, entityId = null, user = null, details = {}, ip = "" }) => {
  try {
    return await Audit.create({ action, entityType, entityId, user, details, ip });
  } catch (error) {
    console.error("Erreur création audit :", error.message);
    return null;
  }
};
module.exports = createAudit;
