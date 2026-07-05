// ============================================================
// controllers/notificationController.js - Notification controller
// ============================================================

const NotificationService = require('../services/notificationService');

/**
 * Get notifications list
 */
exports.getNotifications = async (req, res) => {
  try {
    const { page, limit, read, type } = req.query;
    const result = await NotificationService.getNotifications(
      req.user._id,
      { page, limit, read, type }
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Mark notification as read
 */
exports.markNotificationRead = async (req, res) => {
  try {
    const notification = await NotificationService.markAsRead(
      req.params.id,
      req.user._id
    );

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Mark all notifications as read
 */
exports.markAllNotificationsRead = async (req, res) => {
  try {
    const result = await NotificationService.markAllAsRead(req.user._id);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get unread notification count
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await NotificationService.getUnreadCount(req.user._id);

    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Delete notification
 */
exports.deleteNotification = async (req, res) => {
  try {
    const result = await NotificationService.deleteNotification(
      req.params.id,
      req.user._id
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Delete all notifications
 */
exports.deleteAllNotifications = async (req, res) => {
  try {
    const result = await NotificationService.deleteAllNotifications(req.user._id);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};