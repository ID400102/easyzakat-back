const crypto = require("crypto");

const generatePaymentReference = () => {
    const date = new Date()
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, "");

    const random = crypto
        .randomBytes(4)
        .toString("hex")
        .toUpperCase();

    return `EZ-PAY-${date}-${random}`;
};

module.exports = generatePaymentReference;