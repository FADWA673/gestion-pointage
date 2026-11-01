const express = require('express');
const router = express.Router();
const Calendrier = require('../models/Calendrier');
const Pointage = require('../models/Pointage');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// GET /api/calendrier/employe/:userId — Calendrier d'un employé (admin ou lui-même)
router.get('/employe/:userId', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.id !== req.params.userId) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }
    let cal = await Calendrier.findOne({ user_id: req.params.userId });
    if (!cal) cal = { user_id: req.params.userId, jours: [] };
    res.json(cal);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

// GET /api/calendrier/mon-calendrier — Mon propre calendrier (employé)
router.get('/mon-calendrier', protect, async (req, res) => {
  try {
    let cal = await Calendrier.findOne({ user_id: req.user.id });
    if (!cal) cal = { user_id: req.user.id, jours: [] };
    res.json(cal);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

// POST /api/calendrier/employe/:userId/jours — Ajouter des jours planifiés (admin)
router.post('/employe/:userId/jours', protect, adminOnly, async (req, res) => {
  try {
    const { jours } = req.body; // [{ date, heure_debut, heure_fin }]

    let cal = await Calendrier.findOne({ user_id: req.params.userId });
    if (!cal) {
      cal = new Calendrier({ user_id: req.params.userId, jours: [] });
    }

    for (const jour of jours) {
      const existe = cal.jours.find(j => j.date === jour.date);
      if (existe) {
        existe.heure_debut = jour.heure_debut;
        existe.heure_fin = jour.heure_fin;
        existe.statut = 'planifie';
      } else {
        cal.jours.push({ date: jour.date, heure_debut: jour.heure_debut, heure_fin: jour.heure_fin });
      }
    }

    await cal.save();
    res.json(cal);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

// DELETE /api/calendrier/employe/:userId/jours/:date — Supprimer un jour planifié
router.delete('/employe/:userId/jours/:date', protect, adminOnly, async (req, res) => {
  try {
    const cal = await Calendrier.findOne({ user_id: req.params.userId });
    if (!cal) return res.status(404).json({ message: 'Calendrier non trouvé' });
    cal.jours = cal.jours.filter(j => j.date !== req.params.date);
    await cal.save();
    res.json(cal);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

// POST /api/calendrier/sync — Synchroniser les statuts selon les pointages réels
router.post('/sync', protect, adminOnly, async (req, res) => {
  try {
    const calendriers = await Calendrier.find();
    const today = new Date().toISOString().split('T')[0];

    for (const cal of calendriers) {
      const employe = await User.findById(cal.user_id);
      if (!employe) continue;

      for (const jour of cal.jours) {
        // Ne pas modifier les jours futurs
        if (jour.date > today) continue;

        const pointages = await Pointage.find({
          user_id: cal.user_id,
          date: jour.date
        }).sort({ heure: 1 });

        const entree = pointages.find(p => p.type === 'entree');

        if (!entree) {
          // Vérifie si congé validé ce jour
          const Conge = require('../models/Conge');
          const conge = await Conge.findOne({
            user_id: cal.user_id,
            statut: 'valide',
            date_debut: { $lte: jour.date },
            date_fin: { $gte: jour.date }
          });
          jour.statut = conge ? 'conge' : 'absent';
        } else {
          // Calcul retard
          const [hD, mD] = jour.heure_debut.split(':').map(Number);
          const [hE, mE] = entree.heure.split(':').map(Number);
          const retard = (hE * 60 + mE) - (hD * 60 + mD);
          jour.statut = retard > 15 ? 'retard' : 'present';
        }
      }
      await cal.save();
    }

    res.json({ message: 'Calendriers synchronisés' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

// GET /api/calendrier/absences-today — Absences du jour (admin)
router.get('/absences-today', protect, adminOnly, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const calendriers = await Calendrier.find().populate('user_id', 'nom prenom departement poste');

    const absents = [];
    const retards = [];

    for (const cal of calendriers) {
      const jourAujourdhui = cal.jours.find(j => j.date === today);
      if (!jourAujourdhui) continue;

      const pointages = await Pointage.find({ user_id: cal.user_id, date: today });
      const entree = pointages.find(p => p.type === 'entree');

      if (!entree) {
        absents.push({
          employe: cal.user_id,
          date: today,
          heure_prevue: jourAujourdhui.heure_debut
        });
      } else {
        const [hD, mD] = jourAujourdhui.heure_debut.split(':').map(Number);
        const [hE, mE] = entree.heure.split(':').map(Number);
        const minutesRetard = (hE * 60 + mE) - (hD * 60 + mD);
        if (minutesRetard > 15) {
          retards.push({
            employe: cal.user_id,
            date: today,
            heure_entree: entree.heure,
            heure_prevue: jourAujourdhui.heure_debut,
            minutes_retard: minutesRetard
          });
        }
      }
    }

    res.json({ absents, retards, date: today });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

module.exports = router;
