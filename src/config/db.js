const mongoose = require("mongoose");
const connectDB = async () => {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI est absent des variables d'environnement.");
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  console.log("MongoDB connecté avec succès");
  return mongoose.connection;
};
module.exports = connectDB;
