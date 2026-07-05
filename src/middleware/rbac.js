const rbacMiddleware = (requiredPermissions = []) => {
  return (req, res, next) => {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Super Admin has all permissions
    if (user.role === 'SUPER_ADMIN') {
      return next();
    }

    // Check if user has required permissions
    const hasAllPermissions = requiredPermissions.every(permission =>
      user.permissions.includes(permission)
    );

    if (!hasAllPermissions) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

module.exports = rbacMiddleware;