const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },
  phone: String,
  email: String,
  taxRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  currency: {
    type: String,
    default: 'USD'
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
  receiptFooter: String,
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Store', storeSchema);