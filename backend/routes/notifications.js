const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// GET /api/notifications
router.get('/', protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ user_id: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

// GET /api/notifications/unread-count
router.get('/unread-count', protect, async (req, res) => {
  try {
    const count = await Notification.countDocuments({ user_id: req.user.id, lu: false });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

// PUT /api/notifications/read-all — DOIT être avant /:id/read
router.put('/read-all', protect, async (req, res) => {
  try {
    await Notification.updateMany({ user_id: req.user.id, lu: false }, { lu: true });
    res.json({ message: 'Toutes les notifications marquées comme lues' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', protect, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user.id },
      { lu: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: 'Notification non trouvée' });
    res.json({ message: 'Notification marquée comme lue', notification });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

// POST /api/notifications/send (admin)
router.post('/send', protect, adminOnly, async (req, res) => {
  try {
    const { user_id, titre, message, type } = req.body;
    const notification = await Notification.create({ user_id, titre, message, type: type || 'info' });
    res.status(201).json({ message: 'Notification envoyée', notification });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

// POST /api/notifications/broadcast (admin)
router.post('/broadcast', protect, adminOnly, async (req, res) => {
  try {
    const { titre, message, type } = req.body;
    const User = require('../models/User');
    const employes = await User.find({ role: 'employe', actif: true }).select('_id');
    const notifications = await Notification.insertMany(
      employes.map(e => ({ user_id: e._id, titre, message, type: type || 'info' }))
    );
    res.status(201).json({ message: `Notification envoyée à ${notifications.length} employés` });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message });
  }
});

module.exports = router;
