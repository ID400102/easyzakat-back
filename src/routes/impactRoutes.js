const express = require("express");
const { getImpact } = require("../controllers/impactController");
const router = express.Router();
router.get("/", getImpact);
module.exports = router;
