const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createCipheriv, createDecipheriv, randomBytes } = require('crypto');

class SecurityConfig {
  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY || 'default-encryption-key-32bytes';
    this.algorithm = 'aes-256-gcm';
    this.saltRounds = 12;
  }

  // Helmet configuration
  getHelmetConfig() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "wss:", "https:"],
          fontSrc: ["'self'", "https:"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"]
        }
      },
      crossOriginEmbedderPolicy: true,
      crossOriginOpenerPolicy: { policy: "same-origin" },
      crossOriginResourcePolicy: { policy: "same-site" },
      dnsPrefetchControl: { allow: false },
      frameguard: { action: "deny" },
      hsts: { 
        maxAge: 31536000, 
        includeSubDomains: true, 
        preload: true 
      },
      ieNoOpen: true,
      noSniff: true,
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      xssFilter: true,
      hidePoweredBy: true
    });
  }

  // Rate limiting configurations
  getRateLimiters() {
    return {
      // General API rate limiter
      api: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100,
        message: {
          success: false,
          error: 'Too many requests, please try again later.'
        },
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req) => req.user?._id?.toString() || req.ip
      }),

      // Auth endpoints - stricter
      auth: rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 5,
        message: {
          success: false,
          error: 'Too many login attempts, please try again later.'
        },
        keyGenerator: (req) => req.ip
      }),

      // QR scanning - per minute
      scan: rateLimit({
        windowMs: 60 * 1000,
        max: 30,
        message: {
          success: false,
          error: 'Too many scan attempts, please slow down.'
        }
      }),

      // Reports - per hour
      reports: rateLimit({
        windowMs: 60 * 60 * 1000,
        max: 10,
        message: {
          success: false,
          error: 'Report generation limit reached, please try again later.'
        }
      }),

      // Sensitive operations
      sensitive: rateLimit({
        windowMs: 60 * 60 * 1000,
        max: 20,
        message: {
          success: false,
          error: 'Too many sensitive operations, please try again later.'
        }
      })
    };
  }

  // CORS configuration
  getCorsConfig() {
    const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',');
    
    return {
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'Access-Control-Allow-Origin'
      ],
      exposedHeaders: ['X-Request-Id', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
      maxAge: 86400 // 24 hours
    };
  }

  // Encryption utilities
  encrypt(data) {
    try {
      const iv = randomBytes(16);
      const key = Buffer.from(this.encryptionKey.padEnd(32).slice(0, 32));
      const cipher = createCipheriv(this.algorithm, key, iv);
      
      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag().toString('hex');

      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag
      };
    } catch (error) {
      throw new Error('Encryption failed: ' + error.message);
    }
  }

  decrypt(encryptedData) {
    try {
      const { encrypted, iv, authTag } = encryptedData;
      const key = Buffer.from(this.encryptionKey.padEnd(32).slice(0, 32));
      const decipher = createDecipheriv(this.algorithm, key, Buffer.from(iv, 'hex'));
      
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      throw new Error('Decryption failed: ' + error.message);
    }
  }

  // Validate and sanitize input
  sanitizeInput(input) {
    if (typeof input === 'string') {
      // Remove potential XSS vectors
      return input
        .replace(/[<>]/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '')
        .trim();
    }
    return input;
  }

  sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeInput(value);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(v => 
          typeof v === 'string' ? this.sanitizeInput(v) : v
        );
      } else if (value && typeof value === 'object') {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  // Generate secure random tokens
  generateSecureToken(length = 32) {
    return randomBytes(length).toString('hex');
  }

  // Password strength validation
  validatePasswordStrength(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
      return { valid: false, message: `Password must be at least ${minLength} characters long` };
    }
    if (!hasUpperCase) {
      return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }
    if (!hasLowerCase) {
      return { valid: false, message: 'Password must contain at least one lowercase letter' };
    }
    if (!hasNumbers) {
      return { valid: false, message: 'Password must contain at least one number' };
    }
    if (!hasSpecialChars) {
      return { valid: false, message: 'Password must contain at least one special character' };
    }

    return { valid: true };
  }

  // Session configuration
  getSessionConfig() {
    return {
      secret: process.env.SESSION_SECRET || this.generateSecureToken(64),
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        sameSite: 'strict'
      }
    };
  }
}

module.exports = new SecurityConfig();