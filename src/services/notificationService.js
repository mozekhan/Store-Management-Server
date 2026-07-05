// const Notification = require('../models/Notification');
// const User = require('../models/User');
// const { AppError } = require('../middleware/errorHandler');

// class NotificationService {
//   async createNotification(userId, storeId, type, title, message, data = {}, priority = 'MEDIUM') {
//     const notification = new Notification({
//       userId,
//       storeId,
//       type,
//       title,
//       message,
//       data,
//       priority,
//       read: false,
//       delivered: false
//     });

//     await notification.save();

//     // Emit real-time notification if socket is available
//     const io = require('../server').io;
//     if (io) {
//       io.to(`user-${userId}`).emit('notification', notification);
//     }

//     return notification;
//   }

//   async sendTransactionNotification(transaction, event) {
//     const messages = {
//       'created': `New transaction ${transaction.transactionNumber} created`,
//       'sales_qr': `Sales QR generated for ${transaction.transactionNumber}`,
//       'paid': `Transaction ${transaction.transactionNumber} has been paid`,
//       'payment_qr': `Payment QR generated for ${transaction.transactionNumber}`,
//       'released': `Stock released for ${transaction.transactionNumber}`,
//       'completed': `Transaction ${transaction.transactionNumber} completed`,
//       'cancelled': `Transaction ${transaction.transactionNumber} has been cancelled`
//     };

//     const message = messages[event] || `Transaction ${transaction.transactionNumber} updated`;
//     const title = 'Transaction Update';

//     // Get relevant users
//     const userIds = [
//       transaction.salesAttendantId,
//       transaction.financeAttendantId,
//       transaction.warehouseStaffId
//     ].filter(id => id);

//     // Get store managers
//     const managers = await User.find({
//       storeId: transaction.storeId,
//       role: { $in: ['ADMIN', 'SALES_MANAGER', 'FINANCE_MANAGER', 'WAREHOUSE_MANAGER'] },
//       isActive: true
//     });

//     const allUserIds = [...userIds, ...managers.map(m => m._id)];

//     // Create notifications for each user
//     for (const userId of allUserIds) {
//       await this.createNotification(
//         userId,
//         transaction.storeId,
//         'TRANSACTION',
//         title,
//         message,
//         {
//           transactionId: transaction._id,
//           transactionNumber: transaction.transactionNumber,
//           event
//         },
//         event === 'cancelled' ? 'HIGH' : 'MEDIUM'
//       );
//     }
//   }

//   async sendLowStockNotification(product, inventory) {
//     const title = 'Low Stock Alert';
//     const message = `${product.name} (${product.sku}) is running low. Current stock: ${inventory.quantity}, Reorder point: ${inventory.reorderPoint}`;

//     // Get warehouse managers and admins
//     const users = await User.find({
//       storeId: inventory.storeId,
//       role: { $in: ['WAREHOUSE_MANAGER', 'ADMIN'] },
//       isActive: true
//     });

//     for (const user of users) {
//       await this.createNotification(
//         user._id,
//         inventory.storeId,
//         'INVENTORY',
//         title,
//         message,
//         {
//           productId: product._id,
//           productName: product.name,
//           sku: product.sku,
//           currentStock: inventory.quantity,
//           reorderPoint: inventory.reorderPoint
//         },
//         'HIGH'
//       );
//     }
//   }

//   async sendDailyReportNotification(storeId, report) {
//     const title = 'Daily Report';
//     const message = `Daily report for ${new Date().toLocaleDateString()}`;

//     const users = await User.find({
//       storeId,
//       role: { $in: ['ADMIN', 'SALES_MANAGER', 'FINANCE_MANAGER', 'WAREHOUSE_MANAGER'] },
//       isActive: true
//     });

//     for (const user of users) {
//       await this.createNotification(
//         user._id,
//         storeId,
//         'REPORT',
//         title,
//         message,
//         {
//           report,
//           date: new Date()
//         },
//         'MEDIUM'
//       );
//     }
//   }

//   async getNotifications(userId, options = {}) {
//     const { page = 1, limit = 20, read, type } = options;

//     const query = { userId };
//     if (read !== undefined) query.read = read;
//     if (type) query.type = type;

//     const skip = (parseInt(page) - 1) * parseInt(limit);

//     const [notifications, total] = await Promise.all([
//       Notification.find(query)
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(parseInt(limit)),
//       Notification.countDocuments(query)
//     ]);

//     return {
//       notifications,
//       pagination: {
//         page: parseInt(page),
//         limit: parseInt(limit),
//         total,
//         pages: Math.ceil(total / parseInt(limit))
//       }
//     };
//   }

//   async markAsRead(notificationId, userId) {
//     const notification = await Notification.findOne({ _id: notificationId, userId });
//     if (!notification) {
//       throw new AppError('Notification not found', 404);
//     }

//     notification.read = true;
//     notification.readAt = new Date();
//     await notification.save();

//     return notification;
//   }

//   async markAllAsRead(userId) {
//     await Notification.updateMany(
//       { userId, read: false },
//       { read: true, readAt: new Date() }
//     );
//     return { success: true };
//   }

//   async getUnreadCount(userId) {
//     return await Notification.countDocuments({ userId, read: false });
//   }

