const { Server } = require('socket.io');
const logger = require('../utils/logger');

class TransactionEvents {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
        credentials: true
      },
      path: '/socket.io',
      transports: ['websocket', 'polling']
    });

    this.connectedClients = new Map();
    this.setupEvents();
    logger.info('WebSocket server initialized');
  }

  setupEvents() {
    this.io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);

      // Authenticate client
      socket.on('authenticate', (data) => {
        const { userId, storeId, role } = data;
        socket.userId = userId;
        socket.storeId = storeId;
        socket.role = role;
        
        this.connectedClients.set(socket.id, { userId, storeId, role });
        logger.info(`Client ${socket.id} authenticated as ${role}`);

        // Join store room
        if (storeId) {
          socket.join(`store-${storeId}`);
        }

        // Join user room
        if (userId) {
          socket.join(`user-${userId}`);
        }

        // Send confirmation
        socket.emit('authenticated', { success: true });
      });

      // Join store room
      socket.on('join-store', (storeId) => {
        if (storeId) {
          socket.join(`store-${storeId}`);
          socket.storeId = storeId;
          logger.info(`Client ${socket.id} joined store ${storeId}`);
          socket.emit('store-joined', { storeId });
        }
      });

      // Join user room
      socket.on('join-user', (userId) => {
        if (userId) {
          socket.join(`user-${userId}`);
          socket.userId = userId;
          logger.info(`Client ${socket.id} joined user ${userId}`);
          socket.emit('user-joined', { userId });
        }
      });

      // Transaction status update
      socket.on('transaction-status', (data) => {
        const { transactionId, status, storeId, userId } = data;
        this.broadcastTransactionUpdate({
          transactionId,
          status,
          storeId,
          userId,
          timestamp: new Date()
        });
      });

      // Payment notification
      socket.on('payment-processed', (data) => {
        const { transactionId, storeId, amount } = data;
        this.broadcastPaymentUpdate({
          transactionId,
          storeId,
          amount,
          timestamp: new Date()
        });
      });

      // Inventory update
      socket.on('inventory-update', (data) => {
        const { productId, storeId, quantity, type } = data;
        this.broadcastInventoryUpdate({
          productId,
          storeId,
          quantity,
          type,
          timestamp: new Date()
        });
      });

      // Disconnect
      socket.on('disconnect', () => {
        this.connectedClients.delete(socket.id);
        logger.info(`Client disconnected: ${socket.id}`);
      });

      // Error handling
      socket.on('error', (error) => {
        logger.error(`Socket error for ${socket.id}:`, error);
      });
    });
  }

  broadcastTransactionUpdate(data) {
    const { transactionId, status, storeId, userId } = data;
    
    // Broadcast to store room
    if (storeId) {
      this.io.to(`store-${storeId}`).emit('transaction-updated', {
        transactionId,
        status,
        timestamp: new Date()
      });
    }

    // Broadcast to user room
    if (userId) {
      this.io.to(`user-${userId}`).emit('transaction-notification', {
        transactionId,
        status,
        message: `Transaction ${transactionId} status changed to ${status}`,
        timestamp: new Date()
      });
    }

    logger.info(`Transaction update broadcasted for ${transactionId}: ${status}`);
  }

  broadcastPaymentUpdate(data) {
    const { transactionId, storeId, amount } = data;
    
    this.io.to(`store-${storeId}`).emit('payment-processed', {
      transactionId,
      amount,
      timestamp: new Date()
    });

    // Notify finance managers
    this.io.to('finance-managers').emit('payment-notification', {
      transactionId,
      amount,
      storeId,
      timestamp: new Date()
    });

    logger.info(`Payment update broadcasted for ${transactionId}: $${amount}`);
  }

  broadcastInventoryUpdate(data) {
    const { productId, storeId, quantity, type } = data;
    
    this.io.to(`store-${storeId}`).emit('inventory-updated', {
      productId,
      quantity,
      type,
      timestamp: new Date()
    });

    // Check for low stock and broadcast alert
    if (type === 'release' && quantity < 10) {
      this.io.to(`store-${storeId}`).emit('low-stock-alert', {
        productId,
        quantity,
        timestamp: new Date()
      });
    }

    logger.info(`Inventory update broadcasted for ${productId}: ${type} ${quantity}`);
  }

  sendLowStockAlert(productData) {
    const { storeId, productId, productName, currentStock, reorderPoint } = productData;
    
    this.io.to(`store-${storeId}`).emit('low-stock-alert', {
      productId,
      productName,
      currentStock,
      reorderPoint,
      timestamp: new Date()
    });

    // Notify warehouse managers
    this.io.to('warehouse-managers').emit('low-stock-notification', {
      productId,
      productName,
      storeId,
      currentStock,
      reorderPoint,
      timestamp: new Date()
    });

    logger.info(`Low stock alert broadcasted for ${productName}`);
  }

  sendDailyReport(storeId, reportData) {
    this.io.to(`store-${storeId}`).emit('daily-report', {
      ...reportData,
      timestamp: new Date()
    });

    // Notify admins
    this.io.to('admins').emit('report-notification', {
      storeId,
      reportData,
      timestamp: new Date()
    });

    logger.info(`Daily report broadcasted for store ${storeId}`);
  }

  sendSystemNotification(message, severity = 'info') {
    this.io.emit('system-notification', {
      message,
      severity,
      timestamp: new Date()
    });

    logger.info(`System notification sent: ${message}`);
  }

  getConnectedClients() {
    return Array.from(this.connectedClients.entries()).map(([id, data]) => ({
      socketId: id,
      ...data
    }));
  }

  getStoreClients(storeId) {
    return Array.from(this.connectedClients.entries())
      .filter(([_, data]) => data.storeId === storeId)
      .map(([id, data]) => ({
        socketId: id,
        ...data
      }));
  }

  disconnectClient(socketId) {
    const socket = this.io.sockets.sockets.get(socketId);
    if (socket) {
      socket.disconnect();
      this.connectedClients.delete(socketId);
      logger.info(`Client ${socketId} disconnected forcefully`);
      return true;
    }
    return false;
  }
}

module.exports = TransactionEvents;