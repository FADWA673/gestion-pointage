const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  titre: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['pointage', 'conge', 'alerte', 'info'],
    required: true
  },
  lu: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
