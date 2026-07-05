const jwt = require('jsonwebtoken');
const { AppError } = require('../middleware/errorHandler');

class JWTService {
  constructor() {
    this.secret = process.env.JWT_SECRET;
    this.refreshSecret = process.env.JWT_REFRESH_SECRET;
    this.accessExpiry = process.env.JWT_EXPIRE || '15m';
    this.refreshExpiry = process.env.JWT_REFRESH_EXPIRE || '7d';
  }

  generateAccessToken(userId) {
    try {
      return jwt.sign(
        { userId },
        this.secret,
        { expiresIn: this.accessExpiry }
      );
    } catch (error) {
      throw new AppError('Failed to generate access token', 500);
    }
  }

  generateRefreshToken(userId) {
    try {
      return jwt.sign(
        { userId },
        this.refreshSecret,
        { expiresIn: this.refreshExpiry }
      );
    } catch (error) {
      throw new AppError('Failed to generate refresh token', 500);
    }
  }

  verifyAccessToken(token) {
    try {
      return jwt.verify(token, this.secret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new AppError('Access token expired', 401, 'TOKEN_EXPIRED');
      }
      throw new AppError('Invalid access token', 401, 'INVALID_TOKEN');
    }
  }

  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, this.refreshSecret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new AppError('Refresh token expired', 401, 'REFRESH_EXPIRED');
      }
      throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH');
    }
  }

  decodeToken(token) {
    try {
      return jwt.decode(token);
    } catch (error) {
      return null;
    }
  }

  getTokenExpiry(token) {
    const decoded = this.decodeToken(token);
    if (decoded && decoded.exp) {
      return new Date(decoded.exp * 1000);
    }
    return null;
  }

  isTokenExpired(token) {
    const expiry = this.getTokenExpiry(token);
    if (!expiry) return true;
    return expiry < new Date();
  }

  extractTokenFromHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }
}

module.exports = new JWTService();