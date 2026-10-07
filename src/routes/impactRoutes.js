const express = require("express");

const {
    getImpact
} = require("../controllers/impactController");

const router = express.Router();


// Transparence / Impact
router.get("/", getImpact);


module.exports = router;