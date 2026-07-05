// const User = require('../models/User');
// const JWTService = require('../config/jwt');
// const BaseService = require('./baseService');
// const { AppError } = require('../middleware/errorHandler');
// const crypto = require('crypto');

// class AuthService extends BaseService {
//   /**
//    * Login user
//    */
//   async login(email, password, ip, userAgent) {
//     const user = await User.findOne({ email })
//       .populate('storeId')
//       .select('+password +refreshToken');

//     if (!user) {
//       throw new AppError('Invalid credentials', 401);
//     }

//     const isValidPassword = await user.comparePassword(password);
//     if (!isValidPassword) {
//       throw new AppError('Invalid credentials', 401);
//     }

//     if (!user.isActive) {
//       throw new AppError('Account is deactivated', 403);
//     }

//     const accessToken = JWTService.generateAccessToken(user._id);
//     const refreshToken = JWTService.generateRefreshToken(user._id);

//     user.refreshToken = refreshToken;
//     user.lastLogin = new Date();
//     await user.save();

//     // Unified audit log
//     await this.auditLog(
//       user._id,
//       user.role,
//       'LOGIN',
//       'User',
//       user._id,
//       user.storeId,
//       { metadata: { ipAddress: ip, userAgent } }
//     );

//     const userResponse = user.toObject();
//     delete userResponse.password;
//     delete userResponse.refreshToken;

//     return {
//       user: userResponse,
//       accessToken,
//       refreshToken
//     };
//   }

//   /**
//    * Refresh access token
//    */
//   async refreshToken(refreshToken, ip, userAgent) {
//     if (!refreshToken) {
//       throw new AppError('Refresh token required', 401);
//     }

//     const decoded = JWTService.verifyRefreshToken(refreshToken);
//     const user = await User.findById(decoded.userId).populate('storeId');

//     if (!user || user.refreshToken !== refreshToken) {
//       throw new AppError('Invalid refresh token', 401);
//     }

//     if (!user.isActive) {
//       throw new AppError('Account is deactivated', 403);
//     }

//     const newAccessToken = JWTService.generateAccessToken(user._id);
//     const newRefreshToken = JWTService.generateRefreshToken(user._id);

//     user.refreshToken = newRefreshToken;
//     await user.save();

//     return {
//       accessToken: newAccessToken,
//       refreshToken: newRefreshToken
//     };
//   }

//   /**
//    * Logout user
//    */
//   async logout(userId, refreshToken, ip, userAgent) {
//     const user = await User.findById(userId);
//     if (user && user.refreshToken === refreshToken) {
//       user.refreshToken = null;
//       await user.save();
//     }

//     await this.auditLog(
//       userId,
//       null,
//       'LOGOUT',
//       'User',
//       userId,
//       null,
//       { metadata: { ipAddress: ip, userAgent } }
//     );

//     return true;
//   }

//   /**
//    * Change user password
//    */
//   async changePassword(userId, currentPassword, newPassword, ip, userAgent) {
//     const user = await User.findById(userId).select('+password');
//     if (!user) {
//       throw new AppError('User not found', 404);
//     }

//     const isValid = await user.comparePassword(currentPassword);
//     if (!isValid) {
//       throw new AppError('Current password is incorrect', 400);
//     }

//     user.password = newPassword;
//     await user.save();

//     await this.auditLog(
//       userId,
//       null,
//       'UPDATE',
//       'User',
//       userId,
//       user.storeId,
//       {
//         metadata: { ipAddress: ip, userAgent, action: 'Password changed' }
//       }
//     );

//     return true;
//   }

//   /**
//    * Request password reset
//    */
//   async resetPassword(email, ip, userAgent) {
//     const user = await User.findOne({ email });
//     if (!user) {
//       throw new AppError('User not found', 404);
//     }

//     const resetToken = crypto.randomBytes(32).toString('hex');
//     const resetExpiry = new Date(Date.now() + 3600000);

//     user.resetPasswordToken = resetToken;
//     user.resetPasswordExpiry = resetExpiry;
//     await user.save();

//     await this.auditLog(
//       user._id,
//       null,
//       'UPDATE',
//       'User',
//       user._id,
//       user.storeId,
//       {
//         metadata: { ipAddress: ip, userAgent, action: 'Password reset requested' }
//       }
//     );

//     return { resetToken };
//   }
// }

// module.exports = new AuthService();
























// ============================================================
// services/authService.js - Unified authentication service
// ============================================================

const User = require('../models/User');
const Store = require('../models/Store');
const JWTService = require('../config/jwt');
const BaseService = require('./baseService');
const { AppError } = require('../middleware/errorHandler');
const crypto = require('crypto');

class AuthService extends BaseService {
  /**
   * Login user - ENHANCED with store context
   */
  async login(email, password, ip, userAgent) {
    const user = await User.findOne({ email })
      .populate('storeId')
      .populate('currentStoreId')
      .select('+password +refreshToken');

    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      throw new AppError('Invalid credentials', 401);
    }

    if (!user.isActive) {
      throw new AppError('Account is deactivated', 403);
    }

    // Set current store if not set
    if (!user.currentStoreId && user.storeId) {
      user.currentStoreId = user.storeId._id || user.storeId;
    } else if (!user.currentStoreId && user.assignedStores && user.assignedStores.length > 0) {
      user.currentStoreId = user.assignedStores[0];
    }

    const accessToken = JWTService.generateAccessToken(user._id);
    const refreshToken = JWTService.generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    // Unified audit log
    await this.auditLog(
      user._id,
      user.role,
      'LOGIN',
      'User',
      user._id,
      user.currentStoreId || user.storeId,
      { metadata: { ipAddress: ip, userAgent } }
    );

    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.refreshToken;

    return {
      user: userResponse,
      accessToken,
      refreshToken
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken, ip, userAgent) {
    if (!refreshToken) {
      throw new AppError('Refresh token required', 401);
    }

    const decoded = JWTService.verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.userId)
      .populate('storeId')
      .populate('currentStoreId');

    if (!user || user.refreshToken !== refreshToken) {
      throw new AppError('Invalid refresh token', 401);
    }

    if (!user.isActive) {
      throw new AppError('Account is deactivated', 403);
    }

    const newAccessToken = JWTService.generateAccessToken(user._id);
    const newRefreshToken = JWTService.generateRefreshToken(user._id);

    user.refreshToken = newRefreshToken;
    await user.save();

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    };
  }

  /**
   * Logout user
   */
  async logout(userId, refreshToken, ip, userAgent) {
    const user = await User.findById(userId);
    if (user && user.refreshToken === refreshToken) {
      user.refreshToken = null;
      await user.save();
    }

    await this.auditLog(
      userId,
      null,
      'LOGOUT',
      'User',
      userId,
      null,
      { metadata: { ipAddress: ip, userAgent } }
    );

    return true;
  }

  /**
   * Change user password
   */
  async changePassword(userId, currentPassword, newPassword, ip, userAgent) {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) {
      throw new AppError('Current password is incorrect', 400);
    }

    user.password = newPassword;
    await user.save();

    await this.auditLog(
      userId,
      null,
      'UPDATE',
      'User',
      userId,
      user.storeId,
      {
        metadata: { ipAddress: ip, userAgent, action: 'Password changed' }
      }
    );

    return true;
  }

  /**
   * Request password reset
   */
  async resetPassword(email, ip, userAgent) {
    const user = await User.findOne({ email });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpiry = new Date(Date.now() + 3600000);

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiry = resetExpiry;
    await user.save();

    await this.auditLog(
      user._id,
      null,
      'UPDATE',
      'User',
      user._id,
      user.storeId,
      {
        metadata: { ipAddress: ip, userAgent, action: 'Password reset requested' }
      }
    );

    return { resetToken };
  }
}

module.exports = new AuthService();