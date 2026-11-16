const mongoose = require("mongoose");
const organizationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: "", trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, default: "", trim: true },
  address: { type: String, default: "", trim: true },
  city: { type: String, default: "", trim: true },
  country: { type: String, default: "Sénégal", trim: true },
  type: { type: String, enum: ["association", "ong", "fondation", "mosquee", "institution", "autre"], default: "association" },
  status: { type: String, enum: ["pending", "approved", "rejected", "suspended"], default: "pending" },
  responsible: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });
organizationSchema.index({ email: 1 }, { unique: true });
module.exports = mongoose.models.Organization || mongoose.model("Organization", organizationSchema);
