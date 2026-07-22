
const Roles = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  SALES_MANAGER: 'SALES_MANAGER',
  SALES_ATTENDANT: 'SALES_ATTENDANT',
  FINANCE_MANAGER: 'FINANCE_MANAGER',
  FINANCE_CASHIER: 'FINANCE_CASHIER',
  WAREHOUSE_MANAGER: 'WAREHOUSE_MANAGER',
  WAREHOUSE_STAFF: 'WAREHOUSE_STAFF'
};

const Permissions = {
  TRANSACTION_CREATE: 'transaction:create',
  TRANSACTION_READ_OWN: 'transaction:read:own',
  TRANSACTION_READ_ALL: 'transaction:read:all',
  TRANSACTION_UPDATE: 'transaction:update',
  TRANSACTION_DELETE: 'transaction:delete',

  PAYMENT_PROCESS: 'payment:process',
  PAYMENT_REFUND: 'payment:refund',

  INVENTORY_READ: 'inventory:read',
  INVENTORY_ADJUST: 'inventory:adjust',
  INVENTORY_RELEASE: 'inventory:release',

  PRODUCT_READ: 'product:read',
  PRODUCT_CREATE: 'product:create',
  PRODUCT_UPDATE: 'product:update',
  PRODUCT_DELETE: 'product:delete',

  USER_CREATE: 'user:create',
  USER_UPDATE: 'user:update',

  AUDIT_READ: 'audit:read',
  REPORT_GENERATE: 'report:generate',

  STORE_MANAGE: 'store:manage',
  STORE_SWITCH: 'store:switch',
  STORE_VIEW_ALL: 'store:view:all'
};

const RolePermissions = {
  [Roles.SUPER_ADMIN]: Object.values(Permissions),
  [Roles.ADMIN]: [
    Permissions.TRANSACTION_READ_ALL,
    Permissions.USER_CREATE,
    Permissions.USER_UPDATE,
    Permissions.AUDIT_READ,
    Permissions.REPORT_GENERATE,
    Permissions.INVENTORY_READ,
    Permissions.INVENTORY_ADJUST,
    Permissions.PRODUCT_READ,
    Permissions.PRODUCT_CREATE,
    Permissions.PRODUCT_UPDATE,
    Permissions.PRODUCT_DELETE,
    Permissions.STORE_SWITCH
  ],
  [Roles.SALES_MANAGER]: [
    Permissions.TRANSACTION_CREATE,
    Permissions.TRANSACTION_READ_ALL,
    Permissions.INVENTORY_READ,
    Permissions.PRODUCT_READ,
    Permissions.REPORT_GENERATE
  ],
  [Roles.SALES_ATTENDANT]: [
    Permissions.TRANSACTION_CREATE,
    Permissions.TRANSACTION_READ_OWN,
    Permissions.INVENTORY_READ,
    Permissions.PRODUCT_READ,
  ],
  [Roles.FINANCE_MANAGER]: [
    Permissions.PAYMENT_PROCESS,
    Permissions.PAYMENT_REFUND,
    Permissions.TRANSACTION_READ_ALL,
    Permissions.REPORT_GENERATE
  ],
  [Roles.FINANCE_CASHIER]: [
    Permissions.PAYMENT_PROCESS,
    Permissions.TRANSACTION_READ_ALL,
  ],
  [Roles.WAREHOUSE_MANAGER]: [
    Permissions.INVENTORY_READ,
    Permissions.INVENTORY_ADJUST,
    Permissions.INVENTORY_RELEASE,
    Permissions.TRANSACTION_READ_ALL,
    Permissions.PRODUCT_READ,
    Permissions.REPORT_GENERATE
  ],
  [Roles.WAREHOUSE_STAFF]: [
    Permissions.INVENTORY_READ,
    Permissions.INVENTORY_RELEASE,
    Permissions.PRODUCT_READ,
    Permissions.TRANSACTION_READ_ALL,
  ]
};

module.exports = {
  Roles,
  Permissions,
  RolePermissions
};