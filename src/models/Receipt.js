const mongoose = require("mongoose");

const receiptSchema = new mongoose.Schema(
    {
        receiptNumber: {
            type: String,
            unique: true,
            required: true
        },

        payment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Payment",
            required: true
        },

        donation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Donation",
            required: true
        },

        donor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        amount: {
            type: Number,
            required: true
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

        paymentMethod: {
            type: String,
            enum: [
                "wave",
                "orange_money",
                "free_money",
                "card",
                "bank_transfer"
            ],
            required: true
        },

        transactionReference: {
            type: String,
            required: true
        },

        status: {
            type: String,
            enum: [
                "success",
                "failed"
            ],
            default: "success"
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Receipt", receiptSchema);