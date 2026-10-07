const crypto = require("crypto");

const generateReceiptNumber = () => {
    const date = new Date()
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, "");

    const random = crypto
        .randomBytes(4)
        .toString("hex")
        .toUpperCase();

    return `EZ-REC-${date}-${random}`;
};

module.exports = generateReceiptNumber;