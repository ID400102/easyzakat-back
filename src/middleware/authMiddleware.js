const jwt = require("jsonwebtoken");
const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return res.status(401).json({ message: "Accès non autorisé. Token manquant." });
  const token = authHeader.slice(7).trim();
  if (!token) return res.status(401).json({ message: "Token invalide." });
  try {
    if (!process.env.JWT_SECRET) return res.status(500).json({ message: "Configuration JWT manquante sur le serveur." });
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch (error) { return res.status(401).json({ message: "Token invalide ou expiré." }); }
};
module.exports = protect;
