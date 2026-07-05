// // ============================================================
// // services/storeService.js - Store management service
// // ============================================================

// const Store = require('../models/Store');
// const User = require('../models/User');
// const Transaction = require('../models/Transaction');
// const Product = require('../models/Product');
// const Inventory = require('../models/Inventory');
// const BaseService = require('./baseService');
// const { AppError } = require('../middleware/errorHandler');

// class StoreService extends BaseService {
//   /**
//    * Create a new store
//    */
//   async createStore(storeData, userId, ip, userAgent) {
//     const { name, code, address, phone, email, taxRate, currency } = storeData;

//     // Check if store code already exists
//     const existingStore = await Store.findOne({ code: code.toUpperCase() });
//     if (existingStore) {
//       throw new AppError('Store with this code already exists', 400);
//     }

//     // Check if store name already exists
//     const existingName = await Store.findOne({ name });
//     if (existingName) {
//       throw new AppError('Store with this name already exists', 400);
//     }

//     const store = new Store({
//       name: this.sanitize(name),
//       code: code.toUpperCase().trim(),
//       address: {
//         street: address?.street || '',
//         city: address?.city || '',
//         state: address?.state || '',
//         country: address?.country || '',
//         zipCode: address?.zipCode || ''
//       },
//       phone: phone || '',
//       email: email?.toLowerCase() || '',
//       taxRate: parseFloat(taxRate) || 0,
//       currency: currency?.toUpperCase() || 'USD',
//       isActive: true,
//       createdBy: userId
//     });

//     await store.save();

//     // Log audit
//     await this.auditLog(
//       userId,
//       null,
//       'CREATE',
//       'Store',
//       store._id,
//       store._id,
//       {
//         after: {
//           name: store.name,
//           code: store.code,
//           taxRate: store.taxRate,
//           currency: store.currency
//         },
//         metadata: { ipAddress: ip, userAgent }
//       },
//       'INFO'
//     );

//     return store;
//   }

//   /**
//    * Get stores with filtering and pagination
//    */
//   async getStores(query, user) {
//     const {
//       page = 1,
//       limit = 20,
//       search,
//       isActive,
//       sortBy = 'createdAt',
//       sortOrder = 'desc'
//     } = query;

//     const filter = {};

//     // Super admin can see all stores, others only their store
//     if (user.role !== 'SUPER_ADMIN') {
//       filter._id = user.storeId;
//     }

//     if (isActive !== undefined) {
//       filter.isActive = isActive === 'true';
//     }

//     if (search) {
//       filter.$or = [
//         { name: { $regex: search, $options: 'i' } },
//         { code: { $regex: search, $options: 'i' } },
//         { 'address.city': { $regex: search, $options: 'i' } },
//         { 'address.state': { $regex: search, $options: 'i' } }
//       ];
//     }

//     const skip = (parseInt(page) - 1) * parseInt(limit);
//     const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

//     const [stores, total] = await Promise.all([
//       Store.find(filter)
//         .sort(sort)
//         .skip(skip)
//         .limit(parseInt(limit)),
//       Store.countDocuments(filter)
//     ]);

//     // Get stats for each store
//     const storesWithStats = await Promise.all(
//       stores.map(async (store) => {
//         const stats = await this.getStoreStats(store._id);
//         return {
//           ...store.toObject(),
//           stats
//         };
//       })
//     );

//     return {
//       stores: storesWithStats,
//       pagination: {
//         page: parseInt(page),
//         limit: parseInt(limit),
//         total,
//         pages: Math.ceil(total / parseInt(limit))
//       }
//     };
//   }

//   /**
//    * Get store by ID
//    */
//   async getStoreById(storeId, user) {
//     const store = await Store.findById(storeId);

//     if (!store) {
//       throw new AppError('Store not found', 404);
//     }

//     // Check access
//     if (user.role !== 'SUPER_ADMIN' && 
//         user.storeId?.toString() !== storeId.toString()) {
//       throw new AppError('Access denied to this store', 403);
//     }

//     const stats = await this.getStoreStats(storeId);

//     return {
//       ...store.toObject(),
//       stats
//     };
//   }

//   /**
//    * Update store
//    */
//   async updateStore(storeId, updateData, userId, ip, userAgent) {
//     const store = await Store.findById(storeId);
//     if (!store) {
//       throw new AppError('Store not found', 404);
//     }

//     const before = store.toObject();

