const express = require('express');
const router = express.Router();
const Departement = require('../models/Departement');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// GET /api/departements
router.get('/', protect, async (req, res) => {
  try {
    const deps = await Departement.find().sort({ nom: 1 });
    res.json(deps);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

// POST /api/departements
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { nom, description } = req.body;
    const existe = await Departement.findOne({ nom: nom.trim() });
    if (existe) return res.status(400).json({ message: 'Ce département existe déjà' });
    const dep = await Departement.create({ nom: nom.trim(), description });
    res.status(201).json(dep);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

// PUT /api/departements/:id
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { nom, description } = req.body;
    const dep = await Departement.findByIdAndUpdate(
      req.params.id,
      { nom: nom.trim(), description },
      { new: true, runValidators: true }
    );
    if (!dep) return res.status(404).json({ message: 'Département non trouvé' });
    res.json(dep);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

// DELETE /api/departements/:id
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const dep = await Departement.findByIdAndDelete(req.params.id);
    if (!dep) return res.status(404).json({ message: 'Département non trouvé' });
    res.json({ message: 'Département supprimé' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

// POST /api/departements/:id/postes
router.post('/:id/postes', protect, adminOnly, async (req, res) => {
  try {
    const { nom, heure_debut, heure_fin } = req.body;
    const dep = await Departement.findById(req.params.id);
    if (!dep) return res.status(404).json({ message: 'Département non trouvé' });
    const existe = dep.postes.find(p => p.nom.toLowerCase() === nom.toLowerCase());
    if (existe) return res.status(400).json({ message: 'Ce poste existe déjà dans ce département' });
    dep.postes.push({ nom: nom.trim(), heure_debut: heure_debut || '08:00', heure_fin: heure_fin || '17:00' });
    await dep.save();
    res.status(201).json(dep);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

// PUT /api/departements/:id/postes/:posteId
router.put('/:id/postes/:posteId', protect, adminOnly, async (req, res) => {
  try {
    const { nom, heure_debut, heure_fin } = req.body;
    const dep = await Departement.findById(req.params.id);
    if (!dep) return res.status(404).json({ message: 'Département non trouvé' });
    const poste = dep.postes.id(req.params.posteId);
    if (!poste) return res.status(404).json({ message: 'Poste non trouvé' });
    poste.nom = nom.trim();
    poste.heure_debut = heure_debut || poste.heure_debut;
    poste.heure_fin = heure_fin || poste.heure_fin;
    await dep.save();
    res.json(dep);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

// DELETE /api/departements/:id/postes/:posteId
router.delete('/:id/postes/:posteId', protect, adminOnly, async (req, res) => {
  try {
    const dep = await Departement.findById(req.params.id);
    if (!dep) return res.status(404).json({ message: 'Département non trouvé' });
    dep.postes = dep.postes.filter(p => p._id.toString() !== req.params.posteId);
    await dep.save();
    res.json(dep);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

module.exports = router;
