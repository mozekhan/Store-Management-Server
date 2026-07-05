// Extended Request type with user
/**
 * @typedef {Object} User
 * @property {string} _id
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} email
 * @property {string} role
 * @property {string} storeId
 * @property {string[]} permissions
 * @property {boolean} isActive
 */

/**
 * @typedef {Object} AuthenticatedRequest
 * @property {User} user
 * @property {string} ip
 * @property {Object} cookies
 * @property {Object} params
 * @property {Object} query
 * @property {Object} body
 */

/**
 * @typedef {Object} AuditDetails
 * @property {Object} before
 * @property {Object} after
 * @property {Object} metadata
 */

/**
 * @typedef {Object} TransactionItem
 * @property {string} productId
 * @property {string} sku
 * @property {string} name
 * @property {number} quantity
 * @property {number} unitPrice
 * @property {number} totalPrice
 * @property {number} taxAmount
 */

/**
 * @typedef {Object} Transaction
 * @property {string} _id
 * @property {string} transactionNumber
 * @property {string} storeId
 * @property {string} salesAttendantId
 * @property {TransactionItem[]} items
 * @property {number} subtotal
 * @property {number} taxTotal
 * @property {number} totalAmount
 * @property {string} status
 * @property {Date} createdAt
 */

/**
 * @typedef {Object} QRPayload
 * @property {string} version
 * @property {string} type
 * @property {string} transactionId
 * @property {number} timestamp
 * @property {string} checksum
 */

/**
 * @typedef {Object} ReceiptData
 * @property {string} storeName
 * @property {string} title
 * @property {string} date
 * @property {string} transactionNumber
 * @property {string} attendant
 * @property {Array} items
 * @property {number} subtotal
 * @property {number} tax
 * @property {number} total
 * @property {string} paymentMethod
 * @property {number} amountPaid
 * @property {number} change
 * @property {string} qrCode
 * @property {string} footer
 */

module.exports = {
  // Empty export to make this a module
};