//     // Check if code is being changed and is unique
//     if (updateData.code && updateData.code.toUpperCase() !== store.code) {
//       const existingStore = await Store.findOne({
//         code: updateData.code.toUpperCase(),
//         _id: { $ne: storeId }
//       });
//       if (existingStore) {
//         throw new AppError('Store with this code already exists', 400);
//       }
//       store.code = updateData.code.toUpperCase().trim();
//     }

//     // Update allowed fields
//     const allowedUpdates = ['name', 'phone', 'email', 'taxRate', 'currency', 'isActive'];
//     allowedUpdates.forEach(field => {
//       if (updateData[field] !== undefined) {
//         if (field === 'name' || field === 'phone') {
//           store[field] = this.sanitize(updateData[field]);
//         } else if (field === 'email') {
//           store[field] = updateData[field]?.toLowerCase();
//         } else {
//           store[field] = updateData[field];
//         }
//       }
//     });

//     // Update address
//     if (updateData.address) {
//       store.address = {
//         street: this.sanitize(updateData.address.street || store.address?.street || ''),
//         city: this.sanitize(updateData.address.city || store.address?.city || ''),
//         state: this.sanitize(updateData.address.state || store.address?.state || ''),
//         country: this.sanitize(updateData.address.country || store.address?.country || ''),
//         zipCode: this.sanitize(updateData.address.zipCode || store.address?.zipCode || '')
//       };
//     }

//     store.updatedAt = new Date();
//     await store.save();

//     // Log audit
//     await this.auditLog(
//       userId,
//       null,
//       'UPDATE',
//       'Store',
//       store._id,
//       store._id,
//       {
//         before: {
//           name: before.name,
//           code: before.code,
//           taxRate: before.taxRate,
//           currency: before.currency,
//           isActive: before.isActive
//         },
//         after: {
//           name: store.name,
//           code: store.code,
//           taxRate: store.taxRate,
//           currency: store.currency,
//           isActive: store.isActive
//         },
//         metadata: { ipAddress: ip, userAgent }
//       },
//       'INFO'
//     );

//     return store;
//   }

//   /**
//    * Delete (deactivate) store
//    */
//   async deleteStore(storeId, userId, ip, userAgent) {
//     const store = await Store.findById(storeId);
//     if (!store) {
//       throw new AppError('Store not found', 404);
//     }

//     // Check if store has any active users
//     const activeUsers = await User.countDocuments({
//       storeId,
//       isActive: true
//     });
//     if (activeUsers > 0) {
//       throw new AppError('Cannot delete store with active users', 400);
//     }

//     // Check if store has any active products
//     const activeProducts = await Product.countDocuments({
//       storeId,
//       isActive: true
//     });
//     if (activeProducts > 0) {
//       throw new AppError('Cannot delete store with active products', 400);
//     }

//     const before = store.toObject();
//     store.isActive = false;
//     store.updatedAt = new Date();
//     await store.save();

//     // Log audit
//     await this.auditLog(
//       userId,
//       null,
//       'DELETE',
//       'Store',
//       store._id,
//       store._id,
//       {
//         before: {
//           name: before.name,
//           code: before.code,
//           isActive: before.isActive
//         },
//         after: { isActive: false },
//         metadata: { ipAddress: ip, userAgent }
//       },
//       'WARNING'
//     );

//     return store;
//   }

//   /**
//    * Get store statistics
//    */
//   async getStoreStats(storeId) {
//     const [
//       totalUsers,
//       totalProducts,
//       totalTransactions,
//       completedTransactions,
//       todayRevenue,
//       monthRevenue,
//       totalRevenue
//     ] = await Promise.all([
//       User.countDocuments({ storeId, isActive: true }),
//       Product.countDocuments({ storeId, isActive: true }),
//       Transaction.countDocuments({ storeId }),
//       Transaction.countDocuments({ storeId, status: 'COMPLETED' }),
//       Transaction.aggregate([
//         {
//           $match: {
//             storeId,
//             status: 'COMPLETED',
//             createdAt: { $gte: new Date().setHours(0, 0, 0, 0) }
//           }
//         },
//         { $group: { _id: null, total: { $sum: '$totalAmount' } } }
//       ]),
//       Transaction.aggregate([
//         {
//           $match: {
//             storeId,
//             status: 'COMPLETED',
//             createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
//           }
//         },
//         { $group: { _id: null, total: { $sum: '$totalAmount' } } }
//       ]),
//       Transaction.aggregate([
//         { $match: { storeId, status: 'COMPLETED' } },
//         { $group: { _id: null, total: { $sum: '$totalAmount' } } }
//       ])
//     ]);

