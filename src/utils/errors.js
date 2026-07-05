class AppError extends Error {
  constructor(message, statusCode, errorCode = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

class BusinessError extends AppError {
  constructor(message) {
    super(message, 400, 'BUSINESS_ERROR');
  }
}

class QRValidationError extends AppError {
  constructor(message = 'Invalid QR code') {
    super(message, 400, 'QR_VALIDATION_ERROR');
  }
}

class InventoryError extends AppError {
  constructor(message = 'Insufficient inventory') {
    super(message, 400, 'INVENTORY_ERROR');
  }
}

class PaymentError extends AppError {
  constructor(message = 'Payment processing failed') {
    super(message, 400, 'PAYMENT_ERROR');
  }
}

const errorTypes = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  BusinessError,
  QRValidationError,
  InventoryError,
  PaymentError
};

module.exports = errorTypes;