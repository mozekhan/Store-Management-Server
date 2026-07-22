const AdminService = require('../services/adminService');

/**
 * Get system statistics
 */
exports.getSystemStats = async (req, res) => {
  try {
    const stats = await AdminService.getSystemStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get store statistics
 */
exports.getStoreStats = async (req, res) => {
  try {
    const { storeId } = req.params;
    const stats = await AdminService.getStoreStats(storeId, req.user);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get activity logs
 */
exports.getActivityLogs = async (req, res) => {
  try {
    const result = await AdminService.getActivityLogs(req.query, req.user);

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
 * Verify system integrity
 */
exports.verifySystemIntegrity = async (req, res) => {
  try {
    const result = await AdminService.verifySystemIntegrity();

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
 * Get user activity summary
 */
exports.getUserActivity = async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 30 } = req.query;

    const result = await AdminService.getUserActivitySummary(userId, parseInt(days));

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