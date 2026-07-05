
// const User = require('../models/User');
// const Store = require('../models/Store');
// const AuditLog = require('../models/AuditLog');
// const SecurityConfig = require('../config/security');
// const { AppError } = require('../middleware/errorHandler');

// /**
//  * Create user
//  */
// exports.createUser = async (req, res) => {
//   try {
//     const {
//       firstName,
//       lastName,
//       email,
//       password,
//       phone,
//       role,
//       storeId,
//       permissions
//     } = req.body;

//     // Check if email already exists
//     const existingUser = await User.findOne({ email });
//     if (existingUser) {
//       return res.status(400).json({
//         success: false,
//         message: 'User with this email already exists'
//       });
//     }

//     // Validate password strength
//     const passwordValidation = SecurityConfig.validatePasswordStrength(password);
//     if (!passwordValidation.valid) {
//       return res.status(400).json({
//         success: false,
//         message: passwordValidation.message
//       });
//     }

//     // Check store exists
//     const store = await Store.findById(storeId);
//     if (!store) {
//       return res.status(404).json({
//         success: false,
//         message: 'Store not found'
//       });
//     }

//     // Check permission to create this role
//     if (req.user.role !== 'SUPER_ADMIN') {
//       const roleHierarchy = {
//         'ADMIN': ['SALES_MANAGER', 'SALES_ATTENDANT', 'FINANCE_MANAGER', 'FINANCE_CASHIER', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF'],
//         'SALES_MANAGER': ['SALES_ATTENDANT'],
//         'FINANCE_MANAGER': ['FINANCE_CASHIER'],
//         'WAREHOUSE_MANAGER': ['WAREHOUSE_STAFF']
//       };
      
//       const allowedRoles = roleHierarchy[req.user.role] || [];
//       if (!allowedRoles.includes(role) && req.user.role !== 'SUPER_ADMIN') {
//         return res.status(403).json({
//           success: false,
//           message: `You don't have permission to create users with role ${role}`
//         });
//       }
//     }

//     const user = new User({
//       firstName: SecurityConfig.sanitizeInput(firstName),
//       lastName: SecurityConfig.sanitizeInput(lastName),
//       email: email.toLowerCase(),
//       password,
//       phone: SecurityConfig.sanitizeInput(phone),
//       role,
//       storeId,
//       permissions: permissions || [],
//       isActive: true
//     });

//     await user.save();

//     // Log audit
//     await AuditLog.create({
//       actorId: req.user._id,
//       actorRole: req.user.role,
//       action: 'CREATE',
//       resourceType: 'User',
//       resourceId: user._id,
//       storeId: storeId,
//       details: {
//         after: {
//           firstName: user.firstName,
//           lastName: user.lastName,
//           email: user.email,
//           role: user.role,
//           storeId: user.storeId
//         },
//         metadata: {
//           ipAddress: req.ip,
//           userAgent: req.headers['user-agent']
//         }
//       },
//       severity: 'INFO'
//     });

//     const userResponse = user.toObject();
//     delete userResponse.password;
//     delete userResponse.refreshToken;

//     res.status(201).json({
//       success: true,
//       data: userResponse
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// /**
//  * Get users list
//  */
// exports.getUsers = async (req, res) => {
//   try {
//     const {
//       page = 1,
//       limit = 20,
//       role,
//       storeId,
//       isActive,
//       search
//     } = req.query;

//     const query = {};

//     if (req.user.role !== 'SUPER_ADMIN') {
//       query.storeId = req.user.storeId;
//       if (req.user.role !== 'ADMIN') {
//         query.role = { $ne: 'ADMIN' };
//       }
//     } else if (storeId) {
//       query.storeId = storeId;
//     }

//     if (role) query.role = role;
//     if (isActive !== undefined) query.isActive = isActive === 'true';

//     if (search) {
//       query.$or = [
//         { firstName: { $regex: search, $options: 'i' } },
//         { lastName: { $regex: search, $options: 'i' } },
//         { email: { $regex: search, $options: 'i' } }
//       ];
//     }

//     const skip = (parseInt(page) - 1) * parseInt(limit);

//     const [users, total] = await Promise.all([
//       User.find(query)
//         .populate('storeId', 'name code')
//         .select('-password -refreshToken')
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(parseInt(limit)),
//       User.countDocuments(query)
//     ]);

//     res.json({
//       success: true,
//       data: {
//         users,
//         pagination: {
//           page: parseInt(page),
//           limit: parseInt(limit),
//           total,
//           pages: Math.ceil(total / parseInt(limit))
//         }
//       }
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// /**
//  * Get user by ID
//  */
// exports.getUserById = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const user = await User.findById(id)
//       .populate('storeId', 'name code')
//       .select('-password -refreshToken');

//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: 'User not found'
//       });
//     }

//     // Check access
//     if (req.user.role !== 'SUPER_ADMIN') {
//       if (user.storeId._id.toString() !== req.user.storeId.toString()) {
//         return res.status(403).json({
//           success: false,
//           message: 'Access denied'
//         });
//       }
//       if (user.role === 'ADMIN' && req.user.role !== 'ADMIN') {
//         return res.status(403).json({
//           success: false,
//           message: 'Access denied'
//         });
//       }
//     }

//     res.json({
//       success: true,
//       data: user
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// /**
//  * Update user
//  */
// exports.updateUser = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const updates = req.body;

//     const user = await User.findById(id);
//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: 'User not found'
//       });
//     }

//     // Check access
//     if (req.user.role === 'ADMIN' && user.role === 'SUPER_ADMIN') {
//       return res.status(403).json({
//         success: false,
//         message: 'Cannot modify super admin'
//       });
//     }

//     if (req.user.role !== 'SUPER_ADMIN') {
//       if (user.storeId.toString() !== req.user.storeId.toString()) {
//         return res.status(403).json({
//           success: false,
//           message: 'Access denied'
//         });
//       }
//       if (user.role === 'ADMIN' && req.user.role !== 'ADMIN') {
//         return res.status(403).json({
//           success: false,
//           message: 'Access denied'
//         });
//       }
//     }

//     const before = user.toObject();

//     const allowedUpdates = ['firstName', 'lastName', 'phone', 'isActive', 'permissions'];
//     allowedUpdates.forEach(field => {
//       if (updates[field] !== undefined) {
//         user[field] = SecurityConfig.sanitizeInput(updates[field]);
//       }
//     });

//     if (req.user.role === 'SUPER_ADMIN' && updates.role) {
//       user.role = updates.role;
//     }

//     if (req.user.role === 'SUPER_ADMIN' && updates.storeId) {
//       const store = await Store.findById(updates.storeId);
//       if (!store) {
//         return res.status(404).json({
//           success: false,
//           message: 'Store not found'
//         });
//       }
//       user.storeId = updates.storeId;
//     }

//     await user.save();

//     // Log audit
//     await AuditLog.create({
//       actorId: req.user._id,
//       actorRole: req.user.role,
//       action: 'UPDATE',
//       resourceType: 'User',
//       resourceId: user._id,
//       storeId: user.storeId,
//       details: {
//         before: {
//           firstName: before.firstName,
//           lastName: before.lastName,
//           email: before.email,
//           role: before.role,
//           isActive: before.isActive
//         },
//         after: {
//           firstName: user.firstName,
//           lastName: user.lastName,
//           role: user.role,
//           isActive: user.isActive
//         },
//         metadata: {
//           ipAddress: req.ip,
//           userAgent: req.headers['user-agent']
//         }
//       }
//     });

//     const userResponse = user.toObject();
//     delete userResponse.password;
//     delete userResponse.refreshToken;

//     res.json({
//       success: true,
//       data: userResponse
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// /**
//  * Delete (deactivate) user
//  */
// exports.deleteUser = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const user = await User.findById(id);
//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: 'User not found'
//       });
//     }

//     if (user.role === 'SUPER_ADMIN') {
//       return res.status(403).json({
//         success: false,
//         message: 'Cannot delete super admin'
//       });
//     }

//     if (user._id.toString() === req.user._id.toString()) {
//       return res.status(403).json({
//         success: false,
//         message: 'Cannot delete your own account'
//       });
//     }

//     if (req.user.role !== 'SUPER_ADMIN') {
//       if (user.storeId.toString() !== req.user.storeId.toString()) {
//         return res.status(403).json({
//           success: false,
//           message: 'Access denied'
//         });
//       }
//       if (user.role === 'ADMIN' && req.user.role !== 'ADMIN') {
//         return res.status(403).json({
//           success: false,
//           message: 'Access denied'
//         });
//       }
//     }

//     const before = user.toObject();
//     user.isActive = false;
//     await user.save();

//     await AuditLog.create({
//       actorId: req.user._id,
//       actorRole: req.user.role,
//       action: 'DELETE',
//       resourceType: 'User',
//       resourceId: user._id,
//       storeId: user.storeId,
//       details: {
//         before: { firstName: before.firstName, lastName: before.lastName, email: before.email },
//         after: { isActive: false },
//         metadata: {
//           ipAddress: req.ip,
//           userAgent: req.headers['user-agent']
//         }
//       },
//       severity: 'WARNING'
//     });

//     res.json({
//       success: true,
//       message: 'User deactivated successfully'
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };


























// ============================================================
// controllers/userController.js - User management controller
// ============================================================

const User = require('../models/User');
const Store = require('../models/Store');
const AuditLog = require('../models/AuditLog');
const SecurityConfig = require('../config/security');
const { AppError } = require('../middleware/errorHandler');
const StoreService = require('../services/storeService');

/**
 * Create user - ENHANCED with store assignment logic
 */
exports.createUser = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      phone,
      role,
      storeId,
      permissions
    } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Validate password strength
    const passwordValidation = SecurityConfig.validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message
      });
    }

    let assignedStoreId = storeId;

    // Store assignment logic
    if (role === 'SUPER_ADMIN') {
      // Super admin doesn't need a store
      assignedStoreId = null;
    } else {
      // If no storeId provided, try to find the only active store
      if (!assignedStoreId) {
        const stores = await Store.find({ isActive: true });
        if (stores.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'No active stores available. Please create a store first.'
          });
        }
        if (stores.length === 1) {
          // Only one store exists, assign to it
          assignedStoreId = stores[0]._id;
        } else {
          return res.status(400).json({
            success: false,
            message: 'Multiple stores available. Please specify a store.'
          });
        }
      } else {
        // Validate the provided store exists and is active
        const store = await Store.findOne({ _id: assignedStoreId, isActive: true });
        if (!store) {
          return res.status(404).json({
            success: false,
            message: 'Store not found or inactive'
          });
        }
      }
    }

    // Check permission to create this role
    if (req.user.role !== 'SUPER_ADMIN') {
      const roleHierarchy = {
        'ADMIN': ['SALES_MANAGER', 'SALES_ATTENDANT', 'FINANCE_MANAGER', 'FINANCE_CASHIER', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF'],
        'SALES_MANAGER': ['SALES_ATTENDANT'],
        'FINANCE_MANAGER': ['FINANCE_CASHIER'],
        'WAREHOUSE_MANAGER': ['WAREHOUSE_STAFF']
      };
      
      const allowedRoles = roleHierarchy[req.user.role] || [];
      if (!allowedRoles.includes(role) && req.user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({
          success: false,
          message: `You don't have permission to create users with role ${role}`
        });
      }

      // Non-super admin can only create users in their store
      if (assignedStoreId && assignedStoreId.toString() !== req.user.storeId?.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only create users in your own store'
        });
      }
    }

    // Build user data
    const userData = {
      firstName: SecurityConfig.sanitizeInput(firstName),
      lastName: SecurityConfig.sanitizeInput(lastName),
      email: email.toLowerCase(),
      password,
      phone: SecurityConfig.sanitizeInput(phone),
      role,
      isActive: true,
      permissions: permissions || [],
      currentStoreId: assignedStoreId
    };

    // Only set storeId for non-super admin
    if (role !== 'SUPER_ADMIN') {
      userData.storeId = assignedStoreId;
    }

    // For super admin, set assignedStores to all stores or specific ones
    if (role === 'SUPER_ADMIN') {
      // Super admin has access to all stores
      const allStores = await Store.find({ isActive: true }).select('_id');
      userData.assignedStores = allStores.map(s => s._id);
    }

    const user = new User(userData);
    await user.save();

    // Log audit
    await AuditLog.create({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'CREATE',
      resourceType: 'User',
      resourceId: user._id,
      storeId: assignedStoreId,
      details: {
        after: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          storeId: user.storeId,
          currentStoreId: user.currentStoreId
        },
        metadata: {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        }
      },
      severity: 'INFO'
    });

    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.refreshToken;

    res.status(201).json({
      success: true,
      data: userResponse,
      message: `User created successfully${assignedStoreId ? ' and assigned to store' : ''}`
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get users list - STORE SPECIFIC
 */
exports.getUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      role,
      storeId,
      isActive,
      search
    } = req.query;

    const query = {};

    if (req.user.role !== 'SUPER_ADMIN') {
      // Non-super admin can only see users in their store
      query.storeId = req.user.storeId;
      
      if (req.user.role !== 'ADMIN') {
        query.role = { $ne: 'ADMIN' };
      }
    } else if (storeId) {
      // Super admin can filter by store
      query.storeId = storeId;
    }

    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      User.find(query)
        .populate('storeId', 'name code')
        .populate('currentStoreId', 'name code')
        .select('-password -refreshToken')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get user by ID - STORE SPECIFIC
 */
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id)
      .populate('storeId', 'name code')
      .populate('currentStoreId', 'name code')
      .populate('assignedStores', 'name code')
      .select('-password -refreshToken');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check access
    if (req.user.role !== 'SUPER_ADMIN') {
      if (user.storeId && user.storeId._id.toString() !== req.user.storeId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
      if (user.role === 'ADMIN' && req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Update user - ENHANCED
 */
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check access
    if (req.user.role === 'ADMIN' && user.role === 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Cannot modify super admin'
      });
    }

    if (req.user.role !== 'SUPER_ADMIN') {
      if (user.storeId && user.storeId.toString() !== req.user.storeId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
      if (user.role === 'ADMIN' && req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    const before = user.toObject();

    // Update allowed fields
    const allowedUpdates = ['firstName', 'lastName', 'phone', 'isActive', 'permissions', 'currentStoreId'];
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        if (field === 'firstName' || field === 'lastName' || field === 'phone') {
          user[field] = SecurityConfig.sanitizeInput(updates[field]);
        } else {
          user[field] = updates[field];
        }
      }
    });

    // Role update only for super admin
    if (req.user.role === 'SUPER_ADMIN' && updates.role) {
      user.role = updates.role;
      // If role changes, update storeId logic
      if (updates.role === 'SUPER_ADMIN') {
        user.storeId = undefined;
        // Assign all stores
        const allStores = await Store.find({ isActive: true }).select('_id');
        user.assignedStores = allStores.map(s => s._id);
      } else if (!user.storeId) {
        // If moving from super admin to staff, need a store
        const stores = await Store.find({ isActive: true });
        if (stores.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'No active stores available'
          });
        }
        if (stores.length === 1) {
          user.storeId = stores[0]._id;
          user.currentStoreId = stores[0]._id;
        } else {
          // Need to specify store
          if (updates.storeId) {
            user.storeId = updates.storeId;
            user.currentStoreId = updates.storeId;
          } else {
            return res.status(400).json({
              success: false,
              message: 'Multiple stores available. Please specify a store.'
            });
          }
        }
      }
    }

    // Store update only for super admin
    if (req.user.role === 'SUPER_ADMIN' && updates.storeId && user.role !== 'SUPER_ADMIN') {
      const store = await Store.findById(updates.storeId);
      if (!store) {
        return res.status(404).json({
          success: false,
          message: 'Store not found'
        });
      }
      user.storeId = updates.storeId;
      if (!updates.currentStoreId) {
        user.currentStoreId = updates.storeId;
      }
    }

    // Validate currentStoreId
    if (updates.currentStoreId && user.role !== 'SUPER_ADMIN') {
      const store = await Store.findById(updates.currentStoreId);
      if (!store || !store.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Store not found or inactive'
        });
      }
      // Ensure user has access to this store
      if (user.storeId && user.storeId.toString() !== updates.currentStoreId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'User does not have access to this store'
        });
      }
    }

    await user.save();

    // Log audit
    await AuditLog.create({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'UPDATE',
      resourceType: 'User',
      resourceId: user._id,
      storeId: user.storeId,
      details: {
        before: {
          firstName: before.firstName,
          lastName: before.lastName,
          email: before.email,
          role: before.role,
          storeId: before.storeId,
          isActive: before.isActive
        },
        after: {
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          storeId: user.storeId,
          currentStoreId: user.currentStoreId,
          isActive: user.isActive
        },
        metadata: {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        }
      }
    });

    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.refreshToken;

    res.json({
      success: true,
      data: userResponse
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Delete (deactivate) user
 */
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role === 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete super admin'
      });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    if (req.user.role !== 'SUPER_ADMIN') {
      if (user.storeId && user.storeId.toString() !== req.user.storeId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
      if (user.role === 'ADMIN' && req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    const before = user.toObject();
    user.isActive = false;
    await user.save();

    await AuditLog.create({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'DELETE',
      resourceType: 'User',
      resourceId: user._id,
      storeId: user.storeId,
      details: {
        before: { firstName: before.firstName, lastName: before.lastName, email: before.email },
        after: { isActive: false },
        metadata: {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        }
      },
      severity: 'WARNING'
    });

    res.json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Switch user's current store
 */
exports.switchStore = async (req, res) => {
  try {
    const { storeId } = req.body;

    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: 'Store ID is required'
      });
    }

    // Use StoreService to switch
    const result = await StoreService.switchUserStore(req.user._id, storeId);

    res.json({
      success: true,
      data: result,
      message: 'Store switched successfully'
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get user's accessible stores
 */
exports.getUserStores = async (req, res) => {
  try {
    const stores = await StoreService.getUserStores(req.user);

    res.json({
      success: true,
      data: stores
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get current user with store context
 */
exports.getCurrentUserWithStore = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('storeId', 'name code')
      .populate('currentStoreId', 'name code')
      .populate('assignedStores', 'name code')
      .select('-password -refreshToken');

    // If no currentStoreId, set to storeId or first assigned store
    if (!user.currentStoreId && user.storeId) {
      user.currentStoreId = user.storeId;
      await user.save();
    } else if (!user.currentStoreId && user.assignedStores && user.assignedStores.length > 0) {
      user.currentStoreId = user.assignedStores[0]._id;
      await user.save();
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};