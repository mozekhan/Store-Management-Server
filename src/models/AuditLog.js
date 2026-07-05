const mongoose = require('mongoose');
const crypto = require('crypto');

const auditLogSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now
  },
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  actorRole: String,
  action: {
    type: String,
    enum: ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'PRINT', 'SCAN', 'APPROVE', 'REJECT'],
    required: true
  },
  resourceType: {
    type: String,
    enum: ['Transaction', 'Product', 'User', 'Payment', 'Inventory', 'Store'],
    required: true
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store'
  },
  details: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed,
    metadata: {
      ipAddress: String,
      userAgent: String,
      location: String,
      reason: String
    }
  },
  severity: {
    type: String,
    enum: ['INFO', 'WARNING', 'CRITICAL'],
    default: 'INFO'
  },
  tamperProofHash: {
    type: String,
  },
  previousHash: {
    type: String
  }
});

auditLogSchema.pre('save', async function() {
  const data = JSON.stringify({
    timestamp: this.timestamp,
    actorId: this.actorId,
    action: this.action,
    resourceId: this.resourceId,
    details: this.details
  });

  const hash = crypto.createHash('sha256');
  hash.update(data);

  if (this.previousHash) {
    hash.update(this.previousHash);
  }

  this.tamperProofHash = hash.digest('hex');
});

auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ actorId: 1, timestamp: -1 });
auditLogSchema.index({ resourceId: 1, resourceType: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);