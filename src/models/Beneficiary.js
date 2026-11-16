
const mongoose = require("mongoose");

const beneficiarySchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  phone: { type: String, default: "", trim: true },
  email: { type: String, default: "", lowercase: true, trim: true },
  address: { type: String, default: "", trim: true },
  city: { type: String, default: "", trim: true },
  country: { type: String, default: "Sénégal", trim: true },
  category: {
    type: String,
    enum: [
      "famille",
      "orphelin",
      "personne_agee",
      "personne_handicapee",
      "etudiant",
      "malade",
      "urgence_sociale",
      "autre"
    ],
    default: "autre"
  },
  description: { type: String, default: "", trim: true },
  amountNeeded: { type: Number, required: true, min: 0 },
  amountReceived: { type: Number, default: 0, min: 0 },
  amountReserved: { type: Number, default: 0, min: 0 },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected", "completed"],
    default: "pending"
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

beneficiarySchema.index({ lastName: 1, firstName: 1 });

module.exports =
  mongoose.models.Beneficiary ||
  mongoose.model("Beneficiary", beneficiarySchema);