//     // Inventory stats
//     const inventoryStats = await Inventory.aggregate([
//       { $match: { storeId } },
//       {
//         $group: {
//           _id: null,
//           totalItems: { $sum: '$quantity' },
//           lowStockCount: {
//             $sum: {
//               $cond: [{ $lte: ['$quantity', '$reorderPoint'] }, 1, 0]
//             }
//           },
//           outOfStockCount: {
//             $sum: {
//               $cond: [{ $eq: ['$quantity', 0] }, 1, 0]
//             }
//           }
//         }
//       }
//     ]);

//     return {
//       users: totalUsers,
//       products: totalProducts,
//       transactions: {
//         total: totalTransactions,
//         completed: completedTransactions,
//         pending: totalTransactions - completedTransactions
//       },
//       revenue: {
//         today: todayRevenue[0]?.total || 0,
//         thisMonth: monthRevenue[0]?.total || 0,
//         total: totalRevenue[0]?.total || 0
//       },
//       inventory: inventoryStats[0] || {
//         totalItems: 0,
//         lowStockCount: 0,
//         outOfStockCount: 0
//       }
//     };
//   }

//   /**
//    * Get store options for dropdowns
//    */
//   async getStoreOptions(user) {
//     const filter = { isActive: true };
    
//     if (user.role !== 'SUPER_ADMIN') {
//       filter._id = user.storeId;
//     }

//     const stores = await Store.find(filter)
//       .select('_id name code')
//       .sort({ name: 1 });

//     return stores.map(store => ({
//       value: store._id,
//       label: `${store.name} (${store.code})`,
//       code: store.code
//     }));
//   }

//   /**
//    * Validate store access
//    */
//   async validateStoreAccess(storeId, user) {
//     if (user.role === 'SUPER_ADMIN') {
//       return true;
//     }

//     const store = await Store.findById(storeId);
//     if (!store) {
//       throw new AppError('Store not found', 404);
//     }

//     if (user.storeId?.toString() !== storeId.toString()) {
//       throw new AppError('Access denied to this store', 403);
//     }

//     return true;
//   }

//   /**
//    * Get store by code
//    */
//   async getStoreByCode(code) {
//     const store = await Store.findOne({ code: code.toUpperCase(), isActive: true });
//     if (!store) {
//       throw new AppError('Store not found', 404);
//     }
//     return store;
//   }
// }

// module.exports = new StoreService();

























// ============================================================
// services/storeService.js - Store management service
// ============================================================

const Store = require('../models/Store');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const BaseService = require('./baseService');
const { AppError } = require('../middleware/errorHandler');

class StoreService extends BaseService {
  /**
   * Create a new store
   */
  async createStore(storeData, userId, ip, userAgent) {
    const { name, code, address, phone, email, taxRate, currency } = storeData;

    // Check if store code already exists
    const existingStore = await Store.findOne({ code: code.toUpperCase() });
    if (existingStore) {
      throw new AppError('Store with this code already exists', 400);
    }

    // Check if store name already exists
    const existingName = await Store.findOne({ name });
    if (existingName) {
      throw new AppError('Store with this name already exists', 400);
    }

    const store = new Store({
      name: this.sanitize(name),
      code: code.toUpperCase().trim(),
      address: {
        street: address?.street || '',
        city: address?.city || '',
        state: address?.state || '',
        country: address?.country || '',
        zipCode: address?.zipCode || ''
      },
      phone: phone || '',
      email: email?.toLowerCase() || '',
      taxRate: parseFloat(taxRate) || 0,
      currency: currency?.toUpperCase() || 'USD',
      isActive: true,
      createdBy: userId
    });

    await store.save();

    // Log audit
    await this.auditLog(
      userId,
      null,
      'CREATE',
      'Store',
      store._id,
      store._id,
      {
        after: {
          name: store.name,
          code: store.code,
          taxRate: store.taxRate,
          currency: store.currency
        },
        metadata: { ipAddress: ip, userAgent }
      },
      'INFO'
    );

    return store;
  }

  /**
   * Get stores with filtering and pagination - STORE SPECIFIC
   */
  async getStores(query, user) {
    const {
      page = 1,
      limit = 20,
      search,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = query;

    const filter = {};

    // Get stores based on user's access
    if (user.role === 'SUPER_ADMIN') {
      // Super admin can see all stores
      // No filter needed
    } else if (user.role === 'ADMIN' || user.role === 'SALES_MANAGER' || 
               user.role === 'FINANCE_MANAGER' || user.role === 'WAREHOUSE_MANAGER') {
      // Managers can only see their assigned store
      filter._id = user.storeId;
    } else {
      // Staff can only see their assigned store
      filter._id = user.storeId;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } },
        { 'address.state': { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [stores, total] = await Promise.all([
      Store.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Store.countDocuments(filter)
    ]);

    // Get stats for each store (if user has access)
    const storesWithStats = await Promise.all(
      stores.map(async (store) => {
        const stats = await this.getStoreStats(store._id, user);
        return {
          ...store.toObject(),
          stats
        };
      })
    );

    return {
      stores: storesWithStats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    };
  }

  /**
   * Get store by ID - with access validation
   */
  async getStoreById(storeId, user) {
    // Check access
    if (!this.hasStoreAccess(user, storeId)) {
      throw new AppError('Access denied to this store', 403);
    }

    const store = await Store.findById(storeId);
    if (!store) {
      throw new AppError('Store not found', 404);
    }

    const stats = await this.getStoreStats(storeId, user);

    return {
      ...store.toObject(),
      stats
    };
  }

  /**
   * Get store by code
   */
  async getStoreByCode(code) {
    const store = await Store.findOne({ code: code.toUpperCase(), isActive: true });
    if (!store) {
      throw new AppError('Store not found', 404);
    }
    return store;
  }

  /**
   * Update store
   */
  async updateStore(storeId, updateData, userId, ip, userAgent) {
    const store = await Store.findById(storeId);
    if (!store) {
      throw new AppError('Store not found', 404);
    }

    const before = store.toObject();

    // Check if code is being changed and is unique
    if (updateData.code && updateData.code.toUpperCase() !== store.code) {
      const existingStore = await Store.findOne({
        code: updateData.code.toUpperCase(),
        _id: { $ne: storeId }
      });
      if (existingStore) {
        throw new AppError('Store with this code already exists', 400);
      }
      store.code = updateData.code.toUpperCase().trim();
    }

    // Update allowed fields
    const allowedUpdates = ['name', 'phone', 'email', 'taxRate', 'currency', 'isActive'];
    allowedUpdates.forEach(field => {
      if (updateData[field] !== undefined) {
        if (field === 'name' || field === 'phone') {
          store[field] = this.sanitize(updateData[field]);
        } else if (field === 'email') {
          store[field] = updateData[field]?.toLowerCase();
        } else {
          store[field] = updateData[field];
        }
      }
    });

    // Update address
    if (updateData.address) {
      store.address = {
        street: this.sanitize(updateData.address.street || store.address?.street || ''),
        city: this.sanitize(updateData.address.city || store.address?.city || ''),
        state: this.sanitize(updateData.address.state || store.address?.state || ''),
        country: this.sanitize(updateData.address.country || store.address?.country || ''),
        zipCode: this.sanitize(updateData.address.zipCode || store.address?.zipCode || '')
      };
    }

    store.updatedAt = new Date();
    await store.save();

    // Log audit
    await this.auditLog(
      userId,
      null,
      'UPDATE',
      'Store',
      store._id,
      store._id,
      {
        before: {
          name: before.name,
          code: before.code,
          taxRate: before.taxRate,
          currency: before.currency,
          isActive: before.isActive
        },
        after: {
          name: store.name,
          code: store.code,
          taxRate: store.taxRate,
          currency: store.currency,
          isActive: store.isActive
        },
        metadata: { ipAddress: ip, userAgent }
      },
      'INFO'
    );

    return store;
  }

  /**
   * Delete (deactivate) store
   */
  async deleteStore(storeId, userId, ip, userAgent) {
    const store = await Store.findById(storeId);
    if (!store) {
      throw new AppError('Store not found', 404);
    }

    // Check if store has any active users
    const activeUsers = await User.countDocuments({
      storeId,
      isActive: true
    });
    if (activeUsers > 0) {
      throw new AppError('Cannot delete store with active users', 400);
    }

    // Check if store has any active products
    const activeProducts = await Product.countDocuments({
      storeId,
      isActive: true
    });
    if (activeProducts > 0) {
      throw new AppError('Cannot delete store with active products', 400);
    }

    const before = store.toObject();
    store.isActive = false;
    store.updatedAt = new Date();
    await store.save();

    // Log audit
    await this.auditLog(
      userId,
      null,
      'DELETE',
      'Store',
      store._id,
      store._id,
      {
        before: {
          name: before.name,
          code: before.code,
          isActive: before.isActive
        },
        after: { isActive: false },
        metadata: { ipAddress: ip, userAgent }
      },
      'WARNING'
    );

    return store;
  }

  /**
   * Get store statistics - STORE SPECIFIC
   */
  async getStoreStats(storeId, user) {
    // Validate access
    if (!this.hasStoreAccess(user, storeId)) {
      throw new AppError('Access denied to this store', 403);
    }

    const [
      totalUsers,
      totalProducts,
      totalTransactions,
      completedTransactions,
      todayRevenue,
      monthRevenue,
      totalRevenue
    ] = await Promise.all([
      User.countDocuments({ storeId, isActive: true }),
      Product.countDocuments({ storeId, isActive: true }),
      Transaction.countDocuments({ storeId }),
      Transaction.countDocuments({ storeId, status: 'COMPLETED' }),
      Transaction.aggregate([
        {
          $match: {
            storeId,
            status: 'COMPLETED',
            createdAt: { $gte: new Date().setHours(0, 0, 0, 0) }
          }
        },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      Transaction.aggregate([
        {
          $match: {
            storeId,
            status: 'COMPLETED',
            createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
          }
        },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      Transaction.aggregate([
        { $match: { storeId, status: 'COMPLETED' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ])
    ]);

    // Inventory stats
    const inventoryStats = await Inventory.aggregate([
      { $match: { storeId } },
      {
        $group: {
          _id: null,
          totalItems: { $sum: '$quantity' },
          lowStockCount: {
            $sum: {
              $cond: [{ $lte: ['$quantity', '$reorderPoint'] }, 1, 0]
            }
          },
          outOfStockCount: {
            $sum: {
              $cond: [{ $eq: ['$quantity', 0] }, 1, 0]
            }
          }
        }
      }
    ]);

    return {
      users: totalUsers,
      products: totalProducts,
      transactions: {
        total: totalTransactions,
        completed: completedTransactions,
        pending: totalTransactions - completedTransactions
      },
      revenue: {
        today: todayRevenue[0]?.total || 0,
        thisMonth: monthRevenue[0]?.total || 0,
        total: totalRevenue[0]?.total || 0
      },
      inventory: inventoryStats[0] || {
        totalItems: 0,
        lowStockCount: 0,
        outOfStockCount: 0
      }
    };
  }

  /**
   * Get store options for dropdowns - STORE SPECIFIC
   */
  async getStoreOptions(user) {
    const filter = { isActive: true };

    if (user.role !== 'SUPER_ADMIN') {
      filter._id = user.storeId;
    }

    const stores = await Store.find(filter)
      .select('_id name code')
      .sort({ name: 1 });

    return stores.map(store => ({
      value: store._id,
      label: `${store.name} (${store.code})`,
      code: store.code
    }));
  }

  /**
   * Validate store access - ENHANCED
   */
  async validateStoreAccess(storeId, user) {
    return this.hasStoreAccess(user, storeId);
  }

  /**
   * Check if user has access to store - ENHANCED
   */
  hasStoreAccess(user, storeId) {
    if (user.role === 'SUPER_ADMIN') return true;
    if (!storeId) return false;

    const storeIdStr = storeId.toString();
    
    // Check user's primary store
    if (user.storeId && user.storeId.toString() === storeIdStr) {
      return true;
    }

    // Check assigned stores
    if (user.assignedStores && Array.isArray(user.assignedStores)) {
      return user.assignedStores.some(s => s.toString() === storeIdStr);
    }

    return false;
  }

  /**
   * Get user's accessible stores
   */
  async getUserStores(user) {
    if (user.role === 'SUPER_ADMIN') {
      return await Store.find({ isActive: true }).select('_id name code');
    }

    const storeIds = [];
    if (user.storeId) storeIds.push(user.storeId);
    if (user.assignedStores) storeIds.push(...user.assignedStores);

    if (storeIds.length === 0) return [];

    return await Store.find({
      _id: { $in: storeIds },
      isActive: true
    }).select('_id name code');
  }

  /**
   * Switch user's current store
   */
  async switchUserStore(userId, storeId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Validate access to the store
    if (!this.hasStoreAccess(user, storeId)) {
      throw new AppError('Access denied to this store', 403);
    }

    const store = await Store.findById(storeId);
    if (!store || !store.isActive) {
      throw new AppError('Store not found or inactive', 404);
    }

    user.currentStoreId = storeId;
    await user.save();

    return { 
      userId: user._id, 
      currentStoreId: storeId,
      store: store 
    };
  }
}

module.exports = new StoreService();