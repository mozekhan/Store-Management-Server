// const Roles = {
//   SUPER_ADMIN: 'SUPER_ADMIN',
//   ADMIN: 'ADMIN',
//   SALES_MANAGER: 'SALES_MANAGER',
//   SALES_ATTENDANT: 'SALES_ATTENDANT',
//   FINANCE_MANAGER: 'FINANCE_MANAGER',
//   FINANCE_CASHIER: 'FINANCE_CASHIER',
//   WAREHOUSE_MANAGER: 'WAREHOUSE_MANAGER',
//   WAREHOUSE_STAFF: 'WAREHOUSE_STAFF'
// };

// const Permissions = {
//   TRANSACTION_CREATE: 'transaction:create',
//   TRANSACTION_READ_OWN: 'transaction:read:own',
//   TRANSACTION_READ_ALL: 'transaction:read:all',
//   TRANSACTION_UPDATE: 'transaction:update',
//   TRANSACTION_DELETE: 'transaction:delete',
//   PAYMENT_PROCESS: 'payment:process',
//   PAYMENT_REFUND: 'payment:refund',
//   INVENTORY_READ: 'inventory:read',
//   INVENTORY_ADJUST: 'inventory:adjust',
//   INVENTORY_RELEASE: 'inventory:release',
//   USER_CREATE: 'user:create',
//   USER_UPDATE: 'user:update',
//   AUDIT_READ: 'audit:read',
//   REPORT_GENERATE: 'report:generate',
//   STORE_MANAGE: 'store:manage'
// };

// const RolePermissions = {
//   [Roles.SUPER_ADMIN]: Object.values(Permissions),
//   [Roles.ADMIN]: [
//     Permissions.TRANSACTION_READ_ALL,
//     Permissions.USER_CREATE,
//     Permissions.USER_UPDATE,
//     Permissions.AUDIT_READ,
//     Permissions.REPORT_GENERATE,
//     Permissions.INVENTORY_READ,
//     Permissions.INVENTORY_ADJUST
//   ],
//   [Roles.SALES_MANAGER]: [
//     Permissions.TRANSACTION_CREATE,
//     Permissions.TRANSACTION_READ_ALL,
//     Permissions.REPORT_GENERATE
//   ],
//   [Roles.SALES_ATTENDANT]: [
//     Permissions.TRANSACTION_CREATE,
//     Permissions.TRANSACTION_READ_OWN
//   ],
//   [Roles.FINANCE_MANAGER]: [
//     Permissions.PAYMENT_PROCESS,
//     Permissions.PAYMENT_REFUND,
//     Permissions.REPORT_GENERATE
//   ],
//   [Roles.FINANCE_CASHIER]: [
//     Permissions.PAYMENT_PROCESS
//   ],
//   [Roles.WAREHOUSE_MANAGER]: [
//     Permissions.INVENTORY_READ,
//     Permissions.INVENTORY_ADJUST,
//     Permissions.INVENTORY_RELEASE,
//     Permissions.REPORT_GENERATE
//   ],
//   [Roles.WAREHOUSE_STAFF]: [
//     Permissions.INVENTORY_READ,
//     Permissions.INVENTORY_RELEASE
//   ]
// };

// module.exports = {
//   Roles,
//   Permissions,
//   RolePermissions
// };






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
  USER_CREATE: 'user:create',
  USER_UPDATE: 'user:update',
  AUDIT_READ: 'audit:read',
  REPORT_GENERATE: 'report:generate',
  STORE_MANAGE: 'store:manage',
  // New permissions for multi-store
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
    Permissions.STORE_SWITCH
  ],
  [Roles.SALES_MANAGER]: [
    Permissions.TRANSACTION_CREATE,
    Permissions.TRANSACTION_READ_ALL,
    Permissions.REPORT_GENERATE
  ],
  [Roles.SALES_ATTENDANT]: [
    Permissions.TRANSACTION_CREATE,
    Permissions.TRANSACTION_READ_OWN
  ],
  [Roles.FINANCE_MANAGER]: [
    Permissions.PAYMENT_PROCESS,
    Permissions.PAYMENT_REFUND,
    Permissions.REPORT_GENERATE
  ],
  [Roles.FINANCE_CASHIER]: [
    Permissions.PAYMENT_PROCESS
  ],
  [Roles.WAREHOUSE_MANAGER]: [
    Permissions.INVENTORY_READ,
    Permissions.INVENTORY_ADJUST,
    Permissions.INVENTORY_RELEASE,
    Permissions.REPORT_GENERATE
  ],
  [Roles.WAREHOUSE_STAFF]: [
    Permissions.INVENTORY_READ,
    Permissions.INVENTORY_RELEASE
  ]
};

module.exports = {
  Roles,
  Permissions,
  RolePermissions
};