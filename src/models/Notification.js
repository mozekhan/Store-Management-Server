const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  type: {
    type: String,
    enum: ['TRANSACTION', 'INVENTORY', 'PAYMENT', 'SYSTEM', 'REPORT'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
    default: 'MEDIUM'
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  delivered: {
    type: Boolean,
    default: false
  },
  deliveredAt: Date,
  pushSent: {
    type: Boolean,
    default: false
  },
  pushSentAt: Date,
  emailSent: {
    type: Boolean,
    default: false
  },
  emailSentAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

notificationSchema.index({ userId: 1, read: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ storeId: 1 });

module.exports = mongoose.model('Notification', notificationSchema);