const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const bcrypt = require('bcryptjs');

// GET /api/employes — Liste tous les employés (admin)
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const { search, departement, actif } = req.query;
    let filtre = { role: 'employe' };

    if (search) {
      filtre.$or = [
        { nom: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (departement) filtre.departement = departement;
    if (actif !== undefined) filtre.actif = actif === 'true';

    const employes = await User.find(filtre)
      .select('-password')
      .sort({ createdAt: -1 });

    res.json(employes);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

// GET /api/employes/:id — Détails d'un employé
router.get('/:id', protect, async (req, res) => {
  try {
    // Un employé ne peut voir que son propre profil, ou admin peut voir tous
    if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    const employe = await User.findById(req.params.id).select('-password');
    if (!employe) {
      return res.status(404).json({ message: 'Employé non trouvé' });
    }
    res.json(employe);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

// POST /api/employes — Ajouter un employé (admin)
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { nom, prenom, email, password, telephone, departement, poste, 
            zone_autorisee, heure_debut, heure_fin } = req.body;

    const userExiste = await User.findOne({ email });
    if (userExiste) {
      return res.status(400).json({ message: 'Email déjà utilisé' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordChiffre = await bcrypt.hash(password || 'password123', salt);

    const newEmploye = await User.create({
      nom,
      prenom,
      email,
      password: passwordChiffre,
      telephone,
      departement,
      poste,
      role: 'employe',
      zone_autorisee,
      heure_debut,
      heure_fin
    });

    res.status(201).json({
      message: 'Employé créé avec succès',
      employe: {
        id: newEmploye._id,
        nom: newEmploye.nom,
        email: newEmploye.email
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

// PUT /api/employes/:id — Modifier un employé (admin)
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { nom, prenom, email, telephone, departement, poste, 
            zone_autorisee, heure_debut, heure_fin, actif, password } = req.body;

    const updateData = { nom, prenom, email, telephone, departement, poste, 
                         zone_autorisee, heure_debut, heure_fin, actif };

    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    // Supprimer les champs undefined
    Object.keys(updateData).forEach(key => 
      updateData[key] === undefined && delete updateData[key]
    );

    const employe = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!employe) {
      return res.status(404).json({ message: 'Employé non trouvé' });
    }

    res.json({ message: 'Employé mis à jour', employe });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

// DELETE /api/employes/:id — Supprimer un employé (admin)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const employe = await User.findByIdAndDelete(req.params.id);
    if (!employe) {
      return res.status(404).json({ message: 'Employé non trouvé' });
    }
    res.json({ message: 'Employé supprimé' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

// PUT /api/employes/:id/zone — Définir la zone GPS autorisée
router.put('/:id/zone', protect, adminOnly, async (req, res) => {
  try {
    const { latitude, longitude, rayon_metres } = req.body;

    const employe = await User.findByIdAndUpdate(
      req.params.id,
      { zone_autorisee: { latitude, longitude, rayon_metres: rayon_metres || 100 } },
      { new: true }
    ).select('-password');

    if (!employe) {
      return res.status(404).json({ message: 'Employé non trouvé' });
    }

    res.json({ message: 'Zone GPS mise à jour', employe });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

module.exports = router;
