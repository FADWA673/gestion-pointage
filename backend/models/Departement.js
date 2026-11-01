const mongoose = require('mongoose');

const posteSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  heure_debut: { type: String, default: '08:00' },
  heure_fin: { type: String, default: '17:00' }
});

const departementSchema = new mongoose.Schema({
  nom: { type: String, required: true, unique: true, trim: true },
  description: { type: String },
  postes: [posteSchema]
}, { timestamps: true });

module.exports = mongoose.model('Departement', departementSchema);
