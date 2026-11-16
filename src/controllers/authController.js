const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// INSCRIPTION
const register = async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            email,
            phone,
            password
        } = req.body;

        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({
                message: "Veuillez remplir tous les champs obligatoires"
            });
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || String(password).length < 8) {
            return res.status(400).json({ message: "Email invalide ou mot de passe trop court (8 caractères minimum)." });
        }
        const existingUser = await User.findOne({ email: normalizedEmail });

        if (existingUser) {
            return res.status(400).json({
                message: "Cet email est déjà utilisé"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            firstName,
            lastName,
            email: normalizedEmail,
            phone,
            password: hashedPassword
        });

        res.status(201).json({
            message: "Utilisateur créé avec succès",
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        res.status(500).json({
            message: "Erreur lors de l'inscription",
            error: error.message
        });
    }
};


// CONNEXION
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email et mot de passe obligatoires"
            });
        }

        const user = await User.findOne({ email: String(email).trim().toLowerCase() });

        if (!user) {
            return res.status(401).json({
                message: "Email ou mot de passe incorrect"
            });
        }

        if (user.isActive === false) {
            return res.status(403).json({ message: "Ce compte est désactivé. Contactez l'administrateur." });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Email ou mot de passe incorrect"
            });
        }

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({ message: "Le serveur n'est pas configuré pour la connexion (JWT_SECRET manquant)." });
        }

        const token = jwt.sign(
            {
                id: user._id,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        res.json({
            message: "Connexion réussie",
            token,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        res.status(500).json({
            message: "Erreur lors de la connexion",
            error: error.message
        });
    }
};


module.exports = {
    register,
    login
};