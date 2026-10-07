const mongoose = require("mongoose");

const auditSchema = new mongoose.Schema(
    {
        action: {
            type: String,
            required: true,
            trim: true
        },

        entityType: {
            type: String,
            required: true,
            enum: [
                "User",
                "Donation",
                "Payment",
                "Receipt",
                "Campaign",
                "Organization",
                "Beneficiary",
                "Distribution"
            ]
        },

        entityId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        },

        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        details: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },
    {
        timestamps: true
    }
);

const Audit = mongoose.model(
    "Audit",
    auditSchema
);

module.exports = Audit;