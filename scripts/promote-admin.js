require("dotenv").config();
const connectDB = require("../src/config/db");
const User = require("../src/models/User");
(async () => {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) { console.error("Usage: node scripts/promote-admin.js adresse@email.com"); process.exit(1); }
  try {
    await connectDB();
    const user = await User.findOneAndUpdate({ email }, { $set: { role: "admin", isActive: true } }, { new: true });
    if (!user) { console.error("Utilisateur introuvable. Créez d'abord le compte via l'inscription."); process.exitCode = 1; }
    else console.log(`Compte ${user.email} promu administrateur.`);
  } catch (error) { console.error("Promotion impossible :", error.message); process.exitCode = 1; }
  finally { const mongoose = require("mongoose"); await mongoose.disconnect(); }
})();
