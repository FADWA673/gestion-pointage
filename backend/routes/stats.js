const express = require('express');
const router = express.Router();
const Pointage = require('../models/Pointage');
const Conge = require('../models/Conge');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// GET /api/stats — Statistiques pour le dashboard admin
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const totalEmployes = await User.countDocuments({ role: 'employe', actif: true });
    const totalPointages = await Pointage.countDocuments();
    const congesEnAttente = await Conge.countDocuments({ statut: 'en_attente' });

    const aujourd_hui = new Date().toISOString().split('T')[0];
    const presentsAujourdhui = await Pointage.distinct('user_id', {
      date: aujourd_hui,
      type: 'entree'
    });

    const absentsAujourdhui = totalEmployes - presentsAujourdhui.length;

    res.json({
      totalEmployes,
      totalPointages,
      congesEnAttente,
      presentsAujourdhui: presentsAujourdhui.length,
      absentsAujourdhui,
      tauxPresence: totalEmployes > 0 ? ((presentsAujourdhui.length / totalEmployes) * 100).toFixed(1) : 0
    });

  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

// GET /api/stats/daily — Statistiques journalières
router.get('/daily', protect, adminOnly, async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const entrees = await Pointage.countDocuments({ date: targetDate, type: 'entree' });
    const sorties = await Pointage.countDocuments({ date: targetDate, type: 'sortie' });
    
    const presents = await Pointage.distinct('user_id', { date: targetDate, type: 'entree' });
    const totalEmployes = await User.countDocuments({ role: 'employe', actif: true });

    // Retards
    const employes = await User.find({ role: 'employe', actif: true });
    let retards = 0;
    
    for (const emp of employes) {
      if (!emp.heure_debut) continue;
      const pointage = await Pointage.findOne({ 
        user_id: emp._id, 
        date: targetDate, 
        type: 'entree' 
      });
      
      if (pointage) {
        const [hDebut, mDebut] = emp.heure_debut.split(':').map(Number);
        const [hEntree, mEntree] = pointage.heure.split(':').map(Number);
        if (hEntree * 60 + mEntree > hDebut * 60 + mDebut + 15) {
          retards++;
        }
      }
    }

    res.json({
      date: targetDate,
      entrees,
      sorties,
      presents: presents.length,
      absents: totalEmployes - presents.length,
      retards,
      tauxPresence: totalEmployes > 0 ? ((presents.length / totalEmployes) * 100).toFixed(1) : 0
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

// GET /api/stats/monthly — Statistiques mensuelles
router.get('/monthly', protect, adminOnly, async (req, res) => {
  try {
    const { mois, annee } = req.query;
    const now = new Date();
    const targetMois = mois || (now.getMonth() + 1);
    const targetAnnee = annee || now.getFullYear();

    const debutMois = `${targetAnnee}-${String(targetMois).padStart(2, '0')}-01`;
    const finMois = `${targetAnnee}-${String(targetMois).padStart(2, '0')}-31`;

    const pointages = await Pointage.find({
      date: { $gte: debutMois, $lte: finMois }
    });

    const parDate = {};
    pointages.forEach(p => {
      if (!parDate[p.date]) parDate[p.date] = { entrees: 0, sorties: 0 };
      if (p.type === 'entree') parDate[p.date].entrees++;
      else parDate[p.date].sorties++;
    });

    const totalPointages = pointages.length;
    const totalJours = Object.keys(parDate).length;
    
    const employesUniques = [...new Set(pointages.map(p => p.user_id.toString()))];
    const totalEmployes = await User.countDocuments({ role: 'employe', actif: true });

    const congesValides = await Conge.countDocuments({
      statut: 'valide',
      date_debut: { $gte: debutMois, $lte: finMois }
    });

    res.json({
      mois: targetMois,
      annee: targetAnnee,
      totalPointages,
      totalJours,
      employesActifs: employesUniques.length,
      totalEmployes,
      congesValides,
      detailsParDate: parDate
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

// GET /api/stats/employe/:id — Stats par employé
router.get('/employe/:id', protect, async (req, res) => {
  try {
    // Un employé ne peut voir que ses stats, admin peut voir tous
    if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    const { date_debut, date_fin } = req.query;
    let filtre = { user_id: req.params.id };
    
    if (date_debut && date_fin) {
      filtre.date = { $gte: date_debut, $lte: date_fin };
    }

    const pointages = await Pointage.find(filtre).sort({ date: 1, heure: 1 });
    const conges = await Conge.find({ user_id: req.params.id });
    const employe = await User.findById(req.params.id).select('-password');

    // Calculer les heures travaillées
    const parDate = {};
    let totalMinutes = 0;

    pointages.forEach(p => {
      if (!parDate[p.date]) parDate[p.date] = [];
      parDate[p.date].push(p);
    });

    for (const [date, pts] of Object.entries(parDate)) {
      const entree = pts.find(p => p.type === 'entree');
      const sortie = pts.find(p => p.type === 'sortie');
      
      if (entree && sortie) {
        const [hE, mE] = entree.heure.split(':').map(Number);
        const [hS, mS] = sortie.heure.split(':').map(Number);
        totalMinutes += (hS * 60 + mS) - (hE * 60 + mE);
      }
    }

    res.json({
      employe,
      totalPointages: pointages.length,
      totalEntrees: pointages.filter(p => p.type === 'entree').length,
      totalSorties: pointages.filter(p => p.type === 'sortie').length,
      heuresTravaillees: Math.floor(totalMinutes / 60),
      minutesRestantes: totalMinutes % 60,
      totalConges: conges.length,
      congesValides: conges.filter(c => c.statut === 'valide').length,
      congesEnAttente: conges.filter(c => c.statut === 'en_attente').length
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

module.exports = router;