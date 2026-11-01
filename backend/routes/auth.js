const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

// POST /api/auth/register — Créer un compte
router.post('/register', async (req, res) => {
  try {
    const { nom, email, password, role } = req.body;

    const userExiste = await User.findOne({ email });
    if (userExiste) {
      return res.status(400).json({ message: 'Email déjà utilisé' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordChiffre = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      nom,
      email,
      password: passwordChiffre,
      role: role || 'employe'
    });

    res.status(201).json({
      message: 'Compte créé avec succès',
      user: {
        id: newUser._id,
        nom: newUser.nom,
        email: newUser.email,
        role: newUser.role
      }
    });

  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

// POST /api/auth/login — Se connecter
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Email ou mot de passe incorrect' });
    }

    if (!user.actif) {
      return res.status(400).json({ message: 'Compte désactivé. Contactez l\'administrateur.' });
    }

    const passwordCorrect = await bcrypt.compare(password, user.password);
    if (!passwordCorrect) {
      return res.status(400).json({ message: 'Email ou mot de passe incorrect' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, nom: user.nom },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Connexion réussie',
      token,
      user: {
        id: user._id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role,
        departement: user.departement
      }
    });

  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

// GET /api/auth/me — Obtenir mon profil
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

// PUT /api/auth/me — Mettre à jour mon profil
router.put('/me', protect, async (req, res) => {
  try {
    const { nom, prenom, telephone } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { nom, prenom, telephone },
      { new: true }
    ).select('-password');

    res.json({ message: 'Profil mis à jour', user });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

// PUT /api/auth/password — Changer le mot de passe
router.put('/password', protect, async (req, res) => {
  try {
    const { ancien_password, nouveau_password } = req.body;

    const user = await User.findById(req.user.id);
    
    const passwordCorrect = await bcrypt.compare(ancien_password, user.password);
    if (!passwordCorrect) {
      return res.status(400).json({ message: 'Ancien mot de passe incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(nouveau_password, salt);
    await user.save();

    res.json({ message: 'Mot de passe changé avec succès' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

module.exports = router;