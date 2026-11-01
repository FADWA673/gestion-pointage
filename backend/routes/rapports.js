const express = require('express');
const router = express.Router();
const Pointage = require('../models/Pointage');
const Conge = require('../models/Conge');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// GET /api/rapports/pointages — Rapport des pointages
router.get('/pointages', protect, adminOnly, async (req, res) => {
  try {
    const { date_debut, date_fin, employe_id, format } = req.query;

    let filtre = {};
    if (date_debut && date_fin) {
      filtre.date = { $gte: date_debut, $lte: date_fin };
    }
    if (employe_id) filtre.user_id = employe_id;

    const pointages = await Pointage.find(filtre)
      .populate('user_id', 'nom prenom email departement')
      .sort({ date: 1, heure: 1 });

    if (format === 'csv') {
      const csv = generatePointagesCSV(pointages);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=pointages.csv');
      return res.send(csv);
    }

    res.json(pointages);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

// GET /api/rapports/conges — Rapport des congés
router.get('/conges', protect, adminOnly, async (req, res) => {
  try {
    const { statut, type, employe_id, format } = req.query;

    let filtre = {};
    if (statut) filtre.statut = statut;
    if (type) filtre.type = type;
    if (employe_id) filtre.user_id = employe_id;

    const conges = await Conge.find(filtre)
      .populate('user_id', 'nom prenom email departement')
      .sort({ date_debut: -1 });

    if (format === 'csv') {
      const csv = generateCongesCSV(conges);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=conges.csv');
      return res.send(csv);
    }

    res.json(conges);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

// GET /api/rapports/anomalies — Rapport des anomalies
router.get('/anomalies', protect, adminOnly, async (req, res) => {
  try {
    const { date_debut, date_fin } = req.query;

    // Détecter les retards, absences, départs anticipés
    const employes = await User.find({ role: 'employe', actif: true });
    const anomalies = [];

    for (const employe of employes) {
      const pointages = await Pointage.find({
        user_id: employe._id,
        date: date_debut && date_fin ? { $gte: date_debut, $lte: date_fin } : { $exists: true }
      }).sort({ date: 1, heure: 1 });

      // Grouper par date
      const parDate = {};
      pointages.forEach(p => {
        if (!parDate[p.date]) parDate[p.date] = [];
        parDate[p.date].push(p);
      });

      for (const [date, pts] of Object.entries(parDate)) {
        const entree = pts.find(p => p.type === 'entree');
        const sortie = pts.find(p => p.type === 'sortie');

        // Retard
        if (entree && employe.heure_debut) {
          const [hDebut, mDebut] = employe.heure_debut.split(':').map(Number);
          const [hEntree, mEntree] = entree.heure.split(':').map(Number);
          const minutesDebut = hDebut * 60 + mDebut;
          const minutesEntree = hEntree * 60 + mEntree;
          
          if (minutesEntree > minutesDebut + 15) { // Tolérance 15 min
            anomalies.push({
              type: 'retard',
              employe: { id: employe._id, nom: employe.nom, prenom: employe.prenom },
              date,
              heure_entree: entree.heure,
              heure_prevue: employe.heure_debut,
              minutes_retard: minutesEntree - minutesDebut
            });
          }
        }

        // Départ anticipé
        if (sortie && employe.heure_fin) {
          const [hFin, mFin] = employe.heure_fin.split(':').map(Number);
          const [hSortie, mSortie] = sortie.heure.split(':').map(Number);
          const minutesFin = hFin * 60 + mFin;
          const minutesSortie = hSortie * 60 + mSortie;
          
          if (minutesSortie < minutesFin - 15) {
            anomalies.push({
              type: 'depart_anticipe',
              employe: { id: employe._id, nom: employe.nom, prenom: employe.prenom },
              date,
              heure_sortie: sortie.heure,
              heure_prevue: employe.heure_fin,
              minutes_avance: minutesFin - minutesSortie
            });
          }
        }
      }

      // Absence (jours sans pointage)
      // Simplifié - dans un vrai système, il faudrait vérifier les jours ouvrables
    }

    res.json(anomalies);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

// GET /api/rapports/heures-travaillees — Heures travaillées par employé
router.get('/heures-travaillees', protect, adminOnly, async (req, res) => {
  try {
    const { date_debut, date_fin, employe_id } = req.query;

    let matchUser = { role: 'employe' };
    if (employe_id) matchUser._id = employe_id;

    const employes = await User.find(matchUser);
    const resultats = [];

    for (const employe of employes) {
      let filtre = { user_id: employe._id };
      if (date_debut && date_fin) {
        filtre.date = { $gte: date_debut, $lte: date_fin };
      }

      const pointages = await Pointage.find(filtre).sort({ date: 1, heure: 1 });
      
      let totalMinutes = 0;
      const parDate = {};
      
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

      resultats.push({
        employe: {
          id: employe._id,
          nom: employe.nom,
          prenom: employe.prenom,
          departement: employe.departement
        },
        heures_travaillees: Math.floor(totalMinutes / 60),
        minutes_restantes: totalMinutes % 60,
        total_minutes: totalMinutes,
        totalPointages: pointages.length
      });
    }

    res.json(resultats);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

// Fonction helper CSV pointages
function generatePointagesCSV(pointages) {
  let csv = 'Date,Heure,Type,Employé,Email,Département,Validé\n';
  pointages.forEach(p => {
    csv += `${p.date},${p.heure},${p.type},${p.user_id?.nom || 'N/A'} ${p.user_id?.prenom || ''},${p.user_id?.email || 'N/A'},${p.user_id?.departement || 'N/A'},${p.valide ? 'Oui' : 'Non'}\n`;
  });
  return csv;
}

// Fonction helper CSV congés
function generateCongesCSV(conges) {
  let csv = 'Employé,Email,Type,Date Début,Date Fin,Statut,Motif\n';
  conges.forEach(c => {
    csv += `${c.user_id?.nom || 'N/A'} ${c.user_id?.prenom || ''},${c.user_id?.email || 'N/A'},${c.type},${c.date_debut},${c.date_fin},${c.statut},"${(c.motif || '').replace(/"/g, '""')}"\n`;
  });
  return csv;
}

module.exports = router;
