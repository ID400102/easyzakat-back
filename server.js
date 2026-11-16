require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./src/config/db");

const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN || "").split(",").map(x => x.trim()).filter(Boolean);
app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : true, credentials: true }));
app.use(express.json({ limit: "2mb" }));

app.use("/api/auth", require("./src/routes/authRoutes"));
app.use("/api/zakat", require("./src/routes/zakatRoutes"));
app.use("/api/campaigns", require("./src/routes/campaignRoutes"));
app.use("/api/donations", require("./src/routes/donationRoutes"));
app.use("/api/payments", require("./src/routes/paymentRoutes"));
app.use("/api/admin", require("./src/routes/adminRoutes"));
app.use("/api/organizations", require("./src/routes/organizationRoutes"));
app.use("/api/beneficiaries", require("./src/routes/beneficiaryRoutes"));
app.use("/api/distributions", require("./src/routes/distributionRoutes"));
app.use("/api/dashboard", require("./src/routes/dashboardRoutes"));
app.use("/api/audits", require("./src/routes/auditRoutes"));
app.use("/api/settings", require("./src/routes/settingRoutes"));
app.use("/api/receipts", require("./src/routes/receiptRoutes"));
app.use("/api/impact", require("./src/routes/impactRoutes"));

app.get("/", (req, res) => res.json({ message: "API EasyZakat fonctionne correctement", status: "ok" }));
app.get("/api/health", (req, res) => res.json({ status: "ok", service: "easyzakat-api" }));
app.use((req, res) => res.status(404).json({ message: `Route introuvable : ${req.method} ${req.originalUrl}` }));
app.use((error, req, res, next) => {
  console.error("Erreur API :", error.message);
  res.status(error.status || 500).json({ message: error.status ? error.message : "Erreur interne du serveur." });
});

const PORT = process.env.PORT || 5000;
if (require.main === module) {
  connectDB().then(() => {
    app.listen(PORT, () => console.log(`Serveur EasyZakat lancé sur le port ${PORT}`));
  }).catch(error => {
    console.error("Impossible de démarrer EasyZakat :", error.message);
    process.exit(1);
  });
}
module.exports = app;
