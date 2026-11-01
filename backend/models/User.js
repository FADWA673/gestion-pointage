const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: true
  },
  prenom: {
    type: String
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  telephone: {
    type: String
  },
  departement: {
    type: String
  },
  poste: {
    type: String
  },
  role: {
    type: String,
    enum: ['admin', 'employe'],
    default: 'employe'
  },
  actif: {
    type: Boolean,
    default: true
  },
  // Zone GPS autorisée pour le pointage
  zone_autorisee: {
    latitude: { type: Number },
    longitude: { type: Number },
    rayon_metres: { type: Number, default: 100 }
  },
  // Paramètres d'horaire
  heure_debut: {
    type: String,
    default: '08:00'
  },
  heure_fin: {
    type: String,
    default: '17:00'
  },
  // Photo de profil
  avatar: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);