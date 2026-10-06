const mongoose = require("mongoose");

const organizationSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            default: ""
        },

        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true
        },

        phone: {
            type: String,
            default: ""
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

        type: {
            type: String,
            enum: [
                "association",
                "ong",
                "fondation",
                "mosquee",
                "institution",
                "autre"
            ],
            default: "association"
        },

        status: {
            type: String,
            enum: [
                "pending",
                "approved",
                "rejected",
                "suspended"
            ],
            default: "pending"
        },

        responsible: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
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

const Organization = mongoose.model(
    "Organization",
    organizationSchema
);

module.exports = Organization;