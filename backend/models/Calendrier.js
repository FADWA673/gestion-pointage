const mongoose = require('mongoose');

// Un jour planifié pour un employé
const jourSchema = new mongoose.Schema({
  date: { type: String, required: true }, // "2026-06-17"
  heure_debut: { type: String, required: true }, // "08:00"
  heure_fin: { type: String, required: true },   // "17:00"
  statut: {
    type: String,
    enum: ['planifie', 'present', 'absent', 'retard', 'conge'],
    default: 'planifie'
  }
});

const calendrierSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  jours: [jourSchema]
}, { timestamps: true });

// Un seul calendrier par employé
calendrierSchema.index({ user_id: 1 }, { unique: true });

module.exports = mongoose.model('Calendrier', calendrierSchema);
