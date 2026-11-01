const mongoose = require('mongoose');

const congeSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date_debut: {
    type: String,
    required: true
  },
  date_fin: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['annuel', 'maladie', 'exceptionnel'],
    required: true
  },
  statut: {
    type: String,
    enum: ['en_attente', 'valide', 'refuse'],
    default: 'en_attente'
  },
  motif: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Conge', congeSchema);