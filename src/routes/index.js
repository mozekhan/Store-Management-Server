const express = require('express');
const router = express.Router();

// Import all route modules
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const storeRoutes = require('./storeRoutes');
const productRoutes = require('./productRoutes');
const inventoryRoutes = require('./inventoryRoutes');
const transactionRoutes = require('./transactionRoutes');
const warehouseRoutes = require('./warehouseRoutes');
const paymentRoutes = require('./paymentRoutes');
const reportRoutes = require('./reportRoutes');
const receiptRoutes = require('./receiptsRoutes');
const notificationRoutes = require('./notificationRoutes');
const adminRoutes = require('./adminRoutes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/stores', storeRoutes);
router.use('/products', productRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/transactions', transactionRoutes);
router.use('/warehouse', warehouseRoutes);
router.use('/payments', paymentRoutes);
router.use('/reports', reportRoutes);
router.use('/receipts', receiptRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

module.exports = router;