const mongoose = require('mongoose');

const qrSessionSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true
  },
  qr_value: {
    type: String
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  expires_at: {
    type: Date,
    required: true
  },
  used_by: [{
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    used_at: { type: Date, default: Date.now }
  }],
  actif: {
    type: Boolean,
    default: true
  },
  duree_minutes: {
    type: Number,
    default: 5
  },
  auto_rotate: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('QRSession', qrSessionSchema);
