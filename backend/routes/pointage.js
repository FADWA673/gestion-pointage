const express = require('express');
const router = express.Router();
const Pointage = require('../models/Pointage');
const { protect } = require('../middleware/authMiddleware');

// POST /api/pointage — Enregistrer un pointage
router.post('/', protect, async (req, res) => {
  try {
    const { type, latitude, longitude } = req.body;

    const now = new Date();
    const date = now.toISOString().split('T')[0]; // "2026-05-06"
    const heure = now.toTimeString().split(' ')[0].substring(0, 5); // "08:30"

    const pointage = await Pointage.create({
      user_id: req.user.id,
      date,
      heure,
      type,
      latitude,
      longitude
    });

    res.status(201).json({ message: 'Pointage enregistré', pointage });

  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

// GET /api/pointage — Voir ses pointages (employé) ou tous (admin)
router.get('/', protect, async (req, res) => {
  try {
    const { date, employe_id } = req.query;
    let filtre = {};

    // Si c'est un employé, il ne voit que les siens
    if (req.user.role === 'employe') {
      filtre.user_id = req.user.id;
    }

    // Filtre optionnel par date
    if (date) filtre.date = date;

    // Filtre optionnel par employé (admin seulement)
    if (employe_id && req.user.role === 'admin') {
      filtre.user_id = employe_id;
    }

    const pointages = await Pointage.find(filtre)
      .populate('user_id', 'nom prenom email') // remplace l'ID par le nom et email
      .sort({ date: -1, heure: -1 });   // du plus récent au plus ancien

    res.json(pointages);

  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

module.exports = router;