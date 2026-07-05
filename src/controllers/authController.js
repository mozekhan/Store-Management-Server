
// const User = require('../models/User');
// const AuthService = require('../services/authService');

// /**
//  * Login user
//  */
// exports.login = async (req, res) => {
//   try {
//     const { email, password } = req.body;
//     const result = await AuthService.login(
//       email,
//       password,
//       req.ip,
//       req.headers['user-agent']
//     );

//     res.cookie('accessToken', result.accessToken, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === 'production',
//       sameSite: 'strict',
//       maxAge: 15 * 60 * 1000
//     });

//     res.cookie('refreshToken', result.refreshToken, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === 'production',
//       sameSite: 'strict',
//       maxAge: 7 * 24 * 60 * 60 * 1000
//     });

//     res.json({
//       success: true,
//       data: result
//     });
//   } catch (error) {
//     res.status(error.statusCode || 500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// /**
//  * Refresh access token
//  */
// exports.refreshToken = async (req, res) => {
//   try {
//     const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
//     const result = await AuthService.refreshToken(
//       refreshToken,
//       req.ip,
//       req.headers['user-agent']
//     );

//     res.cookie('accessToken', result.accessToken, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === 'production',
//       sameSite: 'strict',
//       maxAge: 15 * 60 * 1000
//     });

//     res.cookie('refreshToken', result.refreshToken, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === 'production',
//       sameSite: 'strict',
//       maxAge: 7 * 24 * 60 * 60 * 1000
//     });

//     res.json({
//       success: true,
//       data: { accessToken: result.accessToken }
//     });
//   } catch (error) {
//     res.status(error.statusCode || 401).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// /**
//  * Logout user
//  */
// exports.logout = async (req, res) => {
//   try {
//     const refreshToken = req.cookies.refreshToken;
//     await AuthService.logout(
//       req.user._id,
//       refreshToken,
//       req.ip,
//       req.headers['user-agent']
//     );

//     res.clearCookie('accessToken');
//     res.clearCookie('refreshToken');

//     res.json({
//       success: true,
//       message: 'Logged out successfully'
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// /**
//  * Get current user
//  */
// exports.getCurrentUser = async (req, res) => {
//   try {
//     const user = await User.findById(req.user._id)
//       .populate('storeId')
//       .select('-password -refreshToken');

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
//  * Change password
//  */
// exports.changePassword = async (req, res) => {
//   try {
//     const { currentPassword, newPassword } = req.body;
//     await AuthService.changePassword(
//       req.user._id,
//       currentPassword,
//       newPassword,
//       req.ip,
//       req.headers['user-agent']
//     );

//     res.json({
//       success: true,
//       message: 'Password changed successfully'
//     });
//   } catch (error) {
//     res.status(error.statusCode || 500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// /**
//  * Request password reset
//  */
// exports.resetPassword = async (req, res) => {
//   try {
//     const { email } = req.body;
//     const result = await AuthService.resetPassword(
//       email,
//       req.ip,
//       req.headers['user-agent']
//     );

//     res.json({
//       success: true,
//       data: result,
//       message: 'Password reset email sent'
//     });
//   } catch (error) {
//     res.status(error.statusCode || 500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };























// ============================================================
// controllers/authController.js - Authentication controller
// ============================================================

const User = require('../models/User');
const AuthService = require('../services/authService');

/**
 * Login user - ENHANCED with store context
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await AuthService.login(
      email,
      password,
      req.ip,
      req.headers['user-agent']
    );

    // Set currentStoreId if not set
    const user = await User.findById(result.user._id);
    if (user && !user.currentStoreId && user.storeId) {
      user.currentStoreId = user.storeId;
      await user.save();
    } else if (user && !user.currentStoreId && user.assignedStores && user.assignedStores.length > 0) {
      user.currentStoreId = user.assignedStores[0];
      await user.save();
    }

    // Populate store info in response
    const populatedUser = await User.findById(result.user._id)
      .populate('currentStoreId', 'name code')
      .populate('storeId', 'name code')
      .select('-password -refreshToken');

    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000
    });

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      data: {
        user: populatedUser,
        accessToken: result.accessToken
      }
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Refresh access token
 */
exports.refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    const result = await AuthService.refreshToken(
      refreshToken,
      req.ip,
      req.headers['user-agent']
    );

    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000
    });

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      data: { accessToken: result.accessToken }
    });
  } catch (error) {
    res.status(error.statusCode || 401).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Logout user
 */
exports.logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    await AuthService.logout(
      req.user._id,
      refreshToken,
      req.ip,
      req.headers['user-agent']
    );

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get current user
 */
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('storeId', 'name code')
      .populate('currentStoreId', 'name code')
      .populate('assignedStores', 'name code')
      .select('-password -refreshToken');

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
 * Change password
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    await AuthService.changePassword(
      req.user._id,
      currentPassword,
      newPassword,
      req.ip,
      req.headers['user-agent']
    );

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Request password reset
 */
exports.resetPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const result = await AuthService.resetPassword(
      email,
      req.ip,
      req.headers['user-agent']
    );

    res.json({
      success: true,
      data: result,
      message: 'Password reset email sent'
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};