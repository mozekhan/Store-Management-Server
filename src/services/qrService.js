// const crypto = require("crypto");
// const QRCode = require("qrcode");
// const { AppError } = require("../middleware/errorHandler");

// class QRService {
//   constructor() {
//     // Use a 32-byte (256-bit) key for AES-256-GCM
//     this.secretKey = this.getSecureKey(
//       process.env.QR_SECRET_KEY || "default-secret-key-change-in-production"
//     );
//     this.algorithm = "aes-256-gcm";
//     this.expirationHours = 24;
//   }

//   /**
//    * Generate a secure 32-byte key from any input string
//    */
//   getSecureKey(input) {
//     // Use SHA-256 to generate a consistent 32-byte key
//     return crypto.createHash('sha256').update(input).digest();
//   }

//   /**
//    * Generate QR payload with security features
//    */
//   generatePayload(data) {
//     const payload = {
//       version: "1.0",
//       type: data.type, // SALES, PAYMENT, RELEASE
//       transactionId: data.transactionId,
//       storeId: data.storeId,
//       timestamp: Date.now(),
//       expiresAt: Date.now() + this.expirationHours * 60 * 60 * 1000,
//     };

//     // Generate HMAC for integrity
//     const hmac = crypto.createHmac("sha256", this.secretKey);
//     hmac.update(JSON.stringify(payload));
//     payload.checksum = hmac.digest("hex");

//     return payload;
//   }

//   /**
//    * Generate QR code from data
//    */
//   async generateQR(data) {
//     try {
//       const payload = this.generatePayload(data);
//       const jsonString = JSON.stringify(payload);

//       // Generate random IV (16 bytes for AES-GCM)
//       const iv = crypto.randomBytes(16);

//       // Create cipher with proper 32-byte key
//       const cipher = crypto.createCipheriv(
//         this.algorithm,
//         this.secretKey, // Now this is a 32-byte Buffer
//         iv
//       );

//       let encrypted = cipher.update(jsonString, "utf8", "hex");
//       encrypted += cipher.final("hex");
//       const authTag = cipher.getAuthTag().toString("hex");

//       const qrData = JSON.stringify({
//         encrypted,
//         iv: iv.toString("hex"),
//         authTag,
//       });

//       return await QRCode.toDataURL(qrData, {
//         errorCorrectionLevel: "H",
//         margin: 2,
//         width: 300,
//       });
//     } catch (error) {
//       console.error("QR Generation Error:", error);
//       throw new Error(`Failed to generate QR code: ${error.message}`);
//     }
//   }

//   /**
//    * Validate and decrypt QR data
//    */
//   validateQR(qrData) {
//     try {
//       const { encrypted, iv, authTag } = JSON.parse(qrData);

//       const decipher = crypto.createDecipheriv(
//         this.algorithm,
//         this.secretKey, // Now this is a 32-byte Buffer
//         Buffer.from(iv, "hex")
//       );

//       decipher.setAuthTag(Buffer.from(authTag, "hex"));

//       let decrypted = decipher.update(encrypted, "hex", "utf8");
//       decrypted += decipher.final("utf8");

//       const payload = JSON.parse(decrypted);

//       // Verify HMAC checksum
//       const hmac = crypto.createHmac("sha256", this.secretKey);
//       const payloadCopy = { ...payload };
//       delete payloadCopy.checksum;
//       hmac.update(JSON.stringify(payloadCopy));

//       const expectedChecksum = hmac.digest("hex");

//       if (payload.checksum !== expectedChecksum) {
//         return { valid: false, error: "Invalid QR checksum" };
//       }

//       // Check expiration
//       if (Date.now() > payload.expiresAt) {
//         return { valid: false, error: "QR code expired" };
//       }

//       return { valid: true, data: payload };
//     } catch (error) {
//       console.error("QR Validation Error:", error);
//       return { valid: false, error: error.message };
//     }
//   }

//   /**
//    * Validate QR and get transaction data
//    */
//   async validateAndGetTransaction(qrData, user) {
//     const validation = this.validateQR(qrData);

//     if (!validation.valid) {
//       throw new AppError(validation.error || "Invalid QR code", 400);
//     }

//     const Transaction = require("../models/Transaction");
//     const transaction = await Transaction.findById(
//       validation.data.transactionId
//     )
//       .populate("items.productId")
//       .populate("salesAttendantId", "firstName lastName")
//       .populate("financeAttendantId", "firstName lastName");

//     if (!transaction) {
//       throw new AppError("Transaction not found", 404);
//     }

//     // Check store access
//     if (
//       user.role !== "SUPER_ADMIN" &&
//       user.role !== "ADMIN" &&
//       transaction.storeId.toString() !== user.storeId?.toString()
//     ) {
//       throw new AppError("Access denied to this transaction", 403);
//     }

//     return { transaction, qrType: validation.data.type };
//   }
// }

// module.exports = new QRService();




















// // services/qrService.js
// const crypto = require("crypto");
// const QRCode = require("qrcode");
// const { AppError } = require("../middleware/errorHandler");

// class QRService {
//   constructor() {
//     this.secretKey = this.getSecureKey(
//       process.env.QR_SECRET_KEY || "default-secret-key-change-in-production"
//     );
//     this.algorithm = "aes-256-gcm";
//     this.expirationHours = 24;
//   }

//   getSecureKey(input) {
//     return crypto.createHash('sha256').update(input).digest();
//   }

//   generatePayload(data) {
//     const payload = {
//       version: "1.0",
//       type: data.type, // SALES, PAYMENT, RELEASE, INVOICE
//       transactionId: data.transactionId,
//       storeId: data.storeId,
//       timestamp: Date.now(),
//       expiresAt: Date.now() + this.expirationHours * 60 * 60 * 1000,
//       step: data.step || 'GENERAL',
//       ...(data.metadata || {})
//     };

//     const hmac = crypto.createHmac("sha256", this.secretKey);
//     hmac.update(JSON.stringify(payload));
//     payload.checksum = hmac.digest("hex");

//     return payload;
//   }

//   async generateQR(data) {
//     try {
//       const payload = this.generatePayload(data);
//       const jsonString = JSON.stringify(payload);

//       const iv = crypto.randomBytes(16);

//       const cipher = crypto.createCipheriv(
//         this.algorithm,
//         this.secretKey,
//         iv
//       );

//       let encrypted = cipher.update(jsonString, "utf8", "hex");
//       encrypted += cipher.final("hex");
//       const authTag = cipher.getAuthTag().toString("hex");

//       const qrData = JSON.stringify({
//         encrypted,
//         iv: iv.toString("hex"),
//         authTag,
//       });

//       return await QRCode.toDataURL(qrData, {
//         errorCorrectionLevel: "H",
//         margin: 2,
//         width: 300,
//       });
//     } catch (error) {
//       console.error("QR Generation Error:", error);
//       throw new Error(`Failed to generate QR code: ${error.message}`);
//     }
//   }

//   validateQR(qrData) {
//     try {
//       const { encrypted, iv, authTag } = JSON.parse(qrData);

//       const decipher = crypto.createDecipheriv(
//         this.algorithm,
//         this.secretKey,
//         Buffer.from(iv, "hex")
//       );

//       decipher.setAuthTag(Buffer.from(authTag, "hex"));

//       let decrypted = decipher.update(encrypted, "hex", "utf8");
//       decrypted += decipher.final("utf8");

//       const payload = JSON.parse(decrypted);

//       const hmac = crypto.createHmac("sha256", this.secretKey);
//       const payloadCopy = { ...payload };
//       delete payloadCopy.checksum;
//       hmac.update(JSON.stringify(payloadCopy));

//       const expectedChecksum = hmac.digest("hex");

//       if (payload.checksum !== expectedChecksum) {
//         return { valid: false, error: "Invalid QR checksum" };
//       }

//       if (Date.now() > payload.expiresAt) {
//         return { valid: false, error: "QR code expired" };
//       }

//       return { valid: true, data: payload };
//     } catch (error) {
//       console.error("QR Validation Error:", error);
//       return { valid: false, error: error.message };
//     }
//   }

//   async validateAndGetTransaction(qrData, user) {
//     const validation = this.validateQR(qrData);

//     if (!validation.valid) {
//       throw new AppError(validation.error || "Invalid QR code", 400);
//     }

//     const Transaction = require("../models/Transaction");
//     const transaction = await Transaction.findById(
//       validation.data.transactionId
//     )
//       .populate("items.productId")
//       .populate("salesAttendantId", "firstName lastName")
//       .populate("financeAttendantId", "firstName lastName")
//       .populate("warehouseStaffId", "firstName lastName");

//     if (!transaction) {
//       throw new AppError("Transaction not found", 404);
//     }

//     if (
//       user.role !== "SUPER_ADMIN" &&
//       user.role !== "ADMIN" &&
//       transaction.storeId.toString() !== user.storeId?.toString()
//     ) {
//       throw new AppError("Access denied to this transaction", 403);
//     }

//     return { transaction, qrType: validation.data.type, step: validation.data.step };
//   }
// }

// module.exports = new QRService();






























// const crypto = require("crypto");
// const QRCode = require("qrcode");
// const { AppError } = require("../middleware/errorHandler");
// const Transaction = require("../models/Transaction");

// class QRService {
//   constructor() {
//     this.secretKey = this.getSecureKey(
//       process.env.QR_SECRET_KEY || "default-secret-key-change-in-production"
//     );
//     this.algorithm = "aes-256-gcm";
//     this.expirationHours = 24;
//   }

//   getSecureKey(input) {
//     return crypto.createHash('sha256').update(input).digest();
//   }

//   generatePayload(data) {
//     const payload = {
//       version: "1.0",
//       type: data.type, // SALES, PAYMENT, RELEASE, INVOICE
//       transactionId: data.transactionId,
//       storeId: data.storeId,
//       step: data.step || data.type,
//       timestamp: Date.now(),
//       expiresAt: Date.now() + this.expirationHours * 60 * 60 * 1000,
//       metadata: data.metadata || {},
//     };

//     const hmac = crypto.createHmac("sha256", this.secretKey);
//     hmac.update(JSON.stringify(payload));
//     payload.checksum = hmac.digest("hex");

//     return payload;
//   }

//   async generateQR(data) {
//     try {
//       const payload = this.generatePayload(data);
//       const jsonString = JSON.stringify(payload);

//       const iv = crypto.randomBytes(16);

//       const cipher = crypto.createCipheriv(
//         this.algorithm,
//         this.secretKey,
//         iv
//       );

//       let encrypted = cipher.update(jsonString, "utf8", "hex");
//       encrypted += cipher.final("hex");
//       const authTag = cipher.getAuthTag().toString("hex");

//       const qrData = JSON.stringify({
//         encrypted,
//         iv: iv.toString("hex"),
//         authTag,
//       });

//       return await QRCode.toDataURL(qrData, {
//         errorCorrectionLevel: "H",
//         margin: 2,
//         width: 300,
//       });
//     } catch (error) {
//       console.error("QR Generation Error:", error);
//       throw new Error(`Failed to generate QR code: ${error.message}`);
//     }
//   }

//   validateQR(qrData) {
//     try {
//       const { encrypted, iv, authTag } = JSON.parse(qrData);

//       const decipher = crypto.createDecipheriv(
//         this.algorithm,
//         this.secretKey,
//         Buffer.from(iv, "hex")
//       );

//       decipher.setAuthTag(Buffer.from(authTag, "hex"));

//       let decrypted = decipher.update(encrypted, "hex", "utf8");
//       decrypted += decipher.final("utf8");

//       const payload = JSON.parse(decrypted);

//       const hmac = crypto.createHmac("sha256", this.secretKey);
//       const payloadCopy = { ...payload };
//       delete payloadCopy.checksum;
//       hmac.update(JSON.stringify(payloadCopy));

//       const expectedChecksum = hmac.digest("hex");

//       if (payload.checksum !== expectedChecksum) {
//         return { valid: false, error: "Invalid QR checksum" };
//       }

//       if (Date.now() > payload.expiresAt) {
//         return { valid: false, error: "QR code expired" };
//       }

//       return { valid: true, data: payload };
//     } catch (error) {
//       console.error("QR Validation Error:", error);
//       return { valid: false, error: error.message };
//     }
//   }

//   async validateAndGetTransaction(qrData) {
//     const validation = this.validateQR(qrData);

//     if (!validation.valid) {
//       throw new AppError(validation.error || "Invalid QR code", 400);
//     }

//     const transaction = await Transaction.findById(validation.data.transactionId)
//       .populate("items.productId")
//       .populate("salesAttendantId", "firstName lastName")
//       .populate("financeAttendantId", "firstName lastName");

//     if (!transaction) {
//       throw new AppError("Transaction not found", 404);
//     }

//     return {
//       transaction,
//       qrType: validation.data.type,
//       step: validation.data.step,
//       metadata: validation.data.metadata,
//     };
//   }
// }

// module.exports = new QRService();




























const crypto = require("crypto");
const QRCode = require("qrcode");
const { AppError } = require("../middleware/errorHandler");
const Transaction = require("../models/Transaction");

class QRService {
  constructor() {
    this.secretKey = this.getSecureKey(
      process.env.QR_SECRET_KEY || "default-secret-key-change-in-production"
    );
    this.algorithm = "aes-256-gcm";
    this.expirationHours = 24;
  }

  getSecureKey(input) {
    return crypto.createHash('sha256').update(input).digest();
  }

  /**
   * Generate compact payload - only essential data
   */
  generatePayload(data) {
    // Only include essential fields, not the full transaction
    const payload = {
      v: "1.0",                    // version (short key)
      t: data.type,                // type: S, P, R, I (shortened)
      i: data.transactionId,       // transaction ID
      s: data.storeId,             // store ID
      st: data.step || data.type,  // step
      ts: Date.now(),              // timestamp
      e: Date.now() + this.expirationHours * 60 * 60 * 1000, // expires
    };

    // Add metadata only if not too large
    if (data.metadata) {
      // Only include essential metadata
      const meta = {};
      if (data.metadata.totalAmount) meta.a = Math.round(data.metadata.totalAmount * 100);
      if (data.metadata.itemCount) meta.c = data.metadata.itemCount;
      if (data.metadata.transactionNumber) meta.n = data.metadata.transactionNumber;
      if (data.metadata.invoiceNumber) meta.in = data.metadata.invoiceNumber;
      if (Object.keys(meta).length > 0) {
        payload.m = meta;
      }
    }

    // Generate HMAC
    const hmac = crypto.createHmac("sha256", this.secretKey);
    // Use a compact string for HMAC
    const hmacData = `${payload.i}:${payload.t}:${payload.ts}:${payload.s}`;
    hmac.update(hmacData);
    payload.ch = hmac.digest("hex").substring(0, 16); // Shorten checksum

    return payload;
  }

  async generateQR(data) {
    try {
      const payload = this.generatePayload(data);
      const jsonString = JSON.stringify(payload);

      // Check size - if too large, reduce further
      if (jsonString.length > 3000) {
        // Remove metadata if too large
        delete payload.m;
        const compactJson = JSON.stringify(payload);
        if (compactJson.length > 3000) {
          // Use shorter keys and compress
          const minimal = {
            v: payload.v,
            t: payload.t,
            i: payload.i,
            s: payload.s,
            ts: payload.ts,
          };
          const minimalJson = JSON.stringify(minimal);
          return await this._generateQRCode(minimalJson);
        }
        return await this._generateQRCode(compactJson);
      }

      return await this._generateQRCode(jsonString);
    } catch (error) {
      console.error("QR Generation Error:", error);
      throw new Error(`Failed to generate QR code: ${error.message}`);
    }
  }

  /**
   * Generate QR code from JSON string
   */
  async _generateQRCode(jsonString) {
    // Use a simpler approach - store the data directly in the QR
    // QR Code version 10 (size 57x57) can store ~1,823 characters
    // Version 20 (size 97x97) can store ~3,353 characters
    const qrOptions = {
      errorCorrectionLevel: 'M',  // Medium error correction (less data overhead)
      margin: 2,
      width: 250,
      // version: 10,  // Start with version 10, auto-increase if needed
    };

    try {
      return await QRCode.toDataURL(jsonString, qrOptions);
    } catch (error) {
      // If data is too large, try with higher version
      if (error.message.includes('too big')) {
        qrOptions.version = 20;
        return await QRCode.toDataURL(jsonString, qrOptions);
      }
      throw error;
    }
  }

  /**
   * Validate QR data - handles both compact and full formats
   */
  validateQR(qrData) {
    try {
      // Try to parse as JSON
      let payload;
      try {
        payload = JSON.parse(qrData);
      } catch (e) {
        // Try base64 decode
        try {
          const decoded = Buffer.from(qrData, 'base64').toString('utf8');
          payload = JSON.parse(decoded);
        } catch (e2) {
          return { valid: false, error: "Invalid QR code format" };
        }
      }

      // Check if it's a compact payload (short keys)
      const isCompact = payload.v !== undefined && payload.i !== undefined && payload.t !== undefined;

      if (isCompact) {
        return this._validateCompactPayload(payload);
      }

      // Legacy format - try to extract data
      if (payload.transactionId) {
        return this._validateLegacyPayload(payload);
      }

      return { valid: false, error: "Invalid QR code structure" };
    } catch (error) {
      console.error("QR Validation Error:", error);
      return { valid: false, error: error.message };
    }
  }

  /**
   * Validate compact payload format
   */
  _validateCompactPayload(payload) {
    // Check expiration
    if (payload.e && Date.now() > payload.e) {
      return { valid: false, error: "QR code expired" };
    }

    // Check timestamp
    if (payload.ts) {
      const age = Date.now() - payload.ts;
      if (age > this.expirationHours * 60 * 60 * 1000) {
        return { valid: false, error: "QR code expired" };
      }
    }

    // Verify checksum (if present)
    if (payload.ch) {
      const hmac = crypto.createHmac("sha256", this.secretKey);
      const hmacData = `${payload.i}:${payload.t}:${payload.ts}:${payload.s}`;
      hmac.update(hmacData);
      const expectedChecksum = hmac.digest("hex").substring(0, 16);
      
      if (payload.ch !== expectedChecksum) {
        return { valid: false, error: "Invalid QR checksum" };
      }
    }

    // Map compact keys to full format
    const typeMap = {
      'S': 'SALES',
      'P': 'PAYMENT',
      'R': 'RELEASE',
      'I': 'INVOICE'
    };

    return {
      valid: true,
      data: {
        version: payload.v,
        type: typeMap[payload.t] || payload.t,
        transactionId: payload.i,
        storeId: payload.s,
        step: payload.st || payload.t,
        timestamp: payload.ts,
        expiresAt: payload.e,
        metadata: payload.m ? {
          totalAmount: payload.m.a ? payload.m.a / 100 : undefined,
          itemCount: payload.m.c,
          transactionNumber: payload.m.n,
          invoiceNumber: payload.m.in,
        } : {},
      }
    };
  }

  /**
   * Validate legacy payload format
   */
  _validateLegacyPayload(payload) {
    // Check expiration
    if (payload.expiresAt && Date.now() > payload.expiresAt) {
      return { valid: false, error: "QR code expired" };
    }

    if (payload.timestamp) {
      const age = Date.now() - payload.timestamp;
      if (age > this.expirationHours * 60 * 60 * 1000) {
        return { valid: false, error: "QR code expired" };
      }
    }

    // Verify checksum if present
    if (payload.checksum) {
      const hmac = crypto.createHmac("sha256", this.secretKey);
      const { checksum, ...data } = payload;
      const hmacData = `${data.type}:${data.transactionId}:${data.storeId}`;
      hmac.update(hmacData);
      if (hmac.digest("hex") !== checksum) {
        return { valid: false, error: "Invalid QR checksum" };
      }
    }

    return { valid: true, data: payload };
  }

  /**
   * Validate and get transaction
   */
  async validateAndGetTransaction(qrData) {
    const validation = this.validateQR(qrData);

    if (!validation.valid) {
      throw new AppError(validation.error || "Invalid QR code", 400);
    }

    const transaction = await Transaction.findById(validation.data.transactionId)
      .populate("items.productId")
      .populate("salesAttendantId", "firstName lastName")
      .populate("financeAttendantId", "firstName lastName");

    if (!transaction) {
      throw new AppError("Transaction not found", 404);
    }

    return {
      transaction,
      qrType: validation.data.type,
      step: validation.data.step,
      metadata: validation.data.metadata,
    };
  }
}

module.exports = new QRService();