const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  action: {
    type: String,
    required: true
  },
  details: {
    type: Object
  },
  ip_address: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);
