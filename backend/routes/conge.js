const express = require('express');
const router = express.Router();
const Conge = require('../models/Conge');
const Notification = require('../models/Notification');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// POST /api/conge — Demander un congé (employé)
router.post('/', protect, async (req, res) => {
  try {
    const { date_debut, date_fin, type, motif } = req.body;

    const conge = await Conge.create({
      user_id: req.user.id,
      date_debut,
      date_fin,
      type,
      motif
    });

    // Notifier les admins
    const User = require('../models/User');
    const admins = await User.find({ role: 'admin' });
    await Notification.insertMany(admins.map(admin => ({
      user_id: admin._id,
      titre: 'Nouvelle demande de congé',
      message: `${req.user.nom} a demandé un congé ${type} du ${date_debut} au ${date_fin}`,
      type: 'conge'
    })));

    res.status(201).json({ message: 'Demande envoyée', conge });

  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

// GET /api/conge — Voir les congés
router.get('/', protect, async (req, res) => {
  try {
    let filtre = {};
    if (req.user.role === 'employe') {
      filtre.user_id = req.user.id;
    }

    const conges = await Conge.find(filtre)
      .populate('user_id', 'nom email')
      .sort({ createdAt: -1 });

    res.json(conges);

  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

// PUT /api/conge/:id — Valider ou refuser (admin seulement)
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { statut } = req.body;

    const conge = await Conge.findByIdAndUpdate(
      req.params.id,
      { statut },
      { new: true }
    ).populate('user_id');

    if (!conge) {
      return res.status(404).json({ message: 'Congé non trouvé' });
    }

    // Notifier l'employé
    await Notification.create({
      user_id: conge.user_id._id,
      titre: `Congé ${statut === 'valide' ? 'validé' : 'refusé'}`,
      message: `Votre demande de congé du ${conge.date_debut} au ${conge.date_fin} a été ${statut === 'valide' ? 'validée' : 'refusée'}`,
      type: 'conge'
    });

    res.json({ message: `Congé ${statut}`, conge });

  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

module.exports = router;