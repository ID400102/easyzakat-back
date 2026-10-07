const mongoose = require("mongoose");

const beneficiarySchema = new mongoose.Schema(
    {
        firstName: {
            type: String,
            required: true,
            trim: true
        },

        lastName: {
            type: String,
            required: true,
            trim: true
        },

        phone: {
            type: String,
            default: ""
        },

        email: {
            type: String,
            default: "",
            lowercase: true,
            trim: true
        },

        address: {
            type: String,
            default: ""
        },

        city: {
            type: String,
            default: ""
        },

        country: {
            type: String,
            default: "Sénégal"
        },

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
            required: true
        },

        description: {
            type: String,
            default: ""
        },

        amountNeeded: {
            type: Number,
            min: 0,
            default: 0
        },

        amountReceived: {
            type: Number,
            min: 0,
            default: 0
        },

        status: {
            type: String,
            enum: [
                "pending",
                "approved",
                "rejected",
                "completed"
            ],
            default: "pending"
        },

        organization: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            default: null
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

const Beneficiary = mongoose.model(
    "Beneficiary",
    beneficiarySchema
);

module.exports = Beneficiary;