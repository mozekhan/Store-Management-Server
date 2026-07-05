// const mongoose = require('mongoose');
// const bcrypt = require('bcryptjs');

// const userSchema = new mongoose.Schema({
//   firstName: {
//     type: String,
//     required: true,
//     trim: true
//   },
//   lastName: {
//     type: String,
//     required: true,
//     trim: true
//   },
//   email: {
//     type: String,
//     required: true,
//     unique: true,
//     lowercase: true,
//     trim: true
//   },
//   password: {
//     type: String,
//     required: true,
//     minlength: 6
//   },
//   phone: {
//     type: String,
//     required: true
//   },
//   role: {
//     type: String,
//     enum: [
//       'SUPER_ADMIN',
//       'ADMIN',
//       'SALES_MANAGER',
//       'SALES_ATTENDANT',
//       'FINANCE_MANAGER',
//       'FINANCE_CASHIER',
//       'WAREHOUSE_MANAGER',
//       'WAREHOUSE_STAFF'
//     ],
//     required: true
//   },
//   storeId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Store',
//     required: true
//   },
//   permissions: [{
//     type: String,
//     enum: [
//       'transaction:create',
//       'transaction:read:own',
//       'transaction:read:all',
//       'payment:process',
//       'payment:refund',
//       'inventory:read',
//       'inventory:adjust',
//       'inventory:release',
//       'user:create',
//       'user:update',
//       'audit:read',
//       'report:generate',
//       'store:manage'
//     ]
//   }],
//   isActive: {
//     type: Boolean,
//     default: true
//   },
//   twoFactorEnabled: {
//     type: Boolean,
//     default: false
//   },
//   twoFactorSecret: String,
//   lastLogin: Date,
//   refreshToken: String,
//   createdAt: {
//     type: Date,
//     default: Date.now
//   },
//   updatedAt: {
//     type: Date,
//     default: Date.now
//   }
// }, {
//   timestamps: true
// });

// userSchema.pre('save', async function() {
//   if (!this.isModified('password')) return;

//   this.password = await bcrypt.hash(this.password, 10);
// });

// userSchema.methods.comparePassword = async function(candidatePassword) {
//   return await bcrypt.compare(candidatePassword, this.password);
// };

// userSchema.methods.hasPermission = function(permission) {
//   if (this.role === 'SUPER_ADMIN') return true;
//   return this.permissions.includes(permission);
// };

// module.exports = mongoose.model('User', userSchema);























const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  phone: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: [
      'SUPER_ADMIN',
      'ADMIN',
      'SALES_MANAGER',
      'SALES_ATTENDANT',
      'FINANCE_MANAGER',
      'FINANCE_CASHIER',
      'WAREHOUSE_MANAGER',
      'WAREHOUSE_STAFF'
    ],
    required: true
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: function() {
      // Super admin doesn't require a specific store
      return this.role !== 'SUPER_ADMIN';
    }
  },
  // Track which store the user is currently working in (for multi-store access)
  currentStoreId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store'
  },
  // Store assignments for users who can access multiple stores (super admin)
  assignedStores: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store'
  }],
  permissions: [{
    type: String,
    enum: [
      'transaction:create',
      'transaction:read:own',
      'transaction:read:all',
      'payment:process',
      'payment:refund',
      'inventory:read',
      'inventory:adjust',
      'inventory:release',
      'user:create',
      'user:update',
      'audit:read',
      'report:generate',
      'store:manage',
      'store:switch',
      'store:view:all'
    ]
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: String,
  lastLogin: Date,
  refreshToken: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;

  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.hasPermission = function(permission) {
  if (this.role === 'SUPER_ADMIN') return true;
  return this.permissions.includes(permission);
};

// Check if user has access to a specific store
userSchema.methods.hasStoreAccess = function(storeId) {
  if (this.role === 'SUPER_ADMIN') return true;
  if (this.storeId && this.storeId.toString() === storeId.toString()) return true;
  if (this.assignedStores && this.assignedStores.some(s => s.toString() === storeId.toString())) return true;
  return false;
};

// Get all stores the user has access to
userSchema.methods.getAccessibleStores = function() {
  if (this.role === 'SUPER_ADMIN') {
    // Return all stores for super admin (will be populated by service)
    return null; // Will be handled by service
  }
  const storeIds = [];
  if (this.storeId) storeIds.push(this.storeId);
  if (this.assignedStores) storeIds.push(...this.assignedStores);
  return storeIds;
};

module.exports = mongoose.model('User', userSchema);