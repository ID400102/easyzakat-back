const mongoose = require("mongoose");
const settingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, trim: true },
  label: { type: String, required: true, trim: true },
  category: { type: String, default: "general", trim: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  description: { type: String, default: "" },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
}, { timestamps: true });
module.exports = mongoose.models.Setting || mongoose.model("Setting", settingSchema);
