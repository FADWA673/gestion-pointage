const express = require('express');
const router = express.Router();
const QRSession = require('../models/QRSession');
const Pointage = require('../models/Pointage');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const crypto = require('crypto');

// Calcul distance GPS (mètres) — formule Haversine
const calculerDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ/2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// POST /api/qr/generate — Générer un QR code (admin)
router.post('/generate', protect, adminOnly, async (req, res) => {
  try {
    const { duree_minutes = 5, auto_rotate = false } = req.body;

    // Invalider tous les QR actifs précédents
    await QRSession.updateMany({ actif: true }, { actif: false });

    const code = crypto.randomBytes(20).toString('hex');
    const expires_at = new Date(Date.now() + duree_minutes * 60 * 1000);

    // Utilise l'URL ngrok si disponible via le header, sinon FRONTEND_URL, sinon IP locale
    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    const proto = req.headers['x-forwarded-proto'] || 'http';
    const frontendUrl = process.env.FRONTEND_URL || `${proto}://${host.replace(':5000', ':3000')}`;
    const qrValue = `${frontendUrl}/scan?code=${code}`;

    const qrSession = await QRSession.create({
      code,
      qr_value: qrValue,
      created_by: req.user.id,
      expires_at,
      auto_rotate,
      duree_minutes
    });

    res.status(201).json({
      message: 'QR code généré',
      qr: {
        id: qrSession._id,
        code: qrSession.code,
        qr_value: qrValue,
        expires_at: qrSession.expires_at,
        duree_minutes
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

// POST /api/qr/rotate — Rotation manuelle du QR code actif (admin)
router.post('/rotate', protect, adminOnly, async (req, res) => {
  try {
    const current = await QRSession.findOne({ actif: true });
    const duree = current?.duree_minutes || 5;

    await QRSession.updateMany({ actif: true }, { actif: false });

    const code = crypto.randomBytes(20).toString('hex');
    const expires_at = new Date(Date.now() + duree * 60 * 1000);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const qrValue = `${frontendUrl}/scan?code=${code}`;

    const qrSession = await QRSession.create({
      code,
      qr_value: qrValue,
      created_by: req.user.id,
      expires_at,
      duree_minutes: duree
    });

    res.status(201).json({
      message: 'QR code renouvelé',
      qr: { id: qrSession._id, code: qrSession.code, qr_value: qrValue, expires_at: qrSession.expires_at }
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

// GET /api/qr/active — QR code actif (admin)
router.get('/active', protect, adminOnly, async (req, res) => {
  try {
    const qr = await QRSession.findOne({
      actif: true,
      expires_at: { $gt: new Date() }
    }).populate('created_by', 'nom email').populate('used_by.user_id', 'nom email');

    if (!qr) return res.status(404).json({ message: 'Aucun QR code actif' });

    res.json(qr);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

  // POST /api/qr/scan — Scanner un QR code (employé)
router.post('/scan', protect, async (req, res) => {
  try {
    const { code, latitude, longitude, type } = req.body;

    // Vérifier le QR code en premier
    const qrSession = await QRSession.findOne({ code, actif: true });
    if (!qrSession) {
      return res.status(400).json({ message: 'QR code invalide ou expiré' });
    }

    if (new Date() > qrSession.expires_at) {
      qrSession.actif = false;
      await qrSession.save();
      return res.status(400).json({ message: 'QR code expiré — demandez-en un nouveau' });
    }

    // Anti-fraude : vérifier selon le type demandé
    const pointagesExistants = await Pointage.find({
      user_id: req.user.id,
      qr_session_id: qrSession._id
    });

    const dejaEntree = pointagesExistants.find(p => p.type === 'entree');
    const dejaSortie = pointagesExistants.find(p => p.type === 'sortie');

    if (type === 'entree' && dejaEntree) {
      return res.status(400).json({ message: 'Vous avez déjà pointé votre entrée avec ce QR code' });
    }
    if (type === 'sortie' && dejaSortie) {
      return res.status(400).json({ message: 'Vous avez déjà pointé votre sortie avec ce QR code' });
    }
    if (type === 'sortie' && !dejaEntree) {
      return res.status(400).json({ message: 'Vous devez d\'abord pointer votre entrée' });
    }

    // Vérification GPS si zone configurée
    const employe = await User.findById(req.user.id);
    let gpsValide = true;
    let distanceMetres = null;

    if (latitude && longitude && employe.zone_autorisee?.latitude) {
      distanceMetres = Math.round(calculerDistance(
        latitude, longitude,
        employe.zone_autorisee.latitude,
        employe.zone_autorisee.longitude
      ));
      const rayon = employe.zone_autorisee.rayon_metres || 100;
      gpsValide = distanceMetres <= rayon;

      if (!gpsValide) {
        return res.status(400).json({
          message: `Hors zone autorisée — vous êtes à ${distanceMetres}m (max ${rayon}m)`,
          distance: distanceMetres
        });
      }
    }

    // Enregistrer le pointage
    const now = new Date();
    const pointage = await Pointage.create({
      user_id: req.user.id,
      date: now.toISOString().split('T')[0],
      heure: now.toTimeString().substring(0, 5),
      type: type || 'entree',
      latitude: latitude || null,
      longitude: longitude || null,
      valide: gpsValide,
      methode: 'qr',
      qr_session_id: qrSession._id
    });

    qrSession.used_by.push({ user_id: req.user.id });
    await qrSession.save();

    res.status(201).json({
      message: `Pointage ${type === 'sortie' ? 'sortie' : 'entrée'} enregistré`,
      pointage,
      distance: distanceMetres
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

// GET /api/qr/history — Historique (admin)
router.get('/history', protect, adminOnly, async (req, res) => {
  try {
    const sessions = await QRSession.find()
      .populate('created_by', 'nom email')
      .populate('used_by.user_id', 'nom email')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

// DELETE /api/qr/:id — Invalider un QR code
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const qr = await QRSession.findByIdAndUpdate(req.params.id, { actif: false }, { new: true });
    if (!qr) return res.status(404).json({ message: 'QR code non trouvé' });
    res.json({ message: 'QR code invalidé' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

module.exports = router;