//   async deleteNotification(notificationId, userId) {
//     const notification = await Notification.findOneAndDelete({ _id: notificationId, userId });
//     if (!notification) {
//       throw new AppError('Notification not found', 404);
//     }
//     return { success: true };
//   }

//   async deleteAllNotifications(userId) {
//     await Notification.deleteMany({ userId });
//     return { success: true };
//   }
// }

// module.exports = new NotificationService();























// ============================================================
// services/notificationService.js - Unified notification service
// ============================================================

const Notification = require('../models/Notification');
const User = require('../models/User');
const BaseService = require('./baseService');
const { AppError } = require('../middleware/errorHandler');

class NotificationService extends BaseService {
  /**
   * Create a notification
   */
  async createNotification(userId, storeId, type, title, message, data = {}, priority = 'MEDIUM') {
    const notification = new Notification({
      userId,
      storeId,
      type,
      title,
      message,
      data,
      priority,
      read: false,
      delivered: false
    });

    await notification.save();

    // Emit real-time notification
    const io = require('../server').io;
    if (io) {
      io.to(`user-${userId}`).emit('notification', notification);
    }

    return notification;
  }

  /**
   * Send transaction notification
   */
  async sendTransactionNotification(transaction, event) {
    const messages = {
      'created': `New transaction ${transaction.transactionNumber} created`,
      'sales_qr': `Sales QR generated for ${transaction.transactionNumber}`,
      'paid': `Transaction ${transaction.transactionNumber} has been paid`,
      'payment_qr': `Payment QR generated for ${transaction.transactionNumber}`,
      'released': `Stock released for ${transaction.transactionNumber}`,
      'completed': `Transaction ${transaction.transactionNumber} completed`,
      'cancelled': `Transaction ${transaction.transactionNumber} has been cancelled`
    };

    const message = messages[event] || `Transaction ${transaction.transactionNumber} updated`;
    const title = 'Transaction Update';

    const userIds = [
      transaction.salesAttendantId,
      transaction.financeAttendantId,
      transaction.warehouseStaffId
    ].filter(id => id);

    const managers = await User.find({
      storeId: transaction.storeId,
      role: { $in: ['ADMIN', 'SALES_MANAGER', 'FINANCE_MANAGER', 'WAREHOUSE_MANAGER'] },
      isActive: true
    });

    const allUserIds = [...userIds, ...managers.map(m => m._id)];

    for (const userId of allUserIds) {
      await this.createNotification(
        userId,
        transaction.storeId,
        'TRANSACTION',
        title,
        message,
        {
          transactionId: transaction._id,
          transactionNumber: transaction.transactionNumber,
          event
        },
        event === 'cancelled' ? 'HIGH' : 'MEDIUM'
      );
    }
  }

  /**
   * Send low stock notification
   */
  async sendLowStockNotification(product, inventory) {
    const title = 'Low Stock Alert';
    const message = `${product.name} (${product.sku}) is running low. Current stock: ${inventory.quantity}, Reorder point: ${inventory.reorderPoint}`;

    const users = await User.find({
      storeId: inventory.storeId,
      role: { $in: ['WAREHOUSE_MANAGER', 'ADMIN'] },
      isActive: true
    });

    for (const user of users) {
      await this.createNotification(
        user._id,
        inventory.storeId,
        'INVENTORY',
        title,
        message,
        {
          productId: product._id,
          productName: product.name,
          sku: product.sku,
          currentStock: inventory.quantity,
          reorderPoint: inventory.reorderPoint
        },
        'HIGH'
      );
    }
  }

  /**
   * Send daily report notification
   */
  async sendDailyReportNotification(storeId, report) {
    const title = 'Daily Report';
    const message = `Daily report for ${new Date().toLocaleDateString()}`;

    const users = await User.find({
      storeId,
      role: { $in: ['ADMIN', 'SALES_MANAGER', 'FINANCE_MANAGER', 'WAREHOUSE_MANAGER'] },
      isActive: true
    });

    for (const user of users) {
      await this.createNotification(
        user._id,
        storeId,
        'REPORT',
        title,
        message,
        { report, date: new Date() },
        'MEDIUM'
      );
    }
  }

  /**
   * Get user notifications
   */
  async getNotifications(userId, options = {}) {
    const { page = 1, limit = 20, read, type } = options;

    const query = { userId };
    if (read !== undefined) query.read = read;
    if (type) query.type = type;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Notification.countDocuments(query)
    ]);

    return {
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId, userId) {
    const notification = await Notification.findOne({ _id: notificationId, userId });
    if (!notification) {
      throw new AppError('Notification not found', 404);
    }

    notification.read = true;
    notification.readAt = new Date();
    await notification.save();

    return notification;
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId) {
    await Notification.updateMany(
      { userId, read: false },
      { read: true, readAt: new Date() }
    );
    return { success: true };
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId) {
    return await Notification.countDocuments({ userId, read: false });
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId, userId) {
    const notification = await Notification.findOneAndDelete({ _id: notificationId, userId });
    if (!notification) {
      throw new AppError('Notification not found', 404);
    }
    return { success: true };
  }

  /**
   * Delete all notifications
   */
  async deleteAllNotifications(userId) {
    await Notification.deleteMany({ userId });
    return { success: true };
  }
}

module.exports = new NotificationService();