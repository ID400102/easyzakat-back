const jwt = require("jsonwebtoken");
module.exports = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) return next();
  const token = header.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Token invalide." });
  try { req.user = jwt.verify(token, process.env.JWT_SECRET); return next(); }
  catch { return res.status(401).json({ message: "Token invalide ou expiré." }); }
};
