const mongoose = require("mongoose");
const distributionSchema = new mongoose.Schema({
  beneficiary: { type: mongoose.Schema.Types.ObjectId, ref: "Beneficiary", required: true },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
  campaign: { type: mongoose.Schema.Types.ObjectId, ref: "Campaign", default: null },
  amount: { type: Number, required: true, min: 1 },
  donationType: { type: String, enum: ["zakat", "sadaqa", "ramadan", "urgence_sociale"], default: "sadaqa" },
  reason: { type: String, default: "", trim: true },
  method: { type: String, enum: ["cash", "wave", "orange_money", "bank_transfer", "other"], default: "cash" },
  proofUrl: { type: String, default: "", trim: true },
  status: { type: String, enum: ["pending", "approved", "completed", "cancelled"], default: "pending" },
  distributedAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  validatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  validatedAt: { type: Date, default: null }
}, { timestamps: true });
module.exports = mongoose.models.Distribution || mongoose.model("Distribution", distributionSchema);
