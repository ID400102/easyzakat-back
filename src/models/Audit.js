const mongoose = require("mongoose");
const auditSchema = new mongoose.Schema({
  action: { type: String, required: true, trim: true },
  entityType: { type: String, required: true, trim: true },
  entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  ip: { type: String, default: "" },
  details: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });
auditSchema.index({ createdAt: -1 });
module.exports = mongoose.models.Audit || mongoose.model("Audit", auditSchema);
