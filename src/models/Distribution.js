const mongoose = require("mongoose");

const distributionSchema = new mongoose.Schema(
    {
        beneficiary: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Beneficiary",
            required: true
        },

        organization: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true
        },

        campaign: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Campaign",
            default: null
        },

        amount: {
            type: Number,
            required: true,
            min: 1
        },

        donationType: {
            type: String,
            enum: [
                "zakat",
                "sadaqa",
                "ramadan",
                "urgence_sociale"
            ],
            required: true
        },

        reason: {
            type: String,
            default: ""
        },

        status: {
            type: String,
            enum: [
                "pending",
                "approved",
                "completed",
                "cancelled"
            ],
            default: "pending"
        },

        distributedAt: {
            type: Date,
            default: null
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        }
    },
    {
        timestamps: true
    }
);

const Distribution = mongoose.model(
    "Distribution",
    distributionSchema
);

module.exports = Distribution;