const crypto = require('crypto');

class CryptoUtils {
  constructor() {
    this.secretKey = process.env.QR_SECRET_KEY;
    this.algorithm = 'aes-256-gcm';
  }

  encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      this.algorithm,
      Buffer.from(this.secretKey.padEnd(32)),
      iv
    );
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag
    };
  }

  decrypt(encryptedData) {
    const { encrypted, iv, authTag } = encryptedData;
    
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      Buffer.from(this.secretKey.padEnd(32)),
      Buffer.from(iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  generateHMAC(data) {
    const hmac = crypto.createHmac('sha256', this.secretKey);
    hmac.update(data);
    return hmac.digest('hex');
  }

  verifyHMAC(data, signature) {
    const expected = this.generateHMAC(data);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  }

  generateRandomToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
  }

  encryptQRPayload(payload) {
    const jsonString = JSON.stringify(payload);
    return this.encrypt(jsonString);
  }

  decryptQRPayload(encryptedData) {
    const decrypted = this.decrypt(encryptedData);
    return JSON.parse(decrypted);
  }
}

module.exports = new CryptoUtils();