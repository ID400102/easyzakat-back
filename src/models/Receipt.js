const mongoose = require("mongoose");
const receiptSchema = new mongoose.Schema({
  payment: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", required: true, unique: true },
  donation: { type: mongoose.Schema.Types.ObjectId, ref: "Donation", required: true },
  donor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  receiptNumber: { type: String, required: true, unique: true },
  amount: { type: Number, required: true, min: 1 },
  issuedAt: { type: Date, default: Date.now }
}, { timestamps: true });
module.exports = mongoose.models.Receipt || mongoose.model("Receipt", receiptSchema);